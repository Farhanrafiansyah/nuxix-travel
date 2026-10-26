<script setup lang="ts">
type TripStatus = 'APPROVED' | 'FULFILLED' | 'COMPLETED'
type StageFilter = '' | 'WAITING_BOOKING' | 'PROCESSING' | 'ONGOING' | 'COMPLETED'

interface TravelQueueRecord {
  id: number
  user_id: number
  applicant_name: string
  destination: string
  start_date: string
  end_date: string
  purpose: string
  transportation_mode: string | null
  status: TripStatus
  created_at: string
  fulfillments: Array<{
    transport_details: string
    accommodation_details: string
    created_at: string
  }>
}

interface QueueResponse {
  requests: TravelQueueRecord[]
  pagination: {
    total_pages: number
  }
}

interface FetchErrorLike {
  status?: number
  statusCode?: number
  data?: { message?: string }
  message?: string
}

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')
const PAGE_SIZE = 7
const API_PAGE_SIZE = 100
const apiStatuses: TripStatus[] = ['APPROVED', 'FULFILLED', 'COMPLETED']

const statusLabels: Record<TripStatus, string> = {
  APPROVED: 'Disetujui',
  FULFILLED: 'Dipenuhi',
  COMPLETED: 'Selesai'
}

const statusStyles: Record<TripStatus, string> = {
  APPROVED: 'bg-[#e1efdc] text-[#3f6b3a]',
  FULFILLED: 'bg-[#dcecec] text-[#2f6b6b]',
  COMPLETED: 'bg-[#e4f0e1] text-[#456d43]'
}

const stageTabs: { value: StageFilter, label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'WAITING_BOOKING', label: 'Menunggu Booking' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'ONGOING', label: 'Berlangsung' },
  { value: 'COMPLETED', label: 'Selesai' }
]

const authToken = useCookie<string | null>('auth_token')

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

const apiRequest = async <T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> => {
  if (!authToken.value) {
    await navigateTo('/login')
    throw Object.assign(new Error('Sesi berakhir. Silakan masuk kembali.'), { statusCode: 401 })
  }

  try {
    return await $fetch<T>(`${API_BASE_URL}${path}`, {
      query,
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

const formatDate = (date: string | undefined) => {
  if (!date) return '—'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsedDate)
}

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const trips = ref<TravelQueueRecord[]>([])
const isLoading = ref(true)
const loadError = ref('')
const searchQuery = ref('')
const selectedStage = ref<StageFilter>('')
const currentPage = ref(1)
let latestRequestId = 0

const activeStatus = computed<TripStatus | undefined>(() => {
  if (selectedStage.value === 'WAITING_BOOKING') return 'APPROVED'
  if (selectedStage.value === 'PROCESSING' || selectedStage.value === 'ONGOING') return 'FULFILLED'
  if (selectedStage.value === 'COMPLETED') return 'COMPLETED'
  return undefined
})

const filteredTrips = computed(() => {
  return activeStatus.value
    ? trips.value.filter((trip) => trip.status === activeStatus.value)
    : trips.value
})

const lastPage = computed(() => Math.max(1, Math.ceil(filteredTrips.value.length / PAGE_SIZE)))
const paginatedTrips = computed(() => filteredTrips.value.slice(
  (currentPage.value - 1) * PAGE_SIZE,
  currentPage.value * PAGE_SIZE
))

const visiblePages = computed(() => {
  const windowSize = 5
  const start = Math.max(1, Math.min(currentPage.value - 2, lastPage.value - windowSize + 1))
  const end = Math.min(lastPage.value, start + windowSize - 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const loadTrips = async () => {
  const requestId = ++latestRequestId
  isLoading.value = true
  loadError.value = ''

  try {
    const statuses = activeStatus.value ? [activeStatus.value] : apiStatuses
    const queueGroups = await Promise.all(statuses.map(async (status) => {
      const firstPage = await apiRequest<QueueResponse>('/fulfillment/queue', {
        status,
        search: searchQuery.value.trim() || undefined,
        page: 1,
        limit: API_PAGE_SIZE
      })
      const pageNumbers = Array.from(
        { length: Math.max(0, firstPage.pagination.total_pages - 1) },
        (_, index) => index + 2
      )
      const rest = await Promise.all(pageNumbers.map((page) =>
        apiRequest<QueueResponse>('/fulfillment/queue', {
          status,
          search: searchQuery.value.trim() || undefined,
          page,
          limit: API_PAGE_SIZE
        })
      ))
      return [firstPage, ...rest].flatMap((response) => response.requests)
    }))
    if (requestId !== latestRequestId) return
    trips.value = queueGroups.flat()
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    currentPage.value = 1
  } catch (error) {
    if (requestId !== latestRequestId || getStatusCode(error) === 401) return

    console.error('Gagal memuat antrean perjalanan.', error)
    trips.value = []
    loadError.value = describeError(error, 'Antrean perjalanan belum dapat dimuat dari server.')
  } finally {
    if (requestId === latestRequestId) isLoading.value = false
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > lastPage.value || page === currentPage.value) return
  currentPage.value = page
}

watch([searchQuery, selectedStage], () => {
  currentPage.value = 1
  loadTrips()
})

onMounted(loadTrips)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Antrean Perjalanan</h1>
      <p class="mt-1 text-xs text-[#718078]">Pantau perjalanan karyawan berdasarkan status yang tersedia di Backend_UKK.</p>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadTrips">
        Coba Lagi
      </button>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="travel-queue-list-heading">
      <h2 id="travel-queue-list-heading" class="sr-only">Daftar Antrean Perjalanan</h2>

      <div class="flex flex-wrap gap-2 px-4 pb-1 pt-4">
        <label class="min-w-52 flex-1">
          <span class="sr-only">Cari ID karyawan atau tujuan</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari ID karyawan atau tujuan..."
            class="h-9 w-full rounded-md border border-[#dfe8dc] bg-[#fafcf8] px-3 text-[11px] text-[#263b31] placeholder:text-[#8b968e] focus:border-[#9ab397] focus:outline-none"
          >
        </label>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filter tahap perjalanan">
          <button
            v-for="tab in stageTabs"
            :key="tab.value"
            type="button"
            class="h-9 rounded-md border px-4 text-[11px] text-[#263b31] transition-colors"
            :class="selectedStage === tab.value
              ? 'border-[#9ab397] bg-[#e4f0e1] font-semibold'
              : 'border-[#dfe8dc] bg-[#fafcf8] hover:bg-[#f1f5ee]'"
            :aria-pressed="selectedStage === tab.value"
            @click="selectedStage = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[900px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Tanggal</th>
              <th scope="col" class="px-2.5 py-2.5">Transportasi</th>
              <th scope="col" class="px-2.5 py-2.5">Akomodasi</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat antrean perjalanan...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="paginatedTrips.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                Tidak ada perjalanan yang cocok. Backend saat ini menyediakan status disetujui, dipenuhi, dan selesai; status menunggu atasan/ditolak belum tersedia di endpoint antrean Admin Travel.
              </td>
            </tr>
            <tr v-for="trip in paginatedTrips" v-else :key="trip.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(trip.applicant_name) }}
                  </span>
                  <span class="font-medium">{{ trip.applicant_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ trip.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(trip.start_date) }}</td>
              <td class="px-2.5 py-3">{{ trip.fulfillments[0]?.transport_details || trip.transportation_mode || '—' }}</td>
              <td class="px-2.5 py-3">{{ trip.fulfillments[0]?.accommodation_details || '—' }}</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[trip.status]">
                  {{ statusLabels[trip.status] ?? trip.status }}
                </span>
              </td>
              <td class="px-2.5 py-3">
                <NuxtLink
                  :to="{ path: '/admin-travel/kelola-perjalanan', query: { id: trip.id } }"
                  class="inline-flex rounded-md border border-[#dfe8dc] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#173b30] transition-colors hover:bg-[#f8faf6]"
                >
                  Kelola
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="lastPage > 1" class="flex items-center justify-end gap-1.5 px-4 py-3" aria-label="Halaman">
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
      <div v-else class="pb-3" />
    </section>
  </section>
</template>