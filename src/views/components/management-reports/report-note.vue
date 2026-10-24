<template>
  <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-g-700">
    <span>{{ description }}</span>
    <ElPopover trigger="click" :width="360">
      <template #reference
        ><ElButton text size="small"
          ><span class="art-icon-label"
            ><ArtSvgIcon icon="ri:information-line" />统计口径</span
          ></ElButton
        ></template
      >
      <p class="text-sm leading-6 text-g-800">{{ note }}</p>
    </ElPopover>
  </div>
</template>
<script setup lang="ts">
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  defineProps<{ description: string; note: string }>()
</script>
