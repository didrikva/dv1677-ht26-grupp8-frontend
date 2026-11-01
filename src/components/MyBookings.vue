<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getMyBookings, deleteBooking, getResources, createComment, getMyComments, deleteComment } from '../api.js'
import { useAuth } from '../composables/useAuth.js'
import { io } from 'socket.io-client'

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
let socket

function addComment(comment) {
  if (comments.value.some(existing => String(existing._id) === String(comment._id))) return

  comments.value = [...comments.value, comment].sort(
    (first, second) => new Date(first.createdAt) - new Date(second.createdAt)
  )
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
    : ''
}

function closeCommentPopup() {
  isPopupOpen.value = false
  socket?.disconnect()
  socket = undefined
}

async function openCommentPopup(booking) {
  socket?.disconnect()
  selectedBooking.value = booking
  comments.value = []
  isPopupOpen.value = true
  newComment.value = ''
  commentError.value = ''

  socket = io(import.meta.env.VITE_API_URL || 'https://dv1677-laforge.nplab.bth.se', {
    transports: ['polling'],
    auth: { token: token.value }
  })

  socket.emit('join:booking', booking._id, (response) => {
    console.log('Joined booking room:', response)
  })
  socket.on('comment:created', addComment)

  socket.on('comment:deleted', (commentId) => {
    comments.value = comments.value.filter(
      comment => comment._id !== commentId
    )
  })

  try {
    const loadedComments = await getMyComments(booking._id)
    loadedComments.forEach(addComment)
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
      { text: newComment.value.trim() }
    )

    addComment(comment)
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
onUnmounted(() => socket?.disconnect())
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
        @click.self="closeCommentPopup"
      >
        <div class="popup">
          <div class="popup-header">
            <div>
              <h2>Kommentarer</h2>
              <p class="popup-subtitle">Diskussion om din bokning</p>
            </div>

            <button
              class="close-button"
              type="button"
              @click="closeCommentPopup"
              aria-label="Stäng"
            >
              &times;
            </button>
          </div>

          <div class="booking-info">
            <p class="booking-date">
              {{ formatDate(selectedBooking.startsAt) }}
            </p>

            <p>
              {{ selectedBooking.amount_cpu }} CPU ·
              {{ selectedBooking.amount_ram }} MB RAM
              <span v-if="selectedBooking.amount_disk > 0.1">
                · {{ selectedBooking.amount_disk }} GB Disk
              </span>
            </p>
          </div>

          <div class="comments-list">
            <div v-if="comments.length === 0" class="empty-comments">
              <p>Inga kommentarer ännu.</p>
              <small>Börja diskussionen genom att skriva en kommentar nedan.</small>
            </div>

            <div
              v-for="comment in comments"
              :key="comment._id"
              class="comment"
            >
              <p class="comment-text">{{ comment.text }}</p>

              <div class="comment-footer">
                <small>{{ formatDate(comment.createdAt) }}</small>

                <button
                  class="delete-comment"
                  type="button"
                  @click="removeComment(comment._id)"
                >
                  Ta bort
                </button>
              </div>
            </div>
          </div>

          <p v-if="commentError" class="comment-error">
            {{ commentError }}
          </p>

          <div class="comment-form">
            <textarea
              v-model="newComment"
              placeholder="Skriv en kommentar..."
              rows="3"
            ></textarea>

            <div class="popup-actions">
              <button
                class="send-button"
                type="button"
                @click="submitComment"
                :disabled="!newComment.trim()"
              >
                Skicka kommentar
              </button>

              <button
                class="close-popup-button"
                type="button"
                @click="closeCommentPopup"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      </div>
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

.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: rgba(20, 35, 28, 0.65);
  backdrop-filter: blur(3px);
}

.popup {
  display: flex;
  flex-direction: column;
  width: min(550px, 100%);
  max-height: 85vh;
  padding: 1.5rem;
  background: #f5f8f5;
  color: #243b32;
  border: 1px solid #d5e1d7;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.popup-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.popup-subtitle {
  margin: 0.3rem 0 0;
  color: #647568;
  font-size: 0.9rem;
}

.close-button {
  border: none;
  background: transparent;
  color: #647568;
  font-size: 1.8rem;
  cursor: pointer;
}

.close-button:hover {
  color: #243b32;
}

.booking-info {
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
  background: #e8efe9;
  border: 1px solid #d5e1d7;
  border-radius: 8px;
}

.booking-info p {
  margin: 0.2rem 0;
  font-size: 0.9rem;
}

.booking-date {
  font-weight: 700;
  color: #34583d;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  min-height: 100px;
  overflow-y: auto;
  padding: 0.2rem;
}

.empty-comments {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  text-align: center;
  color: #647568;
  background: #fff;
  border: 1px dashed #cbd8cd;
  border-radius: 8px;
}

.empty-comments p {
  margin: 0 0 0.4rem;
  font-weight: 600;
  color: #34583d;
}

.empty-comments small {
  font-size: 0.85rem;
}

.comment {
  padding: 0.9rem 1rem;
  background: #fff;
  border: 1px solid #d5e1d7;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(36, 59, 50, 0.04);
}

.comment-text {
  margin: 0 0 0.8rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  border-top: 1px solid #edf1ed;
  padding-top: 0.6rem;
}

.comment-footer small {
  color: #647568;
  font-size: 0.8rem;
}

.delete-comment {
  padding: 0.3rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: #fff0ed;
  color: #bd5145;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.delete-comment:hover {
  background: #ffded8;
}

.comment-error {
  color: #c0392b;
  font-size: 0.9rem;
}

.comment-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #d5e1d7;
}

.comment-form textarea {
  box-sizing: border-box;
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #cbd8cd;
  border-radius: 8px;
  background: #fff;
  color: #243b32;
  font: inherit;
  resize: vertical;
}

.comment-form textarea:focus {
  outline: 2px solid #426b4c;
  outline-offset: 1px;
}

.popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.send-button,
.close-popup-button {
  padding: 0.6rem 0.9rem;
  border: 1px solid #426b4c;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.send-button {
  background: #426b4c;
  color: #fff;
}

.send-button:hover:not(:disabled) {
  background: #34583d;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-popup-button {
  background: #e8efe9;
  color: #34583d;
}

.close-popup-button:hover {
  background: #dce7de;
}

</style>
