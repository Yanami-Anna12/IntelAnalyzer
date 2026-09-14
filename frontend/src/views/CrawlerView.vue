<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api } from '../api'
import StatusTag from '../components/StatusTag.vue'
import EmptyState from '../components/EmptyState.vue'

const limit = ref(20)
const spider = ref('hacker_news')
const starting = ref(false)
const stats = ref({ news_count: '-', hacker_news_count: '-' })
const tasks = ref([])
const news = ref([])
const newsLoading = ref(false)
const keyword = ref('')
const tip = ref({ type: '', text: '' })

let pollTimer = null

const sortedTasks = computed(() => [...tasks.value].reverse())

const hasRunning = computed(() =>
  tasks.value.some((t) => t.status === 'pending' || t.status === 'running'),
)

function setTip(type, text) {
  tip.value = { type, text }
}

async function loadStats() {
  try {
    stats.value = await api.crawlerStatistics()
  } catch (error) {
    setTip('err', `统计获取失败：${error.message}`)
  }
}

async function loadNews() {
  newsLoading.value = true
  try {
    news.value = (await api.newsList({ limit: 20, keyword: keyword.value || undefined })) || []
  } catch (error) {
    setTip('err', `情报数据加载失败：${error.message}（后端需已补充 /api/crawler/news 接口）`)
  } finally {
    newsLoading.value = false
  }
}

async function loadTasks(showTip = false) {
  try {
    tasks.value = (await api.crawlerTasks()) || []
    if (showTip) setTip('ok', `任务列表已刷新，共 ${tasks.value.length} 个任务`)
  } catch (error) {
    if (showTip) setTip('err', `任务列表获取失败：${error.message}`)
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    await loadTasks()
    if (!hasRunning.value) {
      clearInterval(pollTimer)
      pollTimer = null
      await Promise.all([loadStats(), loadNews()])
      setTip('ok', '采集流水线执行结束，统计数据已更新')
    }
  }, 2500)
}

async function startCrawl() {
  starting.value = true
  setTip('', '')
  try {
    const res = await api.crawlerStart(limit.value, spider.value)
    setTip('ok', `爬虫任务已提交（task_id=${res.task_id}），后台执行：抓取 → 清洗去重 → MySQL 入库 → 切分 → 向量化 → Milvus`)
    await loadTasks()
    startPolling()
  } catch (error) {
    setTip('err', `任务启动失败：${error.message}`)
  } finally {
    starting.value = false
  }
}

async function searchNews() {
  await loadNews()
}

onMounted(async () => {
  await Promise.all([loadStats(), loadTasks(), loadNews()])
  if (hasRunning.value) startPolling()
})

onUnmounted(() => pollTimer && clearInterval(pollTimer))
</script>

<template>
  <div class="grid" style="gap: 18px">
    <!-- 采集控制台 -->
    <div class="card">
      <div class="card-head">
        <div class="card-title">
          爬虫控制台
          <small>Hacker News 情报采集流水线</small>
        </div>
        <button class="btn btn-sm" :disabled="hasRunning" @click="startCrawl">
          <span v-if="starting" class="spinner" style="margin: 0"></span>
          {{ starting ? '提交中' : '启动采集' }}
        </button>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <div class="field">
            <label>爬虫目标</label>
            <select v-model="spider" class="select">
              <option value="hacker_news">Hacker News（科技情报）</option>
            </select>
          </div>
          <div class="field" style="max-width: 150px">
            <label>采集条数 limit</label>
            <input v-model.number="limit" type="number" min="1" max="200" class="input" />
          </div>
          <button class="btn btn-primary" :disabled="starting || hasRunning" @click="startCrawl">
            {{ hasRunning ? '采集进行中…' : '开始采集' }}
          </button>
          <button class="btn btn-ghost" @click="loadTasks(true)">刷新任务</button>
        </div>

        <div v-if="tip.text" class="notice" :class="{ 'notice-err': tip.type === 'err', 'notice-ok': tip.type === 'ok' }" style="margin-top: 12px">
          {{ tip.text }}
        </div>

        <div class="grid grid-4" style="margin-top: 14px">
          <div class="stat">
            <div class="stat-label">新闻总条数</div>
            <div class="stat-value">{{ stats.news_count ?? '-' }}</div>
            <div class="stat-sub">MySQL · news 表</div>
          </div>
          <div class="stat">
            <div class="stat-label">Hacker News</div>
            <div class="stat-value">{{ stats.hacker_news_count ?? '-' }}</div>
            <div class="stat-sub">按 source 统计</div>
          </div>
          <div class="stat">
            <div class="stat-label">任务总数</div>
            <div class="stat-value">{{ tasks.length }}</div>
            <div class="stat-sub">本次服务运行期间</div>
          </div>
          <div class="stat">
            <div class="stat-label">进行中任务</div>
            <div class="stat-value">{{ tasks.filter((t) => t.status === 'pending' || t.status === 'running').length }}</div>
            <div class="stat-sub">等待 / 采集中</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="card">
      <div class="card-head">
        <div class="card-title">采集任务<small>后台任务状态实时轮询（2.5s）</small></div>
      </div>
      <div class="table-wrap">
        <table v-if="sortedTasks.length" class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>爬虫</th>
              <th>状态</th>
              <th>抓取</th>
              <th>MySQL</th>
              <th>切片</th>
              <th>Milvus</th>
              <th>库内总量</th>
              <th>备注 / 错误</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in sortedTasks" :key="task.id">
              <td class="num">{{ task.id }}</td>
              <td>{{ task.spider_name }}</td>
              <td><StatusTag :status="task.status" /></td>
              <td class="num">{{ task.news_count ?? '—' }} / {{ task.limit }}</td>
              <td class="num">
                <template v-if="task.status === 'success'">{{ task.mysql_success }} 成功 / {{ task.mysql_error }} 失败</template>
                <template v-else>—</template>
              </td>
              <td class="num">{{ task.chunk_count ?? '—' }}</td>
              <td class="num">{{ task.milvus_count ?? '—' }}</td>
              <td class="num">{{ task.db_total ?? '—' }}</td>
              <td style="max-width: 320px; color: var(--muted-2)">
                <span v-if="task.error" style="color: #fca5a5">{{ task.error }}</span>
                <span v-else-if="task.note">{{ task.note }}</span>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState
          v-else
          title="暂无采集任务"
          desc="点击上方「开始采集」，后台将执行：抓取 → 存 JSON → 写 MySQL → 文本切分 → Embedding → 写 Milvus"
        />
      </div>
    </div>

    <!-- 原始情报数据 -->
    <div class="card">
      <div class="card-head">
        <div class="card-title">原始情报数据<small>MySQL news 表</small></div>
        <div style="display: flex; gap: 8px">
          <input
            v-model="keyword"
            class="input"
            style="width: 190px"
            placeholder="按标题 / 正文关键词搜索"
            @keyup.enter="searchNews"
          />
          <button class="btn btn-sm" @click="searchNews">搜索</button>
          <button class="btn btn-sm btn-ghost" @click="((keyword = ''), searchNews())">重置</button>
        </div>
      </div>
      <div class="table-wrap">
        <table v-if="news.length" class="table">
          <thead>
            <tr>
              <th style="width: 44%">标题</th>
              <th>来源</th>
              <th>作者</th>
              <th>评分</th>
              <th>评论</th>
              <th>发布时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in news" :key="item.id">
              <td>
                <a :href="item.url" target="_blank" rel="noreferrer">{{ item.title }}</a>
              </td>
              <td><span class="tag tag-muted">{{ item.source }}</span></td>
              <td class="num">{{ item.author || '—' }}</td>
              <td class="num">{{ item.score ?? '—' }}</td>
              <td class="num">{{ item.comments ?? '—' }}</td>
              <td class="num">{{ item.publish_time || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="newsLoading" class="loading"><span class="spinner"></span>加载情报数据…</div>
        <EmptyState v-else title="没有查询到新闻数据" desc="先运行一次采集，数据会落库到 MySQL 的 news 表" />
      </div>
    </div>
  </div>
</template>
