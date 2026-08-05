import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = (process.env.SITE_URL || 'https://www.ppchart.com').replace(/\/$/, '');
const API_BASE = (process.env.VITE_API_BASE || 'https://api.ppmark.cn/chart/api').replace(/\/$/, '');
const ASSET_BASE = (process.env.VITE_ASSET_BASE || 'https://api.ppmark.cn/chart-assets').replace(/\/$/, '');
const DIST_DIR = path.resolve('dist');
const MAX_CHARTS = Number(process.env.SEO_MAX_CHARTS || 5000);
const PAGE_SIZE = 20;
const CONCURRENCY = 6;

const chartTypes = [
  { label: '折线图', value: '2', slug: 'line', keyword: 'ECharts 折线图示例' },
  { label: '饼图', value: '3', slug: 'pie', keyword: 'ECharts 饼图示例' },
  { label: '柱状图', value: '4', slug: 'bar', keyword: 'ECharts 柱状图示例' },
  { label: '地图', value: '5', slug: 'map', keyword: 'ECharts 地图示例' },
  { label: '词云', value: '6', slug: 'wordcloud', keyword: 'ECharts 词云图示例' },
  { label: '关系图', value: '7', slug: 'graph', keyword: 'ECharts 关系图示例' },
  { label: '象形柱图', value: '8', slug: 'pictorial-bar', keyword: 'ECharts 象形柱图示例' },
  { label: '雷达图', value: '9', slug: 'radar', keyword: 'ECharts 雷达图示例' },
  { label: '矩树图', value: '10', slug: 'treemap', keyword: 'ECharts 矩树图示例' },
  { label: '漏斗图', value: '11', slug: 'funnel', keyword: 'ECharts 漏斗图示例' },
  { label: '河流图', value: '12', slug: 'theme-river', keyword: 'ECharts 主题河流图示例' },
  { label: '路径图', value: '13', slug: 'lines', keyword: 'ECharts 路径图示例' },
  { label: 'K 线图', value: '14', slug: 'candlestick', keyword: 'ECharts K 线图示例' },
  { label: '树状图', value: '15', slug: 'tree', keyword: 'ECharts 树状图示例' },
  { label: '旭日图', value: '16', slug: 'sunburst', keyword: 'ECharts 旭日图示例' },
  { label: '平行坐标系', value: '17', slug: 'parallel', keyword: 'ECharts 平行坐标系示例' },
  { label: '水球', value: '18', slug: 'liquidfill', keyword: 'ECharts 水球图示例' },
  { label: '散点图', value: '19', slug: 'scatter', keyword: 'ECharts 散点图示例' },
  { label: '桑吉图', value: '20', slug: 'sankey', keyword: 'ECharts 桑基图示例' },
  { label: '仪表盘', value: '21', slug: 'gauge', keyword: 'ECharts 仪表盘示例' },
  { label: '盒须图', value: '22', slug: 'boxplot', keyword: 'ECharts 盒须图示例' },
  { label: '热力图', value: '23', slug: 'heatmap', keyword: 'ECharts 热力图示例' }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugifyTitle(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function chartPath(chart) {
  const titleSlug = slugifyTitle(chart.title);
  return titleSlug ? `/chart/${encodeURIComponent(chart.cid)}/${titleSlug}/` : `/chart/${encodeURIComponent(chart.cid)}/`;
}

function chartImage(chart) {
  return `${ASSET_BASE}/ecg-storage/ec_gallery_thumbnail/${chart.cid}.jpg`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.json();
}

async function fetchChartPage(page) {
  const url = new URL(`${API_BASE}/chart-list`);
  url.searchParams.set('current', String(page));
  url.searchParams.set('type', '');
  url.searchParams.set('runtime', 'runnable');
  url.searchParams.set('search', '');
  return fetchJson(url);
}

async function fetchCharts() {
  const first = await fetchChartPage(1);
  const total = Number(first.total || 0);
  const pageCount = Math.min(Math.ceil(Math.min(total, MAX_CHARTS) / PAGE_SIZE), Math.ceil(total / PAGE_SIZE));
  const pages = Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => index + 2);
  const results = [first];

  for (let index = 0; index < pages.length; index += CONCURRENCY) {
    const batch = pages.slice(index, index + CONCURRENCY);
    const payloads = await Promise.all(batch.map(fetchChartPage));
    results.push(...payloads);
  }

  const deduped = new Map();
  for (const payload of results) {
    for (const chart of payload.chartList || []) {
      if (!deduped.has(chart.cid)) {
        deduped.set(chart.cid, chart);
      }
    }
  }

  return [...deduped.values()].slice(0, MAX_CHARTS);
}

function injectHead(html, { title, description, canonical, image }) {
  const meta = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ''
  ]
    .filter(Boolean)
    .join('\n    ');

  return html
    .replace(/<title>.*?<\/title>/s, '')
    .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
    .replace('</head>', `    ${meta}\n  </head>`);
}

function injectFallback(html, content) {
  return html.replace('<div id="app"></div>', `<div id="app">${content}</div>`);
}

async function writeHtmlPage(routePath, html) {
  const outputDir = path.join(DIST_DIR, routePath.replace(/^\//, ''));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'index.html'), html);
}

function chartFallback(chart) {
  return `
    <main>
      <article>
        <h1>${escapeHtml(chart.title || 'ECharts 图表示例')}</h1>
        <p>PPChart 收录的 ECharts 示例，可在线预览、查看代码并基于示例改写。</p>
        <img src="${escapeHtml(chartImage(chart))}" alt="${escapeHtml(chart.title || 'ECharts 图表示例')}" />
        <ul>
          <li>图表 ID：${escapeHtml(chart.cid)}</li>
          <li>ECharts 版本：${escapeHtml(chart.echartsVersion || '-')}</li>
          <li>浏览量：${escapeHtml(chart.viewCount || 0)}</li>
        </ul>
      </article>
    </main>`;
}

function typeFallback(type, charts) {
  const links = charts
    .slice(0, 40)
    .map(chart => `<li><a href="${escapeHtml(chartPath(chart))}">${escapeHtml(chart.title || chart.cid)}</a></li>`)
    .join('');

  return `
    <main>
      <h1>${escapeHtml(type.keyword)}</h1>
      <p>浏览 PPChart 收录的${escapeHtml(type.label)}代码、缩略图和在线编辑入口。</p>
      <ul>${links}</ul>
    </main>`;
}

async function main() {
  const baseHtml = await readFile(path.join(DIST_DIR, 'index.html'), 'utf8');
  const charts = await fetchCharts();
  const sitemapUrls = new Set([`${SITE_URL}/`]);

  for (const chart of charts) {
    const route = chartPath(chart);
    const title = `${chart.title || 'ECharts 图表示例'} - PPChart`;
    const description = `查看 ${chart.title || chart.cid} 的 ECharts 示例代码、缩略图和在线预览，可直接基于 PPChart 修改图表配置。`;
    const canonical = `${SITE_URL}${route}`;
    const html = injectFallback(
      injectHead(baseHtml, { title, description, canonical, image: chartImage(chart) }),
      chartFallback(chart)
    );
    await writeHtmlPage(route, html);
    sitemapUrls.add(canonical);
  }

  for (const type of chartTypes) {
    const route = `/examples/${type.slug}/`;
    const url = new URL(`${API_BASE}/chart-list`);
    url.searchParams.set('current', '1');
    url.searchParams.set('type', type.value);
    url.searchParams.set('runtime', 'runnable');
    url.searchParams.set('search', '');
    const payload = await fetchJson(url);
    const title = `${type.keyword}代码大全 - PPChart`;
    const description = `PPChart 收录可运行的${type.label} ECharts 示例，支持搜索、预览、复制和在线编辑。`;
    const canonical = `${SITE_URL}${route}`;
    const html = injectFallback(
      injectHead(baseHtml, { title, description, canonical }),
      typeFallback(type, payload.chartList || [])
    );
    await writeHtmlPage(route, html);
    sitemapUrls.add(canonical);
  }

  const now = new Date().toISOString();
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...sitemapUrls]
    .map(url => `  <url><loc>${escapeHtml(encodeURI(url))}</loc><lastmod>${now}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`;

  await writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
  console.log(`Generated ${charts.length} chart pages, ${chartTypes.length} category pages and sitemap.xml`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
