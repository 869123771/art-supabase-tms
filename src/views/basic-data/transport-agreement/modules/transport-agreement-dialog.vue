<template>
  <ArtDialog ref="dialogRef" size="xl">
    <div
      class="mb-4 rounded-md bg-[var(--el-color-primary-light-9)] px-4 py-3 text-sm text-[var(--el-text-color-primary)]"
    >
      协议号保存时自动生成；承运方来自承运商管理，车辆信息来自车辆档案。
    </div>
    <ArtForm
      ref="formRef"
      :model-value="form"
      @update:model-value="replaceReactiveModel(form, $event)"
      :items="formItems"
      :rules="rules"
      :span="8"
      :gutter="20"
      label-width="118px"
      :show-reset="false"
      :show-submit="false"
      scroll-to-error
    >
      <template #contentHtml>
        <ArtTiptapEditor
          v-model="form.contentHtml"
          :resource-tenant-id="form.tenantId"
          height="280px"
          placeholder="请输入运输责任、费用及履约约定…"
        />
      </template>
      <template #idCardImages>
        <ArtUploadImage
          v-model="form.idCardImages"
          :resource-tenant-id="form.tenantId"
          :readonly="!form.tenantId"
          title="身份证"
          :size="104"
          :limit="3"
          multiple
        />
      </template>
      <template #registrationImages>
        <ArtUploadImage
          v-model="form.registrationImages"
          :resource-tenant-id="form.tenantId"
          :readonly="!form.tenantId"
          title="行驶证"
          :size="104"
          :limit="3"
          multiple
        />
      </template>
      <template #driverLicenseImage>
        <ArtUploadImage
          v-model="form.driverLicenseImage"
          :resource-tenant-id="form.tenantId"
          :readonly="!form.tenantId"
          title="驾驶证"
          :size="104"
          :limit="1"
        />
      </template>
      <template #roadPermitImage>
        <ArtUploadImage
          v-model="form.roadPermitImage"
          :resource-tenant-id="form.tenantId"
          :readonly="!form.tenantId"
          title="道路运输证"
          :size="104"
          :limit="1"
        />
      </template>
    </ArtForm>
  </ArtDialog>
</template>

<script setup lang="ts">
  import { replaceReactiveModel } from '@/utils/form/model'
  import { validateArtFormForSubmit } from '@/utils/form/validate-art-form'
  import { notifyFriendlyError } from '@/hooks/core/useArtFeedback'
  import type { FormRules } from 'element-plus'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import ArtTiptapEditor from '@/components/core/forms/art-tiptap-editor/index.vue'
  import ArtUploadImage from '@/components/core/forms/art-upload-image/index.vue'
  import { useUserStore } from '@/store/modules/user'
  import {
    addTransportAgreement,
    editTransportAgreement,
    fetchBasicRecordCarrierOptions,
    fetchTmsVehicleOptions,
    type TransportAgreementInput,
    type TransportAgreementRecord
  } from '@tms/api'
  import { useBasicRecordTenant } from '../../modules/basic-record-tenant'

  defineOptions({ name: 'TmsTransportAgreementDialog' })

  type AgreementForm = TransportAgreementInput & {
    carrierName: string
    plateNo: string
    vehicleType: string
    vehicleLengthText: string
  }
  interface FormExpose {
    validate: () => Promise<boolean>
    clearValidate: () => void
    reloadOptions: (key?: string) => Promise<unknown>
  }

  const emit = defineEmits<{ success: [mode: 'add' | 'edit'] }>()
  const userStore = useUserStore()
  onMounted(() => void userStore.ensureDictLoaded('tmsTransportAgreementStatus'))
  const { needsTenantChoice, tenantField, selectedTenantId } = useBasicRecordTenant()
  const dialogRef = ref<ArtDialogExpose<TransportAgreementRecord | undefined>>()
  const formRef = ref<FormExpose>()
  const editingId = ref('')
  const hydrating = ref(false)
  const carrierLoadVersion = ref(0)
  const vehicleLoadVersion = ref(0)
  const initialForm = (): AgreementForm => ({
    tenantId: selectedTenantId.value,
    shipperName: '',
    carrierId: '',
    carrierName: '',
    contactPhone: '',
    vehicleId: '',
    plateNo: '',
    vehicleType: '',
    vehicleLengthText: '',
    startsOn: '',
    endsOn: '',
    status: 'signed',
    contentHtml: '',
    idCardImages: [],
    registrationImages: [],
    driverLicenseImage: null,
    roadPermitImage: null,
    partyASeal: '',
    partyARepresentative: '',
    partyASignedOn: '',
    partyBSeal: '',
    partyBRepresentative: '',
    partyBSignedOn: ''
  })
  const form = reactive<AgreementForm>(initialForm())

  watch(
    () => form.tenantId,
    async () => {
      if (hydrating.value) return
      form.carrierId = ''
      if (needsTenantChoice.value) await formRef.value?.reloadOptions('carrierId')
    }
  )
  watch(
    () => form.carrierId,
    async (id) => {
      if (hydrating.value) return
      const version = ++carrierLoadVersion.value
      form.carrierName = ''
      form.partyBRepresentative = ''
      form.vehicleId = ''
      if (id) {
        const { data } = await fetchBasicRecordCarrierOptions(form.tenantId)
        if (version !== carrierLoadVersion.value) return
        const carrier = (data ?? []).find((item) => item.id === id)
        form.carrierName = carrier?.companyName ?? ''
        form.partyBRepresentative = carrier?.legalRepresentative || carrier?.contactName || ''
      }
      await formRef.value?.reloadOptions('vehicleId')
    }
  )
  watch(
    () => form.vehicleId,
    async (id) => {
      if (hydrating.value) return
      const version = ++vehicleLoadVersion.value
      form.plateNo = ''
      form.vehicleType = ''
      form.vehicleLengthText = ''
      if (!id || !form.carrierId) return
      const { data } = await fetchTmsVehicleOptions({ carrierId: form.carrierId })
      if (version !== vehicleLoadVersion.value) return
      const vehicle = (data ?? []).find((item) => item.id === id)
      form.plateNo = vehicle?.plateNo ?? ''
      form.vehicleType = vehicle?.vehicleType ?? ''
      form.vehicleLengthText = '车辆档案未维护'
    }
  )

  const formItems = computed<FormItem[]>(() => [
    ...tenantField.value,
    { label: '运输信息', key: 'transportSection', type: 'divider', span: 24 },
    { label: '托运方', key: 'shipperName', type: 'input', span: 12, props: { maxlength: 120 } },
    {
      label: '承运方',
      key: 'carrierId',
      type: 'select',
      span: 12,
      api: () => fetchBasicRecordCarrierOptions(form.tenantId),
      resultField: 'data',
      labelField: 'companyName',
      valueField: 'id',
      props: { filterable: true, clearable: true, placeholder: '从承运商管理选择' }
    },
    { label: '联系电话', key: 'contactPhone', type: 'input', props: { maxlength: 30 } },
    {
      label: '车牌号',
      key: 'vehicleId',
      type: 'select',
      api: () => fetchTmsVehicleOptions({ carrierId: form.carrierId }),
      resultField: 'data',
      labelField: 'plateNo',
      valueField: 'id',
      props: {
        filterable: true,
        clearable: true,
        disabled: !form.carrierId,
        placeholder: form.carrierId ? '从车辆档案选择' : '请先选择承运方'
      }
    },
    {
      label: '车型',
      key: 'vehicleType',
      type: 'input',
      props: { disabled: true, placeholder: '选择车辆后自动带入' }
    },
    {
      label: '车长',
      key: 'vehicleLengthText',
      type: 'input',
      props: { disabled: true, placeholder: '选择车辆后自动带入' }
    },
    {
      label: '协议开始时间',
      key: 'startsOn',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择开始时间' }
    },
    {
      label: '协议结束时间',
      key: 'endsOn',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择结束时间' }
    },
    {
      label: '协议状态',
      key: 'status',
      type: 'select',
      hidden: !editingId.value,
      props: {
        options: userStore.getDictMap.tmsTransportAgreementStatus ?? [],
        placeholder: '请选择协议状态'
      }
    },
    { label: '协议内容', key: 'contentHtml', span: 24 },
    { label: '证件附件', key: 'documentsSection', type: 'divider', span: 24 },
    { label: '身份证（最多 3 张）', key: 'idCardImages', span: 12 },
    { label: '行驶证（最多 3 张）', key: 'registrationImages', span: 12 },
    { label: '驾驶证', key: 'driverLicenseImage', span: 12 },
    { label: '道路运输证', key: 'roadPermitImage', span: 12 },
    { label: '签署信息', key: 'signSection', type: 'divider', span: 24 },
    {
      label: '甲方（盖章）',
      key: 'partyASeal',
      type: 'input',
      span: 12,
      props: { maxlength: 120 }
    },
    {
      label: '甲方代表人',
      key: 'partyARepresentative',
      type: 'input',
      span: 12,
      props: { maxlength: 80 }
    },
    {
      label: '甲方签订日期',
      key: 'partyASignedOn',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择日期' }
    },
    {
      label: '乙方（盖章）',
      key: 'partyBSeal',
      type: 'input',
      span: 12,
      props: { maxlength: 120 }
    },
    {
      label: '乙方代表人',
      key: 'partyBRepresentative',
      type: 'input',
      span: 12,
      props: { maxlength: 80, placeholder: '选择承运商后自动带入，可调整' }
    },
    {
      label: '乙方签订日期',
      key: 'partyBSignedOn',
      type: 'date',
      props: { valueFormat: 'YYYY-MM-DD', placeholder: '请选择日期' }
    }
  ])
  const rules = computed<FormRules<AgreementForm>>(() => ({
    tenantId: needsTenantChoice.value
      ? [{ required: true, message: '请选择所属租户', trigger: 'change' }]
      : [],
    shipperName: [{ required: true, message: '请输入托运方', trigger: 'blur' }],
    carrierId: [{ required: true, message: '请选择承运方', trigger: 'change' }],
    contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
    vehicleId: [{ required: true, message: '请选择车牌号', trigger: 'change' }],
    startsOn: [{ required: true, message: '请选择协议开始时间', trigger: 'change' }],
    endsOn: [{ required: true, message: '请选择协议结束时间', trigger: 'change' }],
    contentHtml: [{ required: true, message: '请输入协议内容', trigger: 'change' }],
    partyASeal: [{ required: true, message: '请输入甲方（盖章）', trigger: 'blur' }],
    partyARepresentative: [{ required: true, message: '请输入甲方代表人', trigger: 'blur' }],
    partyASignedOn: [{ required: true, message: '请选择甲方签订日期', trigger: 'change' }],
    partyBSeal: [{ required: true, message: '请输入乙方（盖章）', trigger: 'blur' }],
    partyBRepresentative: [{ required: true, message: '请输入乙方代表人', trigger: 'blur' }],
    partyBSignedOn: [{ required: true, message: '请选择乙方签订日期', trigger: 'change' }]
  }))

  const handleSubmit = async (): Promise<boolean> => {
    try {
      if (!(await validateArtFormForSubmit(formRef.value))) return false
      if (form.endsOn && form.startsOn && form.endsOn < form.startsOn) {
        ElMessage.warning('协议结束时间不能早于开始时间')
        return false
      }
      const payload: TransportAgreementInput = {
        tenantId: form.tenantId,
        shipperName: form.shipperName.trim(),
        carrierId: form.carrierId,
        contactPhone: form.contactPhone.trim(),
        vehicleId: form.vehicleId,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
        status: form.status,
        contentHtml: form.contentHtml,
        idCardImages: form.idCardImages,
        registrationImages: form.registrationImages,
        driverLicenseImage: form.driverLicenseImage,
        roadPermitImage: form.roadPermitImage,
        partyASeal: form.partyASeal.trim(),
        partyARepresentative: form.partyARepresentative.trim(),
        partyASignedOn: form.partyASignedOn,
        partyBSeal: form.partyBSeal.trim(),
        partyBRepresentative: form.partyBRepresentative.trim(),
        partyBSignedOn: form.partyBSignedOn
      }
      if (editingId.value) await editTransportAgreement(editingId.value, payload)
      else await addTransportAgreement(payload)
      emit('success', editingId.value ? 'edit' : 'add')
      return true
    } catch (error) {
      notifyFriendlyError(error, '运输协议保存失败，请检查签约信息后重试')
      return false
    }
  }

  const handleOpen = async (row?: TransportAgreementRecord): Promise<void> => {
    editingId.value = row?.id ?? ''
    hydrating.value = true
    Object.assign(form, initialForm())
    if (row) {
      Object.assign(form, {
        tenantId: row.tenantId,
        shipperName: row.shipperName,
        carrierId: row.carrierId,
        carrierName: row.carrierName,
        contactPhone: row.contactPhone,
        vehicleId: row.vehicleId,
        plateNo: row.plateNo,
        vehicleType: row.vehicleType ?? '',
        vehicleLengthText: row.vehicleLengthM ? `${row.vehicleLengthM} m` : '车辆档案未维护',
        startsOn: row.startsOn || '',
        endsOn: row.endsOn || '',
        status: row.status,
        contentHtml: row.contentHtml,
        idCardImages: [...row.idCardImages],
        registrationImages: [...row.registrationImages],
        driverLicenseImage: row.driverLicenseImage,
        roadPermitImage: row.roadPermitImage,
        partyASeal: row.partyASeal,
        partyARepresentative: row.partyARepresentative,
        partyASignedOn: row.partyASignedOn,
        partyBSeal: row.partyBSeal,
        partyBRepresentative: row.partyBRepresentative,
        partyBSignedOn: row.partyBSignedOn
      })
    }
    await nextTick()
    hydrating.value = false
    await dialogRef.value?.handleOpen(row, {
      title: row ? `编辑运输协议 · ${row.agreementNo}` : '新增运输协议',
      subtitle: '运输信息、证件与双方签署资料。',
      contentMaxHeight: 'calc(100vh - 160px)',
      onOpen: async () => {
        await nextTick()
        await formRef.value?.reloadOptions('carrierId')
        if (row) await formRef.value?.reloadOptions('vehicleId')
        formRef.value?.clearValidate()
      },
      onConfirm: handleSubmit
    })
  }

  defineExpose({ handleOpen })
</script>
