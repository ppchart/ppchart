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
  online?: number;
  threeUV?: number;
  UV?: number;
}

export interface CurrentUser {
  id: number;
  provider: 'github' | 'google';
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: 'user' | 'admin';
}

export type UserChartStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'unpublished';

export interface UserChart {
  id: number;
  cid: string;
  title: string;
  description: string | null;
  code: string;
  echartsVersion: string | null;
  status: UserChartStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerUserId: number | null;
}

export interface AdminChart extends UserChart {
  user: Pick<CurrentUser, 'id' | 'name' | 'email' | 'provider'>;
}
