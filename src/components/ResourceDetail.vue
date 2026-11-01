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
const bookingSuccess = ref('')
const date = ref(null)
const isPopupOpen = ref(false)
const amountCpu = ref(0)
const amountRam = ref(0)
const amountDisk = ref(0.1)
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

    bookingSuccess.value = ''
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
        bookingSuccess.value = 'Bokningen har skapats!'
        isPopupOpen.value = false
    } catch (err) {
        console.error('Kunde inte boka resursen:', err)
        bookingSuccess.value = ''

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
        return
    }

    try {
        await refreshResource()
    } catch (err) {
        console.error('Bokningen skapades, men resursen kunde inte uppdateras:', err)
        error.value = 'Bokningen skapades, men resursens tillgänglighet kunde inte uppdateras.'
    }
}
</script>

<template>
    <section class="resource-detail">
        <div class="resource-top-grid">
            <div v-if="resource" class="resource-summary">
                <h1>{{ resource.name }}</h1>

                <div class="resource-metrics">
                    <span v-if="resourceCapacity.ram">
                        {{ Math.round(resourceCapacity.ram) }} {{ resourceCapacity.ramUnit }} RAM
                    </span>
                    <span v-if="resourceCapacity.diskGb">
                        {{ Math.round(resourceCapacity.diskGb) }} GB disk
                    </span>
                    <span v-if="resourceCapacity.vcpu">
                        {{ Math.round(resourceCapacity.vcpu) }} vCPU
                    </span>
                </div>

                <p class="resource-description">{{ resource.description }}</p>
            </div>

            <div class="date-picker-section">
                <h2>Välj datum och tid</h2>
                <VueDatePicker v-model="date" class="date-picker" />
            </div>
        </div>

        <div class="selected-date" :class="{ 'has-date': date }">
            <template v-if="date">
                <span>Valt datum och tid</span>
                <strong>{{ date.toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' }) }}</strong>
            </template>
            <span v-else>Inget datum valt</span>
        </div>

        <div v-if="resource" class="time-section">
            <h2>Välj en timme</h2>
            <ul class="time-grid">
                <li v-for="slot in timeSlots" :key="slot.hour">
                    <button
                        type="button"
                        :class="{ 'selected-time': date && date.getHours() === slot.hour }"
                        :aria-pressed="Boolean(date && date.getHours() === slot.hour)"
                        @click="selectHour(slot.hour)"
                    >
                        <h3>{{ String(slot.hour).padStart(2, '0') }}:00</h3>

                        <p v-if="slot.availability?.vcpu">
                            {{ Math.round(slot.availability.vcpu) }} vCPU tillgängliga
                        </p>

                        <p v-if="slot.availability?.ram">
                            {{ Math.round(slot.availability.ram) }} {{ slot.availability.ramUnit }} RAM tillgängligt
                        </p>

                        <p v-if="slot.availability?.diskGb">
                            {{ Math.round(slot.availability.diskGb) }} GB Disk tillgänglig
                        </p>

                        <p v-if="resourceCapacity.vcpu || resourceCapacity.ram || resourceCapacity.diskGb" class="total-capacity">
                            <span>Totalt:</span>
                            <span v-if="resourceCapacity.vcpu">{{ Math.round(resourceCapacity.vcpu) }} vCPU</span>
                            <span v-if="resourceCapacity.ram">{{ Math.round(resourceCapacity.ram) }} {{ resourceCapacity.ramUnit }} RAM</span>
                            <span v-if="resourceCapacity.diskGb">{{ Math.round(resourceCapacity.diskGb) }} GB Disk</span>
                        </p>
                    </button>
                </li>
            </ul>
        </div>

        <p v-if="bookingSuccess" class="success-message" role="status">{{ bookingSuccess }}</p>
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <p v-else-if="!resource">Laddar resurs...</p>

        <div class="booking-actions">
            <button
                v-if="token"
                class="book-button"
                :class="{ 'book-button-ready': date }"
                :disabled="!date"
                type="button"
                @click="bookingSuccess = ''; error = ''; isPopupOpen = true"
            >
                Boka resurs
            </button>

            <p v-else>
                <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }">
                    Logga in
                </RouterLink>
                för att boka.
            </p>
        </div>

        <div
            v-if="isPopupOpen && token"
            class="popup-overlay"
            @click.self="isPopupOpen = false"
        >
            <div class="popup" role="dialog" aria-modal="true" aria-labelledby="booking-title">
                <h2 id="booking-title">Bekräfta bokning</h2>

                <p v-if="date" class="booking-summary">
                    Vald datum: {{ date.toLocaleDateString('sv-SE', { dateStyle: 'long' }) }}
                    <br>
                    Vald tid: {{ date.toLocaleTimeString('sv-SE', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }) }}
                </p>

                <p v-else class="booking-summary">
                    Inget datum valt. Vänligen välj ett datum och tid innan du bekräftar bokningen.
                </p>

                <p v-if="resource.provider === 'maas' || resource.type === 'maas'">
                    Antal resurser: {{ resource.description || `${resource.capacity.vcpus} vCPU och ${resource.capacity.ramMb} MB RAM` }}
                </p>

                <div v-else>
                    <div class="booking-field">
                        <label for="ram">RAM ({{ resourceCapacity.ramUnit }}):</label>
                        <input
                            id="ram"
                            type="number"
                            min="0"
                            :max="selectedAvailability?.ram ?? 0"
                            :value="amountRam"
                            @input="amountRam = validateMax(Number($event.target.value), selectedAvailability?.ram ?? 0)"
                        />
                        <p class="capacity-hint">
                            {{ Math.round(selectedAvailability?.ram ?? 0) }} {{ resourceCapacity.ramUnit }} ledigt
                            av {{ Math.round(resourceCapacity.ram ?? 0) }} {{ resourceCapacity.ramUnit }} totalt
                        </p>
                    </div>

                    <div v-if="resource.capacity?.diskGb" class="booking-field">
                        <label for="disk">Disk (GB):</label>
                        <input
                            id="disk"
                            type="number"
                            min="0"
                            :max="selectedAvailability?.diskGb ?? 0"
                            :value="amountDisk"
                            @input="amountDisk = validateMax(Number($event.target.value), selectedAvailability?.diskGb ?? 0)"
                        />
                        <p class="capacity-hint">
                            {{ Number(selectedAvailability?.diskGb ?? 0).toFixed(1) }} GB ledigt
                            av {{ Number(resourceCapacity.diskGb ?? 0).toFixed(1) }} GB totalt
                        </p>
                    </div>

                    <div class="booking-field">
                        <label for="cpu">Antal vCPU:</label>
                        <input
                            id="cpu"
                            type="number"
                            min="0"
                            :max="selectedAvailability?.vcpu ?? 0"
                            :value="amountCpu"
                            @input="amountCpu = validateMax(Number($event.target.value), selectedAvailability?.vcpu ?? 0)"
                        />
                        <p class="capacity-hint">
                            {{ Math.round(selectedAvailability?.vcpu ?? 0) }} vCPU lediga
                            av {{ Math.round(resourceCapacity.vcpu ?? 0) }} totalt
                        </p>
                    </div>
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
.resource-detail {
    display: grid;
    gap: 1.5rem;
    color: #243b32;
}

.resource-detail h1,
.resource-detail h2,
.resource-detail h3 {
    color: #243b32;
}

.resource-top-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 1.5rem;
}

.resource-summary,
.date-picker-section {
    box-sizing: border-box;
    min-width: 0;
    height: 100%;
    padding: 1.25rem 1.5rem;
    border: 1px solid #d5e1d7;
    border-radius: 12px;
    background: #f5f8f5;
}

.resource-summary {
    width: 100%;
    padding: 1.25rem;
    border-left: 4px solid #789681;
    box-shadow: 0 4px 14px rgb(36 59 50 / 6%);
    overflow-wrap: anywhere;
}

.date-picker-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.resource-summary h1 {
    margin-bottom: 1rem;
    color: #243b32;
    font-size: 1.5rem;
    font-weight: 700;
}

.resource-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.resource-metrics span {
    padding: 0.35rem 0.7rem;
    border: 1px solid #d5e1d7;
    border-radius: 999px;
    background: #e8efe9;
    color: #34583d;
    font-size: 0.9rem;
    font-weight: 600;
}

.resource-description {
    margin: 0;
    color: #53675c;
    line-height: 1.5;
}

.date-picker-section h2,
.time-section h2 {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    font-weight: 700;
}

.date-picker {
    --dp-primary-color: #426b4c;
    --dp-border-radius: 8px;
    --dp-border-color: #cbd8cd;
    --dp-menu-border-color: #d5e1d7;
}

.date-picker :deep(.dp__input) {
    width: 100%;
    box-sizing: border-box;
    min-height: 46px;
    border-color: #cbd8cd;
    border-radius: 8px;
    color: #243b32;
}

.date-picker :deep(.dp__input:hover) {
    border-color: #789681;
}

.date-picker :deep(.dp__input:focus) {
    border-color: #426b4c;
    box-shadow: 0 0 0 3px rgb(66 107 76 / 16%);
}

.selected-date {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-radius: 8px;
    background: #f1f3f1;
    color: #53675c;
}

.selected-date.has-date {
    background: #e5f2e7;
    color: #245c32;
}

.selected-date strong {
    font-weight: 700;
}

.time-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
}

.time-grid li {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #d5e1d7;
    border-radius: 10px;
    background: #f5f8f5;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.time-grid li:hover,
.time-grid li:focus-within {
    transform: translateY(-3px);
    border-color: #789681;
    box-shadow: 0 7px 16px rgb(36 59 50 / 12%);
}

.time-grid button {
    display: flex;
    width: 100%;
    min-height: 190px;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    padding: 0.9rem;
    border: 0;
    background: transparent;
    color: #42584d;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease;
}

.time-grid button:hover,
.time-grid button.selected-time {
    background: #e8efe9;
}

.time-grid button.selected-time {
    box-shadow: inset 0 0 0 2px #789681;
}

.time-grid button:focus-visible,
.book-button:focus-visible,
.booking-button:focus-visible,
.cancel-button:focus-visible {
    outline: 3px solid #426b4c;
    outline-offset: 3px;
}

.time-grid h3 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
}

.time-grid p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.35;
}

.total-capacity {
    display: grid;
    gap: 0.1rem;
    margin-top: auto !important;
    padding-top: 0.5rem;
    border-top: 1px solid #d5e1d7;
    color: #647568;
    font-size: 0.8rem !important;
}

.error-message {
    padding: 0.85rem 1rem;
    border-radius: 8px;
    background: #fbe9e7;
    color: #9c3028;
}

.success-message {
    padding: 0.85rem 1rem;
    border: 1px solid #c5dfc9;
    border-radius: 8px;
    background: #e5f2e7;
    color: #245c32;
    font-weight: 600;
}

.booking-actions {
    display: flex;
    justify-content: center;
}

.book-button,
.booking-button,
.cancel-button {
    min-height: 46px;
    padding: 0.7rem 1.25rem;
    border: 1px solid transparent;
    border-radius: 8px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.book-button {
    background: #e8efe9;
    color: #78877c;
    cursor: not-allowed;
}

.book-button-ready,
.booking-button {
    background: #426b4c;
    color: #fff;
    cursor: pointer;
}

.book-button-ready:hover,
.booking-button:hover {
    transform: translateY(-2px);
    background: #34583d;
    box-shadow: 0 5px 12px rgb(36 59 50 / 18%);
}

.cancel-button {
    border-color: #cbd8cd;
    background: #f5f8f5;
    color: #42584d;
}

.cancel-button:hover {
    background: #e8efe9;
}

.popup-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    overflow-y: auto;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    background: rgb(15 23 42 / 55%);
}

.popup {
    width: min(520px, 100%);
    max-height: 100%;
    overflow-y: auto;
    padding: 1.5rem;
    border: 1px solid #d5e1d7;
    border-radius: 12px;
    background: #fff;
    color: #243b32;
    box-shadow: 0 12px 36px rgb(15 23 42 / 25%);
}

.popup h2 {
    margin-bottom: 1rem;
    font-size: 1.4rem;
    font-weight: 700;
}

.booking-summary {
    margin-bottom: 1rem;
    padding: 0.85rem;
    border-radius: 8px;
    background: #f5f8f5;
    line-height: 1.6;
}

.popup label {
    display: block;
    margin: 0 0 0.35rem;
    color: #42584d;
    font-weight: 600;
}

.booking-field {
    margin-top: 0.85rem;
}

.popup input {
    width: 100%;
    min-height: 42px;
    margin: 0;
    padding: 0.5rem 0.65rem;
    border: 1px solid #cbd8cd;
    border-radius: 7px;
    color: #243b32;
    font: inherit;
}

.capacity-hint {
    margin: 0.3rem 0 0;
    color: #647568;
    font-size: 0.85rem;
}

.popup input:focus {
    border-color: #426b4c;
    outline: 3px solid rgb(66 107 76 / 16%);
}

.popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
}

@media (max-width: 1000px) {
    .time-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 650px) {
    .resource-top-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    .time-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.65rem;
    }

    .time-grid button {
        min-height: 175px;
        padding: 0.7rem;
    }
}

@media (max-width: 420px) {
    .time-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .resource-summary,
    .date-picker-section {
        padding: 1rem;
    }

    .popup-overlay {
        padding: 0.75rem;
    }

    .popup {
        padding: 1rem;
    }

    .popup-actions {
        flex-direction: column;
    }
}

@media (prefers-reduced-motion: reduce) {
    .time-grid li,
    .time-grid button,
    .book-button,
    .booking-button,
    .cancel-button {
        transition: none;
    }
}
</style>
