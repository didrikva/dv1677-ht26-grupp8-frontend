<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login as apiLogin, register as apiRegister } from '../api/auth.js'
import { useAuth } from '../composables/useAuth.js'

const route = useRoute()
const router = useRouter()
const { login } = useAuth()

const mode = ref('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

function setMode(newMode) {
  mode.value = newMode
  error.value = ''
  success.value = ''
}

function validate() {
  if (!/^\S+@\S+\.\S+$/.test(email.value)) {
    return 'Ange en giltig e-postadress.'
  }
  if (mode.value === 'register') {
    if (password.value.length < 6) {
      return 'Lösenordet måste vara minst 6 tecken.'
    }
    if (password.value !== confirmPassword.value) {
      return 'Lösenorden matchar inte.'
    }
  } else if (!password.value) {
    return 'Ange ditt lösenord.'
  }
  return ''
}

async function submit() {
  error.value = validate()
  success.value = ''
  if (error.value) return

  loading.value = true
  try {
    if (mode.value === 'login') {
      login(await apiLogin(email.value, password.value))
      const redirect = route.query.redirect
      router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/')
    } else {
      await apiRegister(email.value, password.value)
      mode.value = 'login'
      password.value = ''
      confirmPassword.value = ''
      success.value = 'Kontot är skapat. Du kan nu logga in.'
    }
  } catch (err) {
    if (err.status === 401) error.value = 'Fel e-post eller lösenord.'
    else if (err.status === 409) error.value = 'E-postadressen används redan.'
    else if (err.status === 400) error.value = 'Ogiltiga uppgifter. Kontrollera e-post och lösenord.'
    else error.value = err.message || 'Något gick fel.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth">
    <div class="tabs">
      <button :class="{ active: mode === 'login' }" type="button" @click="setMode('login')">
        Logga in
      </button>
      <button :class="{ active: mode === 'register' }" type="button" @click="setMode('register')">
        Registrera
      </button>
    </div>

    <h2>{{ mode === 'login' ? 'Logga in' : 'Skapa konto' }}</h2>

    <form novalidate @submit.prevent="submit">
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>

      <label>
        E-post
        <input v-model="email" type="email" placeholder="namn@exempel.se" required />
      </label>

      <label>
        Lösenord
        <input v-model="password" type="password" placeholder="Lösenord" required />
      </label>

      <label v-if="mode === 'register'">
        Bekräfta lösenord
        <input v-model="confirmPassword" type="password" placeholder="Upprepa lösenord" required />
      </label>

      <button class="submit" type="submit" :disabled="loading">
        {{ mode === 'login' ? 'Logga in' : 'Registrera' }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.auth {
  max-width: 24rem;
  margin: 2rem auto;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tabs button {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.tabs button.active {
  background: #42b883;
  border-color: #42b883;
  color: #fff;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.error {
  margin: 0;
  color: #c0392b;
}

.success {
  margin: 0;
  color: #27ae60;
}

.submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit {
  padding: 0.6rem;
  border: none;
  border-radius: 4px;
  background: #42b883;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
}
</style>
