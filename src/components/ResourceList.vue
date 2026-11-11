<script setup>
import { ref, onMounted } from 'vue'
import { getResources } from '../api.js'

const resources = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    resources.value = await getResources()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section>
    <h2>Resurser</h2>

    <p v-if="loading">
      Hämtar resurser...
    </p>

    <p v-else-if="error">
      Kunde inte hämta resurser: {{ error }}
    </p>

    <p v-else-if="resources.length === 0">
      Inga resurser hittades.
    </p>

    <ul v-else class="resource-grid">
      <li
        v-for="resource in resources"
        :key="resource._id"
        :class="resource.active ? 'active' : 'notActive'"
      >
        <RouterLink class="resource-card" :to="`/resurser/${resource._id}`">
          <p class="resource-name">
            {{ resource.name }}{{ resource.provider ? ' -- ' + resource.provider : '' }}
          </p>
          <p class="resource-description" :title="resource.description">
            {{ resource.description }}
          </p>
          <div class="resource-capacity">
            <span v-if="resource.capacity?.ramMb">{{ resource.capacity.ramMb }} MB RAM</span>
            <span v-if="resource.capacity?.diskGb">{{ resource.capacity.diskGb.toFixed(1) }} GB Disk</span>
            <span v-if="resource.capacity?.vcpus">{{ resource.capacity.vcpus }} vCPU</span>
          </div>
          <p
            class="availability"
            :class="resource.active ? 'available' : 'unavailable'"
          >
            <span>Tillgänglig</span>
            <strong>{{ resource.active ? 'Ja' : 'Nej' }}</strong>
          </p>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.resource-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch;
    gap: 2rem;
    list-style: none;
    padding: 0;
}

.resource-grid li {
    display: flex;
    min-width: 0;
    height: 205px;
    border-radius: 8px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.resource-grid li:hover,
.resource-grid li:focus-within {
    transform: translateY(-5px);
    box-shadow: 0 10px 22px rgb(15 23 42 / 14%);
}

.resource-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.65rem;
    border-radius: inherit;
    color: inherit;
    text-decoration: none;
}

.resource-card p {
    overflow-wrap: anywhere;
}

.resource-name {
    overflow: hidden;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.resource-description {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-height: 1.3;
}

.resource-capacity {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.6rem;
    font-size: 0.85rem;
}

.availability {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: auto;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
}

.availability strong {
    font-weight: 700;
}

.availability.available {
    background: #e5f2e7;
    color: #245c32;
}

.availability.unavailable {
    background: #fbe9e7;
    color: #9c3028;
}

.resource-grid a:focus-visible {
    outline: 3px solid #426b4c;
    outline-offset: 3px;
}

.active {
  border: 3px solid rgb(129, 181, 129);
}

.notActive {
  border: 3px solid red;
}

@media (prefers-reduced-motion: reduce) {
    .resource-grid li {
        transition: none;
    }
}

@media (max-width: 900px) {
    .resource-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 500px) {
    .resource-grid {
        grid-template-columns: 1fr;
    }
}
</style>