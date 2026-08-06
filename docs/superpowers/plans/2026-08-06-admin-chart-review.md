# PPChart 图表审核管理端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 实现仅管理员可访问的图表审核管理端，并把审核通过的用户图表可靠发布到公共图库。

**Architecture:** 复用现有 OAuth Session 与 `oauth_user.role`。服务端新增审核领域纯函数和管理员 API，通过数据库事务同步 `user_chart` 与公共 `chart`；前端在现有 Vue SPA 中新增 `/admin-charts.html` 页面和独立审核组件。

**Tech Stack:** Vue 3、TypeScript、Vite、Koa、Prisma、MySQL、Redis、Node.js assert

---

### Task 1: 审核数据模型与纯函数

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/chart-review.js`
- Create: `server/tests/chart-review.test.js`
- Modify: `server/package.json`

- [x] **Step 1: 写审核领域失败测试**

测试覆盖：

```js
const assert = require("assert");
const {
  parseReviewInput,
  buildPublicChartData,
  buildReviewUpdate,
} = require("../chart-review");

assert.deepStrictEqual(parseReviewInput({ action: "approve" }), {
  action: "approve",
  note: "",
});
assert.throws(
  () => parseReviewInput({ action: "reject", note: " " }),
  /拒绝原因不能为空/
);
assert.strictEqual(buildPublicChartData({
  cid: "user-1-demo",
  title: "Demo",
  description: "Desc",
  code: "option = {}",
  echartsVersion: "5.6.0",
}).cid, "user-1-demo");
assert.strictEqual(
  buildReviewUpdate("reject", "代码无法运行", 7).status,
  "rejected"
);
```

- [x] **Step 2: 运行测试确认失败**

Run: `cd server && node tests/chart-review.test.js`

Expected: FAIL with `Cannot find module '../chart-review'`.

- [x] **Step 3: 增加审核字段和纯函数**

`user_chart` 增加：

```prisma
reviewNote     String?   @db.Text
reviewedAt     DateTime? @db.DateTime(0)
reviewerUserId Int?
```

`chart-review.js` 导出：

```js
function parseReviewInput(body = {}) {
  const action = body.action;
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!["approve", "reject"].includes(action)) {
    throw new Error("审核动作无效");
  }
  if (action === "reject" && !note) {
    throw new Error("拒绝原因不能为空");
  }
  return { action, note };
}
```

同时实现 `buildPublicChartData(chart)` 和 `buildReviewUpdate(action, note, reviewerUserId)`，统一公共表字段映射和审核审计字段。

- [x] **Step 4: 运行纯函数测试**

Run: `cd server && node tests/chart-review.test.js`

Expected: 输出 `chart-review tests passed`，退出码为 0。

### Task 2: 管理员审核 API 与发布事务

**Files:**
- Modify: `server/source/base.js`
- Modify: `server/server.js`

- [x] **Step 1: 暴露 Prisma 事务能力**

在 `Base` 中增加：

```js
transaction(operations) {
  return prisma.$transaction(operations);
}
```

- [x] **Step 2: 增加管理员鉴权**

在 `server.js` 中增加：

```js
async function requireAdmin(ctx) {
  const user = await requireUser(ctx);
  if (!user) return null;
  if (user.role !== "admin") {
    ctx.status = 403;
    ctx.body = { code: 403, message: "无管理员权限" };
    return null;
  }
  return user;
}
```

- [x] **Step 3: 增加待审核列表 API**

实现 `GET /api/admin/charts`：

```js
const items = await userChart.model.findMany({
  where: { status: ctx.query.status || "pending" },
  orderBy: { updatedAt: "asc" },
  include: {
    user: {
      select: { id: true, name: true, email: true, provider: true },
    },
  },
});
```

仅允许 `pending`、`published`、`rejected` 状态查询。

- [x] **Step 4: 增加审核 API**

实现 `POST /api/admin/charts/:id/review`：

- 解析并校验 `action`、`note`。
- 读取 `status = pending` 的目标图表，不存在时区分 `404` 与 `409`。
- `approve` 使用 `chart.model.upsert` 与 `userChart.model.update` 组成 `$transaction`。
- `reject` 更新状态、拒绝原因和审核人。
- 成功后删除 `chart-list:*` 与 `chart-detail:<cid>` 缓存。

- [x] **Step 5: 校验服务端语法**

Run: `node --check server/server.js && node --check server/chart-review.js`

Expected: 退出码为 0。

### Task 3: 前端审核类型、API 与路由

**Files:**
- Modify: `src/types/chart.ts`
- Modify: `src/api/ppchart.ts`
- Modify: `src/utils/routes.ts`

- [x] **Step 1: 扩展图表审核类型**

增加：

```ts
export type UserChartStatus = 'draft' | 'pending' | 'published' | 'rejected';

export interface AdminChart extends UserChart {
  user: Pick<CurrentUser, 'id' | 'name' | 'email' | 'provider'>;
}
```

`UserChart` 增加 `reviewNote`、`reviewedAt`、`reviewerUserId`。

- [x] **Step 2: 增加管理员 API 客户端**

增加：

```ts
export async function fetchAdminCharts(token: string) {
  const payload = await requestApi<{ code: number; data: AdminChart[] }>(
    '/admin/charts?status=pending',
    { token }
  );
  return payload.data || [];
}

export async function reviewAdminChart(
  token: string,
  id: number,
  action: 'approve' | 'reject',
  note = ''
) {
  return requestApi(`/admin/charts/${id}/review`, {
    method: 'POST',
    token,
    body: { action, note }
  });
}
```

- [x] **Step 3: 增加管理页路由判断**

增加：

```ts
export function isAdminWorkspacePath(pathname = window.location.pathname) {
  return pathname === '/admin-charts.html';
}
```

### Task 4: 管理审核页面

**Files:**
- Create: `src/components/AdminChartPanel.vue`
- Modify: `src/App.vue`
- Modify: `src/components/HeaderBar.vue`
- Modify: `src/style.css`

- [x] **Step 1: 创建审核组件**

`AdminChartPanel.vue` 接收：

```ts
defineProps<{
  user: CurrentUser | null;
  charts: AdminChart[];
  selected: AdminChart | null;
  loading: boolean;
  error: string;
}>();
```

事件包括 `login`、`select`、`approve`、`reject`。组件展示待审列表、提交者、描述、代码、`ChartPreview` 和拒绝原因输入框。

- [x] **Step 2: 接入 App 状态和数据流**

在 `App.vue`：

- 增加 `isAdminWorkspace`。
- 管理页登录后仅管理员调用 `fetchAdminCharts()`。
- 审核成功后重新拉取列表并选择下一项。
- 管理页不加载公共图库和用户图表。
- 非管理员显示无权限状态。

- [x] **Step 3: 增加管理员 Header 入口**

仅在 `user.role === 'admin'` 时渲染：

```vue
<a href="/admin-charts.html">审核管理</a>
```

- [x] **Step 4: 增加审核工作台样式**

使用现有变量实现双栏布局，移动端降级为单栏。通过按钮、拒绝按钮、选中卡片和错误信息必须有独立视觉状态。

### Task 5: 用户反馈、缩略图降级与静态入口

**Files:**
- Modify: `src/components/UserChartPanel.vue`
- Modify: `src/components/ChartCard.vue`
- Modify: `src/style.css`
- Modify: `scripts/generate-static-routes.mjs`

- [x] **Step 1: 展示中文状态和拒绝原因**

状态映射：

```ts
const statusLabels = {
  draft: '草稿',
  pending: '审核中',
  published: '已发布',
  rejected: '已拒绝'
};
```

`rejected` 图表展示 `reviewNote`，编辑时仍允许重新提交。

- [x] **Step 2: 增加缩略图错误降级**

图片加载失败后显示站内文字块，不加载第三方占位图片。

- [x] **Step 3: 生成管理端 HTML**

更新：

```js
const routes = ['my-charts.html', 'admin-charts.html'];
```

- [x] **Step 4: 运行前端构建**

Run: `npm run build`

Expected: `dist/my-charts.html` 与 `dist/admin-charts.html` 均存在。

### Task 6: 生产部署与验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-admin-chart-review.md`

- [x] **Step 1: 更新生产数据库**

在生产 server 目录执行：

```bash
npx prisma db push
```

确认只新增 `reviewNote`、`reviewedAt`、`reviewerUserId`，不删除历史字段。

- [x] **Step 2: 设置首个管理员**

查询现有 OAuth 用户，确认用户账号后执行：

```sql
UPDATE oauth_user SET role = 'admin' WHERE id = <current-user-id>;
```

- [x] **Step 3: 构建并替换后端容器**

构建带时间戳镜像，保留原容器环境变量，启动新容器后验证：

```bash
curl -i https://api.ppmark.cn/chart/api/admin/charts
```

Expected: 未登录返回 `401`。

- [x] **Step 4: 上传前端产物**

上传新 hashed assets、`index.html`、`my-charts.html` 和 `admin-charts.html`，HTML 设置 `Content-Type: text/html`。

- [x] **Step 5: 线上浏览器验收**

- 普通用户访问管理 API 得到 `403`。
- 管理员能进入 `/admin-charts.html`。
- 创建一条待审核测试图表。
- 拒绝时用户能看到原因。
- 再次提交并通过后，公共详情可按 `cid` 打开。

- [x] **Step 6: 提交并推送**

Run:

```bash
git diff --check
git add server src scripts package.json docs
git commit -m "feat: add chart review admin"
git push origin main
```

Expected: 本地与 `origin/main` SHA 一致，工作区干净。
