<script setup>
import { ref, onMounted } from 'vue'
import { getMyBookings, deleteBooking } from '../api.js'

const bookings = ref([])
const loading = ref(true)
const error = ref('')

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
    : ''
}

async function load() {
  try {
    const data = await getMyBookings()
    bookings.value = Array.isArray(data) ? data : data.bookings || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function cancel(booking) {
  error.value = ''
  try {
    await deleteBooking(booking._id)
    bookings.value = bookings.value.filter((b) => b._id !== booking._id)
  } catch (err) {
    error.value = err.status === 404 ? 'Bokningen hittades inte.' : err.message
  }
}

onMounted(load)
</script>

<template>
  <section>
    <h2>Mina bokningar</h2>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading">Hämtar bokningar...</p>
    <p v-else-if="bookings.length === 0 && !error">Du har inga bokningar.</p>

    <ul v-else class="bookings">
      <li v-for="booking in bookings" :key="booking._id">
        <div>
          <p>Resurs: {{ booking.resource_id }}</p>
          <p>{{ formatDate(booking.start_time) }} – {{ formatDate(booking.end_time) }}</p>
          <p v-if="booking.status">Status: {{ booking.status }}</p>
        </div>
        <button type="button" @click="cancel(booking)">Avboka</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bookings {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bookings li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.bookings p {
  margin: 0.25rem 0;
}

.error {
  color: #c0392b;
}
</style>
