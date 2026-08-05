import { chartTypes } from '@/data/chartTypes';
import type { ChartSummary } from '@/types/chart';

const typeSlugMap: Record<string, string> = {
  '2': 'line',
  '3': 'pie',
  '4': 'bar',
  '5': 'map',
  '6': 'wordcloud',
  '7': 'graph',
  '8': 'pictorial-bar',
  '9': 'radar',
  '10': 'treemap',
  '11': 'funnel',
  '12': 'theme-river',
  '13': 'lines',
  '14': 'candlestick',
  '15': 'tree',
  '16': 'sunburst',
  '17': 'parallel',
  '18': 'liquidfill',
  '19': 'scatter',
  '20': 'sankey',
  '21': 'gauge',
  '22': 'boxplot',
  '23': 'heatmap'
};

export const slugTypeMap = Object.fromEntries(
  Object.entries(typeSlugMap).map(([type, slug]) => [slug, type])
) as Record<string, string>;

function slugifyTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function makeChartPath(chart: Pick<ChartSummary, 'cid' | 'title'>) {
  const titleSlug = slugifyTitle(chart.title || '');
  return titleSlug ? `/chart/${encodeURIComponent(chart.cid)}/${titleSlug}/` : `/chart/${encodeURIComponent(chart.cid)}/`;
}

export function parseChartCid(pathname = window.location.pathname) {
  const match = pathname.match(/^\/chart\/([^/?#]+)/);
  if (!match) {
    return '';
  }

  return decodeURIComponent(match[1]).split('-')[0];
}

export function makeTypePath(type: string) {
  const slug = typeSlugMap[type];
  return slug ? `/examples/${slug}/` : '/';
}

export function parseTypeFromPath(pathname = window.location.pathname) {
  const match = pathname.match(/^\/examples\/([^/?#]+)/);
  if (!match) {
    return '';
  }

  return slugTypeMap[decodeURIComponent(match[1])] || '';
}

export function getTypeLabel(type: string) {
  return chartTypes.find(item => item.value === type)?.label || '全部';
}
