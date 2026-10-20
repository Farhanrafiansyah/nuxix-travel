<script setup lang="ts">
type TravelRequest = {
  id: number
  destination: string
  start_date: string
  end_date: string
  purpose: string
  transportation_mode: string | null
  document_url: string | null
  status: string
  lpj_status: string
  created_at?: string
}

type DashboardSummary = {
  cash_advance_running: number
  cash_advance_returned: number
  travel_quota: {
    year: number
    used: number
    limit: number
    remaining: number
  }
  reminders: {
    travel_id: number
    destination: string
    lpj_reminder: string | null
    cash_advance_reminder: string | null
  }[]
}

type ActionItem = {
  id: string
  title: string
  description: string
  actionLabel: string
  to: string
}

type DashboardNotification = {
  id: string
  title: string
  details: string
  date: string
  sortDate: number
  to: string
}

const summaryCards = [
  { key: 'active', label: 'Perjalanan Aktif', icon: 'plane', tone: 'bg-blue-50 text-blue-600' },
  { key: 'pending', label: 'Pengajuan Menunggu', icon: 'clock', tone: 'bg-amber-50 text-amber-600' },
  { key: 'advance', label: 'Uang Muka Berjalan', icon: 'wallet', tone: 'bg-emerald-50 text-emerald-600' },
  { key: 'returned', label: 'Sisa Dikembalikan', icon: 'return', tone: 'bg-rose-50 text-rose-600' }
]

const emptyTableColumns = ['Tujuan', 'Tanggal', 'Keperluan', 'Transportasi', 'Status', 'LPJ', 'Aksi']
const actionItems = ref<ActionItem[]>([])
const requests = ref<TravelRequest[]>([])
const dashboardSummary = ref<DashboardSummary | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const authToken = useCookie<string | null>('auth_token')
const currentUser = useCurrentUser()

const sortedRequests = computed(() => [...requests.value].sort((first, second) => {
  return new Date(second.created_at || second.start_date).getTime() - new Date(first.created_at || first.start_date).getTime()
}))

const recentRequests = computed(() => sortedRequests.value.slice(0, 3))
const latestNotifications = computed(() => {
  const statusNotifications: Record<string, string> = {
    PENDING: 'Pengajuan perjalanan Anda menunggu persetujuan.',
    APPROVED: 'Pengajuan perjalanan Anda telah disetujui.',
    REJECTED: 'Pengajuan perjalanan Anda ditolak.',
    FULFILLED: 'Transportasi dan akomodasi perjalanan telah disiapkan.',
    COMPLETED: 'Perjalanan dinas Anda telah selesai.'
  }
  const notifications: DashboardNotification[] = requests.value
    .filter((request) => statusNotifications[request.status])
    .map((request) => {
      const notificationDate = request.created_at || request.start_date
      return {
        id: `travel-${request.id}`,
        title: statusNotifications[request.status],
        details: `TRV-${String(request.id).padStart(4, '0')} — ${request.destination}, ${formatDateRange(request.start_date, request.end_date)}`,
        date: `Dibuat ${formatDate(notificationDate)}`,
        sortDate: new Date(notificationDate).getTime(),
        to: '/karyawan/dinas'
      }
    })

  actionItems.value.forEach((item) => {
    const travelId = Number(item.id.split('-')[0])
    const request = requests.value.find((travel) => travel.id === travelId)
    notifications.push({
      id: item.id,
      title: item.title,
      details: item.description,
      date: 'Perlu tindakan',
      sortDate: request ? new Date(request.created_at || request.start_date).getTime() : 0,
      to: item.to
    })
  })

  return notifications.sort((first, second) => second.sortDate - first.sortDate).slice(0, 3)
})
const upcomingRequests = computed(() => requests.value
  .filter((request) => !['REJECTED', 'COMPLETED'].includes(request.status)
    && new Date(request.start_date).getTime() >= new Date(new Date().toDateString()).getTime())
  .sort((first, second) => new Date(first.start_date).getTime() - new Date(second.start_date).getTime()))

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(amount)

const summaryValues = computed(() => ({
  active: requests.value.filter((request) => ['APPROVED', 'FULFILLED'].includes(request.status)).length,
  pending: requests.value.filter((request) => request.status === 'PENDING').length,
  advance: dashboardSummary.value ? formatCurrency(dashboardSummary.value.cash_advance_running) : '—',
  returned: dashboardSummary.value ? formatCurrency(dashboardSummary.value.cash_advance_returned) : '—'
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
    const response = await $fetch<{ requests: TravelRequest[] }>('http://localhost:8000/api/travels/my-requests', {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    requests.value = response.requests

    const summary = await $fetch<DashboardSummary>('http://localhost:8000/api/dashboard/my-summary', {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    dashboardSummary.value = summary
    actionItems.value = summary.reminders.flatMap((reminder) => {
      const items: ActionItem[] = []
      if (reminder.lpj_reminder) {
        items.push({
          id: `${reminder.travel_id}-lpj`,
          title: `Selesaikan LPJ perjalanan ke ${reminder.destination}`,
          description: reminder.lpj_reminder,
          actionLabel: 'Lihat perjalanan',
          to: '/karyawan/dinas'
        })
      }
      if (reminder.cash_advance_reminder) {
        items.push({
          id: `${reminder.travel_id}-advance`,
          title: `Kembalikan sisa uang muka perjalanan ke ${reminder.destination}`,
          description: reminder.cash_advance_reminder,
          actionLabel: 'Lihat uang muka',
          to: '/karyawan/uang-muka'
        })
      }
      return items
    })
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
  <section class="dashboard-page space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Dashboard Karyawan</h1>
        <p class="mt-1 text-xs font-medium text-[#718078]">
          Selamat datang kembali, {{ currentUser?.name || 'Karyawan' }}. Berikut ringkasan aktivitas perjalanan dinas Anda.
        </p>
      </div>
      <NuxtLink to="/karyawan/dinas-ajukan" class="inline-flex h-9 items-center gap-2 rounded-md bg-[#f5a623] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#e99514]">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajukan Perjalanan
      </NuxtLink>
    </div>


    <section class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan perjalanan">
      <article v-for="(card, index) in summaryCards" :key="card.label" class="flex min-h-[76px] items-start justify-between rounded-lg border border-[#dfe8dc] bg-white px-3 py-3 shadow-[0_2px_8px_rgba(28,50,38,0.03)]" :class="['border-l-[3px] border-l-[#f5a623]', 'border-l-[#287568]', 'border-l-[#cc761d]', 'border-l-[#597e50]'][index]">
        <div>
          <h2 class="text-[10px] font-medium text-[#65756b]">{{ card.label }}</h2>
          <p class="mt-1.5 text-2xl font-bold leading-none text-[#173b30]">{{ summaryValues[card.key as keyof typeof summaryValues] }}</p>
          <p class="mt-1 text-[10px] text-[#7b8980]">
            {{ card.key === 'advance' || card.key === 'returned' ? 'Dari uang muka kamu' : 'Dari perjalanan kamu' }}
          </p>
        </div>
        <span class="hidden h-8 w-8 items-center justify-center rounded-md sm:flex" :class="card.tone" aria-hidden="true">
          <svg v-if="card.icon === 'plane'" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16Z" /></svg>
          <svg v-else-if="card.icon === 'clock'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <svg v-else-if="card.icon === 'wallet'" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18m-5 5h2" /></svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
        </span>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-2.5 xl:grid-cols-[1.4fr_1fr]">
      <article class="min-h-[180px] rounded-lg border border-[#dfe8dc] bg-white p-3.5 shadow-[0_2px_8px_rgba(28,50,38,0.03)]">
        <div class="flex items-center justify-between border-b border-[#edf1eb] pb-2">
          <h2 class="text-sm font-bold text-[#173b30]">Pengajuan Perjalanan Terbaru</h2>
          <NuxtLink to="/karyawan/dinas" class="text-[10px] font-semibold text-[#9b6816] hover:underline">Lihat semua</NuxtLink>
        </div>
        <div class="mt-2 grid grid-cols-[72px_1fr_125px_68px] gap-2 px-2 py-1 text-[9px] font-semibold text-[#728078]">
          <span>ID</span>
          <span>Tujuan</span>
          <span>Tanggal</span>
          <span>Status</span>
        </div>
        <div v-if="isLoading" class="flex min-h-[104px] items-center justify-center border-y border-[#edf1eb]">
          <p class="text-xs text-[#7b8980]">Memuat pengajuan...</p>
        </div>
        <div v-else-if="recentRequests.length" class="divide-y divide-[#edf1eb]">
          <div v-for="request in recentRequests" :key="request.id" class="grid grid-cols-[72px_1fr_125px_68px] items-center gap-2 px-2 py-2.5 text-[10px]">
            <span class="font-medium text-[#315c4b]">TRV-{{ String(request.id).padStart(4, '0') }}</span>
            <span class="truncate font-medium text-[#263b31]">{{ request.destination }}</span>
            <span class="whitespace-nowrap text-[#64736a]">{{ formatDateRange(request.start_date, request.end_date) }}</span>
            <span class="inline-flex w-fit rounded-full bg-[#e4f0e1] px-2 py-1 text-[9px] font-medium text-[#456d43]">
              {{ statusLabels[request.status] || request.status }}
            </span>
          </div>
        </div>
        <div v-else class="flex min-h-[104px] items-center justify-center border-y border-[#edf1eb]">
          <p class="text-xs text-[#7b8980]">{{ loadError || 'Belum ada pengajuan perjalanan' }}</p>
        </div>
      </article>

      <article class="min-h-[180px] rounded-lg border border-[#dfe8dc] bg-white p-3.5 shadow-[0_2px_8px_rgba(28,50,38,0.03)]">
        <div class="flex items-center justify-between border-b border-[#edf1eb] pb-2">
          <h2 class="text-sm font-bold text-[#173b30]">Notifikasi Terbaru</h2>
          <NuxtLink to="/notifikasi" class="text-[10px] font-semibold text-[#9b6816] hover:underline">Lihat semua</NuxtLink>
        </div>
        <div v-if="isLoading" class="flex min-h-[104px] items-center justify-center">
          <p class="text-xs text-[#7b8980]">Memuat notifikasi...</p>
        </div>
        <ul v-else-if="latestNotifications.length" class="divide-y divide-[#edf1eb]" aria-label="Notifikasi terbaru">
          <li v-for="notification in latestNotifications" :key="notification.id" class="grid grid-cols-[7px_minmax(0,1fr)_auto] items-start gap-2.5 py-2.5">
            <span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#f1a52e]" aria-hidden="true" />
            <NuxtLink :to="notification.to" class="min-w-0">
              <span class="block text-[10px] font-semibold leading-4 text-[#263b31]">{{ notification.title }}</span>
              <span class="mt-0.5 block truncate text-[9px] leading-3 text-[#748179]">{{ notification.details }}</span>
            </NuxtLink>
            <span class="whitespace-nowrap pt-0.5 text-right text-[8px] text-[#748179]">{{ notification.date }}</span>
          </li>
        </ul>
        <div v-else class="flex min-h-[104px] items-center justify-center">
          <p class="text-xs text-[#7b8980]">Belum ada notifikasi terbaru.</p>
        </div>
      </article>
    </section>

    <article class="overflow-hidden rounded-lg border border-[#e8e7e3] bg-white shadow-[0_3px_12px_rgba(28,28,45,0.04)]">
      <div class="flex items-center justify-between px-3 py-3">
        <h2 class="text-sm font-bold text-[#173b30]">Perjalanan Mendatang</h2>
        <NuxtLink to="/karyawan/dinas" class="text-[10px] font-semibold text-[#9b6816] hover:underline">Lihat semua</NuxtLink>
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
              <td colspan="7" class="h-20 px-4 text-center text-xs text-[#858893]">Memuat perjalanan...</td>
            </tr>
            <tr v-else-if="upcomingRequests.length" v-for="request in upcomingRequests" :key="request.id" class="border-b border-[#efeeeb] last:border-0">
              <td class="px-4 py-3 text-xs font-medium text-[#20233e]">{{ request.destination }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-[11px] text-[#727783]">{{ formatDateRange(request.start_date, request.end_date) }}</td>
              <td class="max-w-[240px] truncate px-4 py-3 text-[11px] text-[#727783]">{{ request.purpose }}</td>
              <td class="px-4 py-3 text-[11px] text-[#727783]">{{ request.transportation_mode || '—' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium" :class="statusStyles[request.status] || 'bg-slate-100 text-slate-700'">
                  {{ statusLabels[request.status] || request.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-[11px] text-[#727783]">{{ request.lpj_status || '—' }}</td>
              <td class="px-4 py-3 text-[11px]">
                <NuxtLink :to="`/karyawan/dinas-detail?id=${request.id}`" class="font-semibold text-[#1d46bb] hover:underline">Detail</NuxtLink>
              </td>
            </tr>
            <tr v-else>
              <td colspan="7" class="h-20 px-4 text-center text-xs text-[#858893]">{{ loadError || 'Belum ada perjalanan mendatang' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>
