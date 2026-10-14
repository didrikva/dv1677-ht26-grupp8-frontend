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

    <ul v-else class="resource-grid">
      <li v-for="resource in resources" :key="resource._id" :class="resource.active ? 'active' : 'notActive'">
        <p>{{ resource.name }}{{ resource.provider ? ' -- ' + resource.provider : '' }}</p>
        <p>{{ resource.description }}</p>
        <p>Tillgänglig: {{ resource.active ? 'Ja' : 'Nej' }}</p>
        <!-- <pre>{{ JSON.stringify(resource, null, 2) }}</pre> -->
      </li>
    </ul>
  </section>
</template>

<style scoped>
.resource-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
    list-style: none;
    padding: 0;
}

.resource-grid li {
    padding: 1rem;
    /* border: 1px solid #ddd; */
    border-radius: 8px;
}

.active {
  border: 3px solid rgb(129, 181, 129);
}

.notActive {
  border: 3px solid red;
}

@media (max-width: 900px) {
    .resource-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 500px) {
    .resource-grid {
        grid-template-columns: 1fr;
    }
}
</style>