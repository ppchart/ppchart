<script setup lang="ts">
import type { ChartTypeOption, RuntimeFilter } from '@/data/chartTypes';
import { makeTypePath } from '@/utils/routes';

defineProps<{
  search: string;
  activeType: string;
  runtimeFilter: RuntimeFilter;
  types: ChartTypeOption[];
  runtimeFilters: Array<{ label: string; value: RuntimeFilter }>;
  loading: boolean;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:activeType': [value: string];
  'update:runtimeFilter': [value: RuntimeFilter];
  submit: [];
}>();
</script>

<template>
  <section class="search-panel" aria-labelledby="search-title">
    <div class="hero-copy">
      <div class="hero-title-row">
        <p class="eyebrow">PPCHART / GALLERY INDEX</p>
        <h1 id="search-title">图表代码索引</h1>
      </div>
      <p>
        搜索历史 ECharts 示例，打开后在隔离沙箱里预览、阅读和改写代码。
      </p>
    </div>

    <form class="search-box" @submit.prevent="emit('submit')">
      <input
        :value="search"
        type="search"
        placeholder="搜索地图 / 桑吉图 / 仪表盘"
        aria-label="搜索图表"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
      <button type="submit" :disabled="loading">{{ loading ? '加载中' : '搜索' }}</button>
    </form>

    <div class="filter-groups">
      <div class="filter-group runtime-filter" aria-label="内容范围">
        <span>内容范围</span>
        <button
          v-for="item in runtimeFilters"
          :key="item.value"
          type="button"
          :class="{ active: item.value === runtimeFilter }"
          @click="emit('update:runtimeFilter', item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="filter-group type-list" aria-label="图表分类">
        <span>图表类型</span>
        <a
          v-for="item in types"
          :key="item.value || 'all'"
          :href="makeTypePath(item.value)"
          :class="{ active: item.value === activeType }"
          @click.prevent="emit('update:activeType', item.value)"
        >
          {{ item.label }}
        </a>
      </div>
    </div>
  </section>
</template>
