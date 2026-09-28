<template>
  <div class="order-config">
    <div class="order-config__intro">
      <div>
        <strong>运输配置</strong>
        <p>选择运输类型与计费口径，现场要求会随单传递给调度。</p>
      </div>
      <ElSegmented
        v-model="config.loadType"
        :options="loadTypeOptions"
        @change="handleLoadTypeChange"
      />
    </div>

    <ElForm
      ref="formRef"
      :model="config"
      :rules="rules"
      :validate-on-rule-change="false"
      label-position="top"
      class="order-config__form"
    >
      <div v-if="config.loadType === 'ftl'" class="order-config__vehicle">
        <div class="order-config__section-heading">
          <div
            ><strong>选择车型</strong
            ><span>选择已启用的车型规格，车长、容积和载重会自动带出</span></div
          >
          <ElButton v-if="vehicleError" link type="primary" @click="loadProfiles"
            >重试加载</ElButton
          >
        </div>
        <ElSkeleton v-if="vehicleLoading" :rows="2" animated />
        <p v-else-if="vehicleError" class="order-config__hint is-error"
          >车型规格加载失败，请重试。</p
        >
        <div v-else-if="vehicleProfiles.length" class="order-config__vehicle-grid">
          <button
            v-for="profile in vehicleProfiles"
            :key="profile.id"
            type="button"
            class="order-config__vehicle-card"
            :class="{
              'is-selected':
                config.vehicleType === profile.category && config.vehicleLengthM === profile.lengthM
            }"
            :aria-pressed="
              config.vehicleType === profile.category && config.vehicleLengthM === profile.lengthM
            "
            @click="selectVehicle(profile)"
          >
            <VehicleTypeArt :category="profile.category" />
            <strong>{{ profile.category }}</strong>
            <small>{{ profile.lengthM == null ? '规格待配置' : `${profile.lengthM} 米` }}</small>
          </button>
        </div>
        <p v-else class="order-config__hint">暂无已启用的车型规格，请先在车辆档案维护车型。</p>
        <ElFormItem prop="vehicleType" class="order-config__vehicle-validation">
          <span class="order-config__selected-vehicle">{{
            config.vehicleType ? `已选择 ${config.vehicleType}` : '请选择一款车型'
          }}</span>
        </ElFormItem>
        <div class="order-config__metrics">
          <span
            >车长 <strong>{{ metricText(config.vehicleLengthM, '米') }}</strong></span
          >
          <span
            >容积 <strong>{{ metricText(config.vehicleVolumeM3, '立方米') }}</strong></span
          >
          <span
            >载重 <strong>{{ metricText(config.vehicleLoadTons, '吨') }}</strong></span
          >
        </div>
      </div>

      <div class="order-config__grid">
        <ElFormItem v-if="config.loadType === 'ftl'" label="整车数量" prop="truckCount">
          <ElSelect v-model="config.truckCount" placeholder="请选择整车数量">
            <ElOption v-for="count in 10" :key="count" :label="`${count} 车`" :value="count" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="计费模式" prop="billingMode">
          <ElSelect
            v-model="config.billingMode"
            placeholder="请选择计费模式"
            @change="config.billingUnit = ''"
          >
            <ElOption
              v-for="item in billingModeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="计费单位" prop="billingUnit">
          <ElSelect
            v-model="config.billingUnit"
            :disabled="!config.billingMode"
            placeholder="选择与计费模式对应的单位"
            filterable
          >
            <ElOption
              v-for="item in billingUnitOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="货物分类" prop="cargoCategory">
          <ElSelect
            v-model="config.cargoCategory"
            placeholder="请选择货物分类"
            @change="handleCategoryChange"
          >
            <ElOption
              v-for="item in cargoCategoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          v-if="config.cargoCategory === 'temperature'"
          label="温度阈值（℃）"
          prop="tempMinC"
        >
          <div class="order-config__temperature">
            <ElInputNumber
              v-model="config.tempMinC"
              :controls="false"
              :min="-80"
              :max="80"
              placeholder="最低温"
            />
            <span>至</span>
            <ElInputNumber
              v-model="config.tempMaxC"
              :controls="false"
              :min="-80"
              :max="80"
              placeholder="最高温"
            />
          </div>
        </ElFormItem>
        <ElFormItem label="包装方式" prop="packaging">
          <ElSelect v-model="config.packaging" placeholder="请选择包装方式">
            <ElOption
              v-for="item in packagingOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="是否自提">
          <ElRadioGroup v-model="config.selfPickup">
            <ElRadioButton
              v-for="item in booleanOptions"
              :key="item.value"
              :value="item.value === 'true'"
              >{{ item.label }}</ElRadioButton
            >
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="是否保价">
          <ElRadioGroup v-model="config.insured">
            <ElRadioButton
              v-for="item in booleanOptions"
              :key="item.value"
              :value="item.value === 'true'"
              >{{ item.value === 'true' ? '保价' : '不保价' }}</ElRadioButton
            >
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="允许与其他客户单合车">
          <ElRadioGroup v-model="config.allowConsolidation">
            <ElRadioButton
              v-for="item in booleanOptions"
              :key="item.value"
              :value="item.value === 'true'"
              >{{ item.value === 'true' ? '允许合单' : '单独运输' }}</ElRadioButton
            >
          </ElRadioGroup>
          <p class="order-config__hint">客户明确允许后，调度才能与线路和货物条件相容的订单合车。</p>
        </ElFormItem>
        <ElFormItem label="运输要求" class="order-config__wide">
          <ElCheckboxGroup v-model="config.transportRequirements" class="order-config__checks">
            <ElCheckbox
              v-for="item in transportRequirementOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElCheckboxGroup>
        </ElFormItem>
        <ElFormItem label="跟踪方式">
          <ElSelect
            v-model="config.trackingMethod"
            clearable
            placeholder="请选择跟踪方式"
            @change="config.trackingNumber = ''"
          >
            <ElOption
              v-for="item in trackingMethodOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          v-if="config.trackingMethod"
          :label="config.trackingMethod === 'electronic_receipt' ? '电子回单编号' : '快递单号'"
          prop="trackingNumber"
        >
          <ElInput
            v-model.trim="config.trackingNumber"
            maxlength="80"
            :placeholder="
              config.trackingMethod === 'electronic_receipt'
                ? '请输入电子回单编号'
                : '请输入快递单号'
            "
          />
        </ElFormItem>
        <ElFormItem label="备注" class="order-config__wide">
          <ElInput
            v-model="config.remark"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="补充包装、交接或特殊运输说明"
          />
        </ElFormItem>
      </div>
    </ElForm>
    <div class="order-config__attachments">
      <div class="order-config__section-heading"
        ><div
          ><strong>业务附件</strong
          ><span>支持图片、文档及压缩包，最多 6 个，单个不超过 2 MB</span></div
        ></div
      >
      <ArtUploadFile
        ref="attachmentUploadRef"
        v-model="config.attachmentUrls"
        title="上传附件"
        multiple
        :limit="6"
        :file-size="2 * 1024 * 1024"
        accept=".jpg,.jpeg,.png,.gif,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        :readonly="!canEditAttachments"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { storeToRefs } from 'pinia'
  import ArtUploadFile from '@/components/core/forms/art-upload-file/index.vue'
  import { fetchTmsVehicleTypeProfiles, type TmsVehicleTypeProfile } from '@tms/api'
  import { useUserStore } from '@/store/modules/user'
  import VehicleTypeArt from './vehicle-type-art.vue'

  const config = defineModel<Api.Tms.Order.OrderConfig>({ required: true })
  defineProps<{ canEditAttachments: boolean }>()
  const { getDictMap } = storeToRefs(useUserStore())
  const formRef = ref<FormInstance>()
  const attachmentUploadRef = ref<{ hasPendingUpload: () => boolean }>()
  const vehicleProfiles = ref<TmsVehicleTypeProfile[]>([])
  const vehicleLoading = ref(false)
  const vehicleError = ref(false)
  const loadTypeOptions = computed(() =>
    (getDictMap.value.tmsOrderLoadType ?? []).map((item) => ({
      label: item.label,
      value: item.value
    }))
  )
  const billingModeOptions = computed(() => getDictMap.value.tmsOrderBillingMode ?? [])
  const cargoCategoryOptions = computed(() => getDictMap.value.tmsOrderCargoCategory ?? [])
  const packagingOptions = computed(() => getDictMap.value.tmsOrderPackaging ?? [])
  const transportRequirementOptions = computed(
    () => getDictMap.value.tmsOrderTransportRequirement ?? []
  )
  const trackingMethodOptions = computed(() => getDictMap.value.tmsOrderTrackingMethod ?? [])
  const booleanOptions = computed(() => getDictMap.value.commonBoolean ?? [])
  const billingUnitOptions = computed(() =>
    (getDictMap.value.tmsCargoUnit ?? []).filter((item) => {
      if (config.value.billingMode === 'weight') return ['kg', 'ton'].includes(item.value)
      if (config.value.billingMode === 'volume')
        return ['cubic_meter', 'liter'].includes(item.value)
      return (
        config.value.billingMode === 'quantity' &&
        !['kg', 'ton', 'cubic_meter', 'liter'].includes(item.value)
      )
    })
  )
  const rules = computed<FormRules<Api.Tms.Order.OrderConfig>>(() => ({
    vehicleType:
      config.value.loadType === 'ftl'
        ? [{ required: true, message: '请选择车型', trigger: 'change' }]
        : [],
    truckCount:
      config.value.loadType === 'ftl'
        ? [{ required: true, message: '请选择整车数量', trigger: 'change' }]
        : [],
    billingMode: [{ required: true, message: '请选择计费模式', trigger: 'change' }],
    billingUnit: [],
    cargoCategory: [{ required: true, message: '请选择货物分类', trigger: 'change' }],
    packaging: [{ required: true, message: '请选择包装方式', trigger: 'change' }],
    trackingNumber: config.value.trackingMethod
      ? [{ required: true, message: '请填写跟踪编号', trigger: 'blur' }]
      : [],
    tempMinC:
      config.value.cargoCategory === 'temperature'
        ? [
            {
              validator: (_rule, _value, callback) => {
                const { tempMinC, tempMaxC } = config.value
                callback(
                  tempMinC == null || tempMaxC == null || tempMinC > tempMaxC
                    ? new Error('请填写有效的最低与最高温度')
                    : undefined
                )
              },
              trigger: 'change'
            }
          ]
        : []
  }))

  async function loadProfiles(): Promise<void> {
    if (vehicleLoading.value) return
    vehicleLoading.value = true
    vehicleError.value = false
    try {
      const result = await fetchTmsVehicleTypeProfiles()
      if (result.error) throw result.error
      vehicleProfiles.value = (result.data ?? []).sort((a, b) => a.sort - b.sort)
    } catch {
      vehicleError.value = true
    } finally {
      vehicleLoading.value = false
    }
  }

  function selectVehicle(profile: TmsVehicleTypeProfile): void {
    Object.assign(config.value, {
      vehicleType: profile.category,
      vehicleLengthM: profile.lengthM,
      vehicleVolumeM3: profile.volumeM3,
      vehicleLoadTons: profile.loadTons
    })
    formRef.value?.clearValidate('vehicleType')
  }

  watch(
    () => config.value.loadType,
    (loadType) => {
      if (loadType === 'ftl' && !vehicleProfiles.value.length) void loadProfiles()
    },
    { immediate: true }
  )

  function handleLoadTypeChange(): void {
    if (config.value.loadType === 'ftl') {
      if (!vehicleProfiles.value.length) void loadProfiles()
      return
    }
    Object.assign(config.value, {
      vehicleType: '',
      vehicleLengthM: null,
      vehicleVolumeM3: null,
      vehicleLoadTons: null,
      truckCount: null
    })
  }

  function handleCategoryChange(): void {
    if (config.value.cargoCategory !== 'temperature') {
      config.value.tempMinC = null
      config.value.tempMaxC = null
    }
  }

  function metricText(value: number | null | undefined, unit: string): string {
    return value == null ? '待选择' : `${value} ${unit}`
  }

  async function validate(): Promise<boolean> {
    if (attachmentUploadRef.value?.hasPendingUpload()) {
      ElMessage.warning('请等待附件上传完成后再继续')
      return false
    }
    try {
      await formRef.value?.validate()
      return true
    } catch {
      return false
    }
  }

  defineExpose({ validate })
</script>

<style scoped lang="scss">
  .order-config {
    display: grid;
    gap: var(--art-space-5);

    &__intro,
    &__section-heading {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-3);
      align-items: center;
      justify-content: space-between;
    }

    &__intro strong {
      font-size: var(--art-font-size-section-title);
      color: var(--el-text-color-primary);
    }

    &__intro p,
    &__section-heading span {
      margin: 4px 0 0;
      font-size: var(--art-font-size-caption);
      color: var(--el-text-color-secondary);
    }

    &__section-heading strong,
    &__section-heading span {
      display: block;
    }

    &__section-heading strong {
      color: var(--el-text-color-primary);
    }

    &__vehicle {
      display: grid;
      gap: var(--art-space-3);
    }

    &__vehicle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(142px, 1fr));
      gap: var(--art-space-3);
    }

    &__vehicle-card {
      display: grid;
      gap: 2px;
      justify-items: center;
      min-width: 0;
      padding: var(--art-space-2);
      color: var(--el-text-color-regular);
      cursor: pointer;
      background: var(--art-gray-100);
      border: 1px solid var(--el-border-color-lighter);
      border-radius: var(--art-control-radius);
      transition:
        background-color var(--art-motion-duration-fast) var(--art-motion-ease-out),
        border-color var(--art-motion-duration-fast) var(--art-motion-ease-out);
    }

    &__vehicle-card:hover,
    &__vehicle-card.is-selected {
      background: color-mix(in srgb, var(--theme-color) 9%, var(--default-box-color));
      border-color: var(--theme-color);
    }

    &__vehicle-card:focus-visible {
      outline: 2px solid var(--theme-color);
      outline-offset: 2px;
    }

    &__vehicle-card strong {
      font-size: 13px;
      color: var(--el-text-color-primary);
    }

    &__vehicle-card small {
      color: var(--el-text-color-secondary);
    }

    &__vehicle-validation {
      margin: -12px 0 0;

      :deep(.el-form-item__content) {
        line-height: 1.4;
      }
    }

    &__selected-vehicle {
      font-size: var(--art-font-size-caption);
      color: var(--el-text-color-secondary);
    }

    &__metrics {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-3);
      padding: var(--art-space-3);
      background: var(--art-gray-100);
      border-radius: var(--art-control-radius);
    }

    &__metrics span {
      color: var(--el-text-color-secondary);
    }

    &__metrics strong {
      margin-left: 4px;
      font-variant-numeric: tabular-nums;
      color: var(--el-text-color-primary);
    }

    &__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 var(--art-space-4);
    }

    &__wide {
      grid-column: 1 / -1;
    }

    &__temperature {
      display: flex;
      gap: var(--art-space-2);
      align-items: center;
      width: 100%;
    }

    &__temperature :deep(.el-input-number) {
      flex: 1;
      min-width: 0;
    }

    &__checks {
      display: flex;
      flex-wrap: wrap;
      gap: var(--art-space-2) var(--art-space-4);
    }

    &__attachments {
      display: grid;
      gap: var(--art-space-3);
      padding-top: var(--art-space-4);
      border-top: 1px solid var(--el-border-color-lighter);
    }

    &__hint {
      padding: var(--art-space-3);
      margin: 0;
      color: var(--el-text-color-secondary);
      background: var(--art-gray-100);
      border-radius: var(--art-control-radius);
    }

    &__hint.is-error {
      color: var(--el-color-danger);
    }

    :deep(.el-select),
    :deep(.el-input-number) {
      width: 100%;
    }
  }

  @media (width <= 1000px) {
    .order-config__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 640px) {
    .order-config__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
