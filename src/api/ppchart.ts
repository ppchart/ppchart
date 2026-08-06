import type {
  AdminChart,
  ChartDetail,
  ChartDetailResponse,
  ChartListResponse,
  ChartSummary,
  CurrentUser,
  UserChart,
  VisitResponse,
  VisitStats
} from '@/types/chart';

const API_BASE =
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '/chart-api' : 'https://api.ppmark.cn/chart/api');
const ASSET_BASE =
  import.meta.env.VITE_ASSET_BASE || (import.meta.env.DEV ? '/chart-assets' : 'https://api.ppmark.cn/chart-assets');

function isChartDetail(value: ChartDetail | Record<string, never>): value is ChartDetail {
  return typeof (value as ChartDetail).cid === 'string' && typeof (value as ChartDetail).code === 'string';
}

async function requestJson<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  Object.entries(params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function requestApi<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
): Promise<T> {
  const response = await fetch(new URL(`${API_BASE}${path}`, window.location.origin), {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json()) as T & { code?: number; message?: string };
  if (!response.ok || (typeof payload.code === 'number' && payload.code !== 0)) {
    throw new Error(payload.message || `请求失败：${response.status}`);
  }
  return payload;
}

export function getOAuthLoginUrl(provider: 'github' | 'google') {
  const url = new URL(`${API_BASE}/oauth/${provider}/login`, window.location.origin);
  url.searchParams.set('redirect', window.location.origin + window.location.pathname);
  return url.toString();
}

export async function fetchCurrentUser(token: string): Promise<CurrentUser | null> {
  const payload = await requestApi<{ code: number; data: CurrentUser | null }>('/userinfo', { token });
  return payload.data;
}

export async function logout(token: string) {
  await requestApi('/logout', { token });
}

export async function fetchMyCharts(token: string): Promise<UserChart[]> {
  const payload = await requestApi<{ code: number; data: UserChart[] }>('/my/charts', { token });
  return payload.data || [];
}

export async function createMyChart(token: string, input: Pick<UserChart, 'title' | 'description' | 'code' | 'echartsVersion'> & { status?: string }) {
  const payload = await requestApi<{ code: number; data: UserChart }>('/my/charts', {
    method: 'POST',
    token,
    body: input
  });
  return payload.data;
}

export async function updateMyChart(
  token: string,
  id: number,
  input: Pick<UserChart, 'title' | 'description' | 'code' | 'echartsVersion'> & { status?: string }
) {
  const payload = await requestApi<{ code: number; data: UserChart }>(`/my/charts/${id}`, {
    method: 'PUT',
    token,
    body: input
  });
  return payload.data;
}

export async function deleteMyChart(token: string, id: number) {
  await requestApi(`/my/charts/${id}`, { method: 'DELETE', token });
}

export async function fetchAdminCharts(
  token: string,
  status: 'pending' | 'published'
): Promise<AdminChart[]> {
  const payload = await requestApi<{ code: number; data: AdminChart[] }>(`/admin/charts?status=${status}`, { token });
  return payload.data || [];
}

export async function reviewAdminChart(
  token: string,
  id: number,
  action: 'approve' | 'reject',
  note = '',
  thumbnail = ''
) {
  const payload = await requestApi<{ code: number; data: AdminChart }>(`/admin/charts/${id}/review`, {
    method: 'POST',
    token,
    body: thumbnail ? { action, note, thumbnail } : { action, note }
  });
  return payload.data;
}

export async function unpublishAdminChart(token: string, id: number, note: string) {
  const payload = await requestApi<{ code: number; data: AdminChart }>(`/admin/charts/${id}/unpublish`, {
    method: 'POST',
    token,
    body: { note }
  });
  return payload.data;
}

export async function fetchChartList(input: {
  page: number;
  type: string;
  runtime: string;
  search: string;
}): Promise<{ items: ChartSummary[]; total: number }> {
  const payload = await requestJson<ChartListResponse>('/chart-list', {
    current: input.page,
    type: input.type,
    runtime: input.runtime,
    search: input.search.trim()
  });

  if (payload.code !== 0) {
    throw new Error(payload.message || '图表列表获取失败');
  }

  return {
    items: (payload.chartList || []).map(normalizeSummary),
    total: payload.total || 0
  };
}

export async function fetchChartDetail(cid: string): Promise<ChartDetail> {
  const payload = await requestJson<ChartDetailResponse>('/chart-detail', { cid });

  if (payload.code !== 0) {
    throw new Error(payload.message || '图表详情获取失败');
  }

  const detail = payload.chartDetail;

  if (!isChartDetail(detail)) {
    throw new Error('图表不存在或已下线');
  }

  return detail;
}

export async function fetchVisitStats(): Promise<VisitStats | null> {
  const payload = await requestJson<VisitResponse>('/visit');

  if (payload.code !== 0) {
    return null;
  }

  if (payload.visitNumber) {
    return payload.visitNumber;
  }

  if (
    typeof payload.online === 'number' &&
    typeof payload.threeUV === 'number' &&
    typeof payload.UV === 'number'
  ) {
    return {
      online: payload.online,
      threeUV: payload.threeUV,
      UV: payload.UV
    };
  }

  return null;
}

function normalizeSummary(item: ChartSummary): ChartSummary {
  return {
    ...item,
    thumbnailURL:
      item.cid.startsWith('user-') && item.thumbnailURL
        ? item.thumbnailURL
        : `${ASSET_BASE}/ecg-storage/ec_gallery_thumbnail/${item.cid}.jpg`
  };
}
