<script setup>
import { nextTick, ref } from 'vue'
import { api, streamChat } from '../api'

const messages = ref([
  {
    role: 'ai',
    text: '你好，我是企业情报助手。可以问我最新采集到的科技情报，例如「最近 AI 行业有什么值得关注的新闻」。',
  },
])
const input = ref('')
const mode = ref('stream')
const busy = ref(false)
const listRef = ref(null)
const sessionId = ref(`web-${Date.now()}`)

async function scrollToBottom() {
  await nextTick()
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function send() {
  const text = input.value.trim()
  if (!text || busy.value) return

  messages.value.push({ role: 'me', text })
  input.value = ''
  busy.value = true
  await scrollToBottom()

  if (mode.value === 'stream') {
    const reply = { role: 'ai', text: '', streaming: true }
    messages.value.push(reply)
    await scrollToBottom()

    await streamChat(text, {
      sessionId: sessionId.value,
      onDelta: (delta) => {
        reply.text += delta
        scrollToBottom()
      },
      onDone: () => {
        reply.streaming = false
        if (!reply.text) reply.text = '（模型没有返回内容）'
        busy.value = false
        scrollToBottom()
      },
      onError: (error) => {
        reply.streaming = false
        reply.error = true
        reply.text = `流式请求失败：${error.message}。可切换到「一次性返回」模式重试。`
        busy.value = false
      },
    })
    return
  }

  const reply = { role: 'ai', text: '正在思考…', pending: true }
  messages.value.push(reply)
  await scrollToBottom()
  try {
    const res = await api.chat(text, sessionId.value)
    reply.pending = false
    reply.text = res?.result ?? JSON.stringify(res)
  } catch (error) {
    reply.pending = false
    reply.error = true
    reply.text = `请求失败：${error.message}`
  } finally {
    busy.value = false
    scrollToBottom()
  }
}

function clearChat() {
  messages.value = [{ role: 'ai', text: '会话已清空，继续提问吧。' }]
  sessionId.value = `web-${Date.now()}`
}
</script>

<template>
  <div class="card chat-wrap">
    <div class="card-head">
      <div class="card-title">
        AI 智能问答
        <small>{{ mode === 'stream' ? 'SSE 流式逐字输出' : '一次性返回' }}</small>
      </div>
      <div style="display: flex; align-items: center; gap: 10px">
        <select v-model="mode" class="select" style="width: 150px" :disabled="busy">
          <option value="stream">流式输出</option>
          <option value="once">一次性返回</option>
        </select>
        <button class="btn btn-sm btn-ghost" :disabled="busy" @click="clearChat">清空会话</button>
      </div>
    </div>

    <div ref="listRef" class="chat-list">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="bubble"
        :class="msg.role === 'me' ? 'bubble-me' : 'bubble-ai'"
        :style="msg.error ? 'border-color: rgba(248,113,113,.45); color: #fca5a5' : ''"
      >
        <div class="bubble-role">{{ msg.role === 'me' ? '我' : '情报助手' }}</div>
        <span v-if="msg.pending || msg.streaming" class="spinner" style="margin-right: 6px"></span>{{ msg.text }}<span v-if="msg.streaming">▍</span>
      </div>
    </div>

    <div class="chat-input">
      <textarea
        v-model="input"
        class="textarea"
        rows="2"
        placeholder="输入问题，Enter 发送，Shift + Enter 换行"
        :disabled="busy"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="btn btn-primary" :disabled="busy || !input.trim()" @click="send">
        {{ busy ? '生成中…' : '发送' }}
      </button>
    </div>
  </div>
</template>
