import TreeUtils from '@/utils/tree'
import type { RegionOption } from '@/api/region-options'

export interface RecognizedAddress {
  contactName?: string
  contactPhone?: string
  partyName?: string
  regionPath?: string[]
  regionAdcode?: string
  addressDetail?: string
  addressShortName?: string
}

const phonePattern = /(?:\+?86[-\s]?)?(1[3-9]\d{9}|0\d{2,3}[-\s]?\d{7,8})/
const companyPattern =
  /(?:[\p{Script=Han}A-Za-z0-9（）()·-]{2,}?(?:有限责任公司|股份有限公司|有限公司|集团公司|公司|工厂|学校|医院))/u
const regionTree = new TreeUtils({ idKey: 'code', childrenKey: 'children' })

/** Parse pasted or spoken text locally; the caller reviews all detected fields before saving. */
export function recognizeAddressText(text: string, regions: RegionOption[]): RecognizedAddress {
  const source = text.replace(/[\u00a0\u3000]/g, ' ').trim()
  if (!source) return {}

  const phone = source.match(phonePattern)?.[1]?.replace(/[\s-]/g, '')
  const withoutPhone = (phone ? source.replace(phonePattern, ' ') : source).replace(
    /(?:姓名|联系人|联系电话|电话|手机|地址|单位|公司)[：:]/gu,
    (label) => `，${label}`
  )
  const parts = withoutPhone
    .split(/[，,；;\n]+/)
    .map((part) =>
      part.replace(/^(?:姓名|联系人|联系电话|电话|手机|地址|单位|公司)[：:\s]*/u, '').trim()
    )
    .filter(Boolean)
  const addressPart = parts.find((part) => /(?:省|市|自治区).+(?:区|县|旗|市)/u.test(part))
  const companyPart =
    parts.find((part) => companyPattern.test(part) && part !== addressPart) ||
    addressPart?.split(/\s+/).find((part) => companyPattern.test(part))
  const partyName = companyPart?.match(companyPattern)?.[0]
  let contactName = parts.find(
    (part) => part !== addressPart && part !== companyPart && /^[\p{Script=Han}·]{2,8}$/u.test(part)
  )

  const result: RecognizedAddress = { contactName, contactPhone: phone, partyName }
  if (!addressPart) return result

  const flat = regionTree.treeToList(regions, { includeParentChain: true }) as Array<
    RegionOption & { __parentChain?: string[] }
  >
  const byCode = new Map(flat.map((item) => [item.code, item]))
  const candidate = flat
    .filter((item) => (item.__parentChain?.length ?? 0) === 2 && addressPart.includes(item.name))
    .map((district) => {
      const path = [...(district.__parentChain ?? []), district.code ?? '']
      const names = path.map((code) => byCode.get(code)?.name ?? '')
      const provinceMatches = addressPart.includes(names[0])
      const cityMatches = names[1] === '市辖区' || addressPart.includes(names[1])
      return {
        district,
        names,
        provinceMatches,
        cityMatches,
        score: Number(provinceMatches) * 2 + Number(cityMatches)
      }
    })
    .filter((item) => item.provinceMatches && item.cityMatches)
    .sort(
      (left, right) =>
        right.score - left.score || right.names.join('').length - left.names.join('').length
    )[0]

  if (!candidate) {
    result.addressDetail = addressPart
    result.addressShortName = addressPart.slice(0, 20)
    return result
  }

  const { names, district } = candidate
  const addressText = partyName ? addressPart.replace(partyName, '').trim() : addressPart
  const regionPattern = new RegExp(names.filter((name) => name !== '市辖区').join('\\s*'))
  const regionMatch = regionPattern.exec(addressText)
  const leadingText = regionMatch ? addressText.slice(0, regionMatch.index).trim() : ''
  if (!contactName && /^[\p{Script=Han}·]{2,8}$/u.test(leadingText)) contactName = leadingText
  const detail = (
    regionMatch ? addressText.slice(regionMatch.index + regionMatch[0].length) : addressText
  )
    .replace(/^[\s，,：:]+/u, '')
    .trim()
  result.contactName = contactName
  result.regionPath = names
  result.regionAdcode = district.code
  result.addressDetail = detail || addressPart
  result.addressShortName = (detail || addressPart).slice(0, 20)
  return result
}
