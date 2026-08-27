<template>
  <ArtSectionCard class="price-cargo-section" preserve-content-structure>
    <template #header>
      <div class="price-cargo-section__header">
        <ArtSectionTitle :show-line="false">货物信息</ArtSectionTitle>
        <div v-if="editable" class="price-cargo-section__actions" aria-label="货物信息操作">
          <ElButton plain :icon="Collection" @click="emit('select-cargo')">批量选货物</ElButton>
          <ElButton type="primary" plain :icon="Plus" @click="emit('add-cargo')">添加</ElButton>
        </div>
      </div>
    </template>

    <slot />

    <div class="price-cargo-section__summary">
      <span>合计</span>
      <div>
        <span>总数量：{{ quantityText }}</span>
        <span>总体积：{{ volumeText }}m³</span>
        <span>{{ weightLabel }}：{{ weightText }}kg</span>
      </div>
    </div>

    <slot name="after" />
  </ArtSectionCard>
</template>

<script setup lang="ts">
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import { ElButton } from 'element-plus'
  import { Collection, Plus } from '@element-plus/icons-vue'
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'

  withDefaults(
    defineProps<{
      quantityText: string
      volumeText: string
      weightText: string
      weightLabel?: string
      editable?: boolean
    }>(),
    {
      weightLabel: '总重量',
      editable: true
    }
  )

  const emit = defineEmits<{
    'select-cargo': []
    'add-cargo': []
  }>()
</script>

<style scoped lang="scss">
  .price-cargo-section {
    padding: 18px 20px 24px;

    &__header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      min-width: 0;
      margin-bottom: 14px;

      :deep(.art-section-title) {
        min-width: 0;
        margin: 0;
      }
    }

    &__actions {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: nowrap;
      gap: 10px;
      align-items: center;
      justify-content: flex-end;
      white-space: nowrap;

      :deep(.el-button) {
        flex: 0 0 auto;
        margin-left: 0;
        white-space: nowrap;
      }
    }

    &__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 48px;
      padding: 0 12px;
      color: var(--art-text-gray-600);
      background: var(--el-fill-color-lighter);

      div {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        justify-content: flex-end;
      }
    }
  }

  @media (width <= 900px) {
    .price-cargo-section {
      &__summary {
        flex-direction: column;
        align-items: flex-start;
      }

      &__summary {
        gap: 8px;
        padding: 12px;

        div {
          justify-content: flex-start;
        }
      }
    }
  }

  @media (width <= 640px) {
    .price-cargo-section {
      padding: var(--art-space-4);

      &__header {
        grid-template-columns: 1fr;
      }

      &__actions {
        flex-wrap: wrap;
        justify-content: flex-start;
      }
    }
  }
</style>
