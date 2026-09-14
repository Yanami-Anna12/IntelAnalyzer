<script setup>
import { ref } from 'vue'
import { api } from '../api'
import MarkdownBlock from '../components/MarkdownBlock.vue'

const question = ref('')
const loading = ref(false)
const error = ref('')
const answer = ref('')
const mode = ref('')
const fallback = ref('')
const tools = ref([])

const samples = [
  '最近 AI 行业有什么值得关注的新闻？',
  '帮我查一下数据库里评分最高的几条情报',
  '总结一下当前采集到的科技情报主题分布',
]

function toolLabel(item, index) {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') {
    const name = item.tool || item.name || item.action || `工具步骤 ${index + 1}`
    return name
  }
  return `工具步骤 ${index + 1}`
}

function toolDetail(item) {
  if (item && typeof item === 'object') {
    const detail = item.input ?? item.args ?? item.output ?? item.result ?? item
    if (typeof detail === 'string') return detail
    try {
      return JSON.stringify(detail, null, 2)
    } catch {
      return String(detail)
    }
  }
  return ''
}

async function invoke() {
  const text = question.value.trim()
  if (!text) {
    error.value = '请输入要交给智能体分析的问题'
    return
  }
  loading.value = true
  error.value = ''
  answer.value = ''
  tools.value = []
  mode.value = ''
  fallback.value = ''
  try {
    const res = await api.agentInvoke(text)
    answer.value = res.answer || '（智能体没有返回内容）'
    mode.value = res.mode || ''
    fallback.value = res.fallback_reason || ''
    tools.value = Array.isArray(res.tools) ? res.tools : []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function useSample(text) {
  question.value = text
}
</script>

<template>
  <div class="grid" style="gap: 18px">
    <div class="card">
      <div class="card-head">
        <div class="card-title">
          智能体（ReAct + MCP 工具）
          <small>优先 ReAct 智能体，失败自动回落 LangGraph 工作流</small>
        </div>
        <span v-if="mode" class="tag" :class="mode === 'react' ? 'tag-ok' : 'tag-warn'">
          {{ mode === 'react' ? 'ReAct 智能体' : 'LangGraph 工作流（回落）' }}
        </span>
      </div>
      <div class="card-body">
        <div class="field">
          <label>交给智能体的任务</label>
          <textarea
            v-model="question"
            class="textarea"
            rows="3"
            placeholder="例如：最近 AI 行业有什么值得关注的新闻？"
          ></textarea>
        </div>

        <div class="toolbar" style="margin-top: 12px">
          <button class="btn btn-primary" :disabled="loading" @click="invoke">
            <span v-if="loading" class="spinner" style="margin: 0"></span>
            {{ loading ? '智能体分析中…' : '调用智能体' }}
          </button>
          <span v-for="item in samples" :key="item" class="tag tag-muted" style="cursor: pointer" @click="useSample(item)">
            {{ item }}
          </span>
        </div>

        <div v-if="error" class="notice notice-err" style="margin-top: 12px">{{ error }}</div>
        <div v-if="fallback" class="notice" style="margin-top: 12px">
          ReAct 智能体不可用，已回落到 LangGraph 工作流：{{ fallback }}
        </div>
      </div>
    </div>

    <div v-if="answer" class="grid grid-2-1">
      <div class="card">
        <div class="card-head">
          <div class="card-title">分析结论</div>
        </div>
        <div class="card-body">
          <MarkdownBlock :content="answer" />
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">工具调用轨迹<small>{{ tools.length }} 步</small></div>
        </div>
        <div class="card-body">
          <template v-if="tools.length">
            <div v-for="(item, index) in tools" :key="index" class="item">
              <div class="item-title">{{ index + 1 }}、{{ toolLabel(item, index) }}</div>
              <pre
                v-if="toolDetail(item)"
                style="margin: 0; font-size: 11.8px; color: var(--muted); white-space: pre-wrap; word-break: break-word; max-height: 180px; overflow: auto"
              >{{ toolDetail(item) }}</pre>
            </div>
          </template>
          <div v-else class="empty">
            <b>本次未返回工具轨迹</b>
            <div>智能体直接作答，或该次回落到了 LangGraph 工作流</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
