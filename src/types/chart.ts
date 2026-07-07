export interface ChartSummary {
  cid: string;
  title: string;
  createTime: string;
  echartsVersion: string | null;
  viewCount: number;
  thumbnailURL: string;
}

export interface ChartDetail extends ChartSummary {
  code: string;
}

export interface ChartListResponse {
  code: number;
  message?: string;
  chartList: ChartSummary[];
  total: number;
  fromCache?: boolean;
}

export interface ChartDetailResponse {
  code: number;
  message?: string;
  chartDetail: ChartDetail | Record<string, never>;
  fromCache?: boolean;
}

export interface VisitStats {
  online: number;
  threeUV: number;
  UV: number;
}

export interface VisitResponse {
  code: number;
  message?: string;
  visitNumber?: VisitStats;
}
