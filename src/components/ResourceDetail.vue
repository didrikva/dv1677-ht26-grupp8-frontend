<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getResource } from '../api.js'
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

const route = useRoute()
const resource = ref(null)
const bookings = ref([])
const error = ref('')
const date = ref();
onMounted(async () => {
  try {
    const response = await getResource(route.params.id)
    resource.value = response.resource
    bookings.value = response.bookings
    console.log('Resource:', resource.value)
    console.log('Bookings:', bookings.value)
  } catch (err) {
    console.error('Kunde inte hämta resursen:', err)
    error.value = 'Kunde inte hämta resursen.'
  }
})
</script>

<template>
  <section>

    
    <div v-if="resource">
      <p>Resursens namn: {{ resource.name }}</p>
      <p>Resursens typ: {{ resource.type }}</p>
      <p>{{ resource.description }}</p>
    </div>


    <h2>Välj datum och tid</h2>
    <VueDatePicker v-model="date" />
    
    <div v-if="date">
        <h2>Valt datum och tid:</h2>
        <p> {{ date.toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' }) }}</p>
    </div>
    <p v-else-if="!date">Inget datum valt</p>

    <ul class="time-grid">
        <li v-for="hour in 24" :key="hour">
            <h3>{{ hour - 1 }}:00</h3>
            <p>{{ resource.description }}</p>
        </li>
    </ul>

    <p v-if="error">{{ error }}</p>
    <p v-else-if="!resource">Laddar resurs...</p>
    <pre v-else>{{ JSON.stringify(resource, null, 2) }} {{ JSON.stringify(response, null, 2) }}</pre>
  </section>
</template>

<style scoped>
.time-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 2rem;
    list-style: none;
    padding: 0;
}

.time-grid li {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
}
</style>