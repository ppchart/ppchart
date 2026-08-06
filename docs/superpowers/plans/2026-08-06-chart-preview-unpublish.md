# PPChart 创建预览与发布后管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 为用户投稿编辑区增加隔离预览，并让管理员可以查看和下架已发布的用户投稿。

**Architecture:** 用户端直接复用现有 sandbox `ChartPreview`，不新增运行器。管理端以 `pending`、`published` 两个状态驱动同一审核工作台；下架通过管理员 API 在事务内同步更新 `user_chart` 并删除公共 `chart` 记录，随后清理 Redis 缓存。

**Tech Stack:** Vue 3、TypeScript、Vite、Koa、Prisma、MySQL、Redis、Playwright

---

### Task 1: 下架领域规则

**Files:**
- Modify: `server/chart-review.js`
- Modify: `server/tests/chart-review.test.js`

- [x] **Step 1: 写下架规则失败测试**

增加：

```js
const {
  buildUnpublishUpdate,
  parseUnpublishInput,
} = require("../chart-review");

assert.deepStrictEqual(parseUnpublishInput({ note: "  内容违规  " }), {
  note: "内容违规",
});
assert.throws(
  () => parseUnpublishInput({ note: " " }),
  /下架原因不能为空/
);

const unpublished = buildUnpublishUpdate("内容违规", 7);
assert.strictEqual(unpublished.status, "unpublished");
assert.strictEqual(unpublished.reviewNote, "内容违规");
assert.strictEqual(unpublished.reviewerUserId, 7);
assert.ok(unpublished.reviewedAt instanceof Date);
```

- [x] **Step 2: 运行测试确认失败**

Run: `cd server && npm run test:review`

Expected: FAIL，提示 `parseUnpublishInput is not a function`。

- [x] **Step 3: 实现下架规则**

增加：

```js
function parseUnpublishInput(body = {}) {
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) {
    throw new Error("下架原因不能为空");
  }
  return { note };
}

function buildUnpublishUpdate(note, reviewerUserId, now = new Date()) {
  return {
    status: "unpublished",
    reviewNote: note,
    reviewedAt: now,
    reviewerUserId,
  };
}
```

- [x] **Step 4: 运行测试确认通过**

Run: `cd server && npm run test:review`

Expected: `chart-review tests passed`。

### Task 2: 管理员下架 API

**Files:**
- Modify: `server/server.js`

- [x] **Step 1: 增加下架接口**

实现：

```text
POST /api/admin/charts/:id/unpublish
```

处理顺序：

1. `requireAdmin()` 校验管理员。
2. 校验正整数 ID 和非空下架原因。
3. 查询投稿，`404` 处理不存在，`409` 处理非 `published` 状态。
4. 事务内用 `updateMany({ where: { id, status: "published" } })` 抢占状态。
5. 同一事务按 `cid` 执行 `tx.chart.deleteMany()`。
6. 成功后调用 `invalidatePublicChartCache(cid)`。

- [x] **Step 2: 保持重新提交语义**

现有 `normalizeChartPayload()` 已在用户编辑时清空 `reviewNote`、`reviewedAt` 和 `reviewerUserId`。确认 `unpublished` 不受 pending 编辑限制，用户可以保存草稿或重新提交。

- [x] **Step 3: 校验服务端**

Run:

```bash
cd server
npm run test:review
node --check server.js
```

Expected: 全部退出码为 0。

### Task 3: 管理端状态与 API 客户端

**Files:**
- Modify: `src/types/chart.ts`
- Modify: `src/api/ppchart.ts`
- Modify: `src/App.vue`

- [x] **Step 1: 增加下架状态**

将类型改为：

```ts
export type UserChartStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'unpublished';
```

- [x] **Step 2: 参数化管理列表**

修改：

```ts
export async function fetchAdminCharts(
  token: string,
  status: 'pending' | 'published'
): Promise<AdminChart[]>
```

请求 `/admin/charts?status=${status}`。

- [x] **Step 3: 增加下架请求**

增加：

```ts
export async function unpublishAdminChart(
  token: string,
  id: number,
  note: string
) {
  return requestApi(`/admin/charts/${id}/unpublish`, {
    method: 'POST',
    token,
    body: { note }
  });
}
```

- [x] **Step 4: 接入管理模式状态**

`App.vue` 增加：

```ts
const adminStatus = ref<'pending' | 'published'>('pending');
```

- 切换状态时重新调用 `fetchAdminCharts(token, adminStatus)`。
- 审核通过/拒绝后刷新当前列表。
- 下架成功后从已发布列表移除。

### Task 4: 用户隔离预览与管理端下架交互

**Files:**
- Modify: `src/components/UserChartPanel.vue`
- Modify: `src/components/AdminChartPanel.vue`
- Modify: `src/style.css`

- [x] **Step 1: 用户表单接入隔离预览**

导入：

```ts
import ChartPreview from '@/components/ChartPreview.vue';
```

已登录区域使用 `.user-chart-editor` 双栏包裹：

```vue
<form class="user-chart-form">...</form>
<div class="user-chart-preview">
  <ChartPreview v-if="form.code.trim()" :code="form.code" />
  <div v-else class="preview-placeholder">填写代码后运行隔离预览</div>
</div>
```

移动端将双栏降级为上下排列。

- [x] **Step 2: 用户状态增加已下架**

状态映射增加：

```ts
unpublished: '已下架'
```

`rejected` 和 `unpublished` 均展示 `reviewNote`。已下架投稿允许编辑和删除。

- [x] **Step 3: 管理端增加标签页**

`AdminChartPanel` 新增：

```ts
status: 'pending' | 'published';
```

事件增加：

```ts
'update:status': [value: 'pending' | 'published'];
unpublish: [chart: AdminChart, note: string];
```

Header 渲染“待审核 / 已发布”标签；列表数量对应当前状态。

- [x] **Step 4: 区分审核与下架操作**

- `pending` 模式保留通过、拒绝。
- `published` 模式显示下架原因输入和“确认下架”。
- 原因为空时展示“请填写下架原因”。
- 两种模式都保留代码预览和详情。

### Task 5: 构建、部署与真实验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-chart-preview-unpublish.md`
- Modify: `/Users/bytedance/Desktop/geiha/ppchart-update-runbook.md`

- [x] **Step 1: 本地验证**

Run:

```bash
cd server && npm run test:review && node --check server.js
cd .. && npm run build
```

Expected: 测试和构建通过，生成两个静态工作台入口。

- [x] **Step 2: 部署后端**

- 以当前生产镜像为基线构建新 code-only 镜像。
- 替换 `server.js`、`chart-review.js`、`source/` 和 Prisma schema。
- 保留旧镜像回滚标签。
- 未登录访问下架 API 返回 `401`，普通用户返回 `403`。

- [x] **Step 3: 部署前端**

- 上传新 hashed assets。
- 覆盖 `index.html`、`my-charts.html`、`admin-charts.html`。
- HTML 保持 `Content-Type: text/html`。

- [x] **Step 4: 真实浏览器验收**

创建临时用户投稿并完成：

1. 用户编辑页输入代码并运行隔离预览。
2. 管理员审核通过。
3. 公共详情 API 可访问。
4. 管理员切换到“已发布”并填写原因下架。
5. 公共详情立即不可访问。
6. 用户工作台显示“已下架”和下架原因。
7. 用户修改后可重新提交。
8. 清理临时数据和 Session。

- [x] **Step 5: 提交并推送**

Run:

```bash
git diff --check
git add server src docs
git commit -m "feat: add chart preview and unpublish"
git push origin main
```

Expected: 本地与 `origin/main` SHA 一致，仓库工作区干净，无 lock 文件。
