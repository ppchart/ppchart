import { expect, test } from '@playwright/test';

const legacyThumbnail =
  'https://www.makeapie.com/ecg-storage/ec_gallery_thumbnail/legacy-chart.png';
const userThumbnail =
  'https://ppchart.com/thumbnails/user/user-1-chart.png?v=abc123';

test('历史图使用站内代理，用户投稿使用数据库缩略图', async ({ page }) => {
  await page.route('**/chart-api/chart-list**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        total: 2,
        chartList: [
          {
            cid: 'legacy-chart',
            title: '历史图',
            thumbnailURL: legacyThumbnail,
            echartsVersion: '5.6.0',
            viewCount: 1,
            createTime: '2026-08-06T00:00:00.000Z'
          },
          {
            cid: 'user-1-chart',
            title: '用户投稿',
            thumbnailURL: userThumbnail,
            echartsVersion: '5.6.0',
            viewCount: 0,
            createTime: '2026-08-06T00:00:00.000Z'
          }
        ]
      })
    })
  );
  await page.route('**/chart-api/visit**', route =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        code: 0,
        online: 1,
        threeUV: 2,
        UV: 3
      })
    })
  );

  await page.goto('/');

  const historicalImage = page
    .locator('.chart-card')
    .filter({ hasText: '历史图' })
    .locator('img');
  const userImage = page
    .locator('.chart-card')
    .filter({ hasText: '用户投稿' })
    .locator('img');

  await expect(historicalImage).toHaveAttribute(
    'src',
    '/chart-assets/ecg-storage/ec_gallery_thumbnail/legacy-chart.jpg'
  );
  await expect(userImage).toHaveAttribute('src', userThumbnail);
});
