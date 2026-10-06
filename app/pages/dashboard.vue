<script setup lang="ts">
type TravelRequest = {
  id: number
  destination: string
  start_date: string
  end_date: string
  purpose: string
  document_url: string | null
  status: string
  created_at?: string
}

const summaryCards = [
  { key: 'active', label: 'Perjalanan Aktif', icon: 'plane', tone: 'bg-blue-50 text-blue-600' },
  { key: 'pending', label: 'Pengajuan Menunggu', icon: 'clock', tone: 'bg-amber-50 text-amber-600' },
  { key: 'advance', label: 'Uang Muka Berjalan', icon: 'wallet', tone: 'bg-emerald-50 text-emerald-600' },
  { key: 'returned', label: 'Sisa Dikembalikan', icon: 'return', tone: 'bg-rose-50 text-rose-600' }
]

const emptyTableColumns = ['Tujuan', 'Tanggal', 'Keperluan', 'Transportasi', 'Status', 'Aksi']
const actionItems = ref<{ id: string; title: string; description: string; actionLabel: string }[]>([])
const requests = ref<TravelRequest[]>([])
const isLoading = ref(true)
const loadError = ref('')
const authToken = useCookie<string | null>('auth_token')

const sortedRequests = computed(() => [...requests.value].sort((first, second) => {
  return new Date(second.created_at || second.start_date).getTime() - new Date(first.created_at || first.start_date).getTime()
}))

const recentRequests = computed(() => sortedRequests.value.slice(0, 3))
const upcomingRequests = computed(() => requests.value
  .filter((request) => !['REJECTED', 'COMPLETED'].includes(request.status)
    && new Date(request.start_date).getTime() >= new Date(new Date().toDateString()).getTime())
  .sort((first, second) => new Date(first.start_date).getTime() - new Date(second.start_date).getTime()))

const summaryValues = computed(() => ({
  active: requests.value.filter((request) => ['APPROVED', 'FULFILLED'].includes(request.status)).length,
  pending: requests.value.filter((request) => request.status === 'PENDING').length,
  advance: '—',
  returned: '—'
}))

const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(date))

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const formatPart = (date: Date) => new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short'
  }).format(date)

  return `${formatPart(start)} – ${formatDate(endDate)}`
}

const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  FULFILLED: 'Berjalan',
  COMPLETED: 'Selesai'
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  APPROVED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-rose-50 text-rose-800',
  FULFILLED: 'bg-blue-50 text-blue-800',
  COMPLETED: 'bg-slate-100 text-slate-700'
}

onMounted(async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  try {
    const response = await $fetch<{ requests: TravelRequest[] }>('http://localhost:8000/api/travels/dashboard', {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    requests.value = response.requests
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    loadError.value = fetchError.data?.message || 'Data perjalanan belum dapat dimuat.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="dashboard-page space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium text-[#777b87]">Ringkasan aktivitas perjalanan dinas dan pengajuan kamu</p>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Dashboard Karyawan</h1>
      </div>
      <button type="button" class="inline-flex h-10 items-center gap-2 rounded-md bg-[#f6a623] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#e99514]">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajukan Perjalanan
      </button>
    </div>

    <section class="rounded-lg border border-[#eadfce] bg-white p-5 shadow-[0_3px_12px_rgba(28,28,45,0.04)]" aria-labelledby="action-heading">
      <h2 id="action-heading" class="flex items-center gap-2 text-sm font-bold text-[#20233e]">
        <span class="h-2 w-2 rounded-full bg-[#f5a623]" aria-hidden="true" />
        Perlu Tindakan Kamu
      </h2>
      <div v-if="actionItems.length" class="mt-4 space-y-2">
        <article v-for="item in actionItems" :key="item.id" class="flex items-center justify-between gap-4 rounded-md border border-[#e8e4de] bg-[#fdfcf9] px-4 py-3">
          <div class="min-w-0">
            <h3 class="truncate text-xs font-semibold text-[#20233e]">{{ item.title }}</h3>
            <p class="mt-1 text-[11px] text-[#858893]">{{ item.description }}</p>
          </div>
          <button type="button" class="shrink-0 rounded-md border border-[#dedbd5] bg-white px-3 py-2 text-[10px] font-medium text-[#20233e] hover:bg-[#f7f5f0]">
            {{ item.actionLabel }}
          </button>
        </article>
      </div>
      <div v-else class="mt-4 flex min-h-16 items-center justify-center rounded-md border border-dashed border-[#e8e4de] bg-[#fdfcf9] px-4 text-center">
        <p class="text-xs text-[#858893]">Belum ada tindakan yang perlu diproses</p>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan perjalanan">
      <article v-for="card in summaryCards" :key="card.label" class="flex min-h-[112px] items-start justify-between rounded-lg border border-[#e9e8e5] bg-white px-4 py-4 shadow-[0_3px_12px_rgba(28,28,45,0.04)]">
        <div>
          <h2 class="text-xs text-[#777b87]">{{ card.label }}</h2>
          <p class="mt-3 text-2xl font-bold leading-none text-[#20233e]">{{ summaryValues[card.key as keyof typeof summaryValues] }}</p>
          <p class="mt-2 text-[11px] text-[#8a8d98]">
            {{ card.key === 'advance' || card.key === 'returned' ? 'Belum tersedia dari backend' : 'Dari perjalanan kamu' }}
          </p>
        </div>
        <span class="flex h-8 w-8 items-center justify-center rounded-md" :class="card.tone" aria-hidden="true">
          <svg v-if="card.icon === 'plane'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" /></svg>
          <svg v-else-if="card.icon === 'clock'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <svg v-else-if="card.icon === 'wallet'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18m-5 5h2" /></svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
        </span>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.55fr_0.9fr]">
      <article class="min-h-[230px] rounded-lg border border-[#e8e7e3] bg-white p-4 shadow-[0_3px_12px_rgba(28,28,45,0.04)]">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-[#20233e]">Pengajuan Perjalanan Terbaru</h2>
          <button type="button" class="text-[11px] font-semibold text-[#1d46bb] hover:underline">Lihat semua</button>
        </div>
        <div v-if="isLoading" class="mt-4 flex min-h-[165px] items-center justify-center border-y border-[#efeeeb]">
          <p class="text-xs text-[#858893]">Memuat pengajuan...</p>
        </div>
        <div v-else-if="recentRequests.length" class="mt-4 divide-y divide-[#efeeeb]">
          <div v-for="request in recentRequests" :key="request.id" class="grid grid-cols-[74px_1fr_auto] items-center gap-3 py-3 text-[11px]">
            <span class="font-semibold text-[#1d46bb]">TRV-{{ String(request.id).padStart(4, '0') }}</span>
            <div class="min-w-0">
              <p class="truncate font-semibold text-[#292b3c]">{{ request.destination }}</p>
              <p class="truncate text-[10px] text-[#858893]">{{ request.purpose }}</p>
            </div>
            <div class="text-right">
              <p class="whitespace-nowrap text-[10px] text-[#727783]">{{ formatDateRange(request.start_date, request.end_date) }}</p>
              <span class="mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium" :class="statusStyles[request.status] || 'bg-slate-100 text-slate-700'">
                {{ statusLabels[request.status] || request.status }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="mt-4 flex min-h-[165px] items-center justify-center border-y border-[#efeeeb]">
          <p class="text-xs text-[#858893]">{{ loadError || 'Belum ada pengajuan perjalanan' }}</p>
        </div>
      </article>

      <article class="flex min-h-[230px] flex-col rounded-lg border border-[#e8e7e3] bg-white p-4 shadow-[0_3px_12px_rgba(28,28,45,0.04)]">
        <h2 class="text-sm font-bold text-[#20233e]">Kuota Dinas 2026</h2>
        <div class="flex flex-1 items-center justify-center py-3">
          <div class="flex h-[92px] w-[92px] items-center justify-center rounded-full border-[8px] border-[#e7e8eb]">
            <div class="text-center">
              <p class="text-sm font-bold leading-none text-[#20233e]">— / —</p>
              <p class="mt-1 text-[9px] text-[#8a8d98]">Terpakai</p>
            </div>
          </div>
        </div>
        <p class="text-center text-[11px] text-[#858893]">Informasi kuota akan tampil di sini</p>
      </article>
    </section>

    <article class="overflow-hidden rounded-lg border border-[#e8e7e3] bg-white shadow-[0_3px_12px_rgba(28,28,45,0.04)]">
      <div class="flex items-center justify-between px-3 py-3">
        <h2 class="text-sm font-bold text-[#20233e]">Perjalanan Mendatang Detail</h2>
        <button type="button" class="text-[11px] font-semibold text-[#1d46bb] hover:underline">Lihat semua</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr class="border-y border-[#efeeeb] bg-[#fcfbf9]">
              <th v-for="column in emptyTableColumns" :key="column" class="px-4 py-3 text-[10px] font-semibold text-[#777b87]">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="6" class="h-20 px-4 text-center text-xs text-[#858893]">Memuat perjalanan...</td>
            </tr>
            <tr v-else-if="upcomingRequests.length" v-for="request in upcomingRequests" :key="request.id" class="border-b border-[#efeeeb] last:border-0">
              <td class="px-4 py-3 text-xs font-medium text-[#20233e]">{{ request.destination }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-[11px] text-[#727783]">{{ formatDateRange(request.start_date, request.end_date) }}</td>
              <td class="max-w-[240px] truncate px-4 py-3 text-[11px] text-[#727783]">{{ request.purpose }}</td>
              <td class="px-4 py-3 text-[11px] text-[#92939b]">—</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium" :class="statusStyles[request.status] || 'bg-slate-100 text-slate-700'">
                  {{ statusLabels[request.status] || request.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-[11px] text-[#92939b]">—</td>
            </tr>
            <tr v-else>
              <td colspan="6" class="h-20 px-4 text-center text-xs text-[#858893]">{{ loadError || 'Belum ada perjalanan mendatang' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>
