<script setup lang="ts">
type TravelStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'COMPLETED'
type TransportationMode = 'Pesawat' | 'Kereta Api' | 'Travel' | 'Mobil Kantor'

interface TravelRequest {
  id: number
  user_id: number
  destination: string
  start_date: string
  end_date: string
  purpose: string
  transportation_mode: TransportationMode | null
  status: TravelStatus
}

interface FulfillmentRecord {
  id: number
  transport_details: string
  accommodation_details: string
  admin_name: string
  created_at: string
}

interface FulfillmentResponse {
  request: {
    id: number
    applicant_name: string
    destination: string
    status: TravelStatus
  }
  fulfillments: FulfillmentRecord[]
}

interface BookingRecord {
  id: number
  travel_request_id: number
  user_id: number
  booking_code: string
  transportation_mode: TransportationMode
  operator: string | null
  departure_at: string | null
  arrival_at: string | null
  hotel_name: string | null
  room_type: string | null
  check_in_date: string | null
  check_out_date: string | null
  travel_status: TravelStatus
}

interface FetchErrorLike {
  status?: number
  statusCode?: number
  data?: {
    message?: string
    errors?: Record<string, string[]>
    details?: {
      fieldErrors?: Record<string, string[]>
      formErrors?: string[]
    }
  }
  message?: string
}

interface BookingResponse {
  booking: BookingRecord
}

type BookingForm = {
  booking_code: string
  transportation_mode: TransportationMode | ''
  operator: string
  departure_at: string
  arrival_at: string
  hotel_name: string
  room_type: string
  check_in_date: string
  check_out_date: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')
const BACK_PATH = '/admin-travel/antrean'
const BOOKING_PATH = '/admin-travel/booking'
const transportationModes: TransportationMode[] = ['Pesawat', 'Kereta Api', 'Travel', 'Mobil Kantor']

const authToken = useCookie<string | null>('auth_token')
const tripId = computed(() => Number(route.query.id))
const isValidId = computed(() => Number.isInteger(tripId.value) && tripId.value > 0)

const statusLabels: Record<TravelStatus, string> = {
  PENDING: 'Menunggu Atasan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  FULFILLED: 'Dipenuhi',
  COMPLETED: 'Selesai'
}

const statusStyles: Record<TravelStatus, string> = {
  PENDING: 'bg-[#fff0df] text-[#b75d11]',
  APPROVED: 'bg-[#e1efdc] text-[#3f6b3a]',
  REJECTED: 'bg-[#fbe3e1] text-[#a8403a]',
  FULFILLED: 'bg-[#dcecec] text-[#2f6b6b]',
  COMPLETED: 'bg-[#e4f0e1] text-[#456d43]'
}

const getStatusCode = (error: unknown) => {
  const fetchError = error as FetchErrorLike
  return fetchError.statusCode ?? fetchError.status
}

const describeError = (error: unknown, fallback: string) => {
  const fetchError = error as FetchErrorLike
  if (getStatusCode(error) === 403) {
    return 'Akses ditolak. Masuklah menggunakan akun Admin Travel atau Super Admin.'
  }
  return fetchError.data?.message || fetchError.message || fallback
}

const getErrorDetails = (error: unknown) => {
  const data = (error as FetchErrorLike).data
  return [
    ...Object.values(data?.errors ?? {}).flat(),
    ...Object.values(data?.details?.fieldErrors ?? {}).flat(),
    ...(data?.details?.formErrors ?? [])
  ]
}

const apiRequest = async <T>(
  path: string,
  options: { method?: 'GET' | 'POST', body?: Record<string, unknown> } = {}
): Promise<T> => {
  if (!authToken.value) {
    await navigateTo('/login')
    throw Object.assign(new Error('Sesi berakhir. Silakan masuk kembali.'), { statusCode: 401 })
  }

  try {
    return await $fetch<T>(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: {
        Authorization: `Bearer ${authToken.value}`,
        Accept: 'application/json'
      }
    })
  } catch (error) {
    if (getStatusCode(error) === 401) {
      authToken.value = null
      await navigateTo('/login')
    }
    throw error
  }
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return ''
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsed)
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(parsed)
}

const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

const toIsoDateTime = (value: string) => value ? new Date(value).toISOString() : null

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const trip = ref<TravelRequest | null>(null)
const applicantName = ref('')
const fulfillments = ref<FulfillmentRecord[]>([])
const booking = ref<BookingRecord | null>(null)
const isLoading = ref(true)
const notFound = ref(false)
const loadError = ref('')
const notice = ref('')
const activeModal = ref(false)
const isSubmitting = ref(false)
const actionError = ref('')
const actionErrorDetails = ref<string[]>([])

const bookingForm = reactive<BookingForm>({
  booking_code: '',
  transportation_mode: '',
  operator: '',
  departure_at: '',
  arrival_at: '',
  hotel_name: '',
  room_type: '',
  check_in_date: '',
  check_out_date: ''
})

const canCreateBooking = computed(() =>
  !booking.value && (trip.value?.status === 'APPROVED' || trip.value?.status === 'FULFILLED')
)

const detailSections = computed(() => {
  const current = trip.value
  if (!current) return []

  const latestFulfillment = fulfillments.value[0]
  const currentBooking = booking.value

  return [
    {
      title: 'Perjalanan',
      fields: [
        { label: 'Karyawan', value: applicantName.value },
        { label: 'Tujuan', value: current.destination },
        { label: 'Tanggal Berangkat', value: formatDate(current.start_date) },
        { label: 'Tanggal Kembali', value: formatDate(current.end_date) },
        { label: 'Keperluan', value: current.purpose },
        { label: 'Moda yang Diajukan', value: current.transportation_mode ?? '' }
      ]
    },
    {
      title: 'Pemenuhan Perjalanan',
      fields: [
        { label: 'Transportasi', value: latestFulfillment?.transport_details ?? '' },
        { label: 'Akomodasi', value: latestFulfillment?.accommodation_details ?? '' },
        { label: 'Diproses oleh', value: latestFulfillment?.admin_name ?? '' },
        { label: 'Tanggal pemenuhan', value: formatDateTime(latestFulfillment?.created_at) }
      ]
    },
    {
      title: 'Detail Booking',
      fields: [
        { label: 'Nomor Booking', value: currentBooking?.booking_code ?? '' },
        { label: 'Moda', value: currentBooking?.transportation_mode ?? '' },
        { label: 'Operator', value: currentBooking?.operator ?? '' },
        { label: 'Berangkat', value: formatDateTime(currentBooking?.departure_at) },
        { label: 'Tiba', value: formatDateTime(currentBooking?.arrival_at) },
        { label: 'Hotel', value: currentBooking?.hotel_name ?? '' },
        { label: 'Tipe Kamar', value: currentBooking?.room_type ?? '' },
        {
          label: 'Check-in / Check-out',
          value: [formatDate(currentBooking?.check_in_date), formatDate(currentBooking?.check_out_date)]
            .filter(Boolean)
            .join(' — ')
        }
      ]
    }
  ]
})

const loadTrip = async () => {
  if (!isValidId.value) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  notFound.value = false
  loadError.value = ''

  try {
    const [travel, fulfillment] = await Promise.all([
      apiRequest<TravelRequest>(`/travels/${tripId.value}`),
      apiRequest<FulfillmentResponse>(`/fulfillment/${tripId.value}`)
    ])

    let savedBooking: BookingRecord | null = null
    try {
      const result = await apiRequest<BookingResponse>(`/bookings/${tripId.value}`)
      savedBooking = result.booking
    } catch (error) {
      if (getStatusCode(error) !== 404) throw error
    }

    trip.value = travel
    applicantName.value = fulfillment.request.applicant_name
    fulfillments.value = fulfillment.fulfillments
    booking.value = savedBooking
  } catch (error) {
    if (getStatusCode(error) === 401) return

    trip.value = null
    if (getStatusCode(error) === 404) {
      notFound.value = true
      return
    }

    console.error('Gagal memuat detail perjalanan.', error)
    loadError.value = describeError(error, 'Detail perjalanan belum dapat dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

const openBookingModal = () => {
  if (!trip.value || !canCreateBooking.value) return

  Object.assign(bookingForm, {
    booking_code: '',
    transportation_mode: trip.value.transportation_mode ?? '',
    operator: '',
    departure_at: '',
    arrival_at: '',
    hotel_name: '',
    room_type: '',
    check_in_date: '',
    check_out_date: ''
  })
  actionError.value = ''
  actionErrorDetails.value = []
  activeModal.value = true
}

const closeModal = () => {
  activeModal.value = false
  actionError.value = ''
  actionErrorDetails.value = []
}

const submitBooking = async () => {
  if (!trip.value || !bookingForm.transportation_mode) return

  isSubmitting.value = true
  actionError.value = ''
  actionErrorDetails.value = []

  try {
    await apiRequest(`/bookings/${trip.value.id}`, {
      method: 'POST',
      body: {
        booking_code: bookingForm.booking_code.trim(),
        transportation_mode: bookingForm.transportation_mode,
        operator: bookingForm.operator.trim() || null,
        departure_at: toIsoDateTime(bookingForm.departure_at),
        arrival_at: toIsoDateTime(bookingForm.arrival_at),
        hotel_name: bookingForm.hotel_name.trim() || null,
        room_type: bookingForm.room_type.trim() || null,
        check_in_date: bookingForm.check_in_date || null,
        check_out_date: bookingForm.check_out_date || null
      }
    })

    notice.value = 'Booking berhasil dicatat.'
    closeModal()
    await loadTrip()
  } catch (error) {
    if (getStatusCode(error) === 401) return
    actionError.value = describeError(error, 'Booking belum dapat disimpan.')
    actionErrorDetails.value = getErrorDetails(error)
  } finally {
    isSubmitting.value = false
  }
}

watch(tripId, () => {
  notice.value = ''
  loadTrip()
})

onMounted(loadTrip)
</script>

<template>
  <section class="space-y-5 pb-8">
    <template v-if="!isValidId">
      <div class="rounded-xl border border-[#dfe8dc] bg-white px-6 py-14 text-center">
        <h1 class="font-serif text-lg font-bold text-[#173b30]">ID perjalanan tidak valid</h1>
        <p class="mt-1 text-xs text-[#718078]">Buka detail ini dari antrean perjalanan atau daftar booking.</p>
        <NuxtLink :to="BACK_PATH" class="mt-4 inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6]">
          Kembali ke Antrean
        </NuxtLink>
      </div>
    </template>

    <template v-else-if="isLoading">
      <div class="rounded-xl border border-[#dfe8dc] bg-white px-6 py-14 text-center text-xs text-[#7b8980]" role="status">
        Memuat detail perjalanan...
      </div>
    </template>

    <template v-else-if="notFound">
      <div class="rounded-xl border border-[#dfe8dc] bg-white px-6 py-14 text-center">
        <h1 class="font-serif text-lg font-bold text-[#173b30]">Perjalanan tidak ditemukan</h1>
        <p class="mt-1 text-xs text-[#718078]">Data perjalanan {{ `TRV-${String(tripId).padStart(4, '0')}` }} tidak tersedia atau sudah dihapus.</p>
        <NuxtLink :to="BACK_PATH" class="mt-4 inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6]">
          Kembali ke Antrean
        </NuxtLink>
      </div>
    </template>

    <template v-else-if="loadError">
      <div class="rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center" role="alert">
        <p class="text-xs text-rose-700">{{ loadError }}</p>
        <div class="mt-4 flex justify-center gap-2">
          <button type="button" class="h-9 rounded-md border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50" @click="loadTrip">
            Coba Lagi
          </button>
          <NuxtLink :to="BACK_PATH" class="inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6]">
            Kembali
          </NuxtLink>
        </div>
      </div>
    </template>

    <template v-else-if="trip">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[11px] text-[#718078]">
            <NuxtLink :to="BACK_PATH" class="hover:text-[#173b30] hover:underline">Antrean Perjalanan</NuxtLink>
            <span aria-hidden="true"> / </span>
            <span>TRV-{{ String(trip.id).padStart(4, '0') }}</span>
          </p>
          <h1 class="mt-1 font-serif text-2xl font-bold leading-tight text-[#173b30]">Kelola Perjalanan — {{ trip.destination }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-semibold" :class="statusStyles[trip.status]">
            {{ statusLabels[trip.status] }}
          </span>
          <NuxtLink :to="BOOKING_PATH" class="inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-4 text-xs font-semibold text-[#173b30] transition-colors hover:bg-[#f8faf6]">
            Daftar Booking
          </NuxtLink>
        </div>
      </div>

      <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
        <p>{{ notice }}</p>
        <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" aria-label="Tutup pemberitahuan" @click="notice = ''">×</button>
      </div>

      <div class="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <div class="space-y-3">
          <section
            v-for="section in detailSections"
            :key="section.title"
            class="rounded-xl border border-[#dfe8dc] bg-white px-5 py-4"
          >
            <h2 class="font-serif text-sm font-bold text-[#173b30]">{{ section.title }}</h2>
            <dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div v-for="field in section.fields" :key="field.label">
                <dt class="text-[9px] font-medium text-[#718078]">{{ field.label }}</dt>
                <dd class="mt-0.5 break-words text-[11px] font-medium text-[#263b31]">{{ field.value || '—' }}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside class="rounded-xl border border-[#dfe8dc] bg-white px-5 py-4" aria-labelledby="trip-actions-heading">
          <h2 id="trip-actions-heading" class="font-serif text-sm font-bold text-[#173b30]">Booking</h2>
          <p class="mt-2 text-[10px] leading-relaxed text-[#718078]">
            {{ booking
              ? 'Booking sudah tercatat untuk perjalanan ini.'
              : 'Catat nomor booking dan detail transportasi atau akomodasi untuk perjalanan ini.' }}
          </p>
          <button
            v-if="canCreateBooking"
            type="button"
            class="mt-3 h-9 w-full rounded-md bg-[#f0ad4e] text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443]"
            @click="openBookingModal"
          >
            Catat Booking
          </button>
          <p v-else-if="!booking" class="mt-3 rounded-md bg-[#f8faf6] px-3 py-2 text-[10px] text-[#718078]">
            Booking hanya dapat dibuat untuk perjalanan berstatus Disetujui atau Dipenuhi.
          </p>

          <div class="mt-4 border-t border-dashed border-[#dfe8dc] pt-3">
            <p class="text-[9px] font-medium text-[#718078]">Status Perjalanan</p>
            <span class="mt-1.5 inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[trip.status]">
              {{ statusLabels[trip.status] }}
            </span>
          </div>
        </aside>
      </div>
    </template>

    <template v-else>
      <div class="rounded-xl border border-[#dfe8dc] bg-white px-6 py-14 text-center text-xs text-[#7b8980]">
        Data perjalanan belum tersedia.
      </div>
    </template>

    <div
      v-if="activeModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6"
      role="presentation"
      @click.self="!isSubmitting && closeModal()"
    >
      <form
        class="max-h-full w-full max-w-xl overflow-y-auto rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-create-heading"
        @submit.prevent="submitBooking"
      >
        <h2 id="booking-create-heading" class="font-serif text-base font-bold text-[#173b30]">Catat Booking Perjalanan</h2>
        <p class="mt-1 text-[10px] text-[#718078]">Data akan disimpan untuk perjalanan TRV-{{ String(trip?.id ?? 0).padStart(4, '0') }}.</p>

        <div v-if="actionError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700" role="alert">
          <p>{{ actionError }}</p>
          <ul v-if="actionErrorDetails.length" class="mt-1 list-disc pl-4">
            <li v-for="detail in actionErrorDetails" :key="detail">{{ detail }}</li>
          </ul>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nomor Booking *</span>
            <input v-model="bookingForm.booking_code" required maxlength="100" autocomplete="off" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Moda Transportasi *</span>
            <select v-model="bookingForm.transportation_mode" required class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
              <option value="" disabled>Pilih moda</option>
              <option v-for="mode in transportationModes" :key="mode" :value="mode">{{ mode }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Operator</span>
            <input v-model="bookingForm.operator" maxlength="255" autocomplete="off" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nama Hotel</span>
            <input v-model="bookingForm.hotel_name" maxlength="255" autocomplete="off" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Waktu Berangkat</span>
            <input v-model="bookingForm.departure_at" type="datetime-local" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Waktu Tiba</span>
            <input v-model="bookingForm.arrival_at" type="datetime-local" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Tipe Kamar</span>
            <input v-model="bookingForm.room_type" maxlength="255" autocomplete="off" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Check-in</span>
            <input v-model="bookingForm.check_in_date" type="date" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Check-out</span>
            <input v-model="bookingForm.check_out_date" type="date" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60" @click="closeModal">Batal</button>
          <button type="submit" :disabled="isSubmitting" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443] disabled:cursor-not-allowed disabled:opacity-60">
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan Booking' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
