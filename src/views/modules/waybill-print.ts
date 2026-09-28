import { createApp } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { escape, uniq } from 'lodash-es'
import { formatCompactNumberValue, formatDateTimeValue } from '@/utils/ui/format'
import defaultLogoUrl from '@/assets/images/common/logo.webp?url'
import printStyles from './waybill-print.css?inline'

type OrderRecord = Api.Tms.Order.OrderRecord
type WaybillRecord = Api.Tms.Waybill.WaybillRecord
type CargoItem = Api.Tms.Order.CargoItem

export interface WaybillPrintOptions {
  brandName: string
  logoUrl?: string | null
  detailUrl?: string
  copies?: number
  label: (dictCode: string, value?: string | null) => string
}

const text = (value: string | number | null | undefined, fallback = '—'): string =>
  escape(String(value ?? '').trim() || fallback)

const number = (value: string | number | null | undefined, digits = 2): string => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  return Number.isFinite(numeric) ? escape(formatCompactNumberValue(numeric, digits)) : text(value)
}

const date = (value?: string | null): string =>
  escape(formatDateTimeValue(value, { emptyText: '—' }))

const field = (label: string, value: string): string =>
  `<div class="print-field"><span>${label}</span><strong>${value}</strong></div>`

const line = (label: string, value: string): string =>
  `<div class="print-line"><span>${label}</span><strong>${value}</strong></div>`

type CargoTableKind = 'order' | 'loaded'

const cargoRows = (items: CargoItem[], kind: CargoTableKind): string => {
  if (!items.length) {
    return `<tr><td colspan="${kind === 'order' ? 12 : 11}" class="empty-row">暂无货物明细</td></tr>`
  }
  return items
    .map(
      (item, index) => `<tr>
        <td>${index + 1}</td>
        <td>${text(item.cargoCode)}</td>
        <td class="align-left">${text(item.cargoName)}</td>
        <td>${text(item.specModel)}</td>
        ${
          kind === 'order'
            ? `<td>${number(item.weightKg)}</td><td>${number(item.volumeM3, 3)}</td><td>${number(item.quantity, 0)}</td>`
            : `<td>${number(item.quantity, 0)}</td><td>${number(item.weightKg)}</td><td>${number(item.volumeM3, 3)}</td>`
        }
        <td>—</td><td>—</td><td>—</td>
        ${kind === 'order' ? '<td>—</td>' : ''}<td>—</td>
      </tr>`
    )
    .join('')
}

const cargoTable = (items: CargoItem[], kind: CargoTableKind): string => `
  <table class="cargo-table">
    <colgroup>
      <col style="width:4%" /><col style="width:10%" /><col style="width:17%" />
      <col style="width:7%" /><col style="width:9%" /><col style="width:9%" />
      <col style="width:7%" /><col style="width:8%" /><col style="width:8%" />
      <col style="width:9%" />${kind === 'order' ? '<col style="width:7%" />' : ''}
      <col style="width:${kind === 'order' ? 5 : 12}%" />
    </colgroup>
    <thead><tr>
      <th>序号</th><th>物品编码</th><th>物品名称</th><th>规格</th>
      ${
        kind === 'order'
          ? '<th>重量 kg</th><th>体积 m³</th><th>物品数</th>'
          : '<th>物品数量</th><th>总重量 kg</th><th>总体积 m³</th>'
      }
      <th>实签数</th><th>异常数</th><th>异常分类</th>
      ${kind === 'order' ? '<th>异常描述</th>' : ''}<th>批次</th>
    </tr></thead>
    <tbody>${cargoRows(items, kind)}</tbody>
  </table>`

function resolveLogoUrl(candidate?: string | null): string {
  if (!candidate?.trim()) return defaultLogoUrl
  try {
    const url = new URL(candidate, window.location.href)
    return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : defaultLogoUrl
  } catch {
    return defaultLogoUrl
  }
}

function qrMarkup(url?: string): string {
  if (!url) return '<span class="qr-empty">保存后生成<br />查看二维码</span>'
  const mount = document.createElement('div')
  try {
    const app = createApp(QrcodeVue, { value: url, size: 82, renderAs: 'svg', level: 'M' })
    app.mount(mount)
    const svg = mount.querySelector('svg')?.outerHTML ?? ''
    app.unmount()
    return svg || '<span class="qr-empty">二维码暂不可用</span>'
  } catch {
    return '<span class="qr-empty">二维码暂不可用</span>'
  }
}

function brandHeader(
  options: WaybillPrintOptions,
  companyName: string,
  subtitle: string,
  codeLabel: string,
  code: string
): string {
  const logo = escape(resolveLogoUrl(options.logoUrl))
  const qr = qrMarkup(options.detailUrl)
  return `<header class="document-header">
    <div class="document-brand">
      <img src="${logo}" alt="${text(options.brandName)} Logo" width="44" height="44" />
      <strong>${text(options.brandName)}</strong>
    </div>
    <div class="document-heading"><h1>${text(companyName)}</h1><p>${subtitle}</p></div>
    <div class="document-code"><div class="qr-code">${qr}</div><small>${codeLabel}<br /><b>${text(code)}</b></small></div>
  </header>`
}

function orderSheet(order: OrderRecord, options: WaybillPrintOptions): string {
  const config = order.orderConfig
  const items = order.cargoItems ?? []
  const contracts = uniq(items.map((item) => item.sourceContractNo?.trim()).filter(Boolean))
  const company = order.shippingCustomer?.customerName || order.shippingContactName
  const documentNo = order.orderNo?.trim() || '未保存草稿'
  const isDraft = !order.id || !order.orderNo?.trim()
  return `<article class="print-sheet order-sheet">
    ${brandHeader(options, company, '订 单 · 货 物 托 运 凭 证', '运单号', documentNo)}
    <div class="header-rule"></div>
    <div class="document-meta">
      <span>合同编号：<strong>${text(contracts.join('、'))}</strong></span>
      <span>运输线路：<strong>${text(order.originStation)} → ${text(order.destinationStation)}</strong></span>
    </div>
    ${isDraft ? '<p class="draft-note">未保存预览 · 正式运单号将在保存后生成</p>' : ''}
    <section class="contact-grid" aria-label="收发货信息">
      <div class="contact-card"><h2>发货信息</h2>
        ${line('发货方', text(order.shippingCustomer?.customerName || order.shippingContactName))}
        ${line('联系人', text(order.shippingContactName))}
        ${line('联系电话', text(order.shippingContactPhone))}
        ${line('发货时间', date(order.departureAt))}
        ${line('发货地址', text(order.shippingAddressDetail))}
      </div>
      <div class="contact-card"><h2>收货信息</h2>
        ${line('收货方', text(order.receivingCustomer?.customerName || order.receivingContactName))}
        ${line('联系人', text(order.receivingContactName))}
        ${line('联系电话', text(order.receivingContactPhone))}
        ${line('预计到货', date(order.arrivalAt))}
        ${line('收货地址', text(order.receivingAddressDetail))}
      </div>
    </section>
    <section class="facts-section"><h2>运输信息</h2><div class="facts-grid">
      ${field('配送方式', text(options.label('tmsOrderDeliveryMethod', order.deliveryMethod)))}
      ${field('运输模式', text(options.label('tmsOrderTransportMode', order.transportMode)))}
      ${field('装载类型', text(options.label('tmsOrderLoadType', config?.loadType)))}
      ${field('计费模式', text(options.label('tmsOrderBillingMode', config?.billingMode)))}
      ${field('计费单位', text(options.label('tmsCargoUnit', config?.billingUnit)))}
      ${field('货物分类', text(options.label('tmsOrderCargoCategory', config?.cargoCategory)))}
      ${field('包装方式', text(options.label('tmsOrderPackaging', config?.packaging)))}
      ${field('物品总价值', number(order.declaredValue))}
      ${field('总数量', number(order.cargoQuantityTotal, 0))}
      ${field('总重量', `${number(order.cargoWeightTotal)} kg`)}
      ${field('总体积', `${number(order.cargoVolumeTotal, 3)} m³`)}
      ${field('应收运费', `¥ ${number(order.totalFee)}`)}
    </div>${order.orderRemark ? `<p class="remarks">备注：${text(order.orderRemark)}</p>` : ''}</section>
    <section class="cargo-section"><h2>货物信息</h2>${cargoTable(items, 'order')}
      <div class="cargo-total"><span>合计</span><strong>数量 ${number(order.cargoQuantityTotal, 0)}</strong>
        <strong>重量 ${number(order.cargoWeightTotal)} kg</strong>
        <strong>体积 ${number(order.cargoVolumeTotal, 3)} m³</strong></div>
    </section>
    <section class="print-notice"><h2>注意事项</h2>
      <p>请在交接时核对货物名称、规格、数量和包装；发现差异请在签收栏如实记录并留存凭证。</p>
    </section>
    <footer class="signature-row"><span>发货方：________________</span><span>承运方：________________</span><span>收货单位及经办人：________________</span></footer>
  </article>`
}

function loadedSheet(waybill: WaybillRecord, options: WaybillPrintOptions): string {
  const config = waybill.orderConfig
  const items = waybill.cargoItems ?? []
  const contracts = uniq(items.map((item) => item.sourceContractNo?.trim()).filter(Boolean))
  const company = waybill.shippingCustomer?.customerName || waybill.shippingContactName
  return `<article class="print-sheet loaded-sheet">
    <div class="print-date">打印日期：${date(new Date().toISOString())}</div>
    ${brandHeader(options, company, '运 单 · 交 接 凭 证', '运单编号', waybill.waybillNo || waybill.orderNo)}
    <div class="header-rule"></div>
    <div class="document-meta"><span>合同编号：<strong>${text(contracts.join('、'))}</strong></span>
      ${waybill.waybillNo && waybill.waybillNo !== waybill.orderNo ? `<span>原始运单号：<strong>${text(waybill.orderNo)}</strong></span>` : ''}</div>
    <div class="loaded-route"><div><small>发货地址</small><strong>${text(waybill.shippingAddressDetail)}</strong></div>
      <span>→</span><div><small>收货地址</small><strong>${text(waybill.receivingAddressDetail)}</strong></div></div>
    <section class="loaded-contact"><h2>发货方</h2><div class="loaded-fields">
      ${field('名称', text(waybill.shippingCustomer?.customerName || waybill.shippingContactName))}
      ${field('发货时间', date(waybill.plannedDepartureTime || waybill.departureAt))}
      ${field('发货联系人', text(waybill.shippingContactName))}
      ${field('联系电话', text(waybill.shippingContactPhone))}
    </div></section>
    <section class="loaded-contact"><h2>收货方</h2><div class="loaded-fields">
      ${field('名称', text(waybill.receivingCustomer?.customerName || waybill.receivingContactName))}
      ${field('预计到货', date(waybill.plannedArrivalTime || waybill.arrivalAt))}
      ${field('收货联系人', text(waybill.receivingContactName))}
      ${field('联系电话', text(waybill.receivingContactPhone))}
    </div></section>
    <section class="loaded-facts"><div class="facts-grid">
      ${field('是否保价', config?.insured ? '已保价' : '不保价')}
      ${field('运输模式', text(options.label('tmsOrderTransportMode', waybill.transportMode)))}
      ${field('配送方式', text(options.label('tmsOrderDeliveryMethod', waybill.deliveryMethod)))}
      ${field('计费模式', text(options.label('tmsOrderBillingMode', config?.billingMode)))}
      ${field('计价单位', text(options.label('tmsCargoUnit', config?.billingUnit)))}
      ${field('货物分类', text(options.label('tmsOrderCargoCategory', config?.cargoCategory)))}
      ${field('包装方式', text(options.label('tmsOrderPackaging', config?.packaging)))}
      ${field('总体积', `${number(waybill.cargoVolumeTotal, 3)} m³`)}
      ${field('总重量', `${number(waybill.cargoWeightTotal)} kg`)}
      ${field('总数量', number(waybill.cargoQuantityTotal, 0))}
      ${field('物品总价值', `¥ ${number(waybill.declaredValue)}`)}
      ${field('配载车辆', text(waybill.dispatchPlateNo))}
    </div><p class="remarks">备注：${text(waybill.orderRemark)}</p></section>
    <section class="cargo-section"><h2>货物明细</h2>${cargoTable(items, 'loaded')}
      <div class="cargo-total"><span>合计</span><strong>数量 ${number(waybill.cargoQuantityTotal, 0)}</strong>
        <strong>重量 ${number(waybill.cargoWeightTotal)} kg</strong>
        <strong>体积 ${number(waybill.cargoVolumeTotal, 3)} m³</strong></div>
    </section>
    <section class="print-notice"><h2>交接须知</h2>
      <p>一、发货方应如实填写货物信息并妥善包装，特殊货物应提前告知承运方。</p>
      <p>二、承运方应按约定线路与时效运输；装卸和交接异常应当场记录并留存证据。</p>
      <p>三、收货方请核对实收数量及货损情况，确认无误后签收。</p>
    </section>
    <footer class="signature-row"><span>核对人：________________</span>
      <span>签收人：${text(waybill.driverWaybillSignedBy, '________________')}</span>
      <span>签收时间：${date(waybill.driverWaybillSignedAt || waybill.signedAt)}</span></footer>
  </article>`
}

function openPrintWindow(title: string, sheets: string, landscape: boolean): boolean {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return false
  printWindow.opener = null
  printWindow.addEventListener(
    'load',
    () => {
      const images = Array.from(printWindow.document.images)
      void Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) return resolve()
              image.addEventListener('load', () => resolve(), { once: true })
              image.addEventListener('error', () => resolve(), { once: true })
            })
        )
      ).then(() => {
        void printWindow.document.fonts.ready.then(() => {
          printWindow.focus()
          printWindow.print()
        })
      })
    },
    { once: true }
  )
  printWindow.document.open()
  printWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${text(title)}</title><style>@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
    ${printStyles}</style></head><body class="${landscape ? 'landscape' : 'portrait'}">${sheets}</body></html>`)
  printWindow.document.close()
  return true
}

export function printOrderWaybill(order: OrderRecord, options: WaybillPrintOptions): boolean {
  const copies = Math.min(Math.max(Math.floor(options.copies ?? 1), 1), 100)
  const sheets = Array.from({ length: copies }, () => orderSheet(order, options)).join('')
  return openPrintWindow(`订单运单 ${order.orderNo || '预览'}`, sheets, false)
}

export function printLoadedWaybill(waybill: WaybillRecord, options: WaybillPrintOptions): boolean {
  return openPrintWindow(
    `运单 ${waybill.waybillNo || waybill.orderNo}`,
    loadedSheet(waybill, options),
    true
  )
}
