## 开发日志

### 部署
- client build 后扔 AliOSS 进行更新
- server 通过手动命令在本地构建 docker 镜像，push 远程 dockerhub 仓库，服务器 docker-compose 进行更新
- 目前没有接 CI/CD


### 测试环境
- 部署了另外一套环境用来预发验证和测试，总不能线上边跑边换轮子
- client 使用 vite 的测试打包命令：`vite build --mode xxx` 用来指明打包环境变量并加载对应的 .env.xxx 文件
- server 则是通过 package.json/scripts 添加 docker-test 来构建测试环境的 docker 镜像并 push 到 dockerhub


### 代码编辑器
- 初版使用 codemirror，出现行号错乱和其它能力实现复杂等问题
- 后替换为微软开源的 monaco-editor，是 VSCode 底层使用，舒服也好看


### UI
- 使用字节旗下 Acro-Design
- 支持暗黑模式快速实现


### Echart 代码运行
- 一开始是使用 eval，但发现有许多代码的变量声明没有使用 const|var|let 等关键字声明，在 Vue 全局严格模式下通过 eval 直接运行会报错
- 后来改进为通过 Function 建立沙箱环境直接运行代码，Function 内部运行默认为非严格模式，同时支撑了自定义上下文
- 目前发现还有许多诸如地图类的图表代码无法运行，因为直接使用了 JQ 的 $，以及其它原因，目前不打算提供 $，尚需重构图表代码或提供特定可控变量来解决


### 建议/反馈
- 使用了第三方 Gitter 服务，通过 iframe 的形式嵌入，需要 Github 登录进行发言
- 账号服务开启后也不会替换掉会新增一个留言板，Gitter 则作为实时聊天反馈服务继续使用

### ONLINE
- 在线数为一分钟内活跃 IP 数，因此实际在线数一定大于这个数字
- UV 为 IP 总数，因此实际 UV 一定大于这个数字
- 有趣的是，目前看起来 UV:Star 的比例为 100:1
