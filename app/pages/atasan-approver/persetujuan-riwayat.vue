<script setup lang="ts">
interface ApprovalHistoryItem {
  approval_id: number
  travel_request_id: number
  applicant_id: number
  applicant_name: string
  applicant_role: string
  department: string
  destination: string
  start_date: string
  end_date: string
  estimated_cost: string | number | null
  decision: 'APPROVED' | 'REJECTED'
  notes: string | null
  processed_at: string
  approver_id: number
  approver: {
    id: number
    name: string
    email: string
  } | null
}

const authToken = useCookie<string | null>('auth_token')
const history = ref<ApprovalHistoryItem[]>([])
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

const loadHistory = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<{ history: ApprovalHistoryItem[] }>(
      'http://localhost:8000/api/approvals/history',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    history.value = response.history
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat riwayat persetujuan perjalanan.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Halaman ini hanya tersedia untuk Atasan atau Super Admin.'
      : fetchError.data?.message || 'Riwayat persetujuan belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Riwayat Persetujuan</h1>
        <p class="mt-1 text-xs text-[#718078]">Keputusan perjalanan dinas yang telah diproses oleh Atasan.</p>
      </div>
      <button
        type="button"
        class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6] disabled:opacity-50"
        :disabled="isLoading"
        @click="loadHistory"
      >
        Muat Ulang
      </button>
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="approval-history-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="approval-history-heading" class="font-serif text-sm font-bold text-[#173b30]">Keputusan Perjalanan</h2>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[1050px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Diproses</th>
              <th scope="col" class="px-2.5 py-2.5">ID Perjalanan</th>
              <th scope="col" class="px-2.5 py-2.5">Pemohon</th>
              <th scope="col" class="px-2.5 py-2.5">Departemen</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Tanggal Perjalanan</th>
              <th scope="col" class="px-2.5 py-2.5">Estimasi Biaya</th>
              <th scope="col" class="px-2.5 py-2.5">Keputusan</th>
              <th scope="col" class="px-2.5 py-2.5">Catatan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="9" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat riwayat dari server...</td>
            </tr>
            <tr v-else-if="history.length === 0">
              <td colspan="9" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                Belum ada keputusan perjalanan untuk akun Atasan ini.
              </td>
            </tr>
            <tr v-for="item in history" v-else :key="item.approval_id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDateTime(item.processed_at) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">PD-{{ String(item.travel_request_id).padStart(4, '0') }}</td>
              <td class="px-2.5 py-3">
                <p class="font-medium">{{ item.applicant_name }}</p>
                <p class="mt-0.5 text-[9px] text-[#7b8980]">{{ item.applicant_role }}</p>
              </td>
              <td class="px-2.5 py-3">{{ item.department }}</td>
              <td class="px-2.5 py-3">{{ item.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(item.start_date) }} – {{ formatDate(item.end_date) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatCurrency(item.estimated_cost) }}</td>
              <td class="px-2.5 py-3">
                <span
                  class="inline-flex rounded-full px-2 py-1 text-[9px] font-semibold"
                  :class="item.decision === 'APPROVED' ? 'bg-[#e7f2e5] text-[#3f6b4f]' : 'bg-rose-50 text-rose-700'"
                >
                  {{ item.decision === 'APPROVED' ? 'Disetujui' : 'Ditolak' }}
                </span>
                <p v-if="item.approver" class="mt-1 text-[9px] text-[#7b8980]">oleh {{ item.approver.name }}</p>
              </td>
              <td class="max-w-[220px] whitespace-normal px-2.5 py-3">{{ item.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
