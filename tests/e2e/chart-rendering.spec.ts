import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';

interface ChartSummary {
  cid: string;
  title: string | null;
}

interface ChartListResponse {
  code: number;
  chartList: ChartSummary[];
}

const REQUIRED_CONTIGUOUS_RENDERED_CHARTS = 10;
const MAX_CHARTS_TO_SCAN_PER_CATEGORY = 20;

const candidateCategories = [
  { label: 'Beta 可运行', value: 'beta' },
  { label: '饼图', value: '3' },
  { label: '柱状图', value: '4' },
  { label: '折线图', value: '2' },
  { label: '仪表盘', value: '21' },
  { label: '雷达图', value: '9' },
  { label: '散点图', value: '19' },
  { label: '漏斗图', value: '11' }
];

test('连续至少十个图表详情可以无错误渲染', async ({ page, request }, testInfo) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: '查找、预览、改写一份图表代码' })).toBeVisible();
  await expect(page.getByText(/共 \d+ 个示例/)).toBeVisible();

  const attempts: Array<{
    category: string;
    index: number;
    cid: string;
    title: string;
    rendered: boolean;
    reason: string;
  }> = [];
  const consecutive: typeof attempts = [];

  for (const category of candidateCategories) {
    const apiResponse = await request.get(
      `https://api.ppmark.cn/chart/api/chart-list?current=1&type=${category.value}&search=`
    );
    expect(apiResponse.ok()).toBe(true);

    const payload = (await apiResponse.json()) as ChartListResponse;
    expect(payload.code).toBe(0);
    expect(payload.chartList.length).toBeGreaterThanOrEqual(REQUIRED_CONTIGUOUS_RENDERED_CHARTS);

    await page.getByRole('button', { name: category.label }).click();
    await expect(page.locator('.chart-card').first().locator('.chart-title')).toHaveText(payload.chartList[0].title);

    consecutive.length = 0;

    for (const [index, chart] of payload.chartList.slice(0, MAX_CHARTS_TO_SCAN_PER_CATEGORY).entries()) {
      const result = {
        category: category.label,
        ...(await verifyChart(page, chart, index))
      };
      attempts.push(result);

      if (result.rendered) {
        consecutive.push(result);
        if (consecutive.length >= REQUIRED_CONTIGUOUS_RENDERED_CHARTS) {
          break;
        }
      } else {
        consecutive.length = 0;
      }
    }

    if (consecutive.length >= REQUIRED_CONTIGUOUS_RENDERED_CHARTS) {
      break;
    }
  }

  const report = {
    required: REQUIRED_CONTIGUOUS_RENDERED_CHARTS,
    inspected: attempts.length,
    consecutiveRendered: consecutive.map(({ category, index, cid, title }) => ({ category, index, cid, title })),
    attempts
  };

  await testInfo.attach('chart-rendering-report.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json'
  });
  await mkdir(testInfo.outputDir, { recursive: true });
  await writeFile(join(testInfo.outputDir, 'chart-rendering-report.json'), JSON.stringify(report, null, 2));

  expect(
    consecutive.length,
    `未找到连续 ${REQUIRED_CONTIGUOUS_RENDERED_CHARTS} 个渲染无误的图表，报告：${JSON.stringify(report, null, 2)}`
  ).toBeGreaterThanOrEqual(REQUIRED_CONTIGUOUS_RENDERED_CHARTS);
});

async function verifyChart(page: Page, chart: ChartSummary, index: number) {
  const displayTitle = chart.title || '未命名图表';
  const article = page.locator('.chart-card').nth(index);
  await article.locator('.chart-title').click();
  await expect(page.locator('.detail-header h2')).toHaveText(displayTitle);
  await expect(page.getByRole('textbox', { name: 'Editor content' })).toBeVisible();

  const previewFrame = page.frameLocator('iframe[title="图表预览"]');
  const errorNode = previewFrame.locator('#error');
  const chartCanvas = previewFrame.locator('#chart canvas').first();

  await Promise.race([
    chartCanvas.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null),
    errorNode
      .waitFor({ state: 'visible', timeout: 15_000 })
      .catch(() => null)
  ]);
  await page.waitForTimeout(500);

  const errorText = ((await errorNode.textContent()) || '').trim();
  const canvasBox = (await chartCanvas.count()) > 0 ? await chartCanvas.boundingBox() : null;
  const hasCanvasSize = Boolean(canvasBox && canvasBox.width > 20 && canvasBox.height > 20);

  const result = {
    index,
    cid: chart.cid,
    title: displayTitle,
    rendered: errorText.length === 0 && hasCanvasSize,
    reason: errorText || (hasCanvasSize ? 'ok' : 'canvas 尺寸异常')
  };

  await page.getByRole('button', { name: '关闭详情' }).click();
  await expect(page.locator('.detail-drawer')).toHaveCount(0);

  return result;
}
