# PPChart 用户投稿筛选实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在公共图库增加“用户投稿”筛选模式，只展示当前已发布的用户投稿。

**Architecture:** 复用现有 `runtime` 筛选参数和缓存键，增加 `user` 模式。前端把三个模式作为同一组互斥选项；服务端按既有 `user-*` CID 协议过滤，并对投稿使用发布时间倒序。

**Tech Stack:** Vue 3、TypeScript、Vite、Koa、Prisma、MySQL、Redis、Playwright

---

### Task 1: 前端筛选模式

**Files:**
- Modify: `src/data/chartTypes.ts`
- Modify: `src/components/SearchPanel.vue`
- Modify: `src/App.vue`

- [x] **Step 1: 扩展筛选类型**

修改：

```ts
export type RuntimeFilter = 'runnable' | 'unrunnable' | 'user';

export const runtimeFilters = [
  { label: '可运行', value: 'runnable' },
  { label: '不可运行', value: 'unrunnable' },
  { label: '用户投稿', value: 'user' }
];
```

- [x] **Step 2: 调整筛选语义**

`SearchPanel.vue` 将筛选组标题和 aria-label 从“运行状态”改为“内容范围”，保留现有按钮样式和互斥状态。

- [x] **Step 3: 切换投稿时重置类型**

在 `App.vue` 增加：

```ts
function updateRuntimeFilter(value: RuntimeFilter) {
  if (value === 'user') {
    activeType.value = '';
  }
  runtimeFilter.value = value;
}
```

`SearchPanel` 不再直接 `v-model:runtime-filter`，改为：

```vue
:runtime-filter="runtimeFilter"
@update:runtime-filter="updateRuntimeFilter"
```

保证从具体图表类型进入用户投稿时，不会保留无效类型标签过滤。

### Task 2: 服务端投稿过滤与排序

**Files:**
- Modify: `server/server.js`

- [x] **Step 1: 增加用户投稿过滤**

在 `runtimeFilter` 分支增加：

```js
if (runtimeFilter === "user") {
  filters.push({ cid: { startsWith: "user-" } });
}
```

`user` 模式不追加 runnable 标签条件。

- [x] **Step 2: 统一投稿排序**

定义：

```js
const orderBy =
  runtimeFilter === "user"
    ? { createTime: "desc" }
    : type == 1
      ? undefined
      : { viewCount: "desc" };
```

搜索分支和缓存分支都使用同一个 `orderBy`，避免投稿搜索与普通列表排序不一致。

- [x] **Step 3: 校验服务端语法**

Run:

```bash
node --check server/server.js
```

Expected: 退出码为 0。

### Task 3: 构建、部署与真实验收

**Files:**
- Modify: `docs/superpowers/plans/2026-08-06-user-submission-filter.md`
- Modify: `/Users/bytedance/Desktop/geiha/ppchart-update-runbook.md`

- [x] **Step 1: 本地构建**

Run:

```bash
npm run build
cd server && npm run test:review && node --check server.js
```

Expected: 前端类型检查、Vite 构建、服务端规则测试和语法检查均通过。

- [x] **Step 2: 部署后端和前端**

- 构建新的 code-only 后端镜像并保留旧镜像回滚标签。
- 上传新 hashed assets。
- 覆盖 `index.html`、`my-charts.html`、`admin-charts.html`。

- [x] **Step 3: API 验收**

在生产库临时插入：

- 两条 `user-*` 公共图表，发布时间不同。
- 一条非用户 CID 公共图表。

请求：

```text
GET /api/chart-list?current=1&type=&runtime=user&search=
```

验证：

- 只返回 `user-*`。
- 较新的投稿排在前面。
- `total` 等于用户投稿数量。
- 带搜索词只返回匹配投稿。
- `current` 分页参数继续生效，不改变每页 20 条的既有行为。
- 删除一条用户公共图表并清缓存后，该图表不再出现，覆盖管理员下架后的列表语义。

- [x] **Step 4: 浏览器验收**

- 首页显示三个并列选项。
- 默认选中“可运行”。
- 先选择具体图表类型，再点击“用户投稿”，类型自动回到“全部”。
- 页面只展示临时用户投稿，不展示非用户图表。
- 控制台无错误。

- [x] **Step 5: 清理并提交**

- 删除临时公共图表和相关 `chart-list:*` 缓存。
- 更新 Runbook 当前镜像和前端资源。
- 提交并推送：

```bash
git diff --check
git add server src docs
git commit -m "feat: add user submission filter"
git push origin main
```

Expected: 本地与 `origin/main` SHA 一致，工作区干净，无 lock 文件。
