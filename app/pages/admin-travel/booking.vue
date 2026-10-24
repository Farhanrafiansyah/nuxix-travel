<script setup lang="ts">
type BookingType = 'TRANSPORTATION' | 'ACCOMMODATION'
type BookingStatus = 'WAITING' | 'PROCESSING' | 'COMPLETED'

type BookingRecord = {
  id: number
  employee_name: string
  destination: string
  booking_code: string | null
  status: BookingStatus
  mode?: string | null
  departure_at?: string | null
  hotel_name?: string | null
  room_type?: string | null
  check_in_date?: string | null
  check_out_date?: string | null
}

type PageMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type BookingColumn = {
  label: string
  render: (booking: BookingRecord) => string
}

const PAGE_SIZE = 10

const bookingTabs: { value: BookingType, label: string }[] = [
  { value: 'TRANSPORTATION', label: 'Transportasi' },
  { value: 'ACCOMMODATION', label: 'Akomodasi' }
]

const statusLabels: Record<BookingStatus, string> = {
  WAITING: 'Menunggu',
  PROCESSING: 'Diproses',
  COMPLETED: 'Selesai'
}

const statusStyles: Record<BookingStatus, string> = {
  WAITING: 'bg-[#fff0df] text-[#b75d11]',
  PROCESSING: 'bg-[#dcecec] text-[#2f6b6b]',
  COMPLETED: 'bg-[#e4f0e1] text-[#456d43]'
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return ''
  const parsedDate = new Date(date)
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
    { label: 'Moda', render: (booking) => booking.mode ?? '' },
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

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const bookings = ref<BookingRecord[]>([])
const meta = ref<PageMeta>({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
const isLoading = ref(false)
const loadError = ref('')
const activeTab = ref<BookingType>('TRANSPORTATION')
const currentPage = ref(1)

const activeColumns = computed(() => detailColumns[activeTab.value])
const columnCount = computed(() => activeColumns.value.length + 3)

const visiblePages = computed(() => {
  const windowSize = 5
  const lastPage = meta.value.last_page
  const start = Math.max(1, Math.min(currentPage.value - 2, lastPage - windowSize + 1))
  const end = Math.min(lastPage, start + windowSize - 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const goToPage = (page: number) => {
  if (page < 1 || page > meta.value.last_page || page === currentPage.value) return
  currentPage.value = page
}

watch(activeTab, () => {
  currentPage.value = 1
  bookings.value = []
})
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

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="booking-list-heading">
      <h2 id="booking-list-heading" class="sr-only">Daftar Booking</h2>

      <div class="overflow-x-auto px-3.5 py-2">
        <table class="w-full min-w-[820px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th v-for="column in activeColumns" :key="column.label" scope="col" class="px-2.5 py-2.5">{{ column.label }}</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat booking...</td>
            </tr>
            <tr v-else-if="bookings.length === 0">
              <td :colspan="columnCount" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                Backend_UKK belum menyediakan endpoint untuk membaca daftar booking {{ activeTab === 'TRANSPORTATION' ? 'transportasi' : 'akomodasi' }}. Tidak ada data yang ditampilkan.
              </td>
            </tr>
            <tr v-for="booking in bookings" v-else :key="booking.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(booking.employee_name) }}
                  </span>
                  <span class="font-medium">{{ booking.employee_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ booking.destination }}</td>
              <td v-for="column in activeColumns" :key="column.label" class="whitespace-nowrap px-2.5 py-3">
                {{ column.render(booking) || '—' }}
              </td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[booking.status]">
                  {{ statusLabels[booking.status] ?? booking.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="meta.last_page > 1" class="flex items-center justify-end gap-1.5 px-4 pb-3" aria-label="Halaman">
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
          :disabled="currentPage === meta.last_page || isLoading"
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