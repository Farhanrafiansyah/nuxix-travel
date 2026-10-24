<script setup lang="ts">
type PendingTravel = {
  id: number
  user_id: number
  destination: string
  start_date: string
  end_date: string
  estimated_cost: string | number | null
  purpose: string
  transportation_mode: string | null
  status: 'APPROVED'
}

type DashboardStats = {
  upcoming: number
  ongoing: number
  completed: number
}

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string }
  message?: string
}

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')
const QUEUE_LIMIT = 5

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

const apiRequest = async <T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    query?: Record<string, string | number | undefined>
    body?: Record<string, unknown>
  } = {}
): Promise<T> => {
  if (!authToken.value) {
    await navigateTo('/login')
    throw Object.assign(new Error('Sesi berakhir. Silakan masuk kembali.'), { statusCode: 401 })
  }

  try {
    return await $fetch<T>(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      query: options.query,
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

const stats = ref<DashboardStats | null>(null)
const queue = ref<PendingTravel[]>([])
const isLoading = ref(true)
const loadError = ref('')

const statCards = computed(() => [
  {
    label: 'Pengajuan Baru',
    value: '—',
    note: 'Statistik ini belum disediakan API',
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Menunggu Booking',
    value: queue.value.length,
    note: 'Perjalanan disetujui, menunggu fulfillment',
    accent: 'border-l-[#2f6b5e]'
  },
  {
    label: 'Perjalanan Berlangsung',
    value: stats.value?.ongoing ?? '—',
    note: 'Statistik lintas perusahaan',
    accent: 'border-l-[#e0a93a]'
  },
  {
    label: 'Perjalanan Selesai',
    value: stats.value?.completed ?? '—',
    note: 'Total; API belum memfilter per bulan',
    accent: 'border-l-[#3f6b4f]'
  }
])

const loadDashboard = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const [pendingResponse, statsResponse] = await Promise.all([
      apiRequest<{ pending: PendingTravel[] }>('/fulfillment/pending'),
      apiRequest<DashboardStats>('/dashboard/stats')
    ])

    stats.value = statsResponse
    queue.value = pendingResponse.pending.slice(0, QUEUE_LIMIT)
  } catch (error) {
    if (getStatusCode(error) === 401) return

    console.error('Gagal memuat dashboard Admin Travel.', error)
    queue.value = []
    stats.value = null
    loadError.value = describeError(error, 'Dashboard Admin Travel belum dapat dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Dashboard Admin Travel</h1>
      <p class="mt-1 text-xs text-[#718078]">Kelola pemenuhan kebutuhan perjalanan dinas karyawan.</p>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadDashboard">
        Coba Lagi
      </button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <section
        v-for="card in statCards"
        :key="card.label"
        class="rounded-xl border border-l-[3px] border-[#dfe8dc] bg-white px-4 py-3"
        :class="card.accent"
        :aria-label="card.label"
      >
        <p class="text-[10px] font-medium text-[#718078]">{{ card.label }}</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ card.value }}</p>
        <p class="mt-1 text-[10px] text-[#7b8980]">{{ card.note }}</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="travel-queue-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-4">
        <h2 id="travel-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Antrean Perjalanan</h2>
        <NuxtLink to="/admin-travel/antrean" class="text-[10px] font-semibold text-[#9a5a12] hover:underline">
          Lihat semua
        </NuxtLink>
      </div>

      <div class="overflow-x-auto px-3.5 pb-2">
        <table class="w-full min-w-[860px] border-collapse text-left text-[10px]">
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
            <tr v-else-if="queue.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada perjalanan dalam antrean.</td>
            </tr>
            <tr v-for="trip in queue" v-else :key="trip.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    #{{ trip.user_id }}
                  </span>
                  <span class="font-medium">ID Karyawan {{ trip.user_id }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ trip.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(trip.start_date) }}</td>
              <td class="px-2.5 py-3">{{ trip.transportation_mode || '—' }}</td>
              <td class="px-2.5 py-3">—</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full bg-[#e1efdc] px-2.5 py-1 text-[9px] font-semibold text-[#3f6b3a]">
                  Disetujui
                </span>
              </td>
              <td class="px-2.5 py-3">
                <NuxtLink
                  :to="{ path: '/admin-travel/booking', query: { travel_id: trip.id } }"
                  class="inline-flex rounded-md border border-[#dfe8dc] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#173b30] transition-colors hover:bg-[#f8faf6]"
                >
                  Kelola
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>