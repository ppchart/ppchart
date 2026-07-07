<script setup lang="ts">
import ChartCard from '@/components/ChartCard.vue';
import type { ChartSummary } from '@/types/chart';

defineProps<{
  items: ChartSummary[];
  loading: boolean;
  error: string;
}>();

defineEmits<{
  open: [cid: string];
}>();
</script>

<template>
  <section class="chart-section" aria-live="polite">
    <div v-if="loading" class="state-panel">
      <span class="loader"></span>
      <p>正在拉取图表示例</p>
    </div>

    <div v-else-if="error" class="state-panel error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="items.length === 0" class="state-panel">
      <p>没有找到匹配的图表。</p>
    </div>

    <div v-else class="chart-grid">
      <ChartCard v-for="chart in items" :key="chart.cid" :chart="chart" @open="$emit('open', $event)" />
    </div>
  </section>
</template>
