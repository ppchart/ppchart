<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';

import { fetchChartDetail, fetchChartList, fetchVisitStats } from '@/api/ppchart';
import ChartGrid from '@/components/ChartGrid.vue';
import HeaderBar from '@/components/HeaderBar.vue';
import SearchPanel from '@/components/SearchPanel.vue';
import { chartTypes } from '@/data/chartTypes';
import type { ChartDetail, ChartSummary, VisitStats } from '@/types/chart';
import { normalizeCode } from '@/utils/format';

const PAGE_SIZE = 20;
const ChartDetailDrawer = defineAsyncComponent(() => import('@/components/ChartDetailDrawer.vue'));

const charts = ref<ChartSummary[]>([]);
const total = ref(0);
const page = ref(1);
const search = ref('');
const activeType = ref('');
const listLoading = ref(false);
const listError = ref('');
const detailLoading = ref(false);
const detailError = ref('');
const selectedDetail = ref<ChartDetail | null>(null);
const editableCode = ref('');
const stats = ref<VisitStats | null>(null);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)));

async function loadCharts() {
  listLoading.value = true;
  listError.value = '';

  try {
    const result = await fetchChartList({
      page: page.value,
      type: activeType.value,
      search: search.value
    });
    charts.value = result.items;
    total.value = result.total;
  } catch (error) {
    listError.value = error instanceof Error ? error.message : '图表列表获取失败';
    charts.value = [];
    total.value = 0;
  } finally {
    listLoading.value = false;
  }
}

async function openDetail(cid: string) {
  selectedDetail.value = null;
  editableCode.value = '';
  detailLoading.value = true;
  detailError.value = '';
  window.history.replaceState(null, '', `#chart=${encodeURIComponent(cid)}`);

  try {
    const detail = await fetchChartDetail(cid);
    selectedDetail.value = detail;
    editableCode.value = normalizeCode(detail.code);
  } catch (error) {
    detailError.value = error instanceof Error ? error.message : '图表详情获取失败';
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  selectedDetail.value = null;
  editableCode.value = '';
  detailError.value = '';
  window.history.replaceState(null, '', window.location.pathname);
}

function submitSearch() {
  page.value = 1;
  loadCharts();
}

function goPage(direction: 'prev' | 'next') {
  const nextPage = direction === 'prev' ? page.value - 1 : page.value + 1;

  if (nextPage < 1 || nextPage > pageCount.value) {
    return;
  }

  page.value = nextPage;
  loadCharts();
}

watch(activeType, () => {
  page.value = 1;
  loadCharts();
});

onMounted(async () => {
  loadCharts();
  fetchVisitStats()
    .then(value => {
      stats.value = value;
    })
    .catch(() => {
      stats.value = null;
    });

  const hashCid = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('chart');
  if (hashCid) {
    openDetail(hashCid);
  }
});
</script>

<template>
  <HeaderBar :stats="stats" />

  <main>
    <SearchPanel
      v-model:search="search"
      v-model:active-type="activeType"
      :types="chartTypes"
      :loading="listLoading"
      @submit="submitSearch"
    />

    <div class="result-bar">
      <p>共 {{ total }} 个示例</p>
      <div class="pager">
        <button type="button" :disabled="page <= 1 || listLoading" @click="goPage('prev')">上一页</button>
        <span>{{ page }} / {{ pageCount }}</span>
        <button type="button" :disabled="page >= pageCount || listLoading" @click="goPage('next')">下一页</button>
      </div>
    </div>

    <ChartGrid :items="charts" :loading="listLoading" :error="listError" @open="openDetail" />
  </main>

  <ChartDetailDrawer
    v-if="selectedDetail || detailLoading || detailError"
    :detail="selectedDetail"
    :code="editableCode"
    :loading="detailLoading"
    :error="detailError"
    @close="closeDetail"
    @update:code="editableCode = $event"
  />
</template>
