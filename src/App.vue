```vue
<script setup>
import logo from './assets/logo.png'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth.js'

const router = useRouter()
const { token, user, logout } = useAuth()

function handleLogout() {
  logout()
  router.push('/')
}
</script>

<template>
  <div class="app">
    <header class="site-header">
      <nav class="navbar" aria-label="Huvudnavigation">
        <div class="brand">
          <RouterLink class="brand-icon" to="/" aria-label="Till startsidan">
            <img :src="logo" alt="" />
          </RouterLink>
          <span class="brand-title">Resurser</span>
        </div>

        <div class="nav-links">
          <RouterLink to="/" class="nav-link" active-class="nav-link-active" exact-active-class="nav-link-active">
            Alla resurser
          </RouterLink>
          <template v-if="token">
            <RouterLink to="/mina-bokningar" class="nav-link" active-class="nav-link-active">
              Mina bokningar
            </RouterLink>
            <span class="email">{{ user?.email }}</span>
            <button class="logout-button" type="button" @click="handleLogout">Logga ut</button>
          </template>
          <RouterLink
            v-else
            to="/login"
            class="nav-link login-link"
            active-class="nav-link-active"
          >
            Logga in / Registrera
          </RouterLink>
        </div>
      </nav>
    </header>

    <main class="page-content">
      <div class="header-content">
        <p class="sub">
          Vue + Vite på GitHub Pages — data från
          <code>dv1677-ht26-grupp8-backend</code>
        </p>
      </div>
      <RouterView />
    </main>

    <footer>
      <a href="https://github.com/dv1677-ht26-grupp8/frontend">
        Källkod på GitHub
      </a>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  background: #e8efe9;
  box-shadow: 0 2px 8px rgb(15 23 42 / 8%);
}

.navbar {
  width: min(100% - 3rem, 1280px);
  min-height: 96px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  color: #243b32;
  font-size: 1.6rem;
  font-weight: 700;
  white-space: nowrap;
}

.brand-icon {
  display: inline-flex;
  padding: 0;
  border-radius: 50%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.brand-icon img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 50%;
}

.brand:hover .brand-icon,
.brand:focus-within .brand-icon {
  transform: scale(1.06);
  box-shadow: 0 0 0 4px rgb(75 111 87 / 18%);
}

.brand-title {
  cursor: default;
  transition: color 0.2s ease;
}

.brand:hover .brand-title,
.brand:focus-within .brand-title {
  color: #426b4c;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.nav-link {
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  color: #42584d;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.nav-link:hover,
.nav-link:focus-visible,
.nav-link-active {
  color: #1f5138;
  background: #d7e3d9;
}

.email {
  color: #53675c;
  font-size: 0.9rem;
}

.logout-button {
  padding: 0.55rem 0.9rem;
  border: 1px solid #aebdb2;
  border-radius: 0.5rem;
  background: #f7faf7;
  color: #344a3d;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.logout-button:hover {
  background: #dce7de;
  border-color: #8fa595;
  transform: translateY(-1px);
}

.logout-button:focus-visible,
.brand-icon:focus-visible {
  outline: 2px solid #426b4c;
  outline-offset: 3px;
}

.page-content {
  width: min(100% - 3rem, 1280px);
  margin: 0 auto;
  padding: 2rem 0;
  flex: 1;
}

.sub {
  margin-bottom: 1.5rem;
  color: #64748b;
}

footer {
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  text-align: center;
}

footer a {
  color: #475569;
  transition: color 0.2s ease;
}

footer a:hover,
footer a:focus-visible {
  color: #1f5138;
}

@media (max-width: 640px) {
  .navbar {
    width: min(100% - 2rem, 1280px);
    min-height: auto;
    padding: 1rem 0;
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;
  }

  .nav-links {
    width: 100%;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
  }

  .brand {
    font-size: 1.5rem;
  }

  .brand-icon img {
    width: 50px;
    height: 50px;
  }

  .email {
    display: none;
  }

  .page-content {
    width: min(100% - 2rem, 1280px);
    padding: 1.5rem 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
</style>
```
