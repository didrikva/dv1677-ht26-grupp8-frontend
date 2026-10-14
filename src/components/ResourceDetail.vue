<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const resourceId = route.params.id
</script>

<template>
  <section>
    <h1>Resursdetaljer</h1>
    <p>Resursens ID: {{ resourceId }}</p>
  </section>
</template>