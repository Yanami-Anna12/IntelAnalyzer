<script setup>
const props = defineProps({
  status: { type: String, default: '' },
})

const MAP = {
  pending: { text: '等待中', cls: 'tag-warn' },
  running: { text: '采集进行中', cls: 'tag' },
  success: { text: '采集成功', cls: 'tag-ok' },
  failed: { text: '采集失败', cls: 'tag-err' },
  stopped: { text: '已停止', cls: 'tag-muted' },
}

const info = MAP[props.status] || { text: props.status || '未知', cls: 'tag-muted' }
</script>

<template>
  <span class="tag" :class="info.cls">
    <span v-if="status === 'running'" class="spinner" style="width: 11px; height: 11px; margin: 0"></span>
    {{ info.text }}
  </span>
</template>
