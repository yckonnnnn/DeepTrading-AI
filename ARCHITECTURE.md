# DeepTrading AI - 前端架构说明

> AI 股票深度分析平台 · React 19 + TypeScript + Vite

## 目录结构

```
├── index.html                  # 入口 HTML（字体、favicon、viewport-fit）
├── vite.config.ts              # Vite 配置（@ → src/，/api /uploads 代理到 3001）
├── server/                     # Express 后端（保持原有结构）
├── server_terms.md             # 服务条款原文（前端 ?raw 引入）
│
└── src/
    ├── main.tsx                # React 挂载入口，引入全局样式
    ├── app/                    # 应用外壳
    │   ├── App.tsx             # 视图路由：/ · /login · /register · /terms · /app/:tab
    │   ├── router.tsx          # 零依赖轻路由（pushState/popstate，Nginx try_files 兜底）
    │   ├── session.tsx         # 会话上下文：token/游客态、用户、配额、报告历史、30s 刷新
    │   └── notifications.tsx   # 通知上下文：服务端拉取 + 本地合并 + 已读同步
    ├── layouts/
    │   └── WorkspaceLayout.tsx # 工作区外壳：侧边栏 / 顶栏 / 底部导航 / 页面切换动画
    ├── pages/                  # 页面组件（每页一个文件）
    │   ├── LandingPage.tsx     # 官网：天空云层 Hero、玻璃导航、能力/流程/报告示例/订阅
    │   ├── AuthPage.tsx        # 登录 / 注册 / 找回密码 / 游客访问
    │   ├── TermsPage.tsx       # 服务条款
    │   ├── DashboardPage.tsx   # 工作台：会员卡、额度统计、使用趋势、热门股、公告
    │   ├── AnalysisPage.tsx    # AI 分析：双输入模式、策略选择、等待态、近期记录
    │   ├── HistoryPage.tsx     # 历史分析：搜索 + 买入/卖出/观望筛选 + 报告详情
    │   ├── SubscriptionPage.tsx# 订阅：套餐对比、支付说明、管理员临时开通
    │   ├── SettingsPage.tsx    # 设置：资料 / 安全 / 偏好
    │   ├── AnnouncementsPage.tsx / FeaturedPage.tsx / FeedbackPage.tsx / ContactPage.tsx
    ├── features/               # 业务模块
    │   ├── report/             # 报告呈现：ReportView（结论→指标→计划→资金/舆情）、导出图片/HTML
    │   ├── analysis/           # 分析等待态（诚实的单态设计，不伪造进度）
    │   ├── hot-stocks/         # 热门股票榜（游客展示演示数据）
    │   └── workspace/          # 侧边导航、底部导航、更多抽屉、顶栏（通知/个人中心弹层）
    ├── components/
    │   ├── ui/                 # Button、Field/Input、SegmentedControl、SurfaceCard、GlassPanel、
    │   │                       # Modal、Drawer、Toast、EmptyState、Skeleton、Avatar、Market 徽标等
    │   └── charts/             # Recharts 封装（使用趋势柱状图）
    ├── hooks/                  # useToast、useMediaQuery、useClickOutside/useEscapeKey/useLockBodyScroll
    ├── services/               # api.ts（统一 API_BASE_URL + 鉴权头）、geminiService.ts（分析接口）
    ├── styles/                 # 设计系统：tokens / base / motion / ui + 各页面样式
    ├── types/                  # 共享 TypeScript 类型（报告、会话、通知）
    └── data/stockData.json     # A 股代码表（搜索建议）
```

## 设计系统

- **令牌**（`styles/tokens.css`）：颜色（墨 #101820 / 蓝 #3478F6 / 绿 #22B578 / 背景 #F6F8FB）、
  涨跌色遵循 A 股惯例（红涨绿跌，始终带符号/文字）、间距、圆角（卡片 20–28 / 输入 12–16）、
  阴影、玻璃材质（backdrop-filter + 不透明回退）、动效时长与缓动、层级。
- **动效**（`styles/motion.css`）：transform/opacity 为主；页面淡入上移、卡片错峰进场、
  呼吸/涟漪等待态、云层漂移（60–150s 极慢低幅）；`prefers-reduced-motion` 全局降级。
- **玻璃**：仅用于导航、弹层、抽屉、通知面板等选择性表面；正文/表格/图表保持可读白底。

## 关键约定

- API 一律走同源（`services/api.ts`），开发由 Vite 代理、生产由 Nginx 反代；
  可用 `VITE_API_BASE_URL` 覆盖。
- 路由使用 History API，Nginx `try_files ... /index.html` 兜底，刷新与直链可用。
- 管理员「测试模式」档位切换仅本地预览（自定义事件 `dt-dev-tier`）。
- 演示/示例数据一律带「演示数据」标签，与真实数据明确区分。
- 开发验收：`/app/analysis?mockreport=1` 加载演示报告（仅 DEV 构建生效）。
