<script setup>
import { ref, onMounted } from 'vue'
import { getResources } from '../api.js'

const courses = ref([])
const error = ref(null)

onMounted(async () => {
  try {
    courses.value = await getResources()
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <section>
    <h2>Resurser</h2>

    <p v-if="error">
      Kunde inte hämta resurser: {{ error }}
    </p>

    <p v-else-if="courses.length === 0">
      Hämtar resurser...
    </p>

    <ul v-else>
      <li v-for="course in courses" :key="course.id">
        {{ course.name }}
      </li>
    </ul>
  </section>
</template>