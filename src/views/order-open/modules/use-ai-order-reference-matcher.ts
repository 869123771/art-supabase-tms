import { trim } from 'lodash-es'
import { mapWithConcurrency } from '@/utils/async'
import {
  fetchCargoList,
  fetchCustomerAddressList,
  fetchCustomerOptions,
  fetchCustomerSelectorList,
  fetchStationOptions
} from '@tms/api'
import type {
  AiAddressReferenceMatch,
  AiCargoReferenceMatch,
  AiOrderReferenceMatches,
  AiReferenceMatch
} from './ai-order-types'

type StationOption = Api.Tms.Order.StationOption
type CustomerItem = Pick<Api.Tms.Order.CustomerSelectorItem, 'id' | 'customerName'>
type CustomerAddress = Api.Tms.BasicData.CustomerAddress
type Cargo = Api.Tms.BasicData.Cargo

export function useAiOrderReferenceMatcher() {
  async function resolveReferences(
    draft: Api.Tms.Order.AiOrderDraft,
    targetTenantId: string,
    isAllTenants: boolean
  ): Promise<AiOrderReferenceMatches> {
    const customerLookups = new Map<string, Promise<CustomerItem[]>>()
    const cargoLookups = new Map<string, Promise<Cargo[]>>()
    const needsCustomerMatch = Boolean(
      trim(draft.shippingCustomerName ?? '') || trim(draft.receivingCustomerName ?? '')
    )
    const scopedCustomerOptions =
      isAllTenants && needsCustomerMatch
        ? fetchCustomerOptions({ tenantId: targetTenantId }).then(({ data, error }) => {
            if (error) throw error
            if ((data?.length ?? 0) >= 1000) {
              throw new Error('当前租户客户档案较多，请回填后手动选择客户')
            }
            return data ?? []
          })
        : null
    const [
      originStations,
      destinationStations,
      transferStations,
      shippingCustomers,
      receivingCustomers,
      cargoItems
    ] = await Promise.all([
      fetchStationMatches(draft.originStationName, 'shipping', targetTenantId),
      fetchStationMatches(draft.destinationStationName, 'arrival', targetTenantId),
      fetchStationMatches(draft.transferStationName, 'transfer', targetTenantId),
      fetchCustomerMatches(draft.shippingCustomerName, customerLookups, scopedCustomerOptions),
      fetchCustomerMatches(draft.receivingCustomerName, customerLookups, scopedCustomerOptions),
      mapWithConcurrency(draft.cargoItems ?? [], 3, (item, index) =>
        fetchCargoMatch(item.cargoName, index, cargoLookups, targetTenantId)
      )
    ])

    const shippingCustomer = createMatch(
      draft.shippingCustomerName,
      shippingCustomers,
      (item) => item.customerName
    )
    const receivingCustomer = createMatch(
      draft.receivingCustomerName,
      receivingCustomers,
      (item) => item.customerName
    )
    const [shippingAddress, receivingAddress] = await Promise.all([
      fetchAddressMatch(shippingCustomer.id, draft.shippingAddressDetail, 'shipping'),
      fetchAddressMatch(receivingCustomer.id, draft.receivingAddressDetail, 'receiving')
    ])

    return {
      originStation: createMatch(
        draft.originStationName,
        originStations,
        (item) => item.stationName
      ),
      destinationStation: createMatch(
        draft.destinationStationName,
        destinationStations,
        (item) => item.stationName
      ),
      transferStation: createMatch(
        draft.transferStationName,
        transferStations,
        (item) => item.stationName
      ),
      shippingCustomer,
      receivingCustomer,
      shippingAddress,
      receivingAddress,
      cargoItems
    }
  }

  async function fetchStationMatches(
    name: string | null | undefined,
    stationType: string,
    tenantId: string
  ): Promise<StationOption[]> {
    if (!trim(String(name ?? ''))) return []
    const { data, error } = await fetchStationOptions({
      keyword: String(name),
      stationType,
      tenantId
    })
    if (error) throw error
    return data ?? []
  }

  async function fetchCustomerMatches(
    name: string | null | undefined,
    lookups: Map<string, Promise<CustomerItem[]>>,
    scopedOptions: Promise<CustomerItem[]> | null
  ): Promise<CustomerItem[]> {
    const source = trim(String(name ?? ''))
    if (!source) return []
    if (scopedOptions) return await scopedOptions
    let lookup = lookups.get(source)
    if (!lookup) {
      lookup = fetchCustomerSelectorList({ keyword: source, from: 0, to: 9 }).then(
        ({ data, error }) => {
          if (error) throw error
          return data ?? []
        }
      )
      lookups.set(source, lookup)
    }
    return await lookup
  }

  async function fetchAddressMatch(
    customerId: string | undefined,
    address: string | null | undefined,
    addressType: Api.Tms.BasicData.CustomerAddressType
  ): Promise<AiAddressReferenceMatch> {
    const source = trim(String(address ?? ''))
    if (!source) return { status: 'empty' }
    if (!customerId) return { label: source, status: 'unmatched' }

    const { data, error } = await fetchCustomerAddressList({
      customerId,
      addressType,
      from: 0,
      to: 99
    })
    if (error) throw error
    const matched = findUniqueMatch(
      source,
      data ?? [],
      (item: CustomerAddress) => item.addressDetail
    )
    return matched?.id
      ? {
          id: matched.id,
          label: matched.addressDetail,
          status: 'matched',
          longitude: matched.longitude,
          latitude: matched.latitude
        }
      : { label: source, status: 'unmatched' }
  }

  async function fetchCargoMatch(
    name: string | null | undefined,
    index: number,
    lookups: Map<string, Promise<Cargo[]>>,
    tenantId: string
  ): Promise<AiCargoReferenceMatch> {
    const source = trim(String(name ?? ''))
    if (!source) return { index, status: 'empty' }

    let lookup = lookups.get(source)
    if (!lookup) {
      lookup = fetchCargoList({ keyword: source, tenantId, from: 0, to: 19 }).then(
        ({ data, error }) => {
          if (error) throw error
          return data ?? []
        }
      )
      lookups.set(source, lookup)
    }
    return {
      index,
      ...createMatch(source, await lookup, (item: Cargo) => item.cargoName)
    }
  }

  function createMatch<T extends { id?: string }>(
    source: string | null | undefined,
    candidates: T[],
    labelOf: (item: T) => string
  ): AiReferenceMatch {
    if (!normalizeMatchText(source)) return { status: 'empty' }
    const matched = findUniqueMatch(source, candidates, labelOf)
    return matched?.id
      ? { id: matched.id, label: labelOf(matched), status: 'matched' }
      : { label: String(source), status: 'unmatched' }
  }

  function findUniqueMatch<T>(
    source: string | null | undefined,
    candidates: T[],
    labelOf: (item: T) => string
  ): T | undefined {
    const normalizedSource = normalizeMatchText(source)
    if (!normalizedSource) return undefined

    const exact = candidates.filter(
      (item) => normalizeMatchText(labelOf(item)) === normalizedSource
    )
    const fuzzy = candidates.filter((item) => {
      const label = normalizeMatchText(labelOf(item))
      return (
        Boolean(label) && (label.includes(normalizedSource) || normalizedSource.includes(label))
      )
    })
    return exact.length === 1 ? exact[0] : fuzzy.length === 1 ? fuzzy[0] : undefined
  }

  function normalizeMatchText(value?: string | null): string {
    return trim(String(value ?? ''))
      .toLowerCase()
      .replace(/[\s,，。.;；:：()（）\-_/]/g, '')
  }

  return { resolveReferences }
}
