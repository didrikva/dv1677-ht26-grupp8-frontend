<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getResource, createBooking } from '../api.js'
import { useAuth } from '../composables/useAuth.js'
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'

const route = useRoute()
const resource = ref(null)
const bookings = ref([])
const error = ref('')
const date = ref();
const amount_resources = ref([]);
const isPopupOpen = ref(false);
const vcpu = ref();
const ram = ref();
const amountCpu = ref(0)
const amountRam = ref(0)
const amountDisk = ref(1)

const { token } = useAuth()
const bookingError = ref('')
const bookingSuccess = ref('')


onMounted(async () => {
  try {
    const response = await getResource(route.params.id)
    resource.value = response.resource
    bookings.value = response.bookings
    console.log('Resource:', resource.value)
    console.log('Bookings:', bookings.value)
    getResourceInformation(resource.value)
  } catch (err) {
    console.error('Kunde inte hämta resursen:', err)
    error.value = 'Kunde inte hämta resursen.'
  }
})
function getResourceInformation(resource) {
  if (resource.capacity) {
    vcpu.value = resource.capacity.vcpus
    ram.value = resource.capacity.ramMb
  } else if (resource.description) {
    const parts = resource.description.split(',')

    const cpuParts = parts[0].trim().split(' ')
    const ramParts = parts[1].trim().split(' ')

    vcpu.value = Number(cpuParts[0])
    ram.value = Number(ramParts[0])
  }
}
function validateMax(value, max) {
  const number = Number(value)

  if (!Number.isFinite(number)) return 0

  return Math.min(Math.max(number, 0), max)
}

const bookResource = async () => {
    if (!date.value || !resource.value) {
        error.value = 'Vänligen välj datum och tid innan du bokar.'
        return
    }

    const startsAt = new Date(date.value)
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)

    const provider = resource.value.provider ?? resource.value.type

    const bookingData = {
        resourceId: resource.value._id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString()
    }

    if (provider === 'proxmox' || provider === 'openstack') {
        bookingData.want = {
            vcpus: Number(amountCpu.value),
            ramMb: Number(amountRam.value),
            ...(provider === 'proxmox'
            ? { diskGb: Number(amountDisk.value) }
            : {})
        }
    }

    console.log('Bokningsdata som skickas:', JSON.stringify(bookingData, null, 2))
    console.log('Resurs:', resource.value)
    console.log('CPU:', amountCpu.value)
    console.log('RAM:', amountRam.value)
    console.log('Disk:', amountDisk.value)

    try {
        const result = await createBooking(bookingData)

        console.log('Bokning lyckades:', result)
        error.value = ''
        isPopupOpen.value = false

    } catch (err) {
        console.error('Kunde inte boka resursen:', err)

        if (err.status === 409) {
            error.value =
                err.code === 'CAPACITY_EXCEEDED'
                    ? 'Det finns inte tillräckligt med ledig kapacitet.'
                    : err.code === 'ALREADY_BOOKED'
                        ? 'Maskinen är redan bokad.'
                        : err.message || 'Bokningen nekades.'
        } else {
            error.value = err.message || 'Kunde inte boka resursen.'
        }
    }
}

</script>

<template>
  <section>

    
    <div v-if="resource">
      <p>Resursens namn: {{ resource.name }}</p>
      <p v-if="resource.capacity?.ramMb">
        {{ resource.capacity.ramMb }} MB RAM
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
                        {{ resource.capacity.ramMb }} MB RAM
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
    <button v-if="token" class="book-button" @click="isPopupOpen = true">
        Boka resurs
    </button>
    <p v-else>
        <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }">Logga in</RouterLink>
        för att boka.
    </p>
    <p v-if="bookingSuccess">{{ bookingSuccess }}</p>
    <p v-if="bookingError" role="alert">{{ bookingError }}</p>
    <div
        v-if="isPopupOpen && token"
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
        <p v-if="resource.provider === 'maas' || resource.type === 'maas'" >
            Antal resurser: {{   resource.description || `${resource.capacity.vcpus} vCPU och ${resource.capacity.ramMb} MB RAM` }}
        </p>
        <div v-else>
            <label for="ram">RAM (MB):</label>
            <input
            id="ram"
            type="number"
            min="0"
            :max="ram"
            :value="amountRam"
            @input="amountRam = validateMax(Number($event.target.value), ram)"
            /><br>
            <div v-if="resource.capacity?.diskGb">
                <label for="disk">Disk (GB):</label>
                <input
                    id="disk"
                    type="number"
                    min="0"
                    :max="resource.capacity.diskGb"
                    :value="amountDisk"
                    @input="amountDisk = validateMax(Number($event.target.value), resource.capacity.diskGb)"
                />
            </div>
            <label for="cpu">Antal vCPU:</label>
            <input
            id="cpu"
            type="number"
            min="0"
            :max="vcpu"
            :value="amountCpu"
            @input="amountCpu = validateMax(Number($event.target.value), vcpu)"
            />
            <!-- <p>{{ vcpu }}</p>
            <p>{{ ram }}</p>
            <p>{{ amountCpu }}</p>
            <p>{{ amountDisk }}</p>
            <p>{{ amountRam }}</p> -->

        </div>


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
  font-size: 2rem;
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
label {
    padding: 10px;
}
input {
    padding: 5px;
    margin: 10px;
    width: 100px;
}
</style>