
const BASE_URL = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const token = sessionStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))

    console.error('API-fel:', {
      status: response.status,
      error: error.error,
      code: error.code,
      details: error
    })

    throw new Error(
      `${error.error || 'API-fel'} (HTTP ${response.status})` +
      (error.code ? ` – Kod: ${error.code}` : '')
    )
  }

  return response.json()
}

export function getResources() {
    return request('/api/resources')
}

export function getResource(id) {
    return request(`/api/resources/${id}`)
}

export function createBooking(booking) {
    return request('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(booking)
    })
}
