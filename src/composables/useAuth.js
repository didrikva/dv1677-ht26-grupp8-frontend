import { ref, computed } from 'vue'

const token = ref(localStorage.getItem('token'))

// Payloaden är inte krypterad eller verifierad här. Används bara för visning.
function decodePayload(jwt) {
  try {
    const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isExpired(payload) {
  return Boolean(payload?.exp) && payload.exp * 1000 < Date.now()
}

function logout() {
  token.value = null
  localStorage.removeItem('token')
}

function login(newToken) {
  token.value = newToken
  localStorage.setItem('token', newToken)
}

// Rensa en trasig eller utgången token vid start
if (token.value) {
  const payload = decodePayload(token.value)
  if (!payload || isExpired(payload)) {
    logout()
  }
}

const user = computed(() => {
  if (!token.value) return null
  const payload = decodePayload(token.value)
  return payload ? { id: payload.id, email: payload.email } : null
})

export function useAuth() {
  return { token, user, login, logout }
}
