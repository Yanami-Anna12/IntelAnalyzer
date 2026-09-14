<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'

const route = useRoute()

const navItems = [
  {
    to: '/',
    label: '情报概览',
    icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  },
  {
    to: '/crawler',
    label: '情报采集',
    icon: 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3zM3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3',
  },
  {
    to: '/knowledge',
    label: '知识库检索',
    icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35',
  },
  {
    to: '/chat',
    label: 'AI 问答',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  },
  {
    to: '/agent',
    label: '智能体',
    icon: 'M9 9h6v6H9zM4 9h2M4 15h2M18 9h2M18 15h2M9 4v2M15 4v2M9 18v2M15 18v2M6 6h12v12H6z',
  },
  {
    to: '/report',
    label: '行业报告',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  },
]

const apiOk = ref(null)
const dbOk = ref(null)
let timer = null

async function checkHealth() {
  try {
    const res = await api.health()
    apiOk.value = res?.status === 'ok'
  } catch {
    apiOk.value = false
  }
  try {
    const res = await api.healthDb()
    dbOk.value = res?.status === 'ok'
  } catch {
    dbOk.value = false
  }
}

onMounted(() => {
  checkHealth()
  timer = setInterval(checkHealth, 15000)
})

onUnmounted(() => timer && clearInterval(timer))

const pageTitle = computed(() => route.meta?.title ?? '情报概览')
const pageDesc = computed(() => route.meta?.desc ?? '')
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <div class="brand-logo">IQ</div>
        <div class="brand-text">
          <b>智能情报平台</b>
          <span>Intel Agent</span>
        </div>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: route.path === item.to }"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path :d="item.icon" />
          </svg>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="side-foot">
        <div>爬虫 · RAG · Agent</div>
        <div>FastAPI + Vue3 整合版</div>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageDesc }}</p>
        </div>
        <div class="health">
          <span><i class="dot" :class="apiOk === null ? '' : apiOk ? 'ok' : 'err'"></i>后端服务</span>
          <span><i class="dot" :class="dbOk === null ? '' : dbOk ? 'ok' : 'err'"></i>MySQL</span>
        </div>
      </header>

      <section class="content">
        <router-view />
      </section>
    </main>
  </div>
</template>
