<script setup lang="ts">
import type { ChartSummary } from '@/types/chart';
import { formatCount, formatDate } from '@/utils/format';

defineProps<{
  chart: ChartSummary;
}>();

defineEmits<{
  open: [cid: string];
}>();
</script>

<template>
  <article class="chart-card">
    <button class="thumbnail-button" type="button" @click="$emit('open', chart.cid)">
      <img :src="chart.thumbnailURL" :alt="chart.title" loading="lazy" />
    </button>

    <div class="chart-card-body">
      <button class="chart-title" type="button" @click="$emit('open', chart.cid)">
        {{ chart.title || '未命名图表' }}
      </button>

      <dl class="chart-meta">
        <div>
          <dt>版本</dt>
          <dd>{{ chart.echartsVersion || '-' }}</dd>
        </div>
        <div>
          <dt>浏览</dt>
          <dd>{{ formatCount(chart.viewCount) }}</dd>
        </div>
        <div>
          <dt>日期</dt>
          <dd>{{ formatDate(chart.createTime) }}</dd>
        </div>
      </dl>
    </div>
  </article>
</template>
