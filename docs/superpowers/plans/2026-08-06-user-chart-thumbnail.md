# PPChart 用户投稿缩略图实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 审核通过用户投稿时生成真实 PNG 缩略图、上传 OSS、写入公共图表记录，并让图库展示该图片。

**Architecture:** 管理端从 sandbox 预览 iframe 请求 ECharts 截图，将 PNG data URL 随审核请求提交。服务端在数据库事务前验证并上传固定 OSS 对象，上传成功后才发布图表；公共列表优先消费数据库中的缩略图 URL。

**Tech Stack:** Vue 3、TypeScript、ECharts、Koa、Prisma、ali-oss、MySQL、Redis、阿里云 OSS、Playwright

---

### Task 1: 图片验证与 OSS 存储

**Files:**
- Create: `server/chart-thumbnail.js`
- Create: `server/tests/chart-thumbnail.test.js`
- Modify: `server/package.json`

- [x] **Step 1: 写失败测试**

测试覆盖：

```js
const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00,
]);
const dataUrl = `data:image/png;base64,${validPng.toString("base64")}`;

assert.deepStrictEqual(parsePngDataUrl(dataUrl), validPng);
assert.throws(() => parsePngDataUrl("data:image/jpeg;base64,AA=="), /PNG/);
assert.throws(() => parsePngDataUrl("data:image/png;base64,%%%%"), /Base64/);
assert.throws(
  () => parsePngDataUrl(`data:image/png;base64,${Buffer.alloc(MAX_THUMBNAIL_BYTES + 1).toString("base64")}`),
  /3 MB/
);
```

使用 fake OSS client 验证：

```js
const result = await uploadChartThumbnail({
  cid: "user-1-demo",
  png: validPng,
  client: {
    put: async (key, body, options) => {
      captured = { key, body, options };
    },
  },
  publicBaseUrl: "https://ppchart.com/",
});

assert.strictEqual(captured.key, "thumbnails/user/user-1-demo.png");
assert.strictEqual(captured.options.headers["Content-Type"], "image/png");
assert.strictEqual(
  result,
  "https://ppchart.com/thumbnails/user/user-1-demo.png?v=843ac23b1736"
);
```

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
cd server
node tests/chart-thumbnail.test.js
```

Expected: FAIL，提示 `../chart-thumbnail` 不存在。

- [x] **Step 3: 实现图片模块**

`server/chart-thumbnail.js` 导出：

```js
const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;

function parsePngDataUrl(dataUrl) {}
function createOssClient() {}
async function uploadChartThumbnail({
  cid,
  png,
  client = createOssClient(),
  publicBaseUrl = process.env.OSS_PUBLIC_BASE_URL,
}) {}
```

约束：

- 严格校验 data URL 前缀和 Base64 字符。
- 校验 PNG 八字节签名。
- 限制解码后 3 MB。
- CID 只允许 `user-` 开头的字母、数字和连字符。
- 公开 URL 附加 PNG SHA-256 前 12 位作为 `v` 查询参数，防止覆盖后读取旧缓存。
- 使用 `ali-oss@6.23.0`。
- OSS 配置缺失或上传失败抛出 `status = 503` 的统一错误。
- 不在错误中包含凭据或图片正文。

- [x] **Step 4: 运行测试确认通过**

Run:

```bash
cd server
node tests/chart-thumbnail.test.js
```

Expected: `chart-thumbnail tests passed`。

### Task 2: 审核领域合同

**Files:**
- Modify: `server/chart-review.js`
- Modify: `server/tests/chart-review.test.js`

- [x] **Step 1: 扩展失败测试**

审核通过必须带缩略图：

```js
assert.throws(
  () => parseReviewInput({ action: "approve" }),
  /缩略图不能为空/
);
assert.deepStrictEqual(
  parseReviewInput({
    action: "approve",
    thumbnail: "data:image/png;base64,AA==",
  }),
  {
    action: "approve",
    note: "",
    thumbnail: "data:image/png;base64,AA==",
  }
);
```

公共图表字段：

```js
const publicChart = buildPublicChartData(
  sourceChart,
  "https://ppchart.com/thumbnails/user/user-1-demo.png"
);
assert.strictEqual(publicChart.isCustomThumbnail, 1);
assert.strictEqual(
  publicChart.thumbnailURL,
  "https://ppchart.com/thumbnails/user/user-1-demo.png"
);
```

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
cd server
npm run test:review
```

Expected: FAIL，审核合同和公共字段与新断言不一致。

- [x] **Step 3: 实现最小合同**

`parseReviewInput()`：

- `approve` 时要求非空字符串 `thumbnail`。
- `reject` 不要求缩略图。
- 返回 `{ action, note, thumbnail }`。

`buildPublicChartData(sourceChart, thumbnailURL, now)`：

- 写入 `thumbnailURL`。
- 写入 `isCustomThumbnail: 1`。

- [x] **Step 4: 运行审核测试**

Run:

```bash
cd server
npm run test:review
```

Expected: `chart-review tests passed`。

### Task 3: 隔离预览截图协议

**Files:**
- Modify: `src/components/ChartPreview.vue`
- Modify: `src/components/AdminChartPanel.vue`
- Modify: `src/App.vue`
- Modify: `src/api/ppchart.ts`

- [x] **Step 1: 在 iframe 中处理截图请求**

iframe 收到：

```js
if (event.data.type === "capture") {
  const dataUrl = chart.getDataURL({
    type: "png",
    pixelRatio: 1,
    backgroundColor: "#f8fafc",
  });
  parent.postMessage({
    source: "ppchart-preview",
    type: "capture-success",
    requestId: event.data.requestId,
    dataUrl,
  }, "*");
}
```

异常返回 `capture-error`。

- [x] **Step 2: 暴露 Promise 截图 API**

`ChartPreview.vue` 暴露：

```ts
defineExpose({
  capture: (): Promise<string> => {}
});
```

使用 `requestId` 匹配响应，5 秒超时；组件卸载时拒绝并清空待处理请求。所有预览消息校验 `event.source === frameRef.value?.contentWindow`。

- [x] **Step 3: 审核按钮先截图**

`AdminChartPanel.vue`：

```ts
approve: [chart: AdminChart, thumbnail: string];
```

点击时调用预览组件 `capture()`，成功后 emit；失败时展示本地错误。截图期间禁用审核按钮并显示“生成缩略图”。

- [x] **Step 4: 将图片传入 API**

调用链统一为：

```ts
reviewChart(chart, 'approve', '', thumbnail)
reviewAdminChart(token, chart.id, 'approve', '', thumbnail)
```

请求体：

```ts
{ action, note, thumbnail }
```

拒绝请求不发送图片。

- [x] **Step 5: 运行前端类型检查**

Run:

```bash
npx vue-tsc --noEmit
```

Expected: 退出码 0。

### Task 4: 接入服务端审核流程

**Files:**
- Modify: `server/server.js`

- [x] **Step 1: 限制 JSON 请求体**

`parseJsonBody()` 累计字节数，超过：

```js
const MAX_JSON_BODY_BYTES = 5 * 1024 * 1024;
```

时返回：

```json
{ "code": 413, "message": "请求体不能超过 5 MB" }
```

- [x] **Step 2: 上传后再发布**

审核通过分支在事务前执行：

```js
const png = parsePngDataUrl(reviewInput.thumbnail);
const thumbnailURL = await uploadChartThumbnail({
  cid: existing.cid,
  png,
});
```

上传失败返回 `503`，不进入事务。

事务中调用：

```js
buildPublicChartData(existing, thumbnailURL)
```

拒绝分支不调用 OSS。

- [x] **Step 3: 校验服务端**

Run:

```bash
cd server
node tests/chart-thumbnail.test.js
npm run test:review
node --check server.js
```

Expected: 两组测试和语法检查全部通过。

### Task 5: 公共图库消费数据库图片

**Files:**
- Modify: `src/api/ppchart.ts`

- [x] **Step 1: 保留数据库 URL**

修改：

```ts
function normalizeSummary(item: ChartSummary): ChartSummary {
  return {
    ...item,
    thumbnailURL:
      item.thumbnailURL ||
      `${ASSET_BASE}/ecg-storage/ec_gallery_thumbnail/${item.cid}.jpg`
  };
}
```

- [x] **Step 2: 生产构建**

Run:

```bash
npm run build
```

Expected: Vue 类型检查、Vite 构建和静态入口生成成功。

### Task 6: 部署与真实验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-user-chart-thumbnail.md`
- Modify: `/Users/bytedance/Desktop/geiha/ppchart-update-runbook.md`

- [x] **Step 1: 配置生产 OSS 环境**

在服务器运行时环境增加：

```text
OSS_ACCESS_KEY_ID=<现有 OSS AccessKey ID>
OSS_ACCESS_KEY_SECRET=<现有 OSS AccessKey Secret>
OSS_BUCKET=ppchart
OSS_REGION=oss-cn-hongkong
OSS_PUBLIC_BASE_URL=https://ppchart.com
```

文件权限保持 `600`，日志和 Git 中不输出 Secret。

- [x] **Step 2: 构建完整后端镜像并发布前端**

- 新镜像必须包含 `ali-oss@6.23.0`。
- 保留当前镜像回滚标签。
- 上传新 hashed assets 和三个 HTML 入口。
- 健康检查 `/api/visit` 返回 `200`。

- [x] **Step 3: 验证失败阻断**

创建临时待审核投稿，直接调用不带 `thumbnail` 的审核通过请求：

- HTTP `400`。
- `user_chart.status` 仍为 `pending`。
- 公共 `chart` 不存在。

- [x] **Step 4: 浏览器完成真实审核**

在生产管理端：

- 打开临时投稿并等待隔离预览完成。
- 点击“通过并发布”。
- 验证没有控制台错误。
- 验证投稿从待审核队列移除。

- [x] **Step 5: 验证图片与数据库**

- `chart.thumbnailURL` 使用 `https://ppchart.com/thumbnails/user/{cid}.png?v={内容哈希}`。
- `chart.isCustomThumbnail = 1`。
- 图片 URL 返回 `200` 和 `image/png`。
- 公共“用户投稿”卡片使用该 URL，图片自然宽高大于 0，未显示占位符。

- [x] **Step 6: 清理与提交**

- 下架并删除临时数据库记录。
- 删除临时 OSS 对象和相关 Redis 缓存。
- 更新 Runbook 镜像、前端资源与 OSS 环境项。
- 完成密钥扫描、`git diff --check` 和最终构建。
- 提交并推送 `main`，确保本地与 `origin/main` SHA 一致且没有 lock 文件。
