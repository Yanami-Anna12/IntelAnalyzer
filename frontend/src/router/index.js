import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: '情报概览', desc: '平台整体运行状态与最新情报' },
  },
  {
    path: '/crawler',
    name: 'crawler',
    component: () => import('../views/CrawlerView.vue'),
    meta: { title: '情报采集', desc: '爬虫任务调度、数据清洗入库与原始情报数据' },
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('../views/KnowledgeView.vue'),
    meta: { title: '知识库检索', desc: 'RAG 混合检索与文档向量入库' },
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../views/ChatView.vue'),
    meta: { title: 'AI 问答', desc: '大模型流式对话（SSE 逐字输出）' },
  },
  {
    path: '/agent',
    name: 'agent',
    component: () => import('../views/AgentView.vue'),
    meta: { title: '智能体', desc: 'ReAct 智能体调用 MCP 工具完成分析' },
  },
  {
    path: '/report',
    name: 'report',
    component: () => import('../views/ReportView.vue'),
    meta: { title: '行业报告', desc: '基于采集情报自动生成行业分析报告' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
