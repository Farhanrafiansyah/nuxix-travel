<script setup lang="ts">
interface PendingTravel {
  id: number
  user_id: number
  applicant_name: string
  applicant_role: string
  department: string
  destination: string
  start_date: string
  end_date: string
  estimated_cost: string | number | null
  purpose: string
  transportation_mode: string | null
  document_url: string | null
  status: 'PENDING'
  created_at: string
}

interface ApprovalStats {
  year: number
  pending: number
  approved: number
  rejected: number
}

interface ApprovalHistoryItem {
  approval_id: number
  travel_request_id: number
  applicant_name: string
  department: string
  destination: string
  estimated_cost: string | number | null
  decision: 'APPROVED' | 'REJECTED'
  notes: string | null
  processed_at: string
}

const authToken = useCookie<string | null>('auth_token')
const pendingTravels = ref<PendingTravel[]>([])
const stats = ref<ApprovalStats | null>(null)
const approvalHistory = ref<ApprovalHistoryItem[]>([])
const recentHistory = ref<ApprovalHistoryItem[]>([])
const isLoading = ref(true)
const loadError = ref('')

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatCurrency = (value: string | number | null) => {
  if (value === null) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value))
}

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth()
const approvedThisMonthEntries = computed(() => approvalHistory.value.filter((item) => {
  const date = new Date(item.processed_at)
  return item.decision === 'APPROVED'
    && date.getFullYear() === currentYear
    && date.getMonth() === currentMonth
}))
const approvedThisMonth = computed(() => approvedThisMonthEntries.value.length)
const approvedEstimatedCostThisMonth = computed(() => approvedThisMonthEntries.value.reduce(
  (total, item) => total + Number(item.estimated_cost || 0),
  0
))
const rejectedThisMonth = computed(() => approvalHistory.value.filter((item) => {
  const date = new Date(item.processed_at)
  return item.decision === 'REJECTED'
    && date.getFullYear() === currentYear
    && date.getMonth() === currentMonth
}).length)
const totalTeamTravelsThisYear = computed(() => stats.value
  ? stats.value.pending + stats.value.approved + stats.value.rejected
  : '—')

const statCards = computed(() => [
  { label: 'Pengajuan Menunggu', value: pendingTravels.value.length, note: 'Perlu tindakan Anda', accent: 'border-l-[#c8702a]' },
  { label: 'Disetujui Bulan Ini', value: approvedThisMonth.value, note: `Estimasi ${formatCurrency(approvedEstimatedCostThisMonth.value)}`, accent: 'border-l-[#3f6b4f]' },
  { label: 'Ditolak', value: rejectedThisMonth.value, note: 'Bulan berjalan', accent: 'border-l-[#c24f4f]' },
  { label: 'Total Perjalanan Tim', value: totalTeamTravelsThisYear.value, note: `Sepanjang ${stats.value?.year ?? currentYear}`, accent: 'border-l-[#e0a93a]' }
])

const loadDashboard = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const [approvalResponse, statsResponse, historyResponse] = await Promise.all([
      $fetch<{ pending: PendingTravel[] }>('http://localhost:8000/api/approvals', { headers }),
      $fetch<ApprovalStats>(`http://localhost:8000/api/dashboard/stats?year=${new Date().getFullYear()}`, { headers }),
      $fetch<{ history: ApprovalHistoryItem[] }>('http://localhost:8000/api/approvals/history', { headers })
    ])

    pendingTravels.value = approvalResponse.pending
    stats.value = statsResponse
    approvalHistory.value = historyResponse.history
    recentHistory.value = historyResponse.history.slice(0, 5)
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat dashboard Atasan.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Dashboard ini hanya tersedia untuk Atasan atau Super Admin.'
      : fetchError.data?.message || 'Data dashboard belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Dashboard Atasan</h1>
        <p class="mt-1 text-xs text-[#718078]">Ringkasan pengajuan karyawan yang menjadi tanggung jawab Anda.</p>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6] disabled:opacity-50"
          :disabled="isLoading"
          @click="loadDashboard"
        >
          Muat Ulang
        </button>
        <NuxtLink
          to="/atasan-approver/persetujuan"
          class="inline-flex h-9 items-center rounded-md bg-[#f0ad4e] px-3 text-xs font-semibold text-[#3b2a0d] hover:bg-[#e8a13c]"
        >
          Buka Persetujuan
        </NuxtLink>
      </div>
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <section
        v-for="card in statCards"
        :key="card.label"
        class="min-h-[88px] rounded-xl border border-l-[3px] border-[#dfe8dc] bg-white px-3.5 py-3"
        :class="card.accent"
        :aria-label="card.label"
      >
        <p class="text-[10px] font-medium text-[#718078]">{{ card.label }}</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ isLoading ? '…' : card.value }}</p>
        <p class="mt-1 text-[9px] text-[#7b8980]">{{ card.note }}</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="pending-approval-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="pending-approval-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengajuan Menunggu Persetujuan</h2>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[1000px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">ID Pengajuan</th>
              <th scope="col" class="px-2.5 py-2.5">Pemohon</th>
              <th scope="col" class="px-2.5 py-2.5">Departemen</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Tanggal Perjalanan</th>
              <th scope="col" class="px-2.5 py-2.5">Estimasi Biaya</th>
              <th scope="col" class="px-2.5 py-2.5">Keperluan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat data dari server...</td>
            </tr>
            <tr v-else-if="pendingTravels.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Tidak ada pengajuan yang menunggu persetujuan.</td>
            </tr>
            <tr v-for="travel in pendingTravels" v-else :key="travel.id" class="hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">PD-{{ String(travel.id).padStart(4, '0') }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ travel.applicant_name }}<span class="mt-0.5 block text-[9px] text-[#7b8980]">#{{ travel.user_id }}</span></td>
              <td class="px-2.5 py-3">{{ travel.department }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ travel.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(travel.start_date) }} – {{ formatDate(travel.end_date) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatCurrency(travel.estimated_cost) }}</td>
              <td class="max-w-sm px-2.5 py-3">{{ travel.purpose }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="recent-approval-heading">
      <div class="flex items-center justify-between border-b border-[#e8eee5] px-4 py-3">
        <h2 id="recent-approval-heading" class="font-serif text-sm font-bold text-[#173b30]">Keputusan Terbaru</h2>
        <NuxtLink to="/atasan-approver/persetujuan-riwayat" class="text-[10px] font-semibold text-[#3f6b4f] hover:underline">
          Lihat semua
        </NuxtLink>
      </div>
      <div v-if="!isLoading && recentHistory.length === 0" class="px-4 py-10 text-center text-xs text-[#7b8980]">
        Belum ada keputusan yang tercatat.
      </div>
      <ul v-else class="divide-y divide-[#e8eee5]">
        <li v-for="item in recentHistory" :key="item.approval_id" class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-[#263b31]">
              PD-{{ String(item.travel_request_id).padStart(4, '0') }} · {{ item.applicant_name }} · {{ item.destination }}
            </p>
            <p class="mt-1 text-[9px] text-[#7b8980]">{{ item.department }} · {{ formatDateTime(item.processed_at) }}</p>
          </div>
          <span
            class="inline-flex rounded-full px-2 py-1 text-[9px] font-semibold"
            :class="item.decision === 'APPROVED' ? 'bg-[#e7f2e5] text-[#3f6b4f]' : 'bg-rose-50 text-rose-700'"
          >
            {{ item.decision === 'APPROVED' ? 'Disetujui' : 'Ditolak' }}
          </span>
        </li>
        <li v-if="isLoading" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat keputusan...</li>
      </ul>
    </section>
  </section>
</template>
