<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import EmptyState from '../components/EmptyState.vue'

const router = useRouter()

const newsCount = ref('-')
const hnCount = ref('-')
const chunkCount = ref('-')
const collection = ref('-')
const kbError = ref('')
const latest = ref([])
const loading = ref(true)

const flow = [
  { title: '数据采集', desc: 'Requests 抓取 Hacker News Top Stories' },
  { title: '清洗去重', desc: 'HTML 清洗 + SHA256 内容指纹' },
  { title: '入库 MySQL', desc: '幂等写入 news 表 + JSON 备份' },
  { title: '文本切分', desc: '800 字 / 100 重叠 chunk' },
  { title: '向量化', desc: 'BGE-M3 生成 1024 维向量' },
  { title: '写入 Milvus', desc: '供 RAG 检索与 Agent 调用' },
]

onMounted(async () => {
  const jobs = [
    api.crawlerStatistics().then((res) => {
      newsCount.value = res.news_count
      hnCount.value = res.hacker_news_count
    }),
    api.knowledgeStats().then((res) => {
      chunkCount.value = res.chunk_count
      collection.value = res.collection
    }).catch((error) => {
      kbError.value = error.message
    }),
    api.newsList({ limit: 8 }).then((res) => {
      latest.value = res || []
    }).catch(() => {}),
  ]
  await Promise.allSettled(jobs)
  loading.value = false
})
</script>

<template>
  <div class="grid" style="gap: 18px">
    <div class="grid grid-4">
      <div class="stat">
        <div class="stat-label">情报总量</div>
        <div class="stat-value">{{ newsCount }}</div>
        <div class="stat-sub">MySQL news 表累计条数</div>
      </div>
      <div class="stat">
        <div class="stat-label">Hacker News 情报</div>
        <div class="stat-value">{{ hnCount }}</div>
        <div class="stat-sub">爬虫采集来源占比</div>
      </div>
      <div class="stat">
        <div class="stat-label">知识库向量</div>
        <div class="stat-value">{{ chunkCount }}</div>
        <div class="stat-sub">Milvus 集合 {{ collection }}</div>
      </div>
      <div class="stat">
        <div class="stat-label">采集链路</div>
        <div class="stat-value">6 步</div>
        <div class="stat-sub">采集 → 清洗 → 入库 → 切分 → 向量化 → 检索</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">数据采集链路<small>爬虫模块（本人负责）</small></div>
        <button class="btn btn-sm" @click="router.push('/crawler')">去采集 →</button>
      </div>
      <div class="card-body">
        <div class="flow">
          <div v-for="(step, index) in flow" :key="step.title" class="flow-step">
            <div class="flow-index">STEP {{ index + 1 }}</div>
            <b>{{ step.title }}</b>
            <span>{{ step.desc }}</span>
          </div>
        </div>
        <div v-if="kbError" class="notice notice-err" style="margin-top: 12px">
          Milvus 未就绪：{{ kbError }}
        </div>
      </div>
    </div>

    <div class="grid grid-2-1">
      <div class="card">
        <div class="card-head">
          <div class="card-title">最新情报<small>按发布时间倒序</small></div>
          <button class="btn btn-sm btn-ghost" @click="router.push('/crawler')">查看全部</button>
        </div>
        <div class="card-body">
          <div v-if="loading" class="loading"><span class="spinner"></span>加载中…</div>
          <template v-else-if="latest.length">
            <div v-for="item in latest" :key="item.id" class="item">
              <a class="item-title" :href="item.url" target="_blank" rel="noreferrer">{{ item.title }}</a>
              <div class="item-meta">
                <span class="tag tag-muted">{{ item.source }}</span>
                <span v-if="item.author">作者 {{ item.author }}</span>
                <span v-if="item.score != null">评分 {{ item.score }}</span>
                <span v-if="item.comments != null">评论 {{ item.comments }}</span>
                <span>{{ item.publish_time || '' }}</span>
              </div>
            </div>
          </template>
          <EmptyState v-else title="暂无情报数据" desc="到「情报采集」页面启动一次爬虫任务" />
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">快捷入口</div>
        </div>
        <div class="card-body" style="display: flex; flex-direction: column; gap: 10px">
          <button class="btn" @click="router.push('/knowledge')">知识库 RAG 检索</button>
          <button class="btn" @click="router.push('/chat')">AI 流式问答</button>
          <button class="btn" @click="router.push('/agent')">智能体 ReAct 分析</button>
          <button class="btn" @click="router.push('/report')">生成行业分析报告</button>
          <div class="notice" style="margin-top: 6px">
            提示：先启动后端 <code>uvicorn app.main:app --port 8000</code>，并确保 MySQL、Milvus 已就绪。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
