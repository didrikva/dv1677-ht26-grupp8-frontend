const BASE_URL = import.meta.env.VITE_API_URL || ''

async function request(path) {
  const res = await fetch(`${BASE_URL}${path}`)

  if (!res.ok) {
    throw new Error(`API svarade ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export function getCourses() {
  return request('/api/courses')
}

export function getCourse(id) {
  return request(`/api/courses/${id}`)
}