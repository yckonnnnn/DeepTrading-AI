# DeepTrading AI - 项目架构与技术栈说明

> 🚀 基于 Google Gemini AI 的智能股票分析平台

---

## 📁 项目结构

```
deeptrading-ai/
├── index.html              # HTML 入口模板
├── index.tsx               # React 应用渲染入口
├── App.tsx                 # 主应用组件（路由 + 全局状态管理）
├── types.ts                # TypeScript 类型定义
├── vite.config.ts          # Vite 构建配置
├── tsconfig.json           # TypeScript 编译配置
├── package.json            # 依赖管理
├── .env.local              # 环境变量（API Key）
├── .gitignore              # Git 忽略规则
│
├── components/             # UI 组件目录
│   ├── LandingPage.tsx         # 落地页（首页）
│   ├── Auth.tsx                # 登录/注册认证模块
│   ├── Sidebar.tsx             # 侧边导航栏 + 移动端底部导航
│   ├── Logo.tsx                # Logo 组件
│   │
│   ├── Dashboard.tsx           # 投资组合仪表盘
│   ├── StockAnalysis.tsx       # AI 股票分析（核心功能）
│   ├── AnalysisDashboard.tsx   # 分析结果展示面板
│   ├── History.tsx             # 历史分析记录
│   │
│   ├── Subscription.tsx        # 会员订阅管理
│   ├── Settings.tsx            # 系统设置
│   ├── Announcements.tsx       # 系统公告
│   ├── FeaturedContent.tsx     # 优选内容/推荐
│   ├── Feedback.tsx            # 意见反馈
│   └── ContactUs.tsx           # 联系我们
│
└── services/               # 服务层
    └── geminiService.ts        # Google Gemini AI API 封装
```

---

## 🛠 技术栈

### 前端框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.2.1 | UI 框架 |
| **TypeScript** | 5.8.2 | 类型安全 |
| **Vite** | 6.2.0 | 构建工具 + 开发服务器 |

### UI / 样式

| 技术 | 说明 |
|------|------|
| **TailwindCSS** | 原子化 CSS 框架（内联样式） |
| **Lucide React** | 图标库 (v0.559.0) |

### 数据可视化

| 技术 | 版本 | 用途 |
|------|------|------|
| **Recharts** | 3.5.1 | 图表组件（K线/趋势图） |

### AI 引擎

| 技术 | 版本 | 说明 |
|------|------|------|
| **@google/genai** | 1.33.0 | Google Gemini AI SDK |
| **模型** | gemini-2.5-flash | 高速多模态分析 |

### 工具库

| 技术 | 用途 |
|------|------|
| **html2canvas** | 报告截图导出 |

---

## 🏗 核心模块说明

### 1. AI 股票分析 (`services/geminiService.ts`)

核心分析引擎，调用 Google Gemini API 进行股票智能分析。

**功能特性：**
- 支持文本输入（股票代码）
- 支持图像输入（K线图识别）
- 结构化 JSON Schema 输出
- 双策略模式：趋势跟踪 / 短线博弈

**输出报告结构：**

```typescript
interface AIAnalysisReport {
  stockName: string;           // 股票名称
  stockCode: string;           // 股票代码
  timestamp: string;           // 分析时间
  strategyMode: string;        // 策略模式
  recommendation: "Buy" | "Wait" | "Sell";  // 操作建议
  confidenceScore: number;     // 置信度 (0-100)
  analysisSummary: string;     // 分析摘要
  fundsFlow: {                 // 资金流向
    inflow: string;
    retailSentiment: string;
  };
  marketSentiment: string;     // 市场情绪
  keyDrivers: string[];        // 关键驱动因素
  technicalIndicators: TechnicalIndicator[];  // 技术指标
  technicalAnalysisAdvice: string;            // 技术分析建议
  strategy: AnalysisStrategy;                 // 操作策略
}
```

### 2. 用户系统 (`components/Auth.tsx`)

**用户层级：**

| 层级 | 说明 |
|------|------|
| `guest` | 访客模式，受限功能 |
| `free` | 免费用户，有分析次数限制 |
| `pro` | Pro 会员，无限制 |

### 3. 视图路由 (`App.tsx`)

**页面路由：**

| 视图 | 组件 | 说明 |
|------|------|------|
| `landing` | LandingPage | 落地页 |
| `login` / `register` | Auth | 认证页 |
| `app` | 主应用 | 登录后主界面 |

**Tab 路由：**

| TabId | 组件 | 说明 |
|-------|------|------|
| `dashboard` | Dashboard | 投资组合 |
| `analysis` | StockAnalysis | AI 分析 |
| `history` | HistoryView | 历史记录 |
| `subscription` | Subscription | 订阅管理 |
| `settings` | Settings | 系统设置 |
| `announcements` | Announcements | 系统公告 |
| `featured` | FeaturedContent | 优选内容 |
| `feedback` | Feedback | 意见反馈 |
| `contact` | ContactUs | 联系我们 |

---

## ⚙️ 环境配置

### 环境变量 (`.env.local`)

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

### Vite 配置 (`vite.config.ts`)

- 开发服务器端口：`3000`
- 环境变量注入：`process.env.API_KEY`
- 路径别名：`@` → 项目根目录

---

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 配置 API Key
echo "GEMINI_API_KEY=your_key" > .env.local

# 开发模式启动
npm run dev

# 生产构建
npm run build

# 预览生产版本
npm run preview
```

**访问地址：** http://localhost:3000

---

## 📊 数据流

```
用户输入 (股票代码/K线图)
       ↓
  StockAnalysis.tsx
       ↓
  geminiService.ts → Gemini API
       ↓
  结构化 JSON 报告
       ↓
  AnalysisDashboard.tsx (展示)
       ↓
  History.tsx (存档)
```

---

## 📝 License

MIT License
