![image](https://user-images.githubusercontent.com/99037010/152569183-4bffb8be-6c08-4d2c-8578-f46fd254cf35.png)


### 站点 ：[PPChart](https://ppchart.com)   数据：[下载资源](https://github.com/ppchart/ppchart/issues/5)

### 🚀 前端代码将在重构完毕后开源至此
- 03-22 正在重构了
- 04-15 真的在重构了-进度：0%（滑稽）
- 11-01 保证这个月重构完毕-进度：client 30%; server 0%;


#### 如有类别/资源等需求还望 Issue 提起


### 背景
- 这里是 makeapie 的复刻项目
- 看到 makeapie 停服是失落的，总要找个替代品
- 希望尽力把这个替代品维护好
- 目前数据都是 makeapie 的数据，如果有疑问或者建议，可以提 Issues


### 愿景
- 让图表更简单
- 助力每个人都可以简单制作想要的图表
- [PPChart](http://ppchart.com) 是一个图表站点，你可以在这里找到对你有帮助的图表代码，也可以实时调试图表效果


### 技术选型
- 前端：Vue3 + Vite
- 后端：Koa + Node + Nginx
- 数据库：AliRDS(Mysql) + AliRedis(Redis)
- 存储：AliOSS(存储)
- 账号服务：TencentCIAM 数字身份管控平台（公众版）

### 更新日志
- [x] 2022/01/29 数据获取
- [x] 2022/01/31 后端基础实现
- [x] 2022/02/03 前端基础实现
- [x] 2022/02/04 前端部署、后端部署、域名
- [x] 2022/02/05 Github
- [x] 2022/02/06 数据分类、icon/title、黑名单、修复分页total不对的问题、详情查看浏览量自增
- [x] 2022/02/06 修复客户端唯一标识不准确的问题、移动端首页/详情页布局调整
- [x] 2022/02/06 浏览量排序、新增柱状图类
- [x] 2022/02/07 增加了 在线数/UV 展示、优化了代码运行（让更多代码能正常跑起来）
- [x] 2022/02/07 更新了代码编辑器 - 使用了 vscode 底层编辑器 monaco-editor：拥有了 vscode 编码的极致体验（自动补全/折叠等能力）
- [x] 2022/02/07 开通了公众号，欢迎关注不迷路：PPChart（大小写均可）、优化了关键词SEO
- [x] 2022/02/08 增加了实时聊天反馈建议（基于gitter）、增加了测试环境、CORS 优化支持 http://www.ppchart.com 域名访问
- [x] 2022/02/09 增加暗黑模式、优化了布局为一行 5 个、优化了图表卡片信息展示增加信息密度
- [x] 2022/02/09 增加了标题搜索、缩略图增加水印+原图保护、增加了反调试、按需加载优化代码体积
- [x] 2022/02/10 详情使用新标签页打开利于分享
- [x] 2022/02/12 增加了许多分类
- [x] 2022/02/15 恢复了使用弹窗打开详情，详情卡片右上角新增新标签页打开
- [x] 2022/02/16 使用 [Issue 7](https://github.com/ppchart/ppchart/issues/7) 提到的传参方式增加了 $ 依赖，让更多数据可以跑起来
- [x] 2022/02/25 使用 nginx 代理 OSS 静态资源、去掉了图片水印
- [x] 2022/03/06 修复代码编辑器报错问题、支持编辑器格式化代码、支持切换 echarts 版本
- [x] 2022/03/10 最近在折腾腾讯出的单点登录系统（CIAM），期望在独立开发的系统里有一个单点登录套路
- [x] 2022/03/20 账号服务已上线，欢迎注册，后续会陆续开放账号相关功能，工作调整导致延期了 1 个月
- [x] 2022/03/21 账号服务的账号密码登录出现问题，Tencent 正在修复中，给已注册登录不上的朋友道个歉，烦请重新注册
- [x] 2022/09/21 HTTPS：访问安全，用了阿里云的 1 年免费证书；顺手移除了用户登录，原因是一方面没什么用另一方面是用的腾讯的身份认证它已经闭门维护了几个月不能用（抽时间自己写个）
- [x] 2022/10/31 接口服务从‘阿里云香港服务器’迁移到了‘腾讯云大陆服务器’，原因是大陆允许备案而腾讯比阿里便宜，杯具是备案后才能用 https 所以等备案期间花了两份服务器的钱维持用阿里云的，赶在 11.01 阿里云到期前一天迁移完毕，迁移过程无感知很丝滑

### Ing 正在做的事
- [ ] 标记是否可运行起来
- [ ] 用户新增示例
- [ ] 代码编辑器：报错等
- [ ] 更多的数据优化：有许多数据跑不起来,过滤一遍数据，跑起来和跑不起来分个类。（一些代码使用了高自定义/依赖脚本各种报错）
- [ ] 留言反馈：有互动才有活力
- [ ] 浏览器兼容：总得让用户用上自己习惯用的浏览器
- [ ] 日志：有日志才可以分析做推荐



### Feature
- [x] Echart 版本切换：更好的兼容测试显示
- [ ] 数据重构：让图表代码更清晰
- [ ] 担保交易：UI换代码，互利互惠
- [ ] 可视化制作：选项勾选和输入数据即可生成图表代码
- [ ] 图表模板：输入数据即可生成图表，可通过 iframe 等形式使用



### 如何提供长久稳定的服务？
  - 会从多渠道尝试收支平衡，具体还没想好，可以听听大家的意见
  - 前端用 OSS 部署大概率不会挂，后面会尝试后端服务用 serverless 部署或者看情况升级服务器
  - 会尝试重构所有旧的图表数据来开源到此项目，这样即使服务挂了也不会影响基础数据的访问
  - 会尝试用 vercel 等免费服务，再部署几个备用站，到时候网址记录在这里
  - 如果有其它备用站也可以提 Issue，我加在这里



### 特别感谢所有捐助的人，是他们让这个站点生机勃勃
1. 2022-02-08 感谢来自 L*n 的赞助
2. 2022-02-10 感谢来自 *心 的赞助
3. 2022-02-11 感谢来自 *ン 的赞助 - 留言：地图数据无法运行
4. 2022-02-14 感谢来自 *C 的赞助 - 留言：感谢对前端的贡献
5. 2022-02-14 感谢来自 *合 的赞助 - 留言：为 ppchart 点赞
6. 2022-02-17 感谢来自 *昭 的赞助 - 留言：66666
7. 2022-02-24 感谢来自 *也 的赞助 - 留言：💪
8. 2022-03-10 感谢来自 *富 的赞助 - 留言：66666
9. 2022-04-22 感谢来自 *ฅ 的赞助 - 留言：ppchart 666
10. 2022-04-25 感谢来自 *合 的赞助 - 留言：ppchart赞，喝杯咖啡
11. 2022-08-10 感谢来自 *👹 的赞助 - 留言：66666

<br />

<div style="display:flex">
  <img src="https://user-images.githubusercontent.com/99037010/153113165-0da0ff85-3d3c-4996-9b1a-b0bfc07d7951.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/153531217-1b9ccfeb-a300-45c7-9c99-5f23ef4d62d0.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/153724840-f28e7ebb-0b0d-42e0-bbaa-5be8539e0302.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/153828484-cf431917-b3aa-4f8e-8f2d-83fa9dc46252.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/153828582-8536070b-e72a-44ee-bc1f-732fb908b781.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/154608658-b1b94eaf-1bad-489d-9d79-81fbbb1dc477.png" width="250" height="140" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/155449530-72903be4-2397-41e5-b5c1-d23c5da6601a.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/158529183-1dafed1b-62fd-403a-bb49-964b71e2fcbb.png" width="250" height="140" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/191048237-3d1eb591-70c3-4081-bdcb-a531850a03a4.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/191048366-175353d9-4898-46ed-b6b1-5a7d53df35b3.png" width="200" height="133" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/191048514-ed469006-807a-43fa-9e07-fac50af8b310.png" width="200" height="133" align="bottom" />

<br />
<br />

<div >
  <img src="https://user-images.githubusercontent.com/99037010/152575541-8eeb94c9-5cd3-4e1a-9b0f-d06dec2f4e11.jpg" width="200" height="210" align="bottom" />
  <img src="https://user-images.githubusercontent.com/99037010/152575512-a27dbe6a-c0e6-4294-9495-b0388c4f2746.jpg" width="200" height="210" align="bottom" />
</div>


<br />
<br />

> 总体搭建支出明细如下，给有想法自己做网站的开发者提供参考
> 
> 流量 ¥2/天；RDS ¥75/年；Redis ¥255/年；轻量应用服务器 ¥400/年；
> 
> CIAM 5w UV 以下免费，现在是内测版

