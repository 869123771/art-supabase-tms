<template>
  <ArtDialog ref="dialogRef" size="lg">
    <ElAlert
      class="mb-4"
      type="info"
      :closable="false"
      title="请核对司机身份与所属组织，拉黑原因会与登记时间一同保留。"
    />
    <ArtForm
      ref="formRef"
      v-model="form"
      :items="formItems"
      :rules="rules"
      :span="12"
      :gutter="20"
      label-width="100px"
      :show-reset="false"
      :show-submit="false"
      scroll-to-error
    />
  </ArtDialog>
</template>

<script setup lang="ts">
  import dayjs from 'dayjs'
  import type { FormRules } from 'element-plus'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtForm, { type FormItem } from '@/components/core/forms/art-form/index.vue'
  import { normalizeNullableText } from '@/utils/form/normalize'
  import { addDriverBlacklist, type BlacklistInput } from '@tms/api'
  import { useBasicRecordTenant } from '../../modules/basic-record-tenant'

  defineOptions({ name: 'TmsDriverBlacklistDialog' })

  interface FormExpose {
    validate: () => Promise<boolean>
    clearValidate: () => void
  }

  const emit = defineEmits<{ success: [] }>()
  const { needsTenantChoice, tenantField, selectedTenantId } = useBasicRecordTenant()
  const dialogRef = ref<ArtDialogExpose>()
  const formRef = ref<FormExpose>()
  const initialForm = (): BlacklistInput => ({
    tenantId: selectedTenantId.value,
    driverName: '',
    phone: '',
    organizationName: '',
    blacklistedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    reason: '',
    remark: null
  })
  const form = reactive<BlacklistInput>(initialForm())

  const formItems = computed<FormItem[]>(() => [
    ...tenantField.value,
    {
      label: '司机姓名',
      key: 'driverName',
      type: 'input',
      props: { maxlength: 80, clearable: true }
    },
    { label: '手机号', key: 'phone', type: 'input', props: { maxlength: 11, clearable: true } },
    {
      label: '所属组织',
      key: 'organizationName',
      type: 'input',
      span: 24,
      props: { maxlength: 120, clearable: true, placeholder: '请输入司机所属公司或组织' }
    },
    {
      label: '拉黑时间',
      key: 'blacklistedAt',
      type: 'date',
      props: { type: 'datetime', valueFormat: 'YYYY-MM-DD HH:mm:ss', placeholder: '选择拉黑时间' }
    },
    {
      label: '拉黑原因',
      key: 'reason',
      type: 'input',
      span: 24,
      props: { type: 'textarea', rows: 3, maxlength: 500, showWordLimit: true }
    },
    {
      label: '备注',
      key: 'remark',
      type: 'input',
      span: 24,
      props: { type: 'textarea', rows: 2, maxlength: 500, showWordLimit: true }
    }
  ])
  const rules = computed<FormRules<BlacklistInput>>(() => ({
    tenantId: needsTenantChoice.value
      ? [{ required: true, message: '请选择所属租户', trigger: 'change' }]
      : [],
    driverName: [{ required: true, message: '请输入司机姓名', trigger: 'blur' }],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
    ],
    organizationName: [{ required: true, message: '请输入所属组织', trigger: 'blur' }],
    blacklistedAt: [{ required: true, message: '请选择拉黑时间', trigger: 'change' }],
    reason: [{ required: true, message: '请输入拉黑原因', trigger: 'blur' }]
  }))

  const handleSubmit = async (): Promise<boolean> => {
    try {
      await formRef.value?.validate()
    } catch {
      return false
    }
    try {
      await addDriverBlacklist({
        ...form,
        driverName: form.driverName.trim(),
        phone: form.phone.trim(),
        organizationName: form.organizationName.trim(),
        reason: form.reason.trim(),
        remark: normalizeNullableText(form.remark),
        blacklistedAt: new Date(form.blacklistedAt.replace(' ', 'T')).toISOString()
      })
      emit('success')
      return true
    } catch {
      return false
    }
  }

  const handleOpen = async (): Promise<void> => {
    Object.assign(form, initialForm())
    await dialogRef.value?.handleOpen(undefined, {
      title: '新增黑名单',
      subtitle: '登记后可在列表中查看与导出，提交前请确认手机号和拉黑原因。',
      onOpen: async () => {
        await nextTick()
        formRef.value?.clearValidate()
      },
      onConfirm: handleSubmit
    })
  }

  defineExpose({ handleOpen })
</script>
