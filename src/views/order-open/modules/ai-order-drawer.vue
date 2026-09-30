<template>
  <ArtDrawer ref="drawerRef">
    <div class="ai-order-drawer">
      <section class="ai-order-drawer__hero art-card-xs">
        <div class="ai-order-drawer__hero-icon">
          <ArtSvgIcon icon="ri:sparkling-2-line" />
        </div>
        <div class="ai-order-drawer__hero-copy">
          <span>AI 智能开单</span>
          <h2>把聊天和图片快速变成可开单资料</h2>
          <p>提取客户、路线、货物、结算与运输配置，核对后回填当前订单。</p>
        </div>
        <div class="ai-order-drawer__progress" aria-label="智能填单进度">
          <div class="is-complete"><strong>1</strong><span>提供资料</span></div>
          <div :class="{ 'is-complete': state.analysis }"
            ><strong>2</strong><span>识别核对</span></div
          >
          <div :class="{ 'is-complete': state.analysis && !masterDataTasks.length }">
            <strong>3</strong><span>建档填单</span>
          </div>
        </div>
      </section>

      <div v-if="!effectiveTenantId" class="ai-order-drawer__tenant-target art-card-xs">
        <div>
          <strong>选择建档租户</strong>
          <p>一键建档需要明确目标租户；选择后会按该租户重新匹配已有档案。</p>
        </div>
        <PlatformTenantScopeSwitcher />
      </div>

      <div v-if="!state.analysis" class="ai-order-drawer__start-grid">
        <AiOrderSourcePanel
          v-model="form.data"
          :analyzing="state.analyzing"
          :generating-example="state.generatingExample"
          :error-message="state.errorMessage"
          :notice-message="state.noticeMessage"
          @analyze="handleAnalyze"
          @generate-example="handleGenerateExample"
        />

        <ArtSectionCard
          class="ai-order-drawer__guide"
          preserve-content-structure
          title="识别前了解"
        >
          <div class="ai-order-drawer__guide-list">
            <div>
              <ArtSvgIcon
                class="ai-order-drawer__guide-icon"
                icon="ri:file-search-line"
                aria-hidden="true"
              />
              <span><b>提取开单信息</b><small>识别路线、联系人、货品、费用与运输配置</small></span>
            </div>
            <div>
              <ArtSvgIcon
                class="ai-order-drawer__guide-icon"
                icon="ri:links-line"
                aria-hidden="true"
              />
              <span><b>匹配已有档案</b><small>对照站点、客户、地址及货物资料</small></span>
            </div>
            <div>
              <ArtSvgIcon
                class="ai-order-drawer__guide-icon"
                icon="ri:checkbox-circle-line"
                aria-hidden="true"
              />
              <span><b>核对后回填</b><small>检查缺失字段，整车车型和时间仍需人工确认</small></span>
            </div>
          </div>
          <ElAlert
            title="AI 不会自动保存或建档"
            description="开单仍需人工确认并保存；有对应新增权限的用户可在所属租户建档，跨租户操作须先选定目标租户。"
            type="info"
            :closable="false"
            show-icon
          />
        </ArtSectionCard>
      </div>

      <template v-else>
        <AiOrderSourcePanel
          v-if="state.sourceExpanded"
          v-model="form.data"
          :analyzing="state.analyzing"
          :generating-example="state.generatingExample"
          :error-message="state.errorMessage"
          :notice-message="state.noticeMessage"
          @analyze="handleAnalyze"
          @generate-example="handleGenerateExample"
        />

        <section v-else class="ai-order-drawer__source-summary art-card-xs">
          <div class="ai-order-drawer__source-summary-icon">
            <ArtSvgIcon icon="ri:file-list-3-line" />
          </div>
          <div>
            <span>已识别原始资料</span>
            <strong>{{ inputSummary }}</strong>
          </div>
          <div class="ai-order-drawer__source-summary-actions">
            <ElButton @click="state.sourceExpanded = true">
              <ArtSvgIcon icon="ri:edit-line" />
              编辑资料
            </ElButton>
            <ElButton type="primary" plain :loading="state.analyzing" @click="handleAnalyze">
              <ArtSvgIcon icon="ri:refresh-line" />
              重新识别
            </ElButton>
          </div>
        </section>

        <div class="ai-order-drawer__analysis-grid">
          <AiOrderResultPanel :analysis="state.analysis" :options="state.openData?.options" />
          <div class="ai-order-drawer__master-column">
            <ElAlert
              v-if="state.matchingReferences"
              title="正在匹配已有档案"
              description="识别结果已生成，正在核对站点、客户、地址和货物资料。"
              type="info"
              :closable="false"
              show-icon
            />
            <div v-else-if="state.referenceError" class="ai-order-drawer__match-error">
              <ElAlert
                title="档案匹配暂不可用"
                description="识别结果仍可核对和回填；回填后请手动选择站点、客户及货物档案。"
                type="warning"
                :closable="false"
                show-icon
              />
              <ElButton type="primary" plain @click="handleRetryReferences">重新匹配档案</ElButton>
            </div>
            <AiOrderReferencePanel
              v-else
              :analysis="state.analysis"
              :references="state.references"
            />
            <AiOrderMasterDataPanel
              v-if="masterDataTasks.length"
              v-model:selected-keys="state.selectedMasterDataKeys"
              :tasks="masterDataTasks"
              :creating="state.creatingMasterData"
            />
            <ElAlert
              v-else-if="!state.matchingReferences && !state.referenceError"
              title="无需新建基础资料"
              description="已匹配的档案会关联到订单；未识别的信息请在回填后补充。"
              type="success"
              :closable="false"
              show-icon
            />
          </div>
        </div>
      </template>
    </div>

    <template #footer="{ api, loading }">
      <ElButton @click="api.handleClose()">取消</ElButton>
      <ElButton
        v-if="masterDataTasks.length"
        type="primary"
        plain
        :loading="state.creatingMasterData"
        :disabled="!state.selectedMasterDataKeys.length || loading"
        :title="createMasterDataHint"
        @click="handleCreateMasterData(state.selectedMasterDataKeys)"
      >
        一键建档 {{ state.selectedMasterDataKeys.length }} 项
      </ElButton>
      <ElButton
        type="primary"
        :loading="loading"
        :disabled="!state.analysis || state.creatingMasterData || state.matchingReferences"
        @click="api.handleConfirm()"
      >
        填入当前订单
      </ElButton>
    </template>
  </ArtDrawer>
</template>

<script setup lang="ts">
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import { getFriendlySupabaseErrorMessage } from '@/utils/supabase'
  import { useArtFeedback } from '@/hooks/core/useArtFeedback'
  import type { UnwrapNestedRefs } from 'vue'
  import { trim } from 'lodash-es'
  import { ElMessage } from 'element-plus'
  import ArtDrawer from '@/components/core/drawers/art-drawer/index.vue'
  import type { ArtDrawerExpose } from '@/components/core/drawers/art-drawer/types'
  import PlatformTenantScopeSwitcher from '@/components/business/platform-tenant-scope-switcher/index.vue'
  import { analyzeOrderByAi, generateAiOrderExample } from '@tms/api'
  import { useAuth } from '@/hooks/core/useAuth'
  import { useTenantScopeStore } from '@/store/modules/tenantScope'
  import { getBuiltInOrderExample } from './ai-order-examples'
  import AiOrderMasterDataPanel from './ai-order-master-data-panel.vue'
  import AiOrderReferencePanel from './ai-order-reference-panel.vue'
  import AiOrderResultPanel from './ai-order-result-panel.vue'
  import AiOrderSourcePanel from './ai-order-source-panel.vue'
  import type {
    AiOrderApplyPayload,
    AiOrderDrawerOpenData,
    AiOrderInputModel,
    AiOrderMasterDataTask,
    AiOrderReferenceMatches
  } from './ai-order-types'
  import { useAiOrderMasterData } from './use-ai-order-master-data'
  import { useAiOrderReferenceMatcher } from './use-ai-order-reference-matcher'

  defineOptions({ name: 'TmsAiOrderDrawer' })

  const { confirmAction } = useArtFeedback()

  interface FormGroup {
    data: AiOrderInputModel
  }

  interface DrawerState {
    analyzing: boolean
    matchingReferences: boolean
    creatingMasterData: boolean
    generatingExample: boolean
    analysis: Api.Tms.Order.AiOrderAnalyzeResponse | null
    openData: AiOrderDrawerOpenData | null
    references: AiOrderReferenceMatches
    selectedMasterDataKeys: string[]
    sourceExpanded: boolean
    errorMessage: string
    noticeMessage: string
    referenceError: boolean
  }

  const emit = defineEmits<{
    apply: [payload: AiOrderApplyPayload]
  }>()

  const drawerRef = ref<ArtDrawerExpose<AiOrderDrawerOpenData>>()
  const { hasAuth } = useAuth()
  const { effectiveTenantId } = storeToRefs(useTenantScopeStore())
  const { resolveReferences } = useAiOrderReferenceMatcher()
  const { buildTasks, createTasks } = useAiOrderMasterData()

  const form: UnwrapNestedRefs<FormGroup> = reactive<FormGroup>({
    data: createInitialInput()
  })

  const state: UnwrapNestedRefs<DrawerState> = reactive<DrawerState>({
    analyzing: false,
    matchingReferences: false,
    creatingMasterData: false,
    generatingExample: false,
    analysis: null,
    openData: null,
    references: createEmptyReferences(),
    selectedMasterDataKeys: [],
    sourceExpanded: true,
    errorMessage: '',
    noticeMessage: '',
    referenceError: false
  })

  const masterDataTasks = computed(() => {
    if (!state.analysis || state.matchingReferences || state.referenceError) return []
    return buildTasks(state.analysis.order, state.references).map((task) => {
      const missingPermissions = task.requiredPermissions.filter(
        (permission) => !hasAuth(permission)
      )
      const reason = !effectiveTenantId.value
        ? '请先选择目标租户'
        : missingPermissions.length
          ? `缺少${missingPermissions.map((permission) => masterDataPermissionLabels[permission]).join('、')}权限`
          : undefined
      return {
        ...task,
        ready: task.ready && !reason,
        reason: task.reason || reason
      }
    })
  })
  const createMasterDataHint = computed(() => {
    if (!effectiveTenantId.value) return '请先选择目标租户'
    if (!state.selectedMasterDataKeys.length) return '请先勾选资料完整且有新增权限的项目'
    return `创建所选的 ${state.selectedMasterDataKeys.length} 项基础资料`
  })
  const inputSummary = computed(() => {
    const characterCount = trim(form.data.prompt).length
    const imageCount = form.data.imageUrls.filter(Boolean).length
    const parts = [
      characterCount ? `${characterCount} 个字` : '',
      imageCount ? `${imageCount} 张图片` : ''
    ]
    return parts.filter(Boolean).join(' · ') || '已提供资料'
  })
  let requestVersion = 0

  const masterDataPermissionLabels: Record<
    AiOrderMasterDataTask['requiredPermissions'][number],
    string
  > = {
    'TmsStation:Add': '站点新增',
    'TmsCustomer:Add': '客户新增',
    'TmsCustomerAddress:Add': '客户地址新增',
    'TmsCargo:Add': '货物新增'
  }

  watch(effectiveTenantId, (nextTenantId, previousTenantId) => {
    if (nextTenantId === previousTenantId) return

    const version = ++requestVersion
    state.references = createEmptyReferences()
    state.selectedMasterDataKeys = []
    if (state.analyzing) {
      state.analyzing = false
      state.noticeMessage = '租户范围已变化，请重新识别资料'
    }
    if (state.generatingExample) state.generatingExample = false
    if (state.analysis) {
      void matchReferences(state.analysis.order, version)
    }
  })

  async function handleOpen(data: AiOrderDrawerOpenData): Promise<void> {
    resetState(data)
    await drawerRef.value?.handleOpen(data, {
      title: 'AI 智能填单',
      size: 'min(1360px, 92vw)',
      contentHeight: 'calc(100vh - 132px)',
      onConfirm: handleApply,
      onReset: () => resetState(null),
      drawerProps: {
        appendToBody: true,
        closeOnClickModal: false,
        resizable: true
      }
    })
  }

  async function handleAnalyze(): Promise<void> {
    if (state.generatingExample || state.creatingMasterData || state.matchingReferences) return

    const prompt = trim(form.data.prompt)
    const imageUrls = form.data.imageUrls.filter(Boolean)
    if (!prompt && !imageUrls.length) {
      ElMessage.warning('请粘贴订单内容或上传订单图片')
      return
    }

    state.analyzing = true
    state.errorMessage = ''
    state.noticeMessage = ''
    state.analysis = null
    state.references = createEmptyReferences()
    state.selectedMasterDataKeys = []
    state.referenceError = false
    const version = ++requestVersion
    try {
      const { data, error } = await analyzeOrderByAi({
        prompt,
        imageUrls,
        options: state.openData?.options
      })
      if (version !== requestVersion) return
      if (error || !data?.order) {
        state.errorMessage = getFriendlySupabaseErrorMessage(error, 'AI 识别失败，请检查资料后重试')
        return
      }

      state.analysis = data
      state.sourceExpanded = false
      ElMessage.success('识别完成，请确认结果后填入订单')
      await matchReferences(data.order, version)
    } catch (error) {
      if (version === requestVersion) {
        state.errorMessage = getFriendlySupabaseErrorMessage(error, 'AI 识别失败，请检查网络后重试')
      }
    } finally {
      if (version === requestVersion) state.analyzing = false
    }
  }

  async function matchReferences(
    order: Api.Tms.Order.AiOrderDraft,
    version: number
  ): Promise<void> {
    state.matchingReferences = true
    state.referenceError = false
    try {
      const matches = await resolveReferences(order)
      if (version === requestVersion) state.references = matches
    } catch {
      if (version === requestVersion) state.referenceError = true
    } finally {
      if (version === requestVersion) state.matchingReferences = false
    }
  }

  async function handleRetryReferences(): Promise<void> {
    if (!state.analysis || state.matchingReferences) return
    await matchReferences(state.analysis.order, requestVersion)
  }

  async function handleGenerateExample(): Promise<void> {
    if (state.analyzing || state.creatingMasterData) return

    if (trim(form.data.prompt)) {
      try {
        await confirmAction('生成新示例会替换当前输入的文字，是否继续？', '替换当前内容', {
          type: 'warning',
          confirmButtonText: '继续生成',
          cancelButtonText: '取消'
        })
      } catch {
        return
      }
    }

    state.generatingExample = true
    state.errorMessage = ''
    state.noticeMessage = ''
    state.referenceError = false
    const version = ++requestVersion
    try {
      const { data, error } = await generateAiOrderExample({
        options: state.openData?.options
      })
      if (version !== requestVersion) return

      form.data.prompt = data?.prompt || getBuiltInOrderExample()
      state.analysis = null
      state.references = createEmptyReferences()
      state.sourceExpanded = true
      if (error || !data?.prompt) {
        state.noticeMessage = 'AI 示例暂时不可用，已填入内置示例。可直接修改并尝试识别。'
        return
      }
      ElMessage.success('已生成一份完整示例，可直接修改后识别')
    } catch {
      if (version === requestVersion) {
        form.data.prompt = getBuiltInOrderExample()
        state.noticeMessage = 'AI 示例暂时不可用，已填入内置示例。可直接修改并尝试识别。'
      }
    } finally {
      if (version === requestVersion) state.generatingExample = false
    }
  }

  async function handleCreateMasterData(keys: string[]): Promise<void> {
    if (!effectiveTenantId.value) {
      ElMessage.warning(createMasterDataHint.value)
      return
    }
    if (!state.analysis || !keys.length || state.creatingMasterData) return
    const targetTenantId = effectiveTenantId.value

    const selectedTasks = masterDataTasks.value.filter(
      (task) => task.ready && keys.includes(task.key)
    )
    if (!selectedTasks.length) return

    try {
      await confirmAction(
        `将创建：${selectedTasks.map((task) => task.title).join('、')}。创建后仍需确认并保存订单，是否继续？`,
        '确认一键建档',
        {
          type: 'warning',
          confirmButtonText: '确认创建',
          cancelButtonText: '取消'
        }
      )
    } catch {
      return
    }

    if (effectiveTenantId.value !== targetTenantId) {
      ElMessage.warning('租户范围已变化，请重新核对目标租户后建档')
      return
    }

    state.creatingMasterData = true
    try {
      const createdCount = await createTasks(
        state.analysis.order,
        state.references,
        selectedTasks.map((task) => task.key)
      )
      if (effectiveTenantId.value !== targetTenantId) {
        state.referenceError = true
        ElMessage.warning('建档时租户范围已变化，请重新匹配档案后继续')
        return
      }
      await matchReferences(state.analysis.order, requestVersion)
      if (state.referenceError) {
        ElMessage.warning(`已创建 ${createdCount} 项基础资料，请点击“重新匹配档案”确认关联`)
      } else {
        ElMessage.success(`已创建 ${createdCount} 项基础资料，可继续填入订单`)
      }
    } catch (error) {
      await matchReferences(state.analysis.order, requestVersion)
      ElMessage.error(
        getFriendlySupabaseErrorMessage(error, '建档结果未确认，请核对档案匹配结果后重试')
      )
    } finally {
      state.creatingMasterData = false
    }
  }

  function handleApply(): boolean {
    if (!state.analysis) {
      ElMessage.warning('请先完成智能识别')
      return false
    }
    if (state.matchingReferences) {
      ElMessage.warning('请等待档案匹配完成')
      return false
    }

    emit('apply', {
      analysis: state.analysis,
      references: state.references
    })
    return true
  }

  function createInitialInput(): AiOrderInputModel {
    return { prompt: '', imageUrls: [] }
  }

  function createEmptyReferences(): AiOrderReferenceMatches {
    return {
      originStation: { status: 'empty' },
      destinationStation: { status: 'empty' },
      transferStation: { status: 'empty' },
      shippingCustomer: { status: 'empty' },
      receivingCustomer: { status: 'empty' },
      shippingAddress: { status: 'empty' },
      receivingAddress: { status: 'empty' },
      cargoItems: []
    }
  }

  function resetState(data: AiOrderDrawerOpenData | null): void {
    requestVersion += 1
    Object.assign(form.data, createInitialInput())
    Object.assign(state, {
      analyzing: false,
      matchingReferences: false,
      creatingMasterData: false,
      generatingExample: false,
      analysis: null,
      openData: data,
      references: createEmptyReferences(),
      selectedMasterDataKeys: [],
      sourceExpanded: true,
      errorMessage: '',
      noticeMessage: '',
      referenceError: false
    })
  }

  defineExpose({ handleOpen })
</script>

<style scoped lang="scss">
  .ai-order-drawer {
    display: grid;
    gap: 16px;
    min-width: 0;

    &__hero {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 18px 20px;
      background: var(--default-box-color);
    }

    &__tenant-target {
      display: flex;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;

      > div {
        min-width: 0;
      }

      strong {
        color: var(--el-text-color-primary);
      }

      p {
        margin: 4px 0 0;
        line-height: 1.45;
        color: var(--el-text-color-secondary);
      }

      :deep(.tenant-scope-switcher) {
        margin-right: 0;
      }
    }

    &__hero-icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      font-size: 24px;
      color: var(--theme-color);
      background: color-mix(in srgb, var(--theme-color) 10%, var(--default-box-color));
      border: 1px solid color-mix(in srgb, var(--theme-color) 22%, transparent);
      border-radius: var(--el-border-radius-base);
    }

    &__hero-copy {
      min-width: 0;

      > span {
        font-size: 11px;
        font-weight: 700;
        color: var(--theme-color);
        letter-spacing: 0.12em;
      }

      h2 {
        margin: 3px 0 5px;
        font-size: 20px;
        line-height: 1.35;
        color: var(--art-text-gray-900);
      }

      p {
        margin: 0;
        color: var(--el-text-color-secondary);
      }
    }

    &__progress {
      display: flex;
      gap: 8px;

      div {
        display: flex;
        gap: 7px;
        align-items: center;
        padding: 8px 10px;
        color: var(--el-text-color-secondary);
        background: var(--art-main-bg-color);
        border-radius: var(--el-border-radius-base);

        strong {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          font-size: 12px;
          background: var(--default-box-color);
          border: 1px solid var(--el-border-color);
          border-radius: 50%;
        }

        span {
          font-size: 12px;
          white-space: nowrap;
        }

        &.is-complete {
          color: var(--theme-color);
          background: color-mix(in srgb, var(--theme-color) 8%, var(--default-box-color));

          strong {
            color: #fff;
            background: var(--theme-color);
            border-color: var(--theme-color);
          }
        }
      }
    }

    &__start-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.8fr);
      gap: 16px;
      align-items: start;
      min-width: 0;
    }

    &__analysis-grid {
      display: grid;
      grid-template-columns: minmax(460px, 1.08fr) minmax(360px, 0.92fr);
      gap: 16px;
      align-items: start;
      min-width: 0;
    }

    &__master-column {
      display: grid;
      gap: 16px;
      min-width: 0;
    }

    &__match-error {
      display: grid;
      gap: 10px;
      justify-items: start;
    }

    &__source-summary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 12px 16px;

      &-icon {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        font-size: 18px;
        color: var(--theme-color);
        background: color-mix(in srgb, var(--theme-color) 9%, var(--default-box-color));
        border-radius: var(--el-border-radius-base);
      }

      > div:nth-child(2) {
        min-width: 0;

        span,
        strong {
          display: block;
        }

        span {
          margin-bottom: 2px;
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }

        strong {
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          color: var(--el-text-color-primary);
          white-space: nowrap;
        }
      }

      &-actions {
        display: flex;
        gap: 8px;
      }
    }

    &__guide {
      padding: var(--art-space-4);
    }

    &__guide-list {
      display: grid;
      gap: 10px;
      margin: 16px 0;

      > div {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: var(--art-space-2) 0;

        > .ai-order-drawer__guide-icon {
          flex: none;
          margin-top: 2px;
          font-size: 18px;
          color: var(--theme-color);
        }

        span,
        b,
        small {
          display: block;
          min-width: 0;
        }

        b {
          margin-bottom: 3px;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }

        small {
          line-height: 1.45;
          color: var(--el-text-color-secondary);
        }
      }
    }

    @media (width <= 900px) {
      &__hero {
        grid-template-columns: auto minmax(0, 1fr);
      }

      &__progress {
        grid-column: 1 / -1;
      }

      &__start-grid,
      &__analysis-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (width <= 640px) {
      &__tenant-target {
        align-items: flex-start;
        flex-direction: column;

        :deep(.tenant-scope-switcher) {
          justify-content: space-between;
          width: 100%;
          max-width: none;
        }

        :deep(.tenant-scope-switcher > span),
        :deep(.tenant-scope-switcher__arrow) {
          display: block;
        }
      }

      &__hero {
        grid-template-columns: 1fr;
        padding: 16px;
      }

      &__hero-icon {
        display: none;
      }

      &__progress {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));

        div {
          justify-content: center;
          padding: 7px 4px;

          span {
            display: none;
          }
        }
      }

      &__source-summary {
        grid-template-columns: auto minmax(0, 1fr);

        &-actions {
          grid-column: 1 / -1;

          .el-button {
            flex: 1;
          }
        }
      }
    }
  }
</style>
