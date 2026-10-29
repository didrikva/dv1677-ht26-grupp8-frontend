<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getResource, createBooking } from '../api.js'
import { useAuth } from '../composables/useAuth.js'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { io } from 'socket.io-client'

const route = useRoute()
const resource = ref(null)
const bookings = ref([])
const error = ref('')
const date = ref(null)
const isPopupOpen = ref(false)
const amountCpu = ref(0)
const amountRam = ref(0)
const amountDisk = ref(1)
const { token } = useAuth()
let socket

const resourceCapacity = computed(() => {
    const capacity = resource.value?.capacity
    const description = resource.value?.description || ''

    const parts = description.split(',')
    let cpu = null
    let ram = null
    let ramUnit = null
    let disk = null

    for (const part of parts) {
        const value = part.trim()
        const lower = value.toLowerCase()

        if (lower.includes('cpu') || lower.includes('core')) {
            cpu = parseFloat(value)
        }

        if (lower.includes('ram')) {
            ram = parseFloat(value)
            ramUnit = lower.includes('gb') ? 'GB' : 'MB'
        }

        if (lower.includes('disk')) {
            disk = parseFloat(value)

            if (lower.includes('tb')) {
                disk *= 1024
            }
        }
    }

    if (capacity?.vcpus != null) {
        cpu = Number(capacity.vcpus)
    }

    if (capacity?.ramMb != null) {
        ram = Number(capacity.ramMb)
        ramUnit = 'MB'
    }

    if (capacity?.diskGb != null) {
        disk = Number(capacity.diskGb)
    }

    return {
        vcpu: cpu,
        ram,
        ramUnit,
        ramMb: ram == null ? null : ram * (ramUnit === 'GB' ? 1024 : 1),
        diskGb: disk
    }
})

const selectedAvailability = computed(() => {
    if (!date.value) return resourceCapacity.value

    const start = new Date(date.value)
    return slotAvailability(start, new Date(start.getTime() + 60 * 60 * 1000))
})

const timeSlots = computed(() => Array.from({ length: 24 }, (_, hour) => {
    const start = date.value ? new Date(date.value) : new Date()
    start.setHours(hour, 0, 0, 0)

    return {
        hour,
        availability: slotAvailability(start, new Date(start.getTime() + 60 * 60 * 1000))
    }
}))

async function refreshResource() {
    const updated = await getResource(route.params.id)
    resource.value = updated.resource
    bookings.value = Array.isArray(updated.bookings) ? updated.bookings : []
}

function slotAvailability(start, end) {
    const capacity = resourceCapacity.value
    if (!capacity) return null

    let usedCpu = 0
    let usedRam = 0
    let usedDisk = 0

    for (const booking of bookings.value) {
        if (booking.status !== 'confirmed') continue

        const bookingStart = new Date(booking.startsAt ?? booking.start_time)
        const bookingEnd = new Date(booking.endsAt ?? booking.end_time)

        if (
            Number.isNaN(bookingStart.getTime()) ||
            Number.isNaN(bookingEnd.getTime()) ||
            bookingStart >= end ||
            bookingEnd <= start
        ) {
            continue
        }

        usedCpu += Number(booking.want?.vcpus ?? booking.amount_cpu ?? 0)

        const bookedRamMb = booking.want?.ramMb != null
            ? Number(booking.want.ramMb)
            : Number(booking.amount_ram ?? 0)

        usedRam += bookedRamMb
        usedDisk += Number(booking.want?.diskGb ?? booking.amount_disk ?? 0)
    }

    return {
        vcpu: capacity.vcpu == null ? null : Math.max(0, capacity.vcpu - usedCpu),
        ram: capacity.ram == null
            ? null
            : Math.max(0, capacity.ramMb - usedRam) / (capacity.ramUnit === 'GB' ? 1024 : 1),
        ramUnit: capacity.ramUnit,
        diskGb: capacity.diskGb == null ? null : Math.max(0, capacity.diskGb - usedDisk)
    }
}

function selectHour(hour) {
    const selected = date.value ? new Date(date.value) : new Date()
    selected.setHours(hour, 0, 0, 0)
    date.value = selected
}

onMounted(async () => {
    try {
        await refreshResource()

        socket = io('https://dv1677-laforge.nplab.bth.se', {
            transports: ['polling']
        })

        socket.on('connect', () => {
            socket.emit('join', String(resource.value._id))
        })

        socket.on('booking:created', async () => {
            try {
                await refreshResource()
            } catch (err) {
                console.error('Kunde inte uppdatera resursen:', err)
                error.value = 'Kunde inte uppdatera resursens bokningar.'
            }
        })
    } catch (err) {
        console.error('Kunde inte hämta resursen:', err)
        error.value = err.message || 'Kunde inte hämta resursen.'
    }
})

onUnmounted(() => {
    if (socket) socket.disconnect()
})

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
        endsAt: endsAt.toISOString(),
        amount_cpu: amountCpu.value,
        amount_ram: amountRam.value * (resourceCapacity.value.ramUnit === 'MB' ? 1 / 1024 : 1)
    }

    if (provider === 'proxmox' || provider === 'openstack') {
        bookingData.want = {
            vcpus: Number(amountCpu.value),
            ramMb: Number(amountRam.value) * (resourceCapacity.value.ramUnit === 'GB' ? 1024 : 1),
            ...(provider === 'proxmox' ? { diskGb: Number(amountDisk.value) } : {})
        }
    }

    try {
        await createBooking(bookingData)

        error.value = ''
        isPopupOpen.value = false
        await refreshResource()
    } catch (err) {
        console.error('Kunde inte boka resursen:', err)

        if (err.status === 409) {
            if (err.code === 'CAPACITY_EXCEEDED') {
                error.value = 'Det finns inte tillräckligt med ledig kapacitet.'
            } else if (err.code === 'ALREADY_BOOKED') {
                error.value = 'Maskinen är redan bokad.'
            } else {
                error.value = err.message || 'Bokningen nekades.'
            }
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

            <p v-if="resourceCapacity.ram ">
                {{ Math.round(resourceCapacity.ram) }} {{ resourceCapacity.ramUnit }} RAM
            </p>

            <p v-if="resourceCapacity.diskGb ">
                {{ Math.round(resourceCapacity.diskGb) }} GB Disk
            </p>

            <p v-if="resourceCapacity.vcpu ">
                {{ Math.round(resourceCapacity.vcpu) }} vCPU
            </p>

            <p>{{ resource.description }}</p>
        </div>

        <h2>Välj datum och tid</h2>
        <VueDatePicker v-model="date" />

        <div v-if="date">
            <h2>Valt datum och tid:</h2>
            <p>{{ date.toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' }) }}</p>
        </div>
        <p v-else>Inget datum valt</p>

        <div v-if="resource">
            <ul class="time-grid">
                <li v-for="slot in timeSlots" :key="slot.hour">
                    <button @click="selectHour(slot.hour)">
                        <h3>{{ slot.hour }}:00</h3>

                        <p v-if="slot.availability?.vcpu ">
                            {{ Math.round(slot.availability.vcpu) }} vCPU tillgängliga
                        </p>

                        <p v-if="slot.availability?.ram ">
                            {{ Math.round(slot.availability.ram) }} {{ slot.availability.ramUnit }} RAM tillgängligt
                        </p>

                        <p v-if="slot.availability?.diskGb ">
                            {{ Math.round(slot.availability.diskGb) }} GB Disk tillgänglig
                        </p>

                        <p v-if="resourceCapacity.vcpu || resourceCapacity.ram  || resourceCapacity.diskGb ">
                            Totalt:
                            <span v-if="resourceCapacity.vcpu ">{{ Math.round(resourceCapacity.vcpu) }} vCPU</span><br>
                            <span v-if="resourceCapacity.ram ">{{ Math.round(resourceCapacity.ram) }} {{ resourceCapacity.ramUnit }} RAM</span><br>
                            <span v-if="resourceCapacity.diskGb ">{{ Math.round(resourceCapacity.diskGb) }} GB Disk</span><br>
                        </p>
                    </button>
                </li>
            </ul>
        </div>

        <p v-if="error">{{ error }}</p>
        <p v-else-if="!resource">Laddar resurs...</p>

        <button v-if="token" class="book-button" @click="isPopupOpen = true">
            Boka resurs
        </button>

        <p v-else>
            <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }">
                Logga in
            </RouterLink>
            för att boka.
        </p>

        <div
            v-if="isPopupOpen && token"
            class="popup-overlay"
            @click.self="isPopupOpen = false"
        >
            <div class="popup">
                <h2>Bekräfta bokning</h2>

                <p v-if="date">
                    Vald datum: {{ date.toLocaleDateString('sv-SE', { dateStyle: 'long' }) }}
                    <br>
                    Vald tid: {{ date.toLocaleTimeString('sv-SE', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) }}
                </p>

                <p v-else>
                    Inget datum valt. Vänligen välj ett datum och tid innan du bekräftar bokningen.
                </p>

                <p v-if="resource.provider === 'maas' || resource.type === 'maas'">
                    Antal resurser: {{ resource.description || `${resource.capacity.vcpus} vCPU och ${resource.capacity.ramMb} MB RAM` }}
                </p>

                <div v-else>
                    <label for="ram">RAM ({{ resourceCapacity.ramUnit }}):</label>
                    <input
                        id="ram"
                        type="number"
                        min="0"
                        :max="selectedAvailability?.ram ?? 0"
                        :value="amountRam"
                        @input="amountRam = validateMax(Number($event.target.value), selectedAvailability?.ram ?? 0)"
                    />
                    <br>

                    <div v-if="resource.capacity?.diskGb">
                        <label for="disk">Disk (GB):</label>
                        <input
                            id="disk"
                            type="number"
                            min="0"
                            :max="selectedAvailability?.diskGb ?? 0"
                            :value="amountDisk"
                            @input="amountDisk = validateMax(Number($event.target.value), selectedAvailability?.diskGb ?? 0)"
                        />
                    </div>

                    <label for="cpu">Antal vCPU:</label>
                    <input
                        id="cpu"
                        type="number"
                        min="0"
                        :max="selectedAvailability?.vcpu ?? 0"
                        :value="amountCpu"
                        @input="amountCpu = validateMax(Number($event.target.value), selectedAvailability?.vcpu ?? 0)"
                    />
                </div>

                <div class="popup-actions">
                    <button class="booking-button" @click="bookResource">
                        Bekräfta bokning
                    </button>
                    <button class="cancel-button" @click="isPopupOpen = false">
                        Avbryt
                    </button>
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

.popup p {
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
.time-grid li {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
}

.time-grid button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-height: 220px;
    padding: 16px;
    text-align: center;
}

.time-grid h3 {
    margin: 0 0 8px;
    font-size: 1.2rem;
}

.resource-info p {
    margin: 4px 0;
    font-size: 0.9rem;
}

.total-capacity {
    border-top: 1px solid #ddd;
    padding-top: 8px;
    margin-top: auto;
    font-size: 0.8rem;
    color: #666;
}
</style>
