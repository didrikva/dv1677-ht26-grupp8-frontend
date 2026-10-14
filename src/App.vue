```vue
<script setup>
import ResourceList from './components/ResourceList.vue'
import logo from './assets/logo.png'
</script>

<template>
  <div class="app">
    <header>
      <h1>
        <RouterLink to="/">Resurser</RouterLink>
      </h1>
      <div class="header-content">
        <p>
          <img :src="logo" alt="Logo" />
        </p>
        <p class="sub">
          Vue + Vite på GitHub Pages — data från
          <code>dv1677-ht26-grupp8-backend</code>
        </p>
      </div>
      <RouterView />
    </header>

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
}

header {
  padding: 2rem;
}

header h1 {
  margin: 0;
}

header h1 a {
  text-decoration: none;
  color: inherit;
}

.sub {
  color: #666;
}

main {
  padding: 2rem;
}

footer {
  padding: 2rem;
  margin-top: 2rem;
  border-top: 1px solid #ddd;
}

footer a {
  color: inherit;
}

header img {
  max-width: 100px;
  height: auto;
}
.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
```
