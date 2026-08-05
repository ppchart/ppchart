# PPChart 用户图表工作台设计

## 目标

将上传和管理图表能力从公开图库首页移除，放到独立 `/my-charts.html` 页面；首页恢复为纯搜索和浏览入口。

## 页面边界

- `/`、`/examples/**`、`/chart/**`：公开图库，只展示搜索、分类、图表列表和详情。
- `/my-charts.html`：用户工作台，只展示登录入口、上传表单和用户自己的图表列表。

## 导航

- Header 始终保留首页、GitHub、主题和流量入口。
- 未登录时显示 GitHub、Google 两个登录按钮。
- 已登录时显示头像、昵称、`我的图表` 和 `退出`。
- 工作台增加返回图库入口。

## 状态与路由

- 不新增 Vue Router，继续使用当前 pathname 轻量路由。
- `App.vue` 根据 pathname 判断是否为工作台。
- OAuth 登录时将当前页面作为 redirect，登录后回到原页面。
- 浏览器前进/后退触发 `popstate`，同步页面状态和图表详情状态。

## 静态部署

- Vite 构建后复制 `dist/index.html` 为 `dist/my-charts.html`，兼容 OSS 不解析子目录 index、无扩展名对象强制下载的限制。
- OSS 上传 `index.html`、新 assets 和 `my-charts.html`。
- 用户工作台不进入 sitemap。

## 验收

- 首页不再出现用户上传表单。
- Header 未登录时可发起 GitHub/Google 登录。
- 登录后点击 `我的图表` 进入 `/my-charts.html`。
- `/my-charts.html` 可直接打开，不返回 OSS 404。
- 工作台不加载公开图表列表。
- 首页图表浏览和详情不受影响。
