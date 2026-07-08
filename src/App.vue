<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { fetchChartDetail, fetchChartList, fetchVisitStats } from '@/api/ppchart';
import ChartGrid from '@/components/ChartGrid.vue';
import HeaderBar from '@/components/HeaderBar.vue';
import SearchPanel from '@/components/SearchPanel.vue';
import { chartTypes, runtimeFilters, type RuntimeFilter } from '@/data/chartTypes';
import type { ChartDetail, ChartSummary, VisitStats } from '@/types/chart';
import { normalizeCode } from '@/utils/format';

const ChartDetailDrawer = defineAsyncComponent(() => import('@/components/ChartDetailDrawer.vue'));
type ThemeMode = 'light' | 'dark' | 'system';

const charts = ref<ChartSummary[]>([]);
const total = ref(0);
const page = ref(1);
const search = ref('');
const activeType = ref('');
const runtimeFilter = ref<RuntimeFilter>('runnable');
const listLoading = ref(false);
const listError = ref('');
const loadMoreTrigger = ref<HTMLElement | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const selectedDetail = ref<ChartDetail | null>(null);
const editableCode = ref('');
const stats = ref<VisitStats | null>(null);
const themeMode = ref<ThemeMode>('dark');
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const initialListLoading = computed(() => listLoading.value && charts.value.length === 0);
const hasMoreCharts = computed(() => charts.value.length < total.value);
const loadedCount = computed(() => Math.min(charts.value.length, total.value));
let loadMoreObserver: IntersectionObserver | null = null;

function resolveTheme(mode: ThemeMode) {
  return mode === 'system' ? (systemDarkQuery.matches ? 'dark' : 'light') : mode;
}

function applyTheme() {
  const resolvedTheme = resolveTheme(themeMode.value);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = themeMode.value;
}

function updateThemeMode(mode: ThemeMode) {
  themeMode.value = mode;
  window.localStorage.setItem('ppchart-theme-mode', mode);
  applyTheme();
}

async function loadCharts(options: { reset?: boolean } = {}) {
  if (listLoading.value) {
    return;
  }

  const nextPage = options.reset ? 1 : page.value + 1;
  if (!options.reset && !hasMoreCharts.value) {
    return;
  }

  listLoading.value = true;
  listError.value = '';

  try {
    const result = await fetchChartList({
      page: nextPage,
      type: activeType.value,
      runtime: runtimeFilter.value,
      search: search.value
    });
    charts.value = options.reset ? result.items : mergeCharts(charts.value, result.items);
    total.value = result.total;
    page.value = nextPage;
  } catch (error) {
    listError.value = error instanceof Error ? error.message : '图表列表获取失败';
    if (options.reset) {
      charts.value = [];
      total.value = 0;
      page.value = 1;
    }
  } finally {
    listLoading.value = false;
  }
}

function mergeCharts(existing: ChartSummary[], incoming: ChartSummary[]) {
  const seen = new Set(existing.map(item => item.cid));
  return [...existing, ...incoming.filter(item => !seen.has(item.cid))];
}

function resetCharts() {
  page.value = 0;
  charts.value = [];
  total.value = 0;
  loadCharts({ reset: true });
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
  resetCharts();
}

watch(activeType, () => {
  resetCharts();
});

watch(runtimeFilter, () => {
  resetCharts();
});

onMounted(async () => {
  const storedThemeMode = window.localStorage.getItem('ppchart-theme-mode') as ThemeMode | null;
  if (storedThemeMode === 'light' || storedThemeMode === 'dark' || storedThemeMode === 'system') {
    themeMode.value = storedThemeMode;
  }
  applyTheme();
  systemDarkQuery.addEventListener('change', applyTheme);

  loadCharts({ reset: true });
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

  await nextTick();
  if (loadMoreTrigger.value) {
    loadMoreObserver = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          loadCharts();
        }
      },
      { rootMargin: '480px 0px' }
    );
    loadMoreObserver.observe(loadMoreTrigger.value);
  }
});

onBeforeUnmount(() => {
  systemDarkQuery.removeEventListener('change', applyTheme);
  loadMoreObserver?.disconnect();
});
</script>

<template>
  <HeaderBar :stats="stats" :theme-mode="themeMode" @update:theme-mode="updateThemeMode" />

  <main>
    <SearchPanel
      v-model:search="search"
      v-model:active-type="activeType"
      v-model:runtime-filter="runtimeFilter"
      :types="chartTypes"
      :runtime-filters="runtimeFilters"
      :loading="listLoading"
      @submit="submitSearch"
    />

    <div class="result-bar">
      <p>共 {{ total }} 个示例</p>
      <span>已加载 {{ loadedCount }} 个</span>
    </div>

    <ChartGrid :items="charts" :loading="initialListLoading" :error="listError" @open="openDetail" />

    <div ref="loadMoreTrigger" class="load-sentinel" aria-hidden="true"></div>
    <div v-if="charts.length > 0" class="stream-status" aria-live="polite">
      <template v-if="listLoading">
        <span class="loader"></span>
        <p>继续加载中</p>
      </template>
      <p v-else-if="!hasMoreCharts">已经到底了</p>
    </div>
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
