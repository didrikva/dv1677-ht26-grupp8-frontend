<script setup>
import { ref, onMounted } from 'vue'
import { getResources } from '../api.js'

const resources = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    resources.value = await getResources()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <h2>Resurser</h2>

    <p v-if="loading">
      Hämtar resurser...
    </p>

    <p v-else-if="error">
      Kunde inte hämta resurser: {{ error }}
    </p>

    <p v-else-if="resources.length === 0">
      Inga resurser hittades.
    </p>

    <ul v-else>
      <li v-for="resource in resources" :key="resource._id">
        {{ resource.name }}
      </li>
    </ul>
  </section>
</template>