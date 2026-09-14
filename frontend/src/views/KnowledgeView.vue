<script setup>
import { onMounted, ref } from 'vue'
import { api, normalizeSearchResult } from '../api'
import EmptyState from '../components/EmptyState.vue'

const question = ref('')
const topK = ref(5)
const searching = ref(false)
const results = ref([])
const engine = ref('')
const note = ref('')
const error = ref('')
const searched = ref(false)

const stats = ref({ collection: '-', chunk_count: '-' })
const statsError = ref('')

const ingestPaths = ref('')
const ingesting = ref(false)
const ingestTip = ref({ type: '', text: '' })

const ENGINE_TAG = {
  hybrid: { text: 'RAG 混合检索（Dense+稀疏+RRF+Reranker）', cls: 'tag-ok' },
  crawler: { text: '爬虫集合 hacker_news 兜底检索', cls: 'tag' },
  keyword_fallback: { text: 'MySQL 关键词兜底检索', cls: 'tag-warn' },
}

async function loadStats() {
  statsError.value = ''
  try {
    stats.value = await api.knowledgeStats()
  } catch (e) {
    statsError.value = e.message
  }
}

async function doSearch() {
  if (!question.value.trim()) {
    error.value = '请输入检索问题'
    return
  }
  searching.value = true
  error.value = ''
  note.value = ''
  results.value = []
  try {
    const res = await api.knowledgeQuery(question.value.trim(), topK.value)
    engine.value = res.engine || ''
    note.value = res.note || ''
    results.value = (res.results || []).map(normalizeSearchResult)
    searched.value = true
  } catch (e) {
    error.value = e.message
  } finally {
    searching.value = false
  }
}

async function doIngest() {
  const paths = ingestPaths.value
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
  if (!paths.length) {
    ingestTip.value = { type: 'err', text: '请填写至少一个文档的绝对路径' }
    return
  }
  ingesting.value = true
  ingestTip.value = { type: '', text: '' }
  try {
    const res = await api.knowledgeIngest(paths)
    ingestTip.value = { type: 'ok', text: `入库完成，写入向量 ${res.ingested} 条` }
    await loadStats()
  } catch (e) {
    ingestTip.value = { type: 'err', text: `入库失败：${e.message}` }
  } finally {
    ingesting.value = false
  }
}

onMounted(loadStats)
</script>

<template>
  <div class="grid" style="gap: 18px">
    <div class="card">
      <div class="card-head">
        <div class="card-title">RAG 知识库检索<small>向量化 → 混合检索 → Reranker 精排</small></div>
        <span class="tag" :class="(ENGINE_TAG[engine] || {}).cls || 'tag-muted'">
          {{ (ENGINE_TAG[engine] || {}).text || '未检索' }}
        </span>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <div class="field" style="flex: 1; min-width: 260px">
            <label>检索问题</label>
            <input
              v-model="question"
              class="input"
              placeholder="例如：最近 AI 行业有什么动态？"
              @keyup.enter="doSearch"
            />
          </div>
          <div class="field" style="max-width: 130px">
            <label>Top-K</label>
            <input v-model.number="topK" type="number" min="1" max="20" class="input" />
          </div>
          <button class="btn btn-primary" :disabled="searching" @click="doSearch">
            {{ searching ? '检索中…' : '检索' }}
          </button>
        </div>

        <div v-if="error" class="notice notice-err" style="margin-top: 12px">{{ error }}</div>
        <div v-if="note" class="notice" style="margin-top: 12px">{{ note }}</div>
      </div>
    </div>

    <div class="grid grid-2-1">
      <div class="card">
        <div class="card-head">
          <div class="card-title">检索结果<small>{{ results.length }} 条</small></div>
        </div>
        <div class="card-body">
          <div v-if="searching" class="loading"><span class="spinner"></span>正在向量化并检索…</div>
          <template v-else-if="results.length">
            <div v-for="(item, index) in results" :key="index" class="item">
              <div class="item-title">
                <a v-if="item.url" :href="item.url" target="_blank" rel="noreferrer">{{ item.title || `结果 ${index + 1}` }}</a>
                <span v-else>{{ item.title || `结果 ${index + 1}` }}</span>
              </div>
              <div class="item-meta">
                <span class="tag tag-muted">{{ item.source }}</span>
                <span v-if="item.author">作者 {{ item.author }}</span>
                <span v-if="item.publishTime">{{ item.publishTime }}</span>
                <template v-if="item.score !== null">
                  <span>相关度 {{ item.score }}</span>
                  <span class="score-bar">
                    <i :style="{ width: `${Math.max(6, Math.min(100, item.score * 100))}%` }"></i>
                  </span>
                </template>
              </div>
              <div class="item-text">{{ item.text }}</div>
            </div>
          </template>
          <EmptyState
            v-else-if="searched"
            title="没有检索到相关内容"
            desc="可以换个问法；若爬虫还没跑过，请先到「情报采集」采集数据"
          />
          <EmptyState v-else title="输入问题开始检索" desc="支持对知识库文档与爬虫采集情报做混合检索" />
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 18px">
        <div class="card">
          <div class="card-head">
            <div class="card-title">知识库状态</div>
            <button class="btn btn-sm btn-ghost" @click="loadStats">刷新</button>
          </div>
          <div class="card-body">
            <div v-if="statsError" class="notice notice-err">{{ statsError }}</div>
            <div v-else>
              <div class="stat-label">Milvus 集合</div>
              <div style="font-size: 15px; font-weight: 600; margin: 6px 0 14px">{{ stats.collection }}</div>
              <div class="stat-label">向量条数</div>
              <div class="stat-value" style="font-size: 22px">{{ stats.chunk_count }}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div class="card-title">文档入库<small>支持 pdf / docx / txt / md</small></div>
          </div>
          <div class="card-body">
            <div class="field">
              <label>文档绝对路径（一行一个）</label>
              <textarea
                v-model="ingestPaths"
                class="textarea"
                rows="5"
                placeholder="C:\docs\行业报告.pdf&#10;C:\docs\调研笔记.md"
              ></textarea>
            </div>
            <button class="btn btn-primary" style="margin-top: 10px" :disabled="ingesting" @click="doIngest">
              {{ ingesting ? '解析入库中…' : '解析并写入向量库' }}
            </button>
            <div
              v-if="ingestTip.text"
              class="notice"
              :class="{ 'notice-err': ingestTip.type === 'err', 'notice-ok': ingestTip.type === 'ok' }"
              style="margin-top: 10px"
            >
              {{ ingestTip.text }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
