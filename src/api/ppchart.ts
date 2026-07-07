import type {
  ChartDetail,
  ChartDetailResponse,
  ChartListResponse,
  ChartSummary,
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

export async function fetchChartList(input: {
  page: number;
  type: string;
  search: string;
}): Promise<{ items: ChartSummary[]; total: number }> {
  const payload = await requestJson<ChartListResponse>('/chart-list', {
    current: input.page,
    type: input.type,
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

  return payload.visitNumber || null;
}

function normalizeSummary(item: ChartSummary): ChartSummary {
  return {
    ...item,
    thumbnailURL: `${ASSET_BASE}/ecg-storage/ec_gallery_thumbnail/${item.cid}.jpg`
  };
}
