import { useAuth } from './composables/useAuth.js'

const BASE_URL = import.meta.env.VITE_API_URL || ''

// Öppna anrop, ingen token behövs
async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`)

  if (!res.ok) {
    throw new Error(`API svarade ${res.status} ${res.statusText}`)
  }

  return res.json()
}

// Anrop mot skyddade routes. Skickar token och loggar ut vid 401.
export async function apiFetch(path, options = {}) {
  const { token, logout } = useAuth()
  const headers = { ...options.headers }

  if (token.value) {
    headers.Authorization = `Bearer ${token.value}`
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  })

  if (res.status === 401) {
    logout()
    const { default: router } = await import('./router/index.js')
    router.push('/login')
    throw new Error('Din session har gått ut. Logga in igen.')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || `API svarade ${res.status} ${res.statusText}`)
    error.status = res.status
    throw error
  }

  return data
}

export function getResources() {
  return request('/api/resources')
}

export function getResource(id) {
  return request(`/api/resources/${id}`)
}

export function getMyBookings() {
  return apiFetch('/api/bookings/mine')
}

export function createBooking({ resource_id, start_time, end_time }) {
  return apiFetch('/api/bookings', {
    method: 'POST',
    body: { resource_id, start_time, end_time }
  })
}

export function updateBooking(id, { resource_id, start_time, end_time, status }) {
  return apiFetch(`/api/bookings/${id}`, {
    method: 'PUT',
    body: { resource_id, start_time, end_time, status }
  })
}

export function deleteBooking(id) {
  return apiFetch(`/api/bookings/${id}`, { method: 'DELETE' })
}
