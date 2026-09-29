<template>
  <div class="waybill-fee-panel">
    <ArtSectionCard
      v-if="canViewFreight || canViewSettlement"
      class="waybill-fee-panel__card"
      preserve-content-structure
      title="运费与收款"
      subtitle="执行运费和订单收款按不同口径展示，不与下方申报费用相加"
    >
      <div class="waybill-fee-panel__totals">
        <div v-if="canViewFreight" class="waybill-fee-panel__total is-primary">
          <span>执行运费</span>
          <strong>{{ money(waybill.freightAmount ?? waybill.order?.totalFee) }}</strong>
          <small>{{ isAllocated ? '按原始运输单分摊' : '当前运单运费' }}</small>
        </div>
        <div v-if="canViewSettlement" class="waybill-fee-panel__total">
          <span>应收 / 付款合计</span>
          <strong>{{ money(waybill.order?.paymentTotal) }}</strong>
          <small>{{ waybill.order ? '关联订单收款口径' : '当前执行单无独立收款单' }}</small>
        </div>
      </div>

      <template v-if="canViewFreight && isAllocated">
        <ArtSectionTitle>原始运输单运费分摊</ArtSectionTitle>
        <p class="waybill-fee-panel__hint">
          合并、拆分运单仅展示本执行单的分摊运费；原始订单的其他收费项目请进入对应订单查看。
        </p>
        <div v-if="waybill.sources?.length" class="waybill-fee-panel__source-list">
          <div v-for="source in waybill.sources" :key="source.id" class="waybill-fee-panel__source">
            <RouterLink :to="{ name: 'TmsOrderDetail', params: { id: source.orderId } }">
              {{ source.orderNo }}
            </RouterLink>
            <span :title="source.customerName || undefined">{{
              source.customerName || '未关联客户'
            }}</span>
            <strong>{{ money(source.freightAmount) }}</strong>
          </div>
        </div>
      </template>
      <template v-else-if="canViewFreight && waybill.order">
        <ArtSectionTitle>订单收费项目</ArtSectionTitle>
        <dl class="waybill-fee-panel__charge-grid">
          <div v-for="item in chargeItems" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ money(item.value) }}</dd>
          </div>
        </dl>
        <p v-if="waybill.order.declaredValue != null" class="waybill-fee-panel__hint">
          声明货值 {{ money(waybill.order.declaredValue) }} 为保价依据，不计入收费合计。
        </p>
      </template>

      <template v-if="canViewSettlement && waybill.order && !isAllocated">
        <ArtSectionTitle>收款分配</ArtSectionTitle>
        <dl class="waybill-fee-panel__charge-grid">
          <div v-for="item in paymentItems" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ money(item.value) }}</dd>
          </div>
        </dl>
      </template>
    </ArtSectionCard>

    <ArtSectionCard
      class="waybill-fee-panel__card"
      preserve-content-structure
      title="费用上报"
      subtitle="汇总司机端上报及 Web 端录入的运单费用"
      :empty="!waybill.costs.length"
      empty-title="当前运单暂无费用上报"
      empty-description="司机端和 Web 端新增的费用会在这里统一显示。"
    >
      <template #actions>
        <span v-if="waybill.costs.length" class="waybill-fee-panel__count">
          司机端 {{ driverCostCount }} 笔 · Web 端 {{ webCostCount }} 笔
          <template v-if="otherCostCount"> · 其他来源 {{ otherCostCount }} 笔 </template>
        </span>
      </template>
      <div v-if="waybill.costs.length" class="waybill-fee-panel__cost-content">
        <div class="waybill-fee-panel__cost-summary">
          <div>
            <span>费用单</span>
            <strong>{{ waybill.costs.length }} 笔</strong>
          </div>
          <div>
            <span>申报金额合计</span>
            <strong>{{ costTotal === null ? '***' : money(costTotal) }}</strong>
          </div>
          <p v-if="costTotal === null">部分费用金额受字段权限保护，合计不予展示。</p>
        </div>

        <ol class="waybill-fee-panel__cost-list">
          <li v-for="cost in waybill.costs" :key="cost.id" class="waybill-fee-panel__cost">
            <div class="waybill-fee-panel__cost-heading">
              <div class="waybill-fee-panel__cost-identity">
                <span class="waybill-fee-panel__cost-icon">
                  <ArtSvgIcon icon="ri:receipt-line" aria-hidden="true" />
                </span>
                <div>
                  <div class="waybill-fee-panel__cost-title">
                    <strong v-if="cost.expenseItem?.itemName">{{
                      cost.expenseItem.itemName
                    }}</strong>
                    <ArtDictDisplay
                      v-else
                      dict-code="tmsWaybillCostType"
                      :value="cost.costType"
                      display="text"
                    />
                    <ElTag
                      size="small"
                      :type="cost.sourceType === 'driver_report' ? 'success' : 'info'"
                    >
                      {{ sourceLabel(cost.sourceType) }}
                    </ElTag>
                  </div>
                  <p>{{ cost.costNo || '暂无费用单号' }} · {{ date(cost.occurredOn) }}</p>
                </div>
              </div>
              <div class="waybill-fee-panel__cost-status">
                <strong v-if="canViewField(cost.fieldAccess, 'costAmounts')">
                  {{ costAmount(cost) }}
                </strong>
                <ArtDictDisplay
                  dict-code="tmsCostAuditStatus"
                  :value="cost.auditStatus"
                  display="tag"
                />
                <ArtDictDisplay
                  dict-code="tmsWaybillCostSettlementStatus"
                  :value="cost.settlementStatus"
                  display="tag"
                />
              </div>
            </div>

            <dl class="waybill-fee-panel__facts">
              <div v-for="fact in costFacts(cost)" :key="fact.label">
                <dt>{{ fact.label }}</dt>
                <dd :title="fact.value">{{ fact.value }}</dd>
              </div>
            </dl>
            <p v-if="cost.remark" class="waybill-fee-panel__note">费用说明：{{ cost.remark }}</p>
            <p v-if="cost.reviewRemark" class="waybill-fee-panel__note">
              审核意见：{{ cost.reviewRemark }}
            </p>
            <div
              v-if="canReadEvidence(cost) && cost.attachments?.length"
              class="waybill-fee-panel__attachments"
            >
              <span>票据附件</span>
              <ArtAttachmentLink
                v-for="(url, index) in cost.attachments"
                :key="url"
                :file="{ url, name: `费用票据 ${index + 1}` }"
              />
            </div>
            <p
              v-else-if="
                canViewField(cost.fieldAccess, 'expenseEvidence') && !canReadEvidence(cost)
              "
              class="waybill-fee-panel__hint"
            >
              票据附件已按字段权限脱敏
            </p>
          </li>
        </ol>
      </div>
    </ArtSectionCard>
  </div>
</template>

<script setup lang="ts">
  import ArtAttachmentLink from '@/components/core/media/art-file-viewer/attachment-link.vue'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'
  import { canViewField, getFieldAccess } from '@/utils/field-permission'
  import { formatWithDayjs } from '@/utils/time'
  import { formatSensitiveNumber, formatSensitiveNumberWithAffix } from '@/utils/field-permission'

  defineOptions({ name: 'TmsWaybillFeePanel' })

  type Cost = Api.Tms.Waybill.WaybillCostRecord

  interface AmountLine {
    label: string
    value?: number | string | null
  }

  interface CostFact {
    label: string
    value: string
  }

  const props = defineProps<{ waybill: Api.Tms.Waybill.WaybillDetailRecord }>()
  const canViewFreight = computed(() => canViewField(props.waybill.fieldAccess, 'freightAmounts'))
  const canViewSettlement = computed(() =>
    canViewField(props.waybill.fieldAccess, 'settlementAmounts')
  )
  const isAllocated = computed(() => ['merge', 'split'].includes(props.waybill.executionKind || ''))
  const driverCostCount = computed(
    () => props.waybill.costs.filter((cost) => cost.sourceType === 'driver_report').length
  )
  const webCostCount = computed(
    () => props.waybill.costs.filter((cost) => !cost.sourceType || cost.sourceType === 'web').length
  )
  const otherCostCount = computed(
    () => props.waybill.costs.length - driverCostCount.value - webCostCount.value
  )
  const costTotal = computed<number | null>(() => {
    let total = 0
    for (const cost of props.waybill.costs) {
      if (!['read', 'edit'].includes(getFieldAccess(cost.fieldAccess, 'costAmounts'))) return null
      const amount = Number(cost.amount)
      if (!Number.isFinite(amount)) return null
      total += amount
    }
    return total
  })

  const chargeItems = computed<AmountLine[]>(() => [
    { label: '运输费', value: props.waybill.order?.transportFee },
    { label: '送货费', value: props.waybill.order?.deliveryFee },
    { label: '卸货费', value: props.waybill.order?.unloadingFee },
    { label: '中转费', value: props.waybill.order?.transferFee },
    { label: '保险费', value: props.waybill.order?.insuranceFee },
    { label: '包装费', value: props.waybill.order?.packageFee },
    { label: '代收货款手续费', value: props.waybill.order?.collectPaymentFee },
    { label: '手续费', value: props.waybill.order?.handlingFee },
    { label: '其他费用', value: props.waybill.order?.otherFee }
  ])
  const paymentItems = computed<AmountLine[]>(() => [
    { label: '现付', value: props.waybill.order?.cashAmount },
    { label: '到付', value: props.waybill.order?.collectAmount },
    { label: '月结', value: props.waybill.order?.monthlyAmount },
    { label: '代收货款', value: props.waybill.order?.codAmount }
  ])

  function costFacts(cost: Cost): CostFact[] {
    const facts: CostFact[] = []
    const add = (label: string, value?: string | null): void => {
      if (value) facts.push({ label, value })
    }
    add('上报人', cost.reporterNameSnapshot)
    add('提交时间', dateTime(cost.submittedAt))
    const amountAccess = getFieldAccess(cost.fieldAccess, 'costAmounts')
    if (amountAccess !== 'hidden') {
      add(
        '数量 / 用量',
        cost.quantity == null
          ? null
          : amountAccess === 'masked'
            ? '***'
            : optionalNumber(cost.quantity)
      )
      add(
        '单价',
        cost.unitPrice == null ? null : amountAccess === 'masked' ? '***' : money(cost.unitPrice)
      )
    }
    if (canViewField(cost.fieldAccess, 'paymentDetails')) {
      add('服务商', cost.providerName)
      add('收款方', cost.payeeName)
      add('支付渠道', cost.paymentChannel)
      add('票据号码', cost.invoiceNo)
      add('表号 / 桩号', cost.meterNo)
    }
    if (canViewField(cost.fieldAccess, 'expenseLocation')) {
      add('发生区域', cost.expenseRegion)
      add('发生地点', cost.expenseLocation)
    }
    add('报销单号', cost.reimbursement?.reimbursementNo)
    add('付款单号', cost.expensePayment?.paymentNo)
    add('审核时间', dateTime(cost.reviewedAt))
    add('付款时间', dateTime(cost.paidAt))
    return facts
  }

  function canReadEvidence(cost: Cost): boolean {
    return ['read', 'edit'].includes(getFieldAccess(cost.fieldAccess, 'expenseEvidence'))
  }

  function costAmount(cost: Cost): string {
    return getFieldAccess(cost.fieldAccess, 'costAmounts') === 'masked' ? '***' : money(cost.amount)
  }

  function sourceLabel(sourceType?: string | null): string {
    if (sourceType === 'driver_report') return '司机端'
    if (!sourceType || sourceType === 'web') return 'Web 端'
    return '其他来源'
  }

  function money(value?: number | string | null): string {
    return formatSensitiveNumberWithAffix(value, { prefix: '¥' })
  }

  function optionalNumber(value?: number | string | null): string | null {
    return value == null ? null : formatSensitiveNumber(value, { maximumFractionDigits: 4 })
  }

  function date(value?: string | null): string {
    return formatWithDayjs(value, 'YYYY-MM-DD') || '--'
  }

  function dateTime(value?: string | null): string | null {
    return formatWithDayjs(value, 'YYYY-MM-DD HH:mm') || null
  }
</script>

<style scoped lang="scss">
  .waybill-fee-panel {
    display: grid;
    gap: var(--art-space-3);
    min-width: 0;

    &__card {
      min-width: 0;
      padding: var(--art-section-padding);
    }

    &__totals,
    &__charge-grid,
    &__facts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--art-space-3);
    }

    &__totals {
      margin-bottom: var(--art-space-4);
    }

    &__total {
      display: grid;
      gap: 4px;
      min-width: 0;
      padding: var(--art-space-4);
      background: var(--el-fill-color-light);
      border-radius: var(--el-border-radius-base);

      &.is-primary {
        background: var(--el-color-primary-light-9);
      }

      > span,
      > small {
        color: var(--el-text-color-secondary);
      }

      > strong {
        font-size: 22px;
        font-variant-numeric: tabular-nums;
        line-height: 1.3;
        color: var(--el-text-color-primary);
      }

      &.is-primary > strong {
        color: var(--el-color-primary);
      }
    }

    &__charge-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0;
      margin: var(--art-space-3) 0 var(--art-space-4);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: var(--el-border-radius-base);

      > div {
        display: flex;
        gap: var(--art-space-2);
        justify-content: space-between;
        min-width: 0;
        padding: var(--art-space-3);
        border-bottom: 1px solid var(--el-border-color-lighter);

        dt {
          color: var(--el-text-color-secondary);
        }

        dd {
          margin: 0;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
      }
    }

    &__hint {
      margin: var(--art-space-2) 0 var(--art-space-3);
      color: var(--el-text-color-secondary);
    }

    &__source-list,
    &__cost-list {
      display: grid;
      gap: var(--art-space-2);
    }

    &__source {
      display: grid;
      grid-template-columns: minmax(150px, 1fr) minmax(0, 1fr) auto;
      gap: var(--art-space-3);
      align-items: center;
      min-width: 0;
      padding: var(--art-space-3);
      border-bottom: 1px solid var(--el-border-color-lighter);

      a {
        color: var(--el-color-primary);
        text-decoration: none;

        &:focus-visible {
          outline: 2px solid var(--el-color-primary);
          outline-offset: 3px;
        }
      }

      > span {
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }

      > strong {
        font-variant-numeric: tabular-nums;
      }
    }

    &__count {
      color: var(--el-text-color-secondary);
    }

    &__cost-content {
      display: grid;
      gap: var(--art-space-3);
    }

    &__cost-summary {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-3) var(--art-space-6);
      align-items: center;
      padding: var(--art-space-3) var(--art-space-4);
      background: var(--el-fill-color-light);
      border-radius: var(--el-border-radius-base);

      > div {
        display: flex;
        gap: var(--art-space-2);
        align-items: baseline;
      }

      span,
      p {
        color: var(--el-text-color-secondary);
      }

      strong {
        font-variant-numeric: tabular-nums;
      }

      p {
        margin: 0;
      }
    }

    &__cost-list {
      padding: 0;
      margin: 0;
      list-style: none;
    }

    &__cost {
      min-width: 0;
      padding: var(--art-space-4);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: var(--el-border-radius-base);
    }

    &__cost-heading,
    &__cost-identity,
    &__cost-title,
    &__cost-status {
      display: flex;
      gap: var(--art-space-2);
      align-items: center;
      min-width: 0;
    }

    &__cost-heading {
      flex-wrap: wrap;
      gap: var(--art-space-3);
      justify-content: space-between;
    }

    &__cost-identity > div {
      min-width: 0;

      p {
        margin: 3px 0 0;
        color: var(--el-text-color-secondary);
      }
    }

    &__cost-title {
      flex-wrap: wrap;

      strong {
        color: var(--el-text-color-primary);
      }
    }

    &__cost-icon {
      display: grid;
      flex: none;
      place-items: center;
      width: 36px;
      height: 36px;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-radius: var(--el-border-radius-base);
    }

    &__cost-status {
      flex-wrap: wrap;
      justify-content: flex-end;

      > strong {
        margin-right: var(--art-space-2);
        font-size: 18px;
        font-variant-numeric: tabular-nums;
      }
    }

    &__facts {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--art-space-3);
      margin: var(--art-space-4) 0 0;

      > div {
        min-width: 0;
      }

      dt {
        margin-bottom: 3px;
        color: var(--el-text-color-secondary);
      }

      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
    }

    &__note {
      margin: var(--art-space-3) 0 0;
      overflow-wrap: anywhere;
    }

    &__attachments {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-2);
      align-items: center;
      margin-top: var(--art-space-3);

      > span {
        color: var(--el-text-color-secondary);
      }
    }
  }

  @media (width <= 900px) {
    .waybill-fee-panel {
      &__charge-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      &__facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  }

  @media (width <= 640px) {
    .waybill-fee-panel {
      &__totals,
      &__charge-grid,
      &__facts {
        grid-template-columns: 1fr;
      }

      &__source {
        grid-template-columns: minmax(0, 1fr) auto;

        > span {
          grid-row: 2;
          grid-column: 1 / -1;
        }
      }

      &__cost-status {
        justify-content: flex-start;
      }
    }
  }
</style>
