<script setup>
import { ref, computed, onMounted } from 'vue'
import { getMyBookings, deleteBooking, getResources, createComment, getMyComments, deleteComment } from '../api.js'
import { useAuth } from '../composables/useAuth.js'

const bookings = ref([])
const loading = ref(true)
const error = ref('')
const resources = ref([])
const showHistory = ref(false)
const isPopupOpen = ref(false)
const { token } = useAuth()
const selectedBooking = ref(null)
const comments = ref([])
const newComment = ref('')
const commentError = ref('')

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
    : ''
}

async function openCommentPopup(booking) {
  selectedBooking.value = booking
  isPopupOpen.value = true
  newComment.value = ''
  commentError.value = ''

  try {
    comments.value = await getMyComments(booking._id)
  } catch (err) {
    commentError.value = 'Kunde inte hämta kommentarer.'
    console.error(err)
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return

  try {
    const comment = await createComment(
      selectedBooking.value._id,
      { text: newComment.value }
    )

    comments.value.push(comment)
    newComment.value = ''
  } catch (err) {
    commentError.value = 'Kunde inte skapa kommentaren.'
    console.error(err)
  }
}

async function removeComment(commentId) {
  try {
    await deleteComment(commentId)

    comments.value = comments.value.filter(
      comment => comment._id !== commentId
    )
  } catch (err) {
    commentError.value = 'Kunde inte ta bort kommentaren.'
    console.error(err)
  }
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
            <p>CPU: {{ booking.amount_cpu }} · RAM: {{ booking.amount_ram }} mb
              <span v-if="booking.amount_disk > 0.1"> · Disk: {{ booking.amount_disk }}</span>
            </p>
          </div>
          <div class="booking-button">
            <button type="button" @click="openCommentPopup(booking)">Kommentera</button>
            <button class="cancel" type="button" @click="cancel(booking)">Avboka</button>
          </div>
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
      <div
        v-if="isPopupOpen && selectedBooking"
        class="popup-overlay"
        @click.self="isPopupOpen = false"
      >
        <div class="popup">
          <h2>Kommentarer</h2>

          <p>
            Bokning:
            {{ new Date(selectedBooking.startsAt).toLocaleString('sv-SE') }}
          </p>

          <div class="comments-list">
            <p v-if="comments.length === 0">
              Inga kommentarer ännu.
            </p>

            <div
              v-for="comment in comments"
              :key="comment._id"
              class="comment"
            >
              <p>{{ comment.text }}</p>

              <small>
                {{ new Date(comment.createdAt).toLocaleString('sv-SE') }}
              </small>

              <button
                v-if="String(comment.author) === String(token.userId)"
                @click="removeComment(comment._id)"
              >
                Ta bort
              </button>
            </div>
          </div>

          <p v-if="commentError">{{ commentError }}</p>

          <textarea
            v-model="newComment"
            placeholder="Skriv en kommentar..."
            rows="3"
          ></textarea>

          <div class="popup-actions">
            <button
              class="booking-button"
              @click="submitComment"
              :disabled="!newComment.trim()"
            >
              Skicka kommentar
            </button>

            <button
              class="cancel-button"
              @click="isPopupOpen = false"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </template>
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
.booking-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
}

.bookings p {
  margin: 0.25rem 0;
}

.error {
  color: #c0392b;
}

.cancel {
  background-color: #ff6f5f;
}

.history {
  opacity: 0.6;
  margin-top: 1rem;
}

.history-toggle {
  margin-top: 1rem;
}

.popup-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.55);
}

.popup {
    width: min(420px, calc(100% - 40px));
    padding: 50px;
    background: white;
    color: #222;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.popup p {
    padding: 50px;
    background: white;
    color: #222;
    border-radius: 12px;
    border: 3px solid #ddd;
    font-size: 2rem;
    font-weight: bold;
}

.popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
}

</style>
