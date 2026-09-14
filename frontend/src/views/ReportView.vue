<script setup>
import { ref } from 'vue'
import { api } from '../api'
import MarkdownBlock from '../components/MarkdownBlock.vue'
import EmptyState from '../components/EmptyState.vue'

const industry = ref('人工智能')
const loading = ref(false)
const error = ref('')
const report = ref('')
const sources = ref([])
const newsUsed = ref(0)
const generatedFor = ref('')

const presets = ['人工智能', '芯片半导体', '云计算', '网络安全', '新能源']

async function generate() {
  const name = industry.value.trim()
  if (!name) {
    error.value = '请输入行业名称'
    return
  }
  loading.value = true
  error.value = ''
  report.value = ''
  sources.value = []
  try {
    const res = await api.reportIndustry(name)
    report.value = res.report || ''
    sources.value = res.sources || []
    newsUsed.value = res.news_used || 0
    generatedFor.value = res.industry || name
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid" style="gap: 18px">
    <div class="card">
      <div class="card-head">
        <div class="card-title">
          行业分析报告
          <small>MySQL 检索相关情报 → 大模型撰写</small>
        </div>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <div class="field" style="flex: 1; min-width: 240px">
            <label>行业 / 主题</label>
            <input v-model="industry" class="input" placeholder="例如：人工智能" @keyup.enter="generate" />
          </div>
          <button class="btn btn-primary" :disabled="loading" @click="generate">
            <span v-if="loading" class="spinner" style="margin: 0"></span>
            {{ loading ? '生成中…' : '生成报告' }}
          </button>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px">
          <span v-for="item in presets" :key="item" class="tag tag-muted" style="cursor: pointer" @click="industry = item">
            {{ item }}
          </span>
        </div>

        <div v-if="error" class="notice notice-err" style="margin-top: 12px">{{ error }}</div>
      </div>
    </div>

    <div v-if="report" class="grid grid-2-1">
      <div class="card">
        <div class="card-head">
          <div class="card-title">{{ generatedFor }} · 行业分析报告<small>AI 生成，仅供参考</small></div>
        </div>
        <div class="card-body">
          <MarkdownBlock :content="report" />
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">引用情报<small>共 {{ newsUsed }} 条</small></div>
        </div>
        <div class="card-body">
          <template v-if="sources.length">
            <div v-for="(url, index) in sources" :key="index" class="item">
              <a class="item-title" :href="url" target="_blank" rel="noreferrer">{{ url }}</a>
            </div>
          </template>
          <div v-else class="empty"><b>没有引用来源</b></div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="card">
      <div class="card-body">
        <EmptyState
          title="还没有生成报告"
          desc="输入行业名称后点击「生成报告」；报告会引用 MySQL 中该行业的相关情报（需先采集数据）"
        />
      </div>
    </div>
  </div>
</template>
