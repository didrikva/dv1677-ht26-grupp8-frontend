const BASE_URL = import.meta.env.VITE_API_URL || ''

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`)

  if (!res.ok) {
    throw new Error(`API svarade ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export function getResources() {
  return request('/api/resources')
}

export function getResource(id) {
  return request(`/api/resources/${id}`)
}