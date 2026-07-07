<script setup lang="ts">
import type { ChartTypeOption } from '@/data/chartTypes';

defineProps<{
  search: string;
  activeType: string;
  types: ChartTypeOption[];
  loading: boolean;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:activeType': [value: string];
  submit: [];
}>();
</script>

<template>
  <section class="search-panel" aria-labelledby="search-title">
    <div class="hero-copy">
      <p class="eyebrow">ECharts Gallery Archive</p>
      <h1 id="search-title">查找、预览、改写一份图表代码</h1>
      <p>
        从历史图表示例里快速定位可复用方案，打开详情后直接在 Monaco 中阅读代码，并在隔离预览区运行。
      </p>
    </div>

    <form class="search-box" @submit.prevent="emit('submit')">
      <input
        :value="search"
        type="search"
        placeholder="搜索地图、桑吉图、仪表盘..."
        aria-label="搜索图表"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
      <button type="submit" :disabled="loading">{{ loading ? '加载中' : '搜索' }}</button>
    </form>

    <div class="type-list" aria-label="图表分类">
      <button
        v-for="item in types"
        :key="item.value || 'all'"
        type="button"
        :class="{ active: item.value === activeType }"
        @click="emit('update:activeType', item.value)"
      >
        {{ item.label }}
      </button>
    </div>
  </section>
</template>
