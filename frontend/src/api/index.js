import axios from 'axios'

/**
 * 统一请求实例
 * 后端所有接口都返回 { code, message, data }，code===200 为成功
 */
const http = axios.create({
  baseURL: '/api',
  timeout: 180000,
})

http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 200) return body.data
      return Promise.reject(new Error(body.message || `请求失败（code=${body.code}）`))
    }
    return body
  },
  (error) => {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error.message ||
      '网络异常'
    return Promise.reject(new Error(String(msg)))
  },
)

export const api = {
  // ===== 健康检查 =====
  health: () => axios.get('/health').then((r) => r.data),
  healthDb: () => axios.get('/health/db').then((r) => r.data),

  // ===== 爬虫 / 情报采集 =====
  crawlerStart: (limit = 20, spiderName = 'hacker_news') =>
    http.post('/crawler/start', null, { params: { spider_name: spiderName, limit } }),
  crawlerTasks: () => http.get('/crawler/tasks'),
  crawlerTask: (id) => http.get(`/crawler/tasks/${id}`),
  crawlerStatistics: () => http.get('/crawler/statistics'),
  newsList: (params = {}) => http.get('/crawler/news', { params }),

  // ===== 知识库 / RAG =====
  knowledgeQuery: (question, topK = 5) => http.post('/knowledge/query', { question, top_k: topK }),
  knowledgeStats: () => http.get('/knowledge/stats'),
  knowledgeIngest: (paths) => http.post('/knowledge/ingest', { paths }),

  // ===== AI 问答 / 智能体 / 报告 =====
  chat: (message, sessionId = '') => http.post('/ai/chat', { message, session_id: sessionId }),
  agentInvoke: (message) => http.post('/ai/agent/invoke', { message }),
  reportIndustry: (industry) => http.post('/report/industry', { industry }),
}

/**
 * SSE 流式对话：POST /api/ai/chat/stream
 * 后端每帧格式为 `data: <片段>\n\n`，结束帧为 `data: [DONE]`
 */
export async function streamChat(message, { sessionId = '', onDelta, onDone, onError } = {}) {
  try {
    const response = await fetch('/api/ai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`流式接口请求失败：HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        const idx = frame.indexOf('data:')
        if (idx === -1) continue
        let text = frame.slice(idx + 5)
        if (text.startsWith(' ')) text = text.slice(1)
        if (text === '[DONE]') {
          onDone?.()
          return
        }
        if (text) onDelta?.(text)
      }
    }
    onDone?.()
  } catch (error) {
    onError?.(error)
  }
}

/** 结果形状归一化：RAG 混合检索 / 爬虫集合检索 / 数据库关键词兜底 三种结构统一 */
export function normalizeSearchResult(item) {
  return {
    title: item.title || '',
    text: item.text || item.content || '',
    source: item.source || '未知来源',
    score: typeof item.score === 'number' ? item.score : null,
    url: item.url || '',
    author: item.author || '',
    publishTime: item.publish_time || '',
  }
}
