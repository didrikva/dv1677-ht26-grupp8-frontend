const BASE_URL = import.meta.env.VITE_API_URL || ''

async function post(path, body) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    const error = new Error('Kunde inte nå servern.')
    error.status = 0
    throw error
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(data.error || `API svarade ${res.status}`)
    error.status = res.status
    throw error
  }

  return data
}

export function register(email, password) {
  return post('/api/auth/register', { email, password })
}

export async function login(email, password) {
  const data = await post('/api/auth/login', { email, password })
  return data.token
}
