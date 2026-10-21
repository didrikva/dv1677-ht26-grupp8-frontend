<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getResource } from '../api.js'
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

const route = useRoute()
const resource = ref(null)
const bookings = ref([])
const error = ref('')
const date = ref();
const amount_resources = ref(0);
const isPopupOpen = ref(false);
onMounted(async () => {
  try {
    const response = await getResource(route.params.id)
    resource.value = response.resource
    bookings.value = response.bookings
    console.log('Resource:', resource.value)
    console.log('Bookings:', bookings.value)
  } catch (err) {
    console.error('Kunde inte hämta resursen:', err)
    error.value = 'Kunde inte hämta resursen.'
  }
})
</script>

<template>
  <section>

    
    <div v-if="resource">
      <p>Resursens namn: {{ resource.name }}</p>
      <p v-if="resource.capacity?.ramMb">
        {{ Math.round(resource.capacity.ramMb / 1024) }} GB RAM
      </p>

      <p v-if="resource.capacity?.diskGb">
        {{ resource.capacity.diskGb.toFixed(1) }} GB Disk
      </p>

      <p v-if="resource.capacity?.vcpus">
        {{ resource.capacity.vcpus }} vCPU
      </p>
      <p>{{ resource.description }}</p>
    </div>


    <h2>Välj datum och tid</h2>
    <VueDatePicker v-model="date" />
    
    <div v-if="date">
        <h2>Valt datum och tid:</h2>
        <p> {{ date.toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' }) }}</p>
    </div>
    <p v-else-if="!date">Inget datum valt</p>

    <div v-if="resource">
        <ul class="time-grid">
            <li v-for="hour in 24" :key="hour">
                <button @click="date = new Date(); date.setHours(hour - 1, 0, 0, 0)">
                    <h3>{{ hour - 1 }}:00</h3>
                    <p v-if="resource.capacity?.ramMb">
                        {{ Math.round(resource.capacity.ramMb / 1024) }} GB RAM
                    </p>

                    <p v-if="resource.capacity?.diskGb">
                        {{ resource.capacity.diskGb.toFixed(1) }} GB Disk
                    </p>

                    <p v-if="resource.capacity?.vcpus">
                        {{ resource.capacity.vcpus }} vCPU
                    </p>
                    <p>{{ resource.description }}</p>
                </button>
            </li>
        </ul>
    </div>

    <p v-if="error">{{ error }}</p>
    <p v-else-if="!resource">Laddar resurs...</p>
    <pre v-else>{{ JSON.stringify(resource, null, 2) }} {{ JSON.stringify(response, null, 2) }}</pre>
    <button class="book-button" @click="isPopupOpen = true">
        Boka resurs
    </button>
    <div
        v-if="isPopupOpen"
        class="popup-overlay"
        @click.self="isPopupOpen = false"
    >
    <div class="popup">
        <h2>Bekräfta bokning</h2>

        <p v-if="date">
        Vald datum: {{ date.toLocaleDateString('sv-SE', {
            dateStyle: 'long'
        }) }}
        <br>
        Vald tid: {{ date.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
        }) }}
        </p>
        <p v-else>
            Inget datum valt. Vänligen välj ett datum och tid innan du bekräftar bokningen.
        </p>
        <p v-if="resource.provider !== 'maas'" >
            Antal resurser: {{ amount_resources }}
        </p>

        <div class="popup-actions">
            <button class="booking-button" @click="bookResource">Bekräfta bokning</button>
            <button class="cancel-button" @click="isPopupOpen = false">Avbryt</button>
        </div>
    </div>
    </div>
  </section>
</template> 

<style scoped>
.time-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 2rem;
    list-style: none;
    padding: 0;
}

.time-grid li {
    border: 1px solid #ddd;
    border-radius: 8px;
}

button {
    width: 100%;
    height: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 1rem;
}

.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.55);
}

.popup {
  width: min(420px, calc(100% - 40px));
  padding: 50px;
  background: white;
  color: #222;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.popup p{
  padding: 50px;
  background: white;
  color: #222;
  border-radius: 12px;
  border: 3px solid #ddd;
  font-size: 2.5rem;
  font-weight: bold;
}

.popup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

.booking-button {
  cursor: pointer;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: rgb(151, 197, 151);
}

.cancel-button {
  cursor: pointer;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: rgb(255, 157, 157);
}

.book-button {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 400px;
  height: 75px;
  padding: 14px;
  margin: 0 auto;
  cursor: pointer;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f0f0f0;
}
</style>