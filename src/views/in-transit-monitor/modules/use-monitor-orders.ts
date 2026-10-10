import { computed, watch, type Ref } from 'vue'
import { uniq } from 'lodash-es'
import {
  getVehicleImage,
  MONITOR_STATUS_DICT_CODE,
  REALTIME_WAYBILL_STATUSES,
  regionOptions,
  VEHICLE_TYPE_DICT_CODE
} from './monitor-config'
import type {
  AlertItem,
  GeoCoord,
  InTransitRecord,
  MonitorMode,
  MonitorOrder,
  ScreenState,
  TransitStatus
} from './monitor-types'
import { canViewField } from '@/utils/field-permission'
import { formatArtValue, formatPercentValue } from '@/utils/ui/format'

const maskPhone = (value?: string | null): string => {
  const phone = String(value ?? '').trim()
  if (!phone) return '未登记电话'
  if (phone.length <= 7) return `${phone.slice(0, 2)}***${phone.slice(-2)}`
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}
import {
  estimateDistanceKm,
  formatDateTime,
  formatRefreshTime,
  formatText,
  getDelayText,
  getMonitorRecordId,
  getAverageProgress,
  getDrivingRouteKey,
  isDelayed,
  normalizeVehicleTypeCode,
  percentOf,
  resolveArrivalPerformance,
  resolveActualTrackPath,
  resolveCurrentLabel,
  resolveEndpointGeo,
  resolveProgress,
  resolveSpeed,
  resolveTransitStatus,
  toGeoCoord
} from './monitor-utils'

interface UseMonitorOrdersOptions {
  activeMode: Ref<MonitorMode>
  drivingRoutePaths: ReadonlyMap<string, GeoCoord[]>
  getDictOptions: (dictCode: string) => readonly Api.DataCenter.DictListItem[]
  screen: ScreenState
}

export function useMonitorOrders(options: UseMonitorOrdersOptions) {
  const monitorStatusOptions = computed<Api.DataCenter.DictListItem[]>(() => [
    ...options.getDictOptions(MONITOR_STATUS_DICT_CODE)
  ])

  const monitorOrders = computed<MonitorOrder[]>(() =>
    options.screen.orders.map(createMonitorOrder)
  )

  const realtimeOrders = computed<MonitorOrder[]>(() =>
    monitorOrders.value.filter(isRealtimeMonitorOrder)
  )

  const vehicleOrders = computed<MonitorOrder[]>(() => {
    const ordersByPlate = new Map<string, MonitorOrder>()
    monitorOrders.value.forEach((item) => {
      if (item.plateNo === '未配车') return
      const existing = ordersByPlate.get(item.plateNo)
      if (!existing || getVehicleOrderPriority(item) > getVehicleOrderPriority(existing)) {
        ordersByPlate.set(item.plateNo, item)
      }
    })
    return [...ordersByPlate.values()]
  })

  const modeOrders = computed<MonitorOrder[]>(() => {
    if (options.activeMode.value === 'realtime') return realtimeOrders.value
    if (options.activeMode.value === 'vehicle') return vehicleOrders.value
    return monitorOrders.value
  })

  const filteredOrders = computed<MonitorOrder[]>(() => {
    const keyword = options.screen.keyword.trim().toLowerCase()

    return realtimeOrders.value.filter((item) => {
      const matchesStatus = !options.screen.status || item.status === options.screen.status
      const matchesRegion = matchesSelectedRegion(item)
      const matchesKeyword =
        !keyword ||
        [item.plateNo, item.orderNo, item.driverName, item.driverPhone, item.routeName]
          .join(' ')
          .toLowerCase()
          .includes(keyword)

      return matchesStatus && matchesRegion && matchesKeyword
    })
  })

  const activeOrder = computed<MonitorOrder | undefined>(() => {
    return (
      modeOrders.value.find((item) => item.id === options.screen.selectedOrderId) ??
      (options.activeMode.value === 'realtime' ? filteredOrders.value[0] : modeOrders.value[0])
    )
  })

  const mapRouteOrder = computed<MonitorOrder | undefined>(() => {
    const active = activeOrder.value
    return active && active.status !== 'pending' ? active : undefined
  })

  const averageProgress = computed(() => getAverageProgress(modeOrders.value))

  const overview = computed(() => {
    const orders = modeOrders.value
    const transporting = orders.filter(isRealtimeMonitorOrder).length
    const delayed = orders.filter((item) => item.delayed).length
    const routeCount = uniq(orders.map((item) => item.routeName)).length
    const vehicleCount = uniq(
      orders.filter((item) => item.plateNo !== '未配车').map((item) => item.plateNo)
    ).length
    const arrivals = monitorOrders.value.filter((item) => item.arrivalDelayed !== null)
    const total = orders.length

    return {
      delayedCount: delayed,
      onTimeRate: arrivals.length
        ? Math.round(
            (arrivals.filter((item) => !item.arrivalDelayed).length / arrivals.length) * 100
          )
        : null,
      arrivalCount: arrivals.length,
      routeCount,
      orderCount: total,
      transporting,
      vehicleCount
    }
  })

  const overviewBars = computed(() => [
    {
      color: '#4c7dff',
      label: '在途运单',
      percent: percentOf(overview.value.transporting, Math.max(overview.value.orderCount, 1)),
      value: `${overview.value.transporting}/${overview.value.orderCount}`
    },
    {
      color: '#23d18b',
      label: '到达准时率',
      percent: overview.value.onTimeRate ?? 0,
      value: formatPercentValue(overview.value.onTimeRate, { fractionDigits: 0 })
    },
    {
      color: '#ff9f43',
      label: '平均进度（含估算）',
      percent: averageProgress.value ?? 0,
      value: formatPercentValue(averageProgress.value, { fractionDigits: 0 })
    }
  ])

  const alertItems = computed<AlertItem[]>(() => {
    const delayedAlerts = realtimeOrders.value
      .filter((item) => item.delayed)
      .map((item) => ({
        content: `${item.orderNo} 预计到达 ${formatDateTime(item.plannedArrivalTime)}`,
        key: `delay-${item.id}`,
        level: 'danger' as const,
        time: formatRefreshTime(options.screen.lastRefreshTime),
        title: `${item.plateNo} 预计到达超时`
      }))

    const missingVehicleAlerts = realtimeOrders.value
      .filter((item) => item.plateNo === '未配车')
      .map((item) => ({
        content: `${item.orderNo} 已进入在途池，请补充配载车辆信息`,
        key: `vehicle-${item.id}`,
        level: 'warning' as const,
        time: formatRefreshTime(options.screen.lastRefreshTime),
        title: '车辆信息缺失'
      }))

    return [...delayedAlerts, ...missingVehicleAlerts].slice(0, 6)
  })

  watch(filteredOrders, (items) => {
    if (options.activeMode.value !== 'realtime' || !items.length) return
    if (!items.some((item) => item.id === options.screen.selectedOrderId)) {
      options.screen.selectedOrderId = items[0].id
    }
  })

  watch(modeOrders, (items) => {
    if (!items.some((item) => item.id === options.screen.selectedOrderId)) {
      options.screen.selectedOrderId = items[0]?.id
    }
  })

  function createMonitorOrder(row: InTransitRecord): MonitorOrder {
    const id = getMonitorRecordId(row)
    const order = row.order
    const origin = formatText(row.originCity || order?.originStation)
    const destination = formatText(row.destinationCity || order?.destinationStation)
    const originGeo = resolveEndpointGeo(
      row,
      'origin',
      row.shipperLongitude ?? order?.shippingLongitude,
      row.shipperLatitude ?? order?.shippingLatitude,
      origin
    )
    const destinationGeo = resolveEndpointGeo(
      row,
      'destination',
      row.receiverLongitude ?? order?.receivingLongitude,
      row.receiverLatitude ?? order?.receivingLatitude,
      destination
    )
    const delayed = isDelayed(row)
    const status = resolveTransitStatus(row, delayed)
    const arrivalPerformance = resolveArrivalPerformance(row)
    const progress = resolveProgress(row, status)
    const routeKey = getDrivingRouteKey({ id, originGeo, destinationGeo })
    const routePath = routeKey ? (options.drivingRoutePaths.get(routeKey) ?? []) : []
    const actualTrackPath = resolveActualTrackPath(row)
    const currentGeo =
      toGeoCoord(row.currentLongitude, row.currentLatitude) ?? actualTrackPath.at(-1)
    const passedPath = currentGeo ? [...actualTrackPath, currentGeo] : actualTrackPath
    const distance =
      originGeo && destinationGeo ? estimateDistanceKm(originGeo, destinationGeo) : null
    const vehicleTypeCode = normalizeVehicleTypeCode(
      row.vehicle?.vehicleType || order?.dispatchVehicleType
    )
    const vehicleTypeLabel = getDictLabel(
      VEHICLE_TYPE_DICT_CODE,
      vehicleTypeCode,
      vehicleTypeCode || '运输车辆'
    )
    const cargoWeightText =
      row.cargoWeightTon !== null && row.cargoWeightTon !== undefined
        ? `${formatArtValue(row.cargoWeightTon, 'number')} 吨`
        : `${formatArtValue(order?.cargoWeightTotal, 'number')} kg`

    return {
      actualTrackPath,
      arrivalDelayed: arrivalPerformance.delayed,
      arrivalText: arrivalPerformance.text,
      cargoSummary: [
        {
          label: '货物类型',
          value:
            row.cargoName || order?.cargoItems?.map((item) => item.cargoName).find(Boolean) || '-'
        },
        {
          label: '总数量',
          value: `${formatArtValue(row.cargoQuantity ?? order?.cargoQuantityTotal, 'number', { numberFormat: { maximumFractionDigits: 0 } })} 件`
        },
        { label: '总重量', value: cargoWeightText },
        {
          label: '总体积',
          value: `${formatArtValue(row.cargoVolumeM3 ?? order?.cargoVolumeTotal, 'number')} 方`
        }
      ],
      completedKm:
        distance !== null && progress !== null ? Math.round(distance * (progress / 100)) : null,
      currentLabel: currentGeo ? 'GPS 位置' : resolveCurrentLabel(row),
      delayed,
      delayText: getDelayText(row.plannedUnloadTime ?? order?.plannedArrivalTime),
      destination,
      destinationGeo,
      driverName: formatText(row.driver?.driverName || order?.dispatchDriverName, '未派司机'),
      driverPhone: maskPhone(row.driver?.phone || order?.dispatchDriverPhone),
      driverPhoneVisible: canViewField(row.fieldAccess ?? order?.fieldAccess, 'driverPhone'),
      id,
      currentGeo,
      orderNo: formatText(row.waybillNo || order?.orderNo),
      origin,
      originGeo,
      passedPath,
      plannedArrivalTime: row.plannedUnloadTime ?? order?.plannedArrivalTime,
      plannedDepartureTime: row.plannedLoadTime ?? order?.plannedDepartureTime,
      plateNo: formatText(row.vehicle?.plateNo || order?.dispatchPlateNo, '未配车'),
      progress,
      progressLabel: ['transporting', 'delayed'].includes(status) ? '时间估算进度' : '运输进度',
      remainingKm:
        distance !== null && progress !== null
          ? Math.max(0, Math.round(distance * (1 - progress / 100)))
          : null,
      remainingPath: routePath,
      routeName: [origin, order?.transferStation, destination].filter(Boolean).join(' - '),
      routePath,
      source: row,
      speed: resolveSpeed(row),
      status,
      statusColor: getMonitorStatusColor(status),
      statusLabel: getMonitorStatusLabel(status),
      totalKm: distance,
      trackSource:
        actualTrackPath.length > 1 ? 'gps' : routePath.length > 1 ? 'planned' : 'unknown',
      trackSourceLabel:
        actualTrackPath.length > 1
          ? 'GPS 实际轨迹'
          : routePath.length > 1
            ? '规划线路'
            : '暂无轨迹数据',
      vehicleImage: getVehicleImage(vehicleTypeCode),
      vehicleType: vehicleTypeCode,
      vehicleTypeCode,
      vehicleTypeLabel
    }
  }

  function matchesSelectedRegion(item: MonitorOrder): boolean {
    if (!options.screen.region) return true
    const region = regionOptions.find((option) => option.value === options.screen.region)
    if (!region) return true

    const routeText = [item.origin, item.destination, item.routeName, item.currentLabel].join('')
    return region.keywords.some((keyword) => routeText.includes(keyword))
  }

  function isRealtimeMonitorOrder(item: MonitorOrder): boolean {
    const waybillStatus = String(item.source.status ?? '')
      .trim()
      .toLowerCase()
    return REALTIME_WAYBILL_STATUSES.has(waybillStatus)
  }

  function getVehicleOrderPriority(item: MonitorOrder): number {
    if (item.status === 'delayed') return 4
    if (item.status === 'transporting') return 3
    if (item.status === 'pending') return 2
    return 1
  }

  function getPreferredMonitorRecordId(rows: InTransitRecord[]): string | undefined {
    const preferred = rows.find((row) => {
      const status = resolveTransitStatus(row, isDelayed(row))
      return ['transporting', 'delayed'].includes(status)
    })
    const row = preferred ?? rows.find((item) => resolveTransitStatus(item, false) === 'arrived')
    return row ? getMonitorRecordId(row) : rows[0] ? getMonitorRecordId(rows[0]) : undefined
  }

  function getMonitorStatusItem(status: TransitStatus) {
    return monitorStatusOptions.value.find((item) => String(item.value) === status)
  }

  function getMonitorStatusLabel(status: TransitStatus): string {
    return getMonitorStatusItem(status)?.label || '状态未加载'
  }

  function getMonitorStatusColor(status: TransitStatus): string {
    return getMonitorStatusItem(status)?.color || '#8fb2c6'
  }

  function getDictLabel(dictCode: string, value?: string | number | null, fallback = '-'): string {
    const normalizedValue = String(value ?? '').trim()
    if (!normalizedValue) return fallback

    const dictItem = options
      .getDictOptions(dictCode)
      .find(
        (item) => String(item.value) === normalizedValue || String(item.code) === normalizedValue
      )
    return dictItem?.label || dictItem?.name || fallback
  }

  return {
    activeOrder,
    alertItems,
    filteredOrders,
    getPreferredMonitorRecordId,
    mapRouteOrder,
    modeOrders,
    monitorOrders,
    monitorStatusOptions,
    overview,
    overviewBars,
    realtimeOrders
  }
}
