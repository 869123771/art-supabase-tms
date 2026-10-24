<template>
  <ArtSectionCard
    root-class="management-report-chart"
    :show-scrollbar="false"
    :min-height="100"
    :skeleton-rows="2"
    :loading="loading"
    :error="error"
    :empty="!labels.length"
    empty-title="暂无可展示的统计"
    empty-description="请调整日期或关键词；未核算和受限金额不参与图表。"
    @retry="$emit('retry')"
  >
    <template #header>
      <div class="mb-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <ArtSectionTitle class="w-auto! shrink-0" :title="title" :show-line="false" />
        <p class="text-xs text-g-600">{{ subtitle }}</p>
      </div>
    </template>
    <div role="img" :aria-label="description"
      ><ReportComparisonChart
        :labels="labels"
        :series="series"
        :unit="unit"
        :axis-unit="axisUnit"
        :divisor="divisor"
        :height="Math.max(100, labels.length * 22 + 45) + 'px'"
    /></div>
    <p
      v-if="series.some((item) => item.data.some((value) => value === null))"
      class="mt-1 text-xs text-g-600"
    >
      部分数值尚未核算或无权查看，图中保留空缺，不按零值计算。
    </p>
  </ArtSectionCard>
</template>
<script setup lang="ts">
  import ArtSectionTitle from '@/components/core/surfaces/art-section-title/index.vue'
  import ArtSectionCard from '@/components/core/surfaces/art-section-card/index.vue'
  import ReportComparisonChart from './comparison-chart.vue'
  defineProps<{
    title: string
    subtitle: string
    labels: string[]
    series: { name: string; data: (number | null)[] }[]
    description: string
    unit: string
    axisUnit: string
    divisor: number
    loading: boolean
    error: string
  }>()
  defineEmits<{ retry: [] }>()
</script>
<style scoped lang="scss">
  .management-report-chart {
    flex: 0 0 auto;
    padding: var(--art-space-4);
  }
</style>
