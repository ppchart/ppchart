# PPChart 用户投稿缩略图设计

## 目标

用户投稿审核通过时生成与审核预览一致的缩略图，上传到阿里云 OSS，并将公开 URL 写入现有 `chart.thumbnailURL` 字段。缩略图生成或上传失败时阻止发布，避免公共图库继续出现 `PPCHART` 占位图。

## 范围

本次只处理用户投稿的发布缩略图：

- 管理员审核页生成 PNG。
- 服务端校验并上传 OSS。
- 公共 `chart` 记录保存缩略图 URL。
- 公共图库优先使用数据库 URL。
- 管理员下架不删除缩略图。

不为历史图表批量补图，不增加图片编辑、裁剪、手动上传或异步任务系统。

## 现有数据模型

公共 `chart` 表已有字段：

```prisma
isCustomThumbnail Int?
thumbnailURL      String? @db.VarChar(255)
```

因此不新增字段、不执行数据库迁移。`user_chart` 不保存缩略图 URL；它重新提交审核时沿用原 CID，并在下一次审核通过时覆盖 OSS 固定对象。

## 截图生成

`ChartPreview` 继续在 `sandbox="allow-scripts"` iframe 中运行用户代码。

iframe 增加截图消息：

```ts
{
  source: "ppchart-host",
  type: "capture",
  requestId: string
}
```

收到消息后调用：

```js
chart.getDataURL({
  type: "png",
  pixelRatio: 1,
  backgroundColor: "#f8fafc"
})
```

iframe 返回：

```ts
{
  source: "ppchart-preview",
  type: "capture-success",
  requestId: string,
  dataUrl: string
}
```

失败时返回 `capture-error` 和可展示的错误信息。

父组件暴露：

```ts
capture(): Promise<string>
```

该 Promise 最多等待 5 秒。消息处理同时校验 `event.source === iframe.contentWindow`，避免同页其他 iframe 的消息被误接收。

## 管理端交互

管理员点击“通过并发布”时：

1. 按钮进入“生成缩略图”状态并禁用重复点击。
2. `AdminChartPanel` 调用当前 `ChartPreview.capture()`。
3. 截图成功后触发 `approve(chart, thumbnailDataUrl)`。
4. `App.vue` 将 PNG data URL 传给审核 API。
5. 截图失败时停留在待审核状态，并在审核页展示错误，不发送审核请求。

拒绝和下架流程不生成图片。

## 审核 API

沿用：

```text
POST /api/admin/charts/:id/review
```

审核通过请求：

```json
{
  "action": "approve",
  "note": "",
  "thumbnail": "data:image/png;base64,..."
}
```

拒绝请求保持不变，且忽略 `thumbnail`。

服务端对审核通过请求校验：

- `thumbnail` 必须存在。
- 必须是 `data:image/png;base64,`。
- Base64 必须可解码。
- 解码后必须包含 PNG 文件签名。
- 解码后最大 3 MB。

非法图片返回 `400`。JSON 请求体最大 5 MB，超限返回 `413`。

## OSS 存储

服务端使用官方 `ali-oss` SDK，凭据只通过生产环境变量注入：

```text
OSS_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET
OSS_BUCKET=ppchart
OSS_REGION=oss-cn-hongkong
OSS_PUBLIC_BASE_URL=https://ppchart.com
```

不把凭据写入 Git、前端构建产物或响应。

对象路径固定为：

```text
thumbnails/user/{cid}.png
```

上传元数据：

```text
Content-Type: image/png
Cache-Control: public, max-age=31536000
```

数据库 URL：

```text
https://ppchart.com/thumbnails/user/{cid}.png
```

同一投稿再次审核时覆盖同一路径。文件名不接收客户端输入，只使用服务端已保存的 CID。

## 发布顺序与一致性

审核通过流程：

1. 验证管理员、请求参数和待审核状态。
2. 解码并校验 PNG。
3. 上传固定 OSS 对象。
4. 执行现有数据库事务：
   - 原子抢占 `pending` 状态。
   - 将 `user_chart` 更新为 `published`。
   - upsert 公共 `chart`，写入 `thumbnailURL` 和 `isCustomThumbnail = 1`。
5. 清理公共列表和详情缓存。

OSS 上传失败时不执行数据库事务，投稿保持 `pending`。

并发审核可能让两个管理员先后覆盖同一固定对象，但二者基于同一待审核代码生成截图；只有一个数据库事务能抢占成功。事务冲突不会产生新的随机对象，也不会删除已成功上传的固定对象。

## 下架与删除

- 管理员下架只删除公共 `chart` 记录，不删除 OSS 图片。
- 用户修改并重新提交后，下一次通过审核会覆盖固定图片。
- 用户永久删除投稿时本次不主动删除 OSS 图片，因为当前删除流程没有公共发布记录且图片可作为重新发布失败时的回退；孤立对象清理由后续生命周期规则处理。

## 公共图库

`normalizeSummary()` 改为：

```ts
thumbnailURL:
  item.thumbnailURL ||
  `${ASSET_BASE}/ecg-storage/ec_gallery_thumbnail/${item.cid}.jpg`
```

用户投稿使用数据库中的 OSS URL；没有数据库 URL 的历史图表继续使用旧缩略图规则。图片加载失败仍保留现有 `PPCHART` 占位逻辑。

## 错误处理

- 截图失败：管理端展示“缩略图生成失败”，不调用审核 API。
- 图片格式或大小非法：API 返回 `400`。
- 请求体超限：API 返回 `413`。
- OSS 配置缺失或上传失败：API 返回 `503` 和“缩略图上传失败”，投稿保持 `pending`。
- 审核并发冲突：API 返回现有 `409`。
- 数据库事务失败：API 返回 `500`，不把投稿标记为发布。

服务端日志不打印 Base64、AccessKey 或 Secret。

## 测试与验收

### 单元测试

- 审核通过缺少缩略图时拒绝。
- 拒绝操作不要求缩略图。
- 合法 PNG data URL 可解码。
- 非 PNG、损坏 Base64、错误签名和超过 3 MB 均拒绝。
- OSS 上传对象键、Content-Type、缓存头和公开 URL 正确。
- `buildPublicChartData()` 写入 `thumbnailURL` 与 `isCustomThumbnail`。

### 构建与静态检查

- Vue TypeScript 检查通过。
- Vite 生产构建通过。
- 服务端测试与语法检查通过。
- 不提交任何 AccessKey、Secret 或生产 `.env`。

### 生产验收

1. 创建一条临时待审核投稿。
2. 管理员在真实审核页预览并通过。
3. 验证审核按钮先生成图片再发请求。
4. 验证数据库 `chart.thumbnailURL` 是固定 OSS URL。
5. 验证 OSS URL 返回 `200`、`Content-Type: image/png`。
6. 验证公共“用户投稿”列表显示真实图，而非占位图。
7. 验证无缩略图直接调用通过 API 返回 `400`，投稿状态不变。
8. 下架临时投稿并清理测试数据及缓存。
