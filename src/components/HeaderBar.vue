<script setup lang="ts">
import type { VisitStats } from '@/types/chart';
import { formatCount } from '@/utils/format';

defineProps<{
  stats: VisitStats | null;
  themeMode: 'light' | 'dark' | 'system';
}>();

defineEmits<{
  'update:themeMode': [value: 'light' | 'dark' | 'system'];
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
    </nav>

    <div class="theme-switch" aria-label="主题模式">
      <button
        type="button"
        :class="{ active: themeMode === 'light' }"
        aria-label="切换到明亮主题"
        @click="$emit('update:themeMode', 'light')"
      >
        明亮
      </button>
      <button
        type="button"
        :class="{ active: themeMode === 'dark' }"
        aria-label="切换到暗黑主题"
        @click="$emit('update:themeMode', 'dark')"
      >
        暗黑
      </button>
      <button
        type="button"
        :class="{ active: themeMode === 'system' }"
        aria-label="跟随系统主题"
        @click="$emit('update:themeMode', 'system')"
      >
        系统
      </button>
    </div>

    <div v-if="stats" class="traffic" aria-label="访问统计">
      <span>
        <small>实时在线</small>
        {{ formatCount(stats.online) }}
      </span>
      <span>
        <small>累计 UV</small>
        {{ formatCount(stats.UV) }}
      </span>
    </div>
  </header>
</template>
