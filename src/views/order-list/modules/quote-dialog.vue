<template>
  <ArtDialog ref="dialogRef" size="xl" :show-fullscreen-button="true">
    <div
      v-if="loadError"
      class="flex min-h-52 flex-col items-center justify-center gap-3 text-center"
    >
      <p class="text-sm text-[var(--art-gray-700)]">报价信息加载失败，请重试。</p>
      <ElButton type="primary" plain :loading="reloadLoading" @click="loadQuote">重新加载</ElButton>
    </div>
    <div v-else-if="order" class="space-y-5 pb-2">
      <section class="rounded-[var(--custom-radius)] bg-[var(--art-gray-100)] p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <strong class="text-base text-[var(--art-gray-900)]">{{ order.orderNo }}</strong>
            <ArtDictDisplay
              v-if="quoteStatus"
              dict-code="tmsOrderQuoteStatus"
              :value="quoteStatus"
            />
          </div>
          <span class="text-sm text-[var(--art-gray-700)]">
            {{ order.originStation || '始发站未填' }} →
            {{ order.destinationStation || '到货站未填' }}
          </span>
        </div>
        <div class="grid gap-3 text-sm md:grid-cols-2">
          <div class="min-w-0">
            <span class="text-[var(--art-gray-600)]">发货方</span>
            <p class="mt-1 break-words text-[var(--art-gray-900)]">
              {{ order.shippingContactName || '—' }} · {{ order.shippingContactPhone || '—' }}
            </p>
            <p class="mt-1 break-words text-[var(--art-gray-700)]">
              {{ order.shippingAddressDetail || '未填写发货地址' }}
            </p>
          </div>
          <div class="min-w-0">
            <span class="text-[var(--art-gray-600)]">收货方</span>
            <p class="mt-1 break-words text-[var(--art-gray-900)]">
              {{ order.receivingContactName || '—' }} · {{ order.receivingContactPhone || '—' }}
            </p>
            <p class="mt-1 break-words text-[var(--art-gray-700)]">
              {{ order.receivingAddressDetail || '未填写收货地址' }}
            </p>
          </div>
        </div>
        <div
          class="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--art-gray-200)] pt-3 text-sm text-[var(--art-gray-700)]"
        >
          <span>发货：{{ formatWithDayjs(order.departureAt) || '—' }}</span>
          <span>到货：{{ formatWithDayjs(order.arrivalAt) || '—' }}</span>
          <span>数量：{{ order.cargoQuantityTotal ?? 0 }}</span>
          <span>重量：{{ order.cargoWeightTotal ?? 0 }} kg</span>
          <span>体积：{{ order.cargoVolumeTotal ?? 0 }} m³</span>
        </div>
      </section>

      <ArtForm
        ref="feeFormRef"
        v-model="form"
        :items="feeItems"
        :span="8"
        :gutter="16"
        :show-reset="false"
        :show-submit="false"
      />

      <section>
        <ArtSectionTitle>补充费用</ArtSectionTitle>
        <p class="mb-3 mt-3 text-sm text-[var(--art-gray-700)]">
          选择一项后立即加入下方，可继续选择其他费用。
        </p>
        <div class="rounded-[var(--custom-radius)] bg-[var(--art-gray-100)] p-3 sm:p-4">
          <ElSelect
            v-model="selectedExpenseCode"
            filterable
            class="w-full"
            placeholder="选择要添加的费用项"
            aria-label="添加补充费用项"
            :disabled="form.supplementaryItems.length >= expenseOptions.length"
            @change="addExpenseItem"
          >
            <ElOption
              v-for="option in expenseOptions"
              :key="option.value"
              :label="option.label || option.name"
              :value="option.value"
              :disabled="form.supplementaryItems.some((item) => item.code === option.value)"
            />
          </ElSelect>
          <div v-if="form.supplementaryItems.length" class="mt-3 space-y-2">
            <div
              v-for="item in form.supplementaryItems"
              :key="item.code"
              class="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2 rounded-[var(--art-control-radius)] border border-[var(--art-gray-200)] bg-[var(--default-box-color)] p-2.5 sm:grid-cols-[110px_minmax(150px,1fr)_minmax(180px,1.5fr)_36px]"
            >
              <span class="min-w-0 font-medium text-[var(--art-gray-800)]">{{
                expenseLabel(item.code)
              }}</span>
              <ElInputNumber
                v-model="item.amount"
                :min="0"
                :max="9999999999.99"
                :precision="2"
                :controls="false"
                class="col-start-1 row-start-2 w-full! sm:col-auto sm:row-auto"
                :aria-label="`${expenseLabel(item.code)}金额（元）`"
              />
              <ElInput
                v-model="item.remark"
                maxlength="200"
                class="col-start-1 row-start-3 min-w-0 sm:col-auto sm:row-auto"
                :aria-label="`${expenseLabel(item.code)}备注`"
                placeholder="费用说明（选填）"
              />
              <ArtIconButton
                icon="ri:delete-bin-line"
                tone="danger"
                class="col-start-2 row-start-1 sm:col-auto sm:row-auto"
                :label="`移除${expenseLabel(item.code)}`"
                @click="removeExpenseItem(item.code)"
              />
            </div>
          </div>
          <ArtEmptyState
            v-else
            title="暂无补充费用"
            description="可从上方选择费用项。"
            size="compact"
            :visual-size="64"
          />
        </div>
        <div
          class="mt-3 flex flex-wrap items-baseline justify-end gap-x-3 border-t border-[var(--art-gray-200)] pt-3 text-sm"
        >
          <span class="text-[var(--art-gray-700)]">报价费用与补充费用合计（含税）</span>
          <strong class="text-lg tabular-nums text-[var(--el-color-primary)]">
            ¥{{ formatCurrencyAmount(totalAmount) }}
          </strong>
        </div>
      </section>

      <ArtForm
        ref="paymentFormRef"
        v-model="form"
        :items="paymentItems"
        :span="8"
        :gutter="16"
        :show-reset="false"
        :show-submit="false"
      />

      <section>
        <ArtSectionTitle>报价附件</ArtSectionTitle>
        <p class="mb-3 mt-1 text-sm text-[var(--art-gray-600)]">
          可附报价清单或说明文件，最多 6 个，单个不超过 20 MB。
        </p>
        <p v-if="!canUploadToOrderTenant" class="mb-3 text-sm text-[var(--el-color-warning)]">
          本地上传需切换到订单所属租户；当前可选择该租户已有附件。
        </p>
        <ArtUploadFile
          ref="attachmentRef"
          v-model="form.attachmentUrls"
          multiple
          :limit="6"
          :file-size="20 * 1024 * 1024"
          :resource-tenant-id="order.tenantId || ''"
          :upload-request="uploadQuoteAttachment"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,image/*"
        />
      </section>
    </div>

    <template #footer="{ loading, api }">
      <div class="flex w-full flex-wrap items-center justify-end gap-2">
        <ElButton :disabled="loading" @click="api.handleClose()">返回</ElButton>
        <ElButton
          v-auth="'TmsOrderList:Quote'"
          :loading="loading && submitMode === 'save'"
          :disabled="loading || reloadLoading || loadError || !order"
          @click="handleFooterConfirm(api, 'save')"
        >
          保存报价
        </ElButton>
        <ElButton
          v-auth="'TmsOrderList:Quote'"
          type="primary"
          :loading="loading && submitMode === 'submit'"
          :disabled="loading || reloadLoading || loadError || !order"
          @click="handleFooterConfirm(api, 'submit')"
        >
          提交报价
        </ElButton>
      </div>
    </template>
  </ArtDialog>
</template>

<script setup lang="ts">
  import { round, toNumber } from 'lodash-es'
  import { ElMessage } from 'element-plus'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtDictDisplay from '@/components/core/base/art-dict-display/index.vue'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'
  import ArtEmptyState from '@/components/core/feedback/art-empty-state/index.vue'
  import ArtUploadFile from '@/components/core/forms/art-upload-file/index.vue'
  import ArtIconButton from '@/components/core/widget/art-icon-button/index.vue'
  import { formatWithDayjs } from '@/utils/time'
  import { useUserStore } from '@/store/modules/user'
  import { uploadAttachment } from '@/api/common'
  import { fetchOrderQuote, saveOrderQuote } from '@tms/api'

  defineOptions({ name: 'TmsOrderQuoteDialog' })

  type OrderRecord = Api.Tms.Order.OrderRecord
  type QuotePayload = Api.Tms.Order.OrderQuotePayload
  type SubmitMode = 'save' | 'submit'
  type FooterApi = Pick<ArtDialogExpose<OrderRecord>, 'handleConfirm' | 'confirmLoading'>

  const emit = defineEmits<{ success: [] }>()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const dialogRef = ref<ArtDialogExpose<OrderRecord>>()
  const feeFormRef = ref<InstanceType<typeof ArtForm>>()
  const paymentFormRef = ref<InstanceType<typeof ArtForm>>()
  const attachmentRef = ref<{ hasPendingUpload: () => boolean }>()
  const orderId = ref('')
  const order = ref<OrderRecord | null>(null)
  const quoteStatus = ref<Api.Tms.Order.OrderQuoteRecord['status'] | ''>('')
  const form = ref<QuotePayload>(createInitialForm())
  const selectedExpenseCode = ref('')
  const loadError = ref(false)
  const reloadLoading = ref(false)
  const submitMode = ref<SubmitMode>('save')
  let loadRequestId = 0

  const expenseOptions = computed(() => getDictMap.value.tmsOrderQuoteExpenseItem ?? [])
  const canUploadToOrderTenant = computed(
    () => Boolean(order.value?.tenantId) && userStore.getUserInfo.tenantId === order.value?.tenantId
  )
  const totalAmount = computed(() =>
    round(
      moneyValue(form.value.transportFee) +
        moneyValue(form.value.unloadingFee) +
        moneyValue(form.value.deliveryFee) +
        moneyValue(form.value.insuranceFee) +
        moneyValue(form.value.taxFee) +
        form.value.supplementaryItems.reduce((sum, item) => sum + moneyValue(item.amount), 0),
      2
    )
  )

  const moneyProps = {
    min: 0,
    max: 9999999999.99,
    precision: 2,
    controls: false,
    class: 'w-full!'
  }
  const feeItems: FormItem[] = [
    { key: 'feeSection', label: '运输报价', type: 'divider', span: 24 },
    { key: 'transportFee', label: '运输费（元）', type: 'number', props: moneyProps },
    { key: 'unloadingFee', label: '卸货费（元）', type: 'number', props: moneyProps },
    { key: 'deliveryFee', label: '送货费（元）', type: 'number', props: moneyProps },
    { key: 'insuranceFee', label: '保险费（元）', type: 'number', props: moneyProps },
    { key: 'taxFee', label: '税费（元）', type: 'number', props: moneyProps }
  ]
  const paymentItems: FormItem[] = [
    { key: 'paymentSection', label: '付款安排', type: 'divider', span: 24 },
    { key: 'prepayment', label: '预付款（元）', type: 'number', props: moneyProps },
    { key: 'arrivalPayment', label: '货到付款（元）', type: 'number', props: moneyProps },
    { key: 'collectPayment', label: '代收货款（元）', type: 'number', props: moneyProps },
    {
      key: 'remark',
      label: '报价备注',
      type: 'input',
      span: 24,
      props: { type: 'textarea', rows: 3, maxlength: 500, showWordLimit: true }
    }
  ]

  function createInitialForm(): QuotePayload {
    return {
      transportFee: 0,
      unloadingFee: 0,
      deliveryFee: 0,
      insuranceFee: 0,
      taxFee: 0,
      supplementaryItems: [],
      prepayment: 0,
      arrivalPayment: 0,
      collectPayment: 0,
      remark: '',
      attachmentUrls: []
    }
  }

  function moneyValue(value?: number | string | null): number {
    const amount = toNumber(value ?? 0)
    return Number.isFinite(amount) ? amount : 0
  }

  function formatCurrencyAmount(value: number): string {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function uploadQuoteAttachment(
    file: File
  ): Promise<Api.DataCenter.Resources.ResourceListItem[]> {
    if (!canUploadToOrderTenant.value) {
      throw new Error('本地上传需切换到订单所属租户')
    }
    return await uploadAttachment(file)
  }

  function expenseLabel(code: string): string {
    const option = expenseOptions.value.find((item) => item.value === code)
    return option?.label || option?.name || code
  }

  function addExpenseItem(code: string): void {
    if (code && !form.value.supplementaryItems.some((item) => item.code === code)) {
      form.value.supplementaryItems.push({ code, amount: 0, remark: '' })
    }
    selectedExpenseCode.value = ''
  }

  function removeExpenseItem(code: string): void {
    form.value.supplementaryItems = form.value.supplementaryItems.filter(
      (item) => item.code !== code
    )
  }

  async function loadQuote(): Promise<void> {
    if (!orderId.value) return
    const requestId = ++loadRequestId
    const currentOrderId = orderId.value
    reloadLoading.value = true
    loadError.value = false
    try {
      const [result] = await Promise.all([
        fetchOrderQuote(currentOrderId),
        userStore.ensureDictLoaded('tmsOrderQuoteExpenseItem'),
        userStore.ensureDictLoaded('tmsOrderQuoteStatus')
      ])
      if (requestId !== loadRequestId) return
      const context = result.data
      if (!context) throw new Error('报价数据不可用')
      order.value = context.order
      quoteStatus.value = context.quote?.status || ''
      form.value = context.quote
        ? {
            transportFee: moneyValue(context.quote.transportFee),
            unloadingFee: moneyValue(context.quote.unloadingFee),
            deliveryFee: moneyValue(context.quote.deliveryFee),
            insuranceFee: moneyValue(context.quote.insuranceFee),
            taxFee: moneyValue(context.quote.taxFee),
            supplementaryItems: context.quote.supplementaryItems.map((item) => ({ ...item })),
            prepayment: moneyValue(context.quote.prepayment),
            arrivalPayment: moneyValue(context.quote.arrivalPayment),
            collectPayment: moneyValue(context.quote.collectPayment),
            remark: context.quote.remark || '',
            attachmentUrls: [...context.quote.attachmentUrls]
          }
        : {
            ...createInitialForm(),
            transportFee: moneyValue(context.order.transportFee),
            unloadingFee: moneyValue(context.order.unloadingFee),
            deliveryFee: moneyValue(context.order.deliveryFee),
            insuranceFee: moneyValue(context.order.insuranceFee)
          }
      selectedExpenseCode.value = ''
    } catch {
      if (requestId === loadRequestId) loadError.value = true
    } finally {
      if (requestId === loadRequestId) reloadLoading.value = false
    }
  }

  function validateAmounts(): boolean {
    const amounts = [
      form.value.transportFee,
      form.value.unloadingFee,
      form.value.deliveryFee,
      form.value.insuranceFee,
      form.value.taxFee,
      form.value.prepayment,
      form.value.arrivalPayment,
      form.value.collectPayment,
      ...form.value.supplementaryItems.map((item) => item.amount)
    ]
    if (
      amounts.some(
        (amount) =>
          !Number.isFinite(amount) ||
          amount < 0 ||
          amount > 9999999999.99 ||
          round(amount, 2) !== amount
      )
    ) {
      ElMessage.warning('费用金额须为非负数，最多保留两位小数')
      return false
    }
    if (totalAmount.value > 9999999999.99) {
      ElMessage.warning('报价总额不能超过 9,999,999,999.99 元')
      return false
    }
    return true
  }

  async function handleSubmit(): Promise<boolean> {
    if (!orderId.value || loadError.value || !order.value) return false
    if (attachmentRef.value?.hasPendingUpload()) {
      ElMessage.warning('请等待附件上传完成后再保存报价')
      return false
    }
    try {
      await Promise.all([feeFormRef.value?.validate(), paymentFormRef.value?.validate()])
    } catch {
      return false
    }
    if (!validateAmounts()) return false
    if (submitMode.value === 'submit' && totalAmount.value <= 0) {
      ElMessage.warning('提交报价前请填写费用金额')
      return false
    }
    try {
      await saveOrderQuote(orderId.value, form.value, submitMode.value === 'submit')
      ElMessage.success(submitMode.value === 'submit' ? '报价已提交到系统' : '报价已保存')
      emit('success')
      return true
    } catch {
      return false
    }
  }

  function handleFooterConfirm(api: FooterApi, mode: SubmitMode): void {
    if (api.confirmLoading.value || reloadLoading.value) return
    submitMode.value = mode
    void api.handleConfirm()
  }

  async function handleOpen(row: OrderRecord): Promise<void> {
    if (!row.id) return
    orderId.value = row.id
    order.value = row
    form.value = createInitialForm()
    quoteStatus.value = ''
    selectedExpenseCode.value = ''
    loadError.value = false
    await dialogRef.value?.handleOpen(row, {
      title: `报价 · ${row.orderNo}`,
      subtitle: '填写费用、付款安排和补充说明；提交仅在系统内记录报价状态。',
      onOpen: async (_row, api) => {
        api.setLoading(true)
        try {
          await loadQuote()
        } finally {
          api.setLoading(false)
        }
      },
      onConfirm: handleSubmit,
      onClose: () => {
        loadRequestId += 1
        orderId.value = ''
        order.value = null
      }
    })
  }

  defineExpose({ handleOpen })
</script>
