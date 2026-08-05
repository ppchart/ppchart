<script setup lang="ts">
import type { ChartSummary } from '@/types/chart';
import { formatCount, formatDate } from '@/utils/format';
import { makeChartPath } from '@/utils/routes';

defineProps<{
  chart: ChartSummary;
}>();

defineEmits<{
  open: [cid: string];
}>();
</script>

<template>
  <article class="chart-card">
    <a class="thumbnail-button" :href="makeChartPath(chart)" @click.prevent="$emit('open', chart.cid)">
      <img :src="chart.thumbnailURL" :alt="chart.title" loading="lazy" />
    </a>

    <div class="chart-card-body">
      <a class="chart-title" :href="makeChartPath(chart)" @click.prevent="$emit('open', chart.cid)">
        {{ chart.title || '未命名图表' }}
      </a>

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
