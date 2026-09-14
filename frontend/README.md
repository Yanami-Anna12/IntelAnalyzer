# 企业智能情报采集与分析 Agent 平台 · 前端

基于 **Vue 3 + Vite + Vue Router + Axios** 的单页应用，对接项目 FastAPI 后端（`app/main.py`）。

## 一、功能页面

| 路由 | 页面 | 对接接口 | 说明 |
| --- | --- | --- | --- |
| `/` | 情报概览 | `/health`、`/health/db`、`/api/crawler/statistics`、`/api/knowledge/stats`、`/api/crawler/news` | 统计卡片、采集链路图、最新情报、快捷入口 |
| `/crawler` | 情报采集 | `POST /api/crawler/start`、`GET /api/crawler/tasks`、`GET /api/crawler/statistics`、`GET /api/crawler/news` | 启动爬虫、任务状态轮询（2.5s）、原始情报数据表格与关键词搜索 |
| `/knowledge` | 知识库检索 | `POST /api/knowledge/query`、`GET /api/knowledge/stats`、`POST /api/knowledge/ingest` | RAG 混合检索结果、引擎标识（hybrid/crawler/keyword_fallback）、文档入库 |
| `/chat` | AI 问答 | `POST /api/ai/chat`、`POST /api/ai/chat/stream` | SSE 流式逐字输出 + 一次性返回两种模式 |
| `/agent` | 智能体 | `POST /api/ai/agent/invoke` | ReAct 智能体 / LangGraph 回落标识、分析结论、工具调用轨迹 |
| `/report` | 行业报告 | `POST /api/report/industry` | Markdown 报告渲染 + 引用情报来源 |

## 二、运行方式

**1. 先启动后端**（项目根目录，用 py312 环境）：

```bash
uvicorn app.main:app --reload --port 8000
```

**2. 再启动前端**（frontend 目录）：

```bash
cd frontend
npm install          # 首次运行
npm run dev          # 打开 http://127.0.0.1:5173/
```

其它命令：

```bash
npm run build        # 打包到 frontend/dist
npm run preview      # 预览打包结果（http://127.0.0.1:4173/）
```

## 三、依赖与约定

- **接口代理**：`vite.config.js` 中把 `/api`、`/health` 代理到 `http://127.0.0.1:8000`，所以前端不需要改后端 CORS 配置，也不用配环境变量。
- **统一响应体**：后端所有接口返回 `{ code, message, data }`，`code === 200` 为成功；`src/api/index.js` 的拦截器已统一拆包与报错。
- **SSE 流式**：`streamChat()` 用 `fetch` + `ReadableStream` 解析 `data: xxx\n\n` 帧，以 `data: [DONE]` 结束（axios 不支持浏览器端流式读取，故单独实现）。
- **检索结果归一化**：知识库接口可能返回三种结构（RAG 混合检索 / 爬虫集合检索 / MySQL 关键词兜底），`normalizeSearchResult()` 统一成同一展示结构。
- **Markdown 渲染**：`MarkdownBlock.vue` 用 `marked` 渲染，并做了简单的标签/事件属性清理。

## 四、目录结构

```text
frontend/
├── index.html
├── vite.config.js          # 端口 5173 + 后端接口代理
├── package.json
└── src/
    ├── main.js
    ├── App.vue             # 侧边导航 + 顶栏（含后端/MySQL 健康状态灯）
    ├── api/index.js        # axios 实例、接口封装、SSE 流式、结果归一化
    ├── router/index.js     # 6 个页面路由（hash 模式）
    ├── styles/main.css     # 全局深色主题与组件样式
    ├── components/
    │   ├── MarkdownBlock.vue
    │   ├── StatusTag.vue   # 爬虫任务状态标签
    │   └── EmptyState.vue
    └── views/
        ├── DashboardView.vue
        ├── CrawlerView.vue
        ├── KnowledgeView.vue
        ├── ChatView.vue
        ├── AgentView.vue
        └── ReportView.vue
```

## 五、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 顶栏 MySQL 灯变红 | MySQL 未启动或 `.env` 里 `DB_PASSWORD` 不对 |
| 知识库页提示「Milvus 未连接」 | 先启动 Docker Desktop，再在 `data` 目录执行 `standalone.bat start` |
| 情报列表为空 | 还没采集过数据，到「情报采集」页点一次「开始采集」 |
| 行业报告提示找不到新闻 | 该行业关键词在 news 表中没有匹配数据，换个词或先采集 |
| `npm install` 报 EPERM | 在普通 PowerShell / PyCharm 终端里执行，不要用受限沙箱环境 |
