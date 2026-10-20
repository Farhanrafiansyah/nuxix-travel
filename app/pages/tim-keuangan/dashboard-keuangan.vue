<script setup lang="ts">
type ReimbursementStatus = 'SUBMITTED' | 'NEEDS_DOCUMENTS' | 'VERIFIED' | 'PAID' | 'REJECTED'

interface ReimbursementRecord {
  id: number
  user_id: number
  total_amount: string | number
  status: ReimbursementStatus
  user: { name: string } | null
  travelRequest: { destination: string } | null
  items: { category: string; receipt_url: string | null }[]
}

interface FinanceQueueItem {
  id: number
  transaction_id: string
  transaction_type: 'REIMBURSEMENT' | 'CASH_ADVANCE'
  applicant_name: string
  department: string
  destination: string
  amount: string | number
  requested_at: string
  status: string
}

interface FinanceTransaction {
  transaction_id: string
  transaction_type: 'REIMBURSEMENT' | 'CASH_ADVANCE'
  payment_status: string
  payment_date: string | null
  actual_expense: string | number
}

const authToken = useCookie<string | null>('auth_token')
const reimbursements = ref<ReimbursementRecord[]>([])
const paymentQueue = ref<FinanceQueueItem[]>([])
const transactions = ref<FinanceTransaction[]>([])
const annualBudget = ref<number | null>(null)
const isLoading = ref(true)
const loadError = ref('')

const formatCurrency = (amount: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

const submittedReimbursements = computed(() => reimbursements.value
  .filter((item) => item.status === 'SUBMITTED')
  .sort((a, b) => a.id - b.id))

const incompleteReceiptCount = computed(() => submittedReimbursements.value.filter(
  (item) => item.items.length === 0 || item.items.some((entry) => !entry.receipt_url)
).length)

const waitingPaymentTotal = computed(() => paymentQueue.value.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
))

const paidThisMonth = computed(() => {
  const now = new Date()
  return transactions.value.filter((item) => {
    if (!item.payment_date || !['PAID', 'DISBURSED'].includes(item.payment_status)) return false
    const paymentDate = new Date(item.payment_date)
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()
  })
})

const paidThisMonthTotal = computed(() => paidThisMonth.value.reduce(
  (sum, item) => sum + Number(item.actual_expense || 0),
  0
))

const statCards = computed(() => [
  {
    label: 'Reimbursement Menunggu Verifikasi',
    value: String(submittedReimbursements.value.length),
    note: `${incompleteReceiptCount.value} dengan bukti belum lengkap`,
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Antrean Pembayaran',
    value: String(paymentQueue.value.length),
    note: `Total ${formatCurrency(waitingPaymentTotal.value)}`,
    accent: 'border-l-[#e0a93a]'
  },
  {
    label: 'Dibayarkan Bulan Ini',
    value: formatCurrency(paidThisMonthTotal.value),
    note: `${paidThisMonth.value.length} transaksi`,
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Anggaran Tahunan',
    value: annualBudget.value === null ? '—' : formatCurrency(annualBudget.value),
    note: 'Sumber: pengaturan keuangan',
    accent: 'border-l-[#2f6b5e]'
  }
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
    const [reimbursementResponse, queueResponse, transactionResponse, settingsResponse] = await Promise.all([
      $fetch<{ reimbursements: ReimbursementRecord[] }>('http://localhost:8000/api/reimbursements', { headers }),
      $fetch<{ queue: FinanceQueueItem[] }>('http://localhost:8000/api/finance/payments/queue', { headers }),
      $fetch<{ transactions: FinanceTransaction[] }>(
        `http://localhost:8000/api/finance/transactions?year=${new Date().getFullYear()}`,
        { headers }
      ),
      $fetch<{ settings: { annual_budget: string | number } }>('http://localhost:8000/api/finance/settings', { headers })
    ])

    reimbursements.value = reimbursementResponse.reimbursements
    paymentQueue.value = queueResponse.queue
    transactions.value = transactionResponse.transactions
    annualBudget.value = Number(settingsResponse.settings.annual_budget)
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat dashboard Tim Keuangan.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Masuklah menggunakan akun Tim Keuangan atau Super Admin.'
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
        <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Dashboard Tim Keuangan</h1>
        <p class="mt-1 text-xs text-[#718078]">Pantau verifikasi reimbursement dan transaksi yang siap dibayarkan.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60"
        :disabled="isLoading"
        @click="loadDashboard"
      >
        {{ isLoading ? 'Memuat...' : 'Muat Ulang' }}
      </button>
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <section
        v-for="card in statCards"
        :key="card.label"
        class="rounded-xl border border-l-[3px] border-[#dfe8dc] bg-white px-4 py-3"
        :class="card.accent"
      >
        <p class="text-[10px] font-medium text-[#718078]">{{ card.label }}</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ isLoading ? '…' : card.value }}</p>
        <p class="mt-1 text-[10px] text-[#7b8980]">{{ card.note }}</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="verification-queue-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee5] px-4 py-3">
        <h2 id="verification-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Reimbursement Menunggu Verifikasi</h2>
        <NuxtLink to="/tim-keuangan/reimbursement-verifikasi" class="text-[10px] font-semibold text-[#9a5a12] hover:underline">
          Buka verifikasi
        </NuxtLink>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[680px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th class="px-2.5 py-2.5">ID</th>
              <th class="px-2.5 py-2.5">Pemohon</th>
              <th class="px-2.5 py-2.5">Tujuan</th>
              <th class="px-2.5 py-2.5">Rincian</th>
              <th class="px-2.5 py-2.5">Nominal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat reimbursement...</td>
            </tr>
            <tr v-else-if="submittedReimbursements.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#7b8980]">Tidak ada reimbursement yang menunggu verifikasi.</td>
            </tr>
            <tr v-for="item in submittedReimbursements.slice(0, 4)" v-else :key="item.id">
              <td class="whitespace-nowrap px-2.5 py-3">RB-{{ String(item.id).padStart(4, '0') }}</td>
              <td class="px-2.5 py-3">{{ item.user?.name || `Pemohon #${item.user_id}` }}</td>
              <td class="px-2.5 py-3">{{ item.travelRequest?.destination || '—' }}</td>
              <td class="px-2.5 py-3">{{ item.items.map((entry) => entry.category).join(', ') || '—' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="payment-queue-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee5] px-4 py-3">
        <h2 id="payment-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Transaksi Siap Dibayar</h2>
        <NuxtLink to="/tim-keuangan/pembayaran" class="text-[10px] font-semibold text-[#9a5a12] hover:underline">
          Buka pembayaran
        </NuxtLink>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[700px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th class="px-2.5 py-2.5">Pemohon</th>
              <th class="px-2.5 py-2.5">Jenis</th>
              <th class="px-2.5 py-2.5">Tujuan</th>
              <th class="px-2.5 py-2.5">Nominal</th>
              <th class="px-2.5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat antrean pembayaran...</td>
            </tr>
            <tr v-else-if="paymentQueue.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#7b8980]">Tidak ada transaksi yang siap dibayar.</td>
            </tr>
            <tr v-for="item in paymentQueue.slice(0, 4)" v-else :key="item.transaction_id">
              <td class="px-2.5 py-3">{{ item.applicant_name }}</td>
              <td class="px-2.5 py-3">{{ item.transaction_type === 'REIMBURSEMENT' ? 'Reimbursement' : 'Uang Muka' }}</td>
              <td class="px-2.5 py-3">{{ item.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.amount) }}</td>
              <td class="px-2.5 py-3">{{ item.transaction_type === 'REIMBURSEMENT' ? 'Terverifikasi' : 'Menunggu Pencairan' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
