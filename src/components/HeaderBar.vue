<script setup lang="ts">
import type { VisitStats } from '@/types/chart';
import { formatCount } from '@/utils/format';

defineProps<{
  stats: VisitStats | null;
}>();
</script>

<template>
  <header class="header-bar">
    <a class="brand" href="/" aria-label="PPChart 首页">
      <span class="brand-mark">PP</span>
      <span>
        <strong>PPChart</strong>
        <em>让图表更简单</em>
      </span>
    </a>

    <nav class="header-links" aria-label="站点导航">
      <a href="https://github.com/ppchart/ppchart" target="_blank" rel="noreferrer">GitHub</a>
      <a href="https://api.ppmark.cn/chart/api/chart-list?current=1&type=&search=" target="_blank" rel="noreferrer">
        API
      </a>
    </nav>

    <div v-if="stats" class="traffic" aria-label="访问统计">
      <span>在线 {{ formatCount(stats.online) }}</span>
      <span>近 24h {{ formatCount(stats.threeUV) }}</span>
      <span>总 UV {{ formatCount(stats.UV) }}</span>
    </div>
  </header>
</template>
