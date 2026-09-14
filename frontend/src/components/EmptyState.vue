<script setup>
defineProps({
  title: { type: String, default: '暂无数据' },
  desc: { type: String, default: '' },
})
</script>

<template>
  <div class="empty">
    <div><b>{{ title }}</b></div>
    <div v-if="desc">{{ desc }}</div>
  </div>
</template>
