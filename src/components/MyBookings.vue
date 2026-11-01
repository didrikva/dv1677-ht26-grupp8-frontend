<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyBookings, deleteBooking, getResources } from '../api.js'

const bookings = ref([])
const loading = ref(true)
const error = ref('')
const resources = ref([])
const showHistory = ref(false)

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
    : ''
}

async function load() {
  try {
      const [data, res] = await Promise.all([getMyBookings(), getResources()])
      bookings.value = Array.isArray(data) ? data : data.bookings || []
      resources.value = Array.isArray(res) ? res : res.resources || []
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
    await load()
  } catch (err) {
    error.value = err.status === 404 ? 'Bokningen hittades inte.' : err.message
  }
}

function resourceName(id) {
  const r = resources.value.find((r) => r._id === id)
  return r ? r.name : id
}

function isHistory(b) {
  return b.status === 'cancelled' || new Date(b.endsAt) < new Date()
}

const activeBookings = computed(() => bookings.value.filter((b) => !isHistory(b)))
const historyBookings = computed(() => bookings.value.filter(isHistory))

onMounted(load)
</script>

<template>
  <section>
    <h2>Mina bokningar</h2>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading">Hämtar bokningar...</p>

    <template v-else>
      <p v-if="activeBookings.length === 0">Du har inga aktiva bokningar.</p>
      <ul v-else class="bookings">
        <li v-for="booking in activeBookings" :key="booking._id">
          <div>
            <p>Resurs: {{ resourceName(booking.resourceId) }}</p>
            <p>{{ formatDate(booking.startsAt) }} – {{ formatDate(booking.endsAt) }}</p>
            <p>CPU: {{ booking.amount_cpu }} · RAM: {{ booking.amount_ram }}
              <span v-if="booking.amount_disk"> · Disk: {{ booking.amount_disk }}</span>
            </p>
          </div>
          <button type="button" @click="cancel(booking)">Avboka</button>
        </li>
      </ul>

      <button type="button" class="history-toggle" @click="showHistory = !showHistory">
        {{ showHistory ? 'Dölj' : 'Visa' }} historik ({{ historyBookings.length }})
      </button>

      <ul v-if="showHistory" class="bookings history">
        <li v-for="booking in historyBookings" :key="booking._id">
          <div>
            <p>Resurs: {{ resourceName(booking.resourceId) }}</p>
            <p>{{ formatDate(booking.startsAt) }} – {{ formatDate(booking.endsAt) }}</p>
            <p>Status: {{ booking.status }}</p>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
section {
  color: #243b32;
}

h2 {
  color: #243b32;
}

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
  border: 1px solid #d5e1d7;
  border-radius: 8px;
  background: #f5f8f5;
}

.bookings p {
  margin: 0.25rem 0;
}

.error {
  color: #c0392b;
}

.history {
  color: #647568;
  margin-top: 1rem;
}

.history-toggle {
  margin-top: 1rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid #cbd8cd;
  border-radius: 8px;
  background: #e8efe9;
  color: #34583d;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.history-toggle:hover {
  background: #dce7de;
}

.bookings button {
  padding: 0.55rem 0.9rem;
  border: 1px solid #426b4c;
  border-radius: 8px;
  background: #426b4c;
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.bookings button:hover {
  background: #34583d;
  border-color: #34583d;
}

</style>
