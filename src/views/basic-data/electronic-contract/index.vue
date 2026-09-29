<template>
  <div class="business-workspace-page art-full-height">
    <BusinessWorkspaceHeader
      eyebrow="ELECTRONIC CONTRACTS"
      title="电子合同"
      description="管理合同有效期、签署双方与电子附件，通过合同号快速核查完整内容。"
      icon="ri:file-shield-2-line"
      :tags="[
        { label: '按月自动编号', type: 'primary' },
        { label: '签署状态', type: 'info' }
      ]"
    >
      <template #actions><BusinessTableWorkspaceActions :table="tableRef" /></template>
    </BusinessWorkspaceHeader>
    <ArtTableQuery
      ref="tableRef"
      v-model="search"
      :search-items="searchItems"
      :api-fn="fetchTable"
      :columns-factory="columnsFactory"
      :header-actions="headerActions"
      header-actions-placement="workspace"
      :search-bar-props="{ span: 8, labelWidth: 82, showExpand: false }"
      :table-props="{
        rowKey: 'id',
        emptyText: '暂无电子合同',
        emptyDescription: '创建合同后，系统自动生成合同号并保留双方与有效期信息。'
      }"
      focusable
    />
    <ElectronicContractDialog ref="formDialogRef" @success="() => tableRef?.refreshCreate()" />
    <ArtDialog ref="detailDialogRef" size="xl" :show-footer="false" @closed="clearDetailQuery">
      <template v-if="detail">
        <ArtSectionTitle>合同摘要</ArtSectionTitle>
        <ArtDescriptions :data="detail" :items="detailItems" :columns="3" />
        <ArtSectionTitle class="mt-5">签署双方</ArtSectionTitle>
        <ArtDescriptions :data="detail" :items="partyItems" :columns="3" />
        <ArtSectionTitle class="mt-5">合同内容</ArtSectionTitle>
        <div
          class="prose max-w-none break-words rounded-md bg-[var(--el-fill-color-extra-light)] px-5 py-4 text-sm leading-7 text-[var(--el-text-color-primary)]"
          v-html="safeContent"
        />
        <ArtSectionTitle class="mt-5">附件</ArtSectionTitle>
        <ArtUploadFile
          v-if="detail.attachments.length"
          :model-value="detail.attachments"
          title="合同附件"
          :limit="10"
          multiple
          readonly
        />
        <ArtEmptyState v-else title="暂无附件" :visual-size="72" size="compact" />
      </template>
    </ArtDialog>
  </div>
</template>

<script setup lang="tsx">
  import DOMPurify from 'dompurify'
  import { RouterLink } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import ArtButtonTable from '@/components/core/forms/art-button-table/index.vue'
  import ArtDialog from '@/components/core/dialogs/art-dialog/index.vue'
  import type { ArtDialogExpose } from '@/components/core/dialogs/art-dialog/types'
  import ArtDescriptions from '@/components/core/base/art-descriptions/index.vue'
  import type { ArtDescriptionItem } from '@/components/core/base/art-descriptions/types'
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'
  import ArtEmptyState from '@/components/core/feedback/art-empty-state/index.vue'
  import ArtUploadFile from '@/components/core/forms/art-upload-file/index.vue'
  import BusinessWorkspaceHeader from '@/components/business/business-workspace-header/index.vue'
  import BusinessTableWorkspaceActions from '@/components/business/business-table-workspace-actions/index.vue'
  import BusinessTableRowActions from '@/components/business/business-table-row-actions/index.vue'
  import type { SearchFormItem } from '@/components/core/forms/art-search-bar/index.vue'
  import type {
    ArtTableQueryExpose,
    ArtTableQueryHeaderAction
  } from '@/components/core/tables/art-table-query/index.vue'
  import { useUserStore } from '@/store/modules/user'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import type { ColumnOption } from '@/types'
  import { pageInfoHandler } from '@/utils/table/tableUtils'
  import { formatWithDayjs } from '@/utils/time'
  import {
    copyElectronicContract,
    deleteTmsBasicRecords,
    fetchElectronicContractDetail,
    fetchElectronicContractList,
    terminateElectronicContract,
    type ElectronicContractRecord,
    type ElectronicContractSearch
  } from '@tms/api'
  import ElectronicContractDialog from './modules/electronic-contract-dialog.vue'

  defineOptions({ name: 'TmsElectronicContract' })

  const route = useRoute()
  const router = useRouter()
  const { confirmAction } = useArtFeedback()
  const userStore = useUserStore()
  const { getDictMap } = storeToRefs(userStore)
  const tableRef = ref<ArtTableQueryExpose>()
  const formDialogRef = ref<InstanceType<typeof ElectronicContractDialog>>()
  const detailDialogRef = ref<ArtDialogExpose<ElectronicContractRecord>>()
  const detail = ref<ElectronicContractRecord>()
  const safeContent = computed(() => DOMPurify.sanitize(detail.value?.contentHtml || ''))
  const search = reactive<ElectronicContractSearch>({
    contractNo: '',
    contractName: '',
    status: ''
  })

  onMounted(() => void userStore.ensureDictLoaded('tmsElectronicContractStatus'))
  const statusOptions = computed(() => getDictMap.value.tmsElectronicContractStatus ?? [])

  const searchItems = computed<SearchFormItem[]>(() => [
    {
      label: '合同号',
      key: 'contractNo',
      type: 'input',
      props: { clearable: true, placeholder: '请输入合同号' }
    },
    {
      label: '合同名称',
      key: 'contractName',
      type: 'input',
      props: { clearable: true, placeholder: '请输入合同名称' }
    },
    {
      label: '合同状态',
      key: 'status',
      type: 'select',
      props: { options: statusOptions.value, clearable: true }
    }
  ])

  const detailItems: ArtDescriptionItem<ElectronicContractRecord>[] = [
    { key: 'contractNo', label: '合同号', field: 'contractNo', copyable: true },
    { key: 'contractName', label: '合同名称', field: 'contractName' },
    {
      key: 'status',
      label: '合同状态',
      field: 'status',
      dictCode: 'tmsElectronicContractStatus'
    },
    { key: 'startsOn', label: '起始日期', field: 'startsOn' },
    { key: 'endsOn', label: '终止日期', field: 'endsOn' },
    { key: 'createBy', label: '创建人', field: 'createBy' },
    {
      key: 'createTime',
      label: '创建时间',
      value: (row: ElectronicContractRecord) => formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')
    }
  ]
  const partyItems: ArtDescriptionItem<ElectronicContractRecord>[] = [
    { key: 'partyACompany', label: '甲方公司', field: 'partyACompany' },
    { key: 'partyARepresentative', label: '甲方代表人', field: 'partyARepresentative' },
    { key: 'partyASubject', label: '甲方主体', field: 'partyASubject' },
    { key: 'partyBCompany', label: '乙方公司', field: 'partyBCompany' },
    { key: 'partyBRepresentative', label: '乙方代表人', field: 'partyBRepresentative' },
    { key: 'partyBSubject', label: '乙方主体', field: 'partyBSubject' }
  ]

  const columnsFactory = (): ColumnOption<ElectronicContractRecord>[] => [
    { type: 'selection', width: 50, fixed: 'left', reserveSelection: true },
    { type: 'globalIndex', label: '序号', width: 68, fixed: 'left' },
    {
      prop: 'contractNo',
      label: '合同号',
      minWidth: 190,
      fixed: 'left',
      formatter: (row) => (
        <RouterLink
          class="font-semibold text-[var(--el-color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--el-color-primary)]"
          to={{ name: 'TmsElectronicContract', query: { contractId: row.id } }}
          title={`查看合同 ${row.contractNo}`}
        >
          {row.contractNo}
        </RouterLink>
      )
    },
    { prop: 'contractName', label: '合同名称', minWidth: 210, showOverflowTooltip: true },
    { prop: 'partyACompany', label: '甲方公司', minWidth: 195, showOverflowTooltip: true },
    { prop: 'partyASubject', label: '甲方主体', minWidth: 165, showOverflowTooltip: true },
    { prop: 'partyBCompany', label: '乙方公司', minWidth: 195, showOverflowTooltip: true },
    { prop: 'partyBSubject', label: '乙方主体', minWidth: 165, showOverflowTooltip: true },
    { prop: 'startsOn', label: '起始日期', width: 120 },
    { prop: 'endsOn', label: '终止日期', width: 120 },
    {
      prop: 'status',
      label: '合同状态',
      width: 112,
      dict: { code: 'tmsElectronicContractStatus', display: 'auto' }
    },
    { prop: 'createBy', label: '创建人', width: 125, showOverflowTooltip: true },
    {
      prop: 'createTime',
      label: '创建时间',
      width: 166,
      formatter: (row) => formatWithDayjs(row.createTime, 'YYYY-MM-DD HH:mm')
    },
    {
      prop: 'operation',
      label: '操作',
      width: 132,
      fixed: 'right',
      formatter: (row) => (
        <BusinessTableRowActions>
          <ArtButtonTable
            type="view"
            permission="TmsElectronicContract:View"
            onClick={() => void showDetail(row)}
          />
          <ArtButtonTable
            type="sign"
            icon="ri:stop-circle-line"
            label="终止"
            permission="TmsElectronicContract:Terminate"
            disabled={row.status === 'terminated'}
            onClick={() => void terminate(row)}
          />
        </BusinessTableRowActions>
      )
    }
  ]

  const headerActions = computed<ArtTableQueryHeaderAction[]>(() => [
    {
      permission: 'TmsElectronicContract:Add',
      type: 'add',
      label: '创建合同',
      onClick: () => void formDialogRef.value?.handleOpen()
    },
    {
      permission: 'TmsElectronicContract:Copy',
      key: 'copy',
      label: '复制',
      icon: 'ri:file-copy-line',
      selectionRequired: true,
      disabled: ({ selectedCount }) => selectedCount !== 1,
      onClick: async ({ selectedRows, api }) => {
        await copyElectronicContract((selectedRows as ElectronicContractRecord[])[0].id)
        await api.refreshCreate()
      }
    },
    {
      permission: 'TmsElectronicContract:Delete',
      type: 'delete',
      content: ({ selectedCount }: { selectedCount: number }) =>
        `确定删除选中的 ${selectedCount} 份电子合同吗？`,
      onClick: async ({ selectedRows, api }) => {
        await deleteTmsBasicRecords(
          'tms_electronic_contract',
          (selectedRows as ElectronicContractRecord[]).map((row) => row.id)
        )
        await api.refreshRemove()
      }
    }
  ])

  const fetchTable = (params: ElectronicContractSearch & { current: number; size: number }) => {
    const { from, to } = pageInfoHandler({ current: params.current, size: params.size })
    return fetchElectronicContractList({ ...params, from, to })
  }

  const showDetail = async (row: ElectronicContractRecord): Promise<void> => {
    await router.push({
      name: 'TmsElectronicContract',
      query: { ...route.query, contractId: row.id }
    })
  }

  watch(
    () => route.query.contractId,
    async (value) => {
      if (!value || typeof value !== 'string') return
      const result = await fetchElectronicContractDetail(value)
      if (!result.data) return
      detail.value = result.data
      await detailDialogRef.value?.handleOpen(result.data, {
        title: `电子合同 · ${result.data.contractNo}`
      })
    },
    { immediate: true }
  )

  const clearDetailQuery = (): void => {
    if (!route.query.contractId) return
    const query = { ...route.query }
    delete query.contractId
    void router.replace({ name: 'TmsElectronicContract', query })
  }

  const terminate = async (row: ElectronicContractRecord): Promise<void> => {
    try {
      await confirmAction(`确定终止合同“${row.contractNo}”吗？终止后状态将不可恢复。`, '终止合同', {
        confirmButtonText: '终止合同',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await terminateElectronicContract(row.id)
      await tableRef.value?.refreshUpdate()
    } catch {
      // 用户取消或服务端拒绝时保留当前记录。
    }
  }
</script>
