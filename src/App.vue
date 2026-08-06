<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  createMyChart,
  deleteMyChart,
  fetchAdminCharts,
  fetchChartDetail,
  fetchChartList,
  fetchCurrentUser,
  fetchMyCharts,
  fetchVisitStats,
  getOAuthLoginUrl,
  logout,
  reviewAdminChart,
  unpublishAdminChart,
  updateMyChart
} from '@/api/ppchart';
import ChartGrid from '@/components/ChartGrid.vue';
import HeaderBar from '@/components/HeaderBar.vue';
import SearchPanel from '@/components/SearchPanel.vue';
import { chartTypes, runtimeFilters, type RuntimeFilter } from '@/data/chartTypes';
import type { AdminChart, ChartDetail, ChartSummary, CurrentUser, UserChart, VisitStats } from '@/types/chart';
import { normalizeCode } from '@/utils/format';
import {
  isAdminWorkspacePath,
  isUserWorkspacePath,
  makeTypePath,
  parseChartCid,
  parseTypeFromPath
} from '@/utils/routes';

const AdminChartPanel = defineAsyncComponent(() => import('@/components/AdminChartPanel.vue'));
const ChartDetailDrawer = defineAsyncComponent(() => import('@/components/ChartDetailDrawer.vue'));
const UserChartPanel = defineAsyncComponent(() => import('@/components/UserChartPanel.vue'));
type ThemeMode = 'light' | 'dark' | 'system';

const charts = ref<ChartSummary[]>([]);
const currentPath = ref(window.location.pathname);
const total = ref(0);
const page = ref(1);
const search = ref('');
const activeType = ref(parseTypeFromPath());
const runtimeFilter = ref<RuntimeFilter>('runnable');
const listLoading = ref(false);
const listError = ref('');
const loadMoreTrigger = ref<HTMLElement | null>(null);
const detailLoading = ref(false);
const detailError = ref('');
const selectedDetail = ref<ChartDetail | null>(null);
const editableCode = ref('');
const stats = ref<VisitStats | null>(null);
const authToken = ref(window.localStorage.getItem('ppchart-auth-token') || '');
const currentUser = ref<CurrentUser | null>(null);
const myCharts = ref<UserChart[]>([]);
const adminCharts = ref<AdminChart[]>([]);
const adminStatus = ref<'pending' | 'published'>('pending');
const selectedAdminChart = ref<AdminChart | null>(null);
const adminLoading = ref(false);
const adminError = ref('');
const userPanelLoading = ref(false);
const userPanelError = ref('');
const userChartForm = ref({
  id: null as number | null,
  title: '',
  description: '',
  echartsVersion: '5.6.0',
  code: '',
  status: 'draft' as 'draft' | 'pending'
});
const themeMode = ref<ThemeMode>('dark');
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const initialListLoading = computed(() => listLoading.value && charts.value.length === 0);
const hasMoreCharts = computed(() => charts.value.length < total.value);
const loadedCount = computed(() => Math.min(charts.value.length, total.value));
const isUserWorkspace = computed(() => isUserWorkspacePath(currentPath.value));
const isAdminWorkspace = computed(() => isAdminWorkspacePath(currentPath.value));
const isPublicGallery = computed(() => !isUserWorkspace.value && !isAdminWorkspace.value);
let loadMoreObserver: IntersectionObserver | null = null;
let listRequestVersion = 0;

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
  if (listLoading.value && !options.reset) {
    return;
  }

  const nextPage = options.reset ? 1 : page.value + 1;
  if (!options.reset && !hasMoreCharts.value) {
    return;
  }

  const requestVersion = ++listRequestVersion;
  listLoading.value = true;
  listError.value = '';

  try {
    const result = await fetchChartList({
      page: nextPage,
      type: activeType.value,
      runtime: runtimeFilter.value,
      search: search.value
    });
    if (requestVersion !== listRequestVersion) {
      return;
    }
    charts.value = options.reset ? result.items : mergeCharts(charts.value, result.items);
    total.value = result.total;
    page.value = nextPage;
  } catch (error) {
    if (requestVersion !== listRequestVersion) {
      return;
    }
    listError.value = error instanceof Error ? error.message : '图表列表获取失败';
    if (options.reset) {
      charts.value = [];
      total.value = 0;
      page.value = 1;
    }
  } finally {
    if (requestVersion === listRequestVersion) {
      listLoading.value = false;
    }
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
  window.history.replaceState(null, '', `/chart/${encodeURIComponent(cid)}`);

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
  window.history.replaceState(null, '', activeType.value ? makeTypePath(activeType.value) : '/');
}

function submitSearch() {
  resetCharts();
}

function updateRuntimeFilter(value: RuntimeFilter) {
  if (value === 'user') {
    activeType.value = '';
  }
  runtimeFilter.value = value;
}

function resetUserChartForm() {
  userChartForm.value = {
    id: null,
    title: '',
    description: '',
    echartsVersion: '5.6.0',
    code: '',
    status: 'draft'
  };
}

function loginWithProvider(provider: 'github' | 'google') {
  window.location.href = getOAuthLoginUrl(provider);
}

function syncCurrentPath() {
  currentPath.value = window.location.pathname;
}

async function loadCurrentUser() {
  if (!authToken.value) {
    currentUser.value = null;
    myCharts.value = [];
    adminCharts.value = [];
    selectedAdminChart.value = null;
    return;
  }

  try {
    currentUser.value = await fetchCurrentUser(authToken.value);
    if (!currentUser.value) {
      authToken.value = '';
      window.localStorage.removeItem('ppchart-auth-token');
      return;
    }
    myCharts.value = isUserWorkspace.value ? await fetchMyCharts(authToken.value) : [];
    if (isAdminWorkspace.value && currentUser.value.role === 'admin') {
      await loadAdminCharts();
    } else {
      adminCharts.value = [];
      selectedAdminChart.value = null;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '用户信息读取失败';
    if (isAdminWorkspace.value) {
      adminError.value = message;
    } else {
      userPanelError.value = message;
    }
  }
}

async function loadAdminCharts() {
  if (!authToken.value) {
    return;
  }
  adminLoading.value = true;
  adminError.value = '';
  try {
    adminCharts.value = await fetchAdminCharts(authToken.value, adminStatus.value);
    selectedAdminChart.value =
      adminCharts.value.find(chart => chart.id === selectedAdminChart.value?.id) || adminCharts.value[0] || null;
  } catch (error) {
    adminError.value = error instanceof Error ? error.message : '待审核图表读取失败';
  } finally {
    adminLoading.value = false;
  }
}

async function changeAdminStatus(status: 'pending' | 'published') {
  adminStatus.value = status;
  selectedAdminChart.value = null;
  await loadAdminCharts();
}

async function reviewChart(chart: AdminChart, action: 'approve' | 'reject', note = '') {
  if (!authToken.value) {
    return;
  }
  adminLoading.value = true;
  adminError.value = '';
  try {
    await reviewAdminChart(authToken.value, chart.id, action, note);
    adminCharts.value = adminCharts.value.filter(item => item.id !== chart.id);
    selectedAdminChart.value = adminCharts.value[0] || null;
  } catch (error) {
    adminError.value = error instanceof Error ? error.message : '审核操作失败';
  } finally {
    adminLoading.value = false;
  }
}

async function unpublishChart(chart: AdminChart, note: string) {
  if (!authToken.value) {
    return;
  }
  adminLoading.value = true;
  adminError.value = '';
  try {
    await unpublishAdminChart(authToken.value, chart.id, note);
    adminCharts.value = adminCharts.value.filter(item => item.id !== chart.id);
    selectedAdminChart.value = adminCharts.value[0] || null;
  } catch (error) {
    adminError.value = error instanceof Error ? error.message : '下架操作失败';
  } finally {
    adminLoading.value = false;
  }
}

async function logoutCurrentUser() {
  if (authToken.value) {
    await logout(authToken.value).catch(() => undefined);
  }
  authToken.value = '';
  currentUser.value = null;
  myCharts.value = [];
  adminCharts.value = [];
  selectedAdminChart.value = null;
  window.localStorage.removeItem('ppchart-auth-token');
  resetUserChartForm();
}

async function saveUserChart() {
  if (!authToken.value) {
    return;
  }
  userPanelLoading.value = true;
  userPanelError.value = '';
  try {
    const payload = {
      title: userChartForm.value.title,
      description: userChartForm.value.description,
      echartsVersion: userChartForm.value.echartsVersion,
      code: userChartForm.value.code,
      status: userChartForm.value.status
    };
    if (userChartForm.value.id) {
      await updateMyChart(authToken.value, userChartForm.value.id, payload);
    } else {
      await createMyChart(authToken.value, payload);
    }
    myCharts.value = await fetchMyCharts(authToken.value);
    resetUserChartForm();
  } catch (error) {
    userPanelError.value = error instanceof Error ? error.message : '图表保存失败';
  } finally {
    userPanelLoading.value = false;
  }
}

function editUserChart(chart: UserChart) {
  userChartForm.value = {
    id: chart.id,
    title: chart.title,
    description: chart.description || '',
    echartsVersion: chart.echartsVersion || '5.6.0',
    code: chart.code,
    status: chart.status === 'pending' ? 'pending' : 'draft'
  };
}

async function removeUserChart(chart: UserChart) {
  if (!authToken.value || !window.confirm(`确认删除「${chart.title}」吗？`)) {
    return;
  }
  await deleteMyChart(authToken.value, chart.id);
  myCharts.value = await fetchMyCharts(authToken.value);
  if (userChartForm.value.id === chart.id) {
    resetUserChartForm();
  }
}

watch(activeType, () => {
  window.history.replaceState(null, '', activeType.value ? makeTypePath(activeType.value) : '/');
  resetCharts();
});

watch(runtimeFilter, () => {
  resetCharts();
});

onMounted(async () => {
  const authFromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('auth_token');
  if (authFromHash) {
    authToken.value = authFromHash;
    window.localStorage.setItem('ppchart-auth-token', authFromHash);
    window.history.replaceState(null, '', window.location.pathname);
  }

  const storedThemeMode = window.localStorage.getItem('ppchart-theme-mode') as ThemeMode | null;
  if (storedThemeMode === 'light' || storedThemeMode === 'dark' || storedThemeMode === 'system') {
    themeMode.value = storedThemeMode;
  }
  applyTheme();
  systemDarkQuery.addEventListener('change', applyTheme);
  window.addEventListener('popstate', syncCurrentPath);

  if (isPublicGallery.value) {
    loadCharts({ reset: true });
  }
  fetchVisitStats()
    .then(value => {
      stats.value = value;
    })
    .catch(() => {
      stats.value = null;
    });
  loadCurrentUser();

  if (isPublicGallery.value) {
    const routeCid = parseChartCid();
    const hashCid = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('chart');
    if (routeCid || hashCid) {
      openDetail(routeCid || hashCid || '');
    }
  }

  await nextTick();
  if (isPublicGallery.value && loadMoreTrigger.value) {
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
  window.removeEventListener('popstate', syncCurrentPath);
  loadMoreObserver?.disconnect();
});
</script>

<template>
  <HeaderBar
    :stats="stats"
    :theme-mode="themeMode"
    :user="currentUser"
    @update:theme-mode="updateThemeMode"
    @login="loginWithProvider"
    @logout="logoutCurrentUser"
  />

  <main :class="{ 'workspace-page': isUserWorkspace || isAdminWorkspace }">
    <AdminChartPanel
      v-if="isAdminWorkspace"
      :user="currentUser"
      :charts="adminCharts"
      :selected="selectedAdminChart"
      :status="adminStatus"
      :loading="adminLoading"
      :error="adminError"
      @login="loginWithProvider"
      @select="selectedAdminChart = $event"
      @update:status="changeAdminStatus"
      @approve="reviewChart($event, 'approve')"
      @reject="(chart, note) => reviewChart(chart, 'reject', note)"
      @unpublish="unpublishChart"
    />

    <UserChartPanel
      v-else-if="isUserWorkspace"
      v-model:form="userChartForm"
      :user="currentUser"
      :charts="myCharts"
      :loading="userPanelLoading"
      :error="userPanelError"
      @login="loginWithProvider"
      @save="saveUserChart"
      @edit="editUserChart"
      @remove="removeUserChart"
      @reset="resetUserChartForm"
    />

    <template v-else>
      <SearchPanel
        v-model:search="search"
        v-model:active-type="activeType"
        :runtime-filter="runtimeFilter"
        :types="chartTypes"
        :runtime-filters="runtimeFilters"
        :loading="listLoading"
        @update:runtime-filter="updateRuntimeFilter"
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
    </template>
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
