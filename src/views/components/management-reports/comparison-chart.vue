<template>
  <div ref="chartRef" class="w-full" :style="{ height: props.height }" aria-hidden="true" />
</template>

<script setup lang="ts">
  import { useChartComponent } from '@/hooks/core/useChart'
  import type { BaseChartProps } from '@/types/component/chart'
  import type { EChartsOption } from '@/plugins/echarts'
  import { getCssVar } from '@/utils/ui'
  import { formatNumberValue, formatCompactNumberValue } from '@/utils/ui/format'

  interface Props extends BaseChartProps {
    labels: string[]
    series: { name: string; data: (number | null)[] }[]
    unit: string
    axisUnit: string
    divisor: number
  }
  const props = withDefaults(defineProps<Props>(), { height: '142px' })
  const { chartRef } = useChartComponent({
    props,
    checkEmpty: () => !props.labels.length,
    watchSources: [
      () => props.labels,
      () => props.series,
      () => props.unit,
      () => props.axisUnit,
      () => props.divisor
    ],
    generateOptions: (): EChartsOption => {
      const text = getCssVar('--el-text-color-secondary')
      const strong = getCssVar('--el-text-color-primary')
      const colors = [getCssVar('--theme-color'), getCssVar('--el-color-info-light-3')]
      const scale = props.divisor
      return {
        animation: false,
        color: colors,
        grid: { left: 112, right: 70, top: 25, bottom: 20 },
        legend: {
          top: 0,
          right: 0,
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 7,
          textStyle: { color: text, fontSize: 11 }
        },
        tooltip: {
          trigger: 'axis',
          renderMode: 'richText',
          axisPointer: { type: 'shadow' },
          valueFormatter: (value) =>
            typeof value === 'number' ? `${formatNumberValue(value)} ${props.unit}` : '待核算'
        },
        xAxis: {
          type: 'value',
          name: props.axisUnit,
          nameTextStyle: { color: text, fontSize: 10 },
          splitNumber: 4,
          axisLabel: {
            color: text,
            fontSize: 10,
            formatter: (value) => formatCompactNumberValue(Number(value) / scale, 1)
          },
          splitLine: {
            lineStyle: { color: getCssVar('--el-border-color-lighter'), type: 'dashed' }
          }
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: props.labels,
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: strong, fontSize: 11, width: 100, overflow: 'truncate' }
        },
        series: props.series.map((series) => ({
          name: series.name,
          type: 'bar',
          data: series.data,
          barMaxWidth: 9,
          barGap: '35%',
          itemStyle: { borderRadius: [0, 3, 3, 0] },
          label: {
            show: props.labels.length <= 3,
            position: 'right',
            color: text,
            fontSize: 10,
            formatter: (params) => formatNumberValue(params.value)
          }
        }))
      }
    }
  })
</script>
