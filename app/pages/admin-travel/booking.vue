<script setup lang="ts">
type BookingType = 'TRANSPORTATION' | 'ACCOMMODATION'
type TravelStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'COMPLETED'

interface BookingRecord {
  id: number
  travel_request_id: number
  user_id: number
  applicant_name: string
  department: string
  destination: string
  booking_code: string
  transportation_mode: string
  operator: string | null
  departure_at: string | null
  arrival_at: string | null
  hotel_name: string | null
  room_type: string | null
  check_in_date: string | null
  check_out_date: string | null
  travel_status: TravelStatus
  travel_start_date: string
  travel_end_date: string
}

interface BookingsResponse {
  bookings: BookingRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

interface BookingColumn {
  label: string
  render: (booking: BookingRecord) => string
}

interface FetchErrorLike {
  status?: number
  statusCode?: number
  data?: { message?: string }
  message?: string
}

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')
const PAGE_SIZE = 10
const API_PAGE_SIZE = 100

const bookingTabs: { value: BookingType, label: string }[] = [
  { value: 'TRANSPORTATION', label: 'Transportasi' },
  { value: 'ACCOMMODATION', label: 'Akomodasi' }
]

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

const formatDate = (date: string | null | undefined) => {
  if (!date) return ''
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`)
    : new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsedDate)
}

const formatDateTime = (date: string | null | undefined) => {
  const formattedDate = formatDate(date)
  if (!formattedDate) return ''

  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date as string))

  return `${formattedDate}, ${time}`
}

const formatDateRange = (start: string | null | undefined, end: string | null | undefined) => {
  const from = formatDate(start)
  const to = formatDate(end)
  if (from && to) return `${from} – ${to}`
  return from || to
}

const detailColumns: Record<BookingType, BookingColumn[]> = {
  TRANSPORTATION: [
    { label: 'Moda', render: (booking) => [booking.transportation_mode, booking.operator].filter(Boolean).join(' — ') },
    { label: 'No. Booking', render: (booking) => booking.booking_code ?? '' },
    { label: 'Jadwal', render: (booking) => formatDateTime(booking.departure_at) }
  ],
  ACCOMMODATION: [
    { label: 'Hotel', render: (booking) => booking.hotel_name ?? '' },
    { label: 'Tipe Kamar', render: (booking) => booking.room_type ?? '' },
    { label: 'No. Booking', render: (booking) => booking.booking_code ?? '' },
    { label: 'Check-in / Check-out', render: (booking) => formatDateRange(booking.check_in_date, booking.check_out_date) }
  ]
}

const authToken = useCookie<string | null>('auth_token')
const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const bookings = ref<BookingRecord[]>([])
const isLoading = ref(true)
const loadError = ref('')
const activeTab = ref<BookingType>('TRANSPORTATION')
const currentPage = ref(1)

const activeColumns = computed(() => detailColumns[activeTab.value])
const columnCount = computed(() => activeColumns.value.length + 3)
const visibleBookings = computed(() => activeTab.value === 'TRANSPORTATION'
  ? bookings.value
  : bookings.value.filter((booking) =>
    Boolean(booking.hotel_name || booking.room_type || booking.check_in_date || booking.check_out_date)
  ))
const lastPage = computed(() => Math.max(1, Math.ceil(visibleBookings.value.length / PAGE_SIZE)))
const paginatedBookings = computed(() => visibleBookings.value.slice(
  (currentPage.value - 1) * PAGE_SIZE,
  currentPage.value * PAGE_SIZE
))

const visiblePages = computed(() => {
  const windowSize = 5
  const start = Math.max(1, Math.min(currentPage.value - 2, lastPage.value - windowSize + 1))
  const end = Math.min(lastPage.value, start + windowSize - 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const getStatusCode = (error: unknown) => {
  const fetchError = error as FetchErrorLike
  return fetchError.statusCode ?? fetchError.status
}

const loadBookings = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const firstPage = await $fetch<BookingsResponse>(`${API_BASE_URL}/bookings`, {
      query: { page: 1, limit: API_PAGE_SIZE },
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    const pageNumbers = Array.from(
      { length: Math.max(0, firstPage.pagination.total_pages - 1) },
      (_, index) => index + 2
    )
    const remainingPages = await Promise.all(pageNumbers.map((page) =>
      $fetch<BookingsResponse>(`${API_BASE_URL}/bookings`, {
        query: { page, limit: API_PAGE_SIZE },
        headers: { Authorization: `Bearer ${authToken.value}` }
      })
    ))
    bookings.value = [firstPage, ...remainingPages].flatMap((response) => response.bookings)
    currentPage.value = 1
  } catch (error) {
    const fetchError = error as FetchErrorLike
    const statusCode = getStatusCode(error)
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat daftar booking Admin Travel.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Masuklah menggunakan akun Admin Travel atau Super Admin.'
      : fetchError.data?.message || fetchError.message || 'Daftar booking belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
}

watch(activeTab, () => {
  currentPage.value = 1
})

onMounted(loadBookings)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Manajemen Pemesanan</h1>
      <p class="mt-1 text-xs text-[#718078]">Pantau status pemesanan transportasi dan akomodasi.</p>
    </div>

    <div class="flex flex-wrap gap-2" role="group" aria-label="Jenis booking">
      <button
        v-for="tab in bookingTabs"
        :key="tab.value"
        type="button"
        class="h-8 rounded-full border px-4 text-[10px] font-semibold transition-colors"
        :class="activeTab === tab.value
          ? 'border-[#173b30] bg-[#173b30] text-white'
          : 'border-[#dfe8dc] bg-white text-[#31513f] hover:bg-[#f8faf6]'"
        :aria-pressed="activeTab === tab.value"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadBookings">
        Coba Lagi
      </button>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="booking-list-heading">
      <h2 id="booking-list-heading" class="sr-only">Daftar Booking</h2>

      <div class="overflow-x-auto px-3.5 py-2">
        <table class="w-full min-w-[820px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th v-for="column in activeColumns" :key="column.label" scope="col" class="px-2.5 py-2.5">{{ column.label }}</th>
              <th scope="col" class="px-2.5 py-2.5">Status Perjalanan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat booking...</td>
            </tr>
            <tr v-else-if="loadError">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data booking belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="paginatedBookings.length === 0">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                {{ activeTab === 'ACCOMMODATION' && bookings.length > 0
                  ? 'Belum ada booking dengan detail akomodasi di data Backend_UKK.'
                  : 'Belum ada data booking di Backend_UKK. Seeder saat ini tidak membuat record booking.' }}
              </td>
            </tr>
            <tr v-for="booking in paginatedBookings" v-else :key="booking.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(booking.applicant_name) }}
                  </span>
                  <span class="font-medium">{{ booking.applicant_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ booking.destination }}</td>
              <td v-for="column in activeColumns" :key="column.label" class="whitespace-nowrap px-2.5 py-3">
                {{ column.render(booking) || '—' }}
              </td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[booking.travel_status]">
                  {{ statusLabels[booking.travel_status] }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="lastPage > 1" class="flex items-center justify-end gap-1.5 px-4 pb-3" aria-label="Halaman">
        <button
          type="button"
          :disabled="currentPage === 1 || isLoading"
          class="flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe8dc] text-[10px] text-[#31513f] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Halaman sebelumnya"
          @click="goToPage(currentPage - 1)"
        >
          ‹
        </button>
        <button
          v-for="page in visiblePages"
          :key="page"
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-medium transition-colors"
          :class="page === currentPage
            ? 'border-[#173b30] bg-[#173b30] text-white'
            : 'border-[#dfe8dc] text-[#31513f] hover:bg-[#f8faf6]'"
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          :disabled="currentPage === lastPage || isLoading"
          class="flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe8dc] text-[10px] text-[#31513f] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Halaman berikutnya"
          @click="goToPage(currentPage + 1)"
        >
          ›
        </button>
      </nav>
    </section>
  </section>
</template>