# PPChart 图表审核管理端设计

## 目标

为 PPChart 增加独立的图表审核管理端。管理员通过现有 GitHub 或 Google OAuth 登录后，可以查看用户提交的待审核图表、预览代码运行结果、通过并发布到公共图库，或填写原因后拒绝。

## 范围

- 新增管理入口 `/admin-charts.html`。
- 复用 `oauth_user.role`，仅 `role = admin` 的用户可以访问审核数据和执行审核。
- 支持待审核列表、代码预览、通过和拒绝。
- 通过后同步到既有 `chart` 表，使图表立即进入公共图库。
- 拒绝后保存原因，并在用户工作台展示。
- 不新增独立管理员账号密码、用户管理、批量审核或复杂权限系统。

## 身份与权限

- OAuth 登录和 Session Token 流程保持不变。
- 服务端新增 `requireAdmin()`，先校验登录态，再校验 `user.role === "admin"`。
- 未登录访问管理 API 返回 `401`，普通用户返回 `403`。
- 前端 Header 仅对管理员展示“审核管理”入口。
- 管理页面仍会在浏览器中加载，但未登录或非管理员只能看到明确的登录或无权限状态，不能获取审核数据。
- 首个管理员通过一次性数据库更新将现有 OAuth 用户的 `role` 设置为 `admin`。

## 数据模型

`user_chart` 增加以下字段：

- `reviewNote String? @db.Text`：拒绝原因；重新提交或审核通过时清空。
- `reviewedAt DateTime? @db.DateTime(0)`：最近审核时间。
- `reviewerUserId Int?`：最近审核管理员 ID，仅记录审计值，不增加额外关系模型。

状态范围扩展为：

- `draft`：用户草稿。
- `pending`：等待管理员审核。
- `published`：已通过并发布。
- `rejected`：审核拒绝，用户可以修改后重新提交。

## 服务端 API

### `GET /api/admin/charts`

- 权限：管理员。
- 查询参数：`status`，默认 `pending`。
- 返回用户图表及提交者的 `id`、`name`、`email`、`provider`。
- 默认按 `updatedAt` 升序排列，让较早提交的内容先处理。

### `POST /api/admin/charts/:id/review`

请求体：

```json
{
  "action": "approve",
  "note": ""
}
```

- `action` 仅允许 `approve` 或 `reject`。
- 仅允许审核当前状态为 `pending` 的图表。
- `reject` 必须提供非空原因。
- 重复审核返回 `409`，避免覆盖其他管理员已完成的结果。

## 发布事务

审核通过必须在一个数据库事务中完成：

1. 按 `cid` 向既有 `chart` 表执行 upsert。
2. 写入 `title`、`description`、`code`、`echartsVersion`、更新时间和基础浏览字段。
3. 将 `user_chart.status` 更新为 `published`。
4. 写入 `publishedAt`、`reviewedAt`、`reviewerUserId`，清空 `reviewNote`。

事务成功后清理 `chart-list:*` 和当前 `chart-detail:<cid>` Redis 缓存，使公共图库立即读取新数据。事务失败时不改变审核状态。

审核拒绝只更新 `user_chart`：

- 状态改为 `rejected`。
- 保存 `reviewNote`、`reviewedAt` 和 `reviewerUserId`。
- 不写入或修改公共 `chart` 表。

用户修改已拒绝图表并重新提交时，状态回到 `pending`，同时清空旧审核信息。已发布图表再次修改并提交时，公共图库继续保留上一版，直到新版本重新审核通过。

## 前端管理页

管理端沿用现有 PPChart 视觉系统，采用紧凑的审核工作台布局：

- 页面标题、待审核数量、返回图库入口。
- 左侧待审核列表：标题、提交者、提交时间、ECharts 版本。
- 右侧详情：描述、代码、现有 `ChartPreview` 运行预览。
- 操作区：通过、拒绝原因输入框、拒绝按钮。
- 操作成功后从当前待审列表移除并加载下一项。
- API 错误原位展示，操作期间禁用按钮，避免重复提交。

`scripts/generate-static-routes.mjs` 同时生成：

- `dist/my-charts.html`
- `dist/admin-charts.html`

管理端不进入 sitemap。

## 用户工作台

- `UserChart` 类型增加 `rejected` 状态和审核字段。
- 图表列表使用中文状态文案。
- 被拒绝的图表展示拒绝原因。
- 编辑被拒绝或已发布图表时，表单状态默认回到草稿；用户可再次选择提交审核。

## 缩略图处理

首版不增加图片上传和服务端截图链路。用户图表发布后若不存在历史缩略图，公共卡片显示站内文字占位块，不请求外部占位图；详情和代码运行不受影响。

## 错误处理

- 参数错误返回 `400`。
- 未登录返回 `401`。
- 非管理员返回 `403`。
- 图表不存在返回 `404`。
- 图表已被审核返回 `409`。
- 数据库事务错误返回 `500`，不部分发布。
- 前端保留当前列表数据并展示错误，不做乐观状态提交。

## 验收标准

- 普通用户不能读取管理列表或执行审核。
- 管理员可以从 Header 进入 `/admin-charts.html`。
- 管理员能预览待审核图表。
- 拒绝必须填写原因，用户工作台能看到原因并重新提交。
- 通过后 `user_chart` 变为 `published`，公共 `chart` 表存在对应 `cid`。
- 通过后公共列表和详情无需等待缓存过期即可访问。
- 重复审核不会覆盖第一次审核结果。
- `/`、`/my-charts.html` 和现有图表详情功能不回归。
- 前后端构建通过，生产 API 与页面完成真实环境验证。
