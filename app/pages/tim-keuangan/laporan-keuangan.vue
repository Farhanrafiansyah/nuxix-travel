<script setup lang="ts">
type TransactionType = 'REIMBURSEMENT' | 'CASH_ADVANCE'

interface FinanceTransaction {
  transaction_id: string
  id: number
  transaction_type: TransactionType
  applicant_id: number
  applicant_name: string
  role: string
  department: string
  destination: string
  amount: string | number
  requested_at: string
  approval_status: string
  payment_status: string
  status: string
  payment_date: string | null
  payment_reference: string | null
  payment_method: string | null
  processed_by: number | null
  actual_expense: string | number
}

interface PaymentMethod {
  code: string
  label: string
  description: string
}

interface FinanceSettings {
  annual_budget: string | number
  payment_methods: PaymentMethod[]
}

interface ReportMonth {
  label: string
  total: number
}

const authToken = useCookie<string | null>('auth_token')
const reportYear = new Date().getFullYear()
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const transactions = ref<FinanceTransaction[]>([])
const settings = ref<FinanceSettings | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const saveError = ref('')
const isSavingBudget = ref(false)
const isBudgetModalOpen = ref(false)
const budgetForm = reactive({ annual_budget: null as number | null })

const formatCurrency = (amount: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

const formatCompactCurrency = (amount: number) => {
  if (Math.abs(amount) < 1_000_000) return formatCurrency(amount)
  const millions = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(amount / 1_000_000)
  return `Rp${millions}jt`
}

const formatDate = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const isInReportYear = (transaction: FinanceTransaction) => {
  const requestedYear = new Date(transaction.requested_at).getFullYear()
  const paymentYear = transaction.payment_date ? new Date(transaction.payment_date).getFullYear() : null
  return requestedYear === reportYear || paymentYear === reportYear
}

const reportTransactions = computed(() => transactions.value.filter(isInReportYear))
const actualTransactions = computed(() => reportTransactions.value.filter(
  (transaction) => transaction.payment_date
    && new Date(transaction.payment_date).getFullYear() === reportYear
    && Number(transaction.actual_expense) > 0
))
const reportActualAmount = (transaction: FinanceTransaction) => transaction.payment_date
  && new Date(transaction.payment_date).getFullYear() === reportYear
  ? Number(transaction.actual_expense)
  : 0

const totalExpense = computed(() => actualTransactions.value.reduce(
  (total, transaction) => total + Number(transaction.actual_expense || 0),
  0
))
const reimbursementExpense = computed(() => actualTransactions.value
  .filter((transaction) => transaction.transaction_type === 'REIMBURSEMENT')
  .reduce((total, transaction) => total + Number(transaction.actual_expense || 0), 0))
const advanceExpense = computed(() => actualTransactions.value
  .filter((transaction) => transaction.transaction_type === 'CASH_ADVANCE')
  .reduce((total, transaction) => total + Number(transaction.actual_expense || 0), 0))
const remainingBudget = computed(() => settings.value === null
  ? null
  : Number(settings.value.annual_budget) - totalExpense.value)

const statCards = computed(() => [
  {
    label: 'Realisasi Pengeluaran',
    value: formatCompactCurrency(totalExpense.value),
    note: `Tahun ${reportYear}`,
    accent: 'border-l-[#e0a93a]'
  },
  {
    label: 'Reimbursement Dibayar',
    value: formatCompactCurrency(reimbursementExpense.value),
    note: `${actualTransactions.value.filter((item) => item.transaction_type === 'REIMBURSEMENT').length} transaksi`,
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Uang Muka Dicairkan',
    value: formatCompactCurrency(advanceExpense.value),
    note: `${actualTransactions.value.filter((item) => item.transaction_type === 'CASH_ADVANCE').length} transaksi`,
    accent: 'border-l-[#2f6b5e]'
  }
])

const monthlyTotals = computed<ReportMonth[]>(() => monthLabels.map((label, month) => ({
  label,
  total: actualTransactions.value.reduce((sum, transaction) => {
    if (!transaction.payment_date) return sum
    const paidDate = new Date(transaction.payment_date)
    return paidDate.getFullYear() === reportYear && paidDate.getMonth() === month
      ? sum + Number(transaction.actual_expense || 0)
      : sum
  }, 0)
})))

const maxMonthlyTotal = computed(() => Math.max(...monthlyTotals.value.map((month) => month.total), 0))
const barHeight = (total: number) => total > 0 && maxMonthlyTotal.value > 0
  ? `${Math.max((total / maxMonthlyTotal.value) * 100, 3)}%`
  : '0%'

const departmentTotals = computed(() => {
  const groups = new Map<string, number>()
  actualTransactions.value.forEach((transaction) => {
    groups.set(transaction.department, (groups.get(transaction.department) || 0) + Number(transaction.actual_expense))
  })
  return [...groups.entries()]
    .map(([department, total]) => ({ department, total }))
    .sort((a, b) => b.total - a.total)
})

const destinationTotals = computed(() => {
  const groups = new Map<string, { transactions: number; total: number }>()
  actualTransactions.value.forEach((transaction) => {
    const current = groups.get(transaction.destination) || { transactions: 0, total: 0 }
    groups.set(transaction.destination, {
      transactions: current.transactions + 1,
      total: current.total + Number(transaction.actual_expense)
    })
  })
  return [...groups.entries()]
    .map(([destination, values]) => ({ destination, ...values }))
    .sort((a, b) => b.total - a.total)
})

const statusLabel = (transaction: FinanceTransaction) => {
  if (transaction.payment_status === 'PAID') return 'Dibayar'
  if (transaction.payment_status === 'DISBURSED') return 'Dicairkan'
  if (transaction.payment_status === 'WAITING_PAYMENT') return 'Menunggu Pembayaran'
  if (transaction.approval_status === 'PENDING_VERIFICATION') return 'Menunggu Verifikasi'
  if (transaction.approval_status === 'NEEDS_DOCUMENTS') return 'Bukti Kurang'
  if (transaction.approval_status === 'REJECTED') return 'Ditolak'
  if (transaction.approval_status === 'VERIFIED') return 'Terverifikasi'
  return transaction.status
}

const loadReport = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''
  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const [reportResponse, settingsResponse] = await Promise.all([
      $fetch<{ transactions: FinanceTransaction[] }>(
        `http://localhost:8000/api/finance/transactions?year=${reportYear}`,
        { headers }
      ),
      $fetch<{ settings: FinanceSettings }>('http://localhost:8000/api/finance/settings', { headers })
    ])
    transactions.value = reportResponse.transactions
    settings.value = settingsResponse.settings
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat laporan keuangan.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Masuklah menggunakan akun Tim Keuangan atau Super Admin.'
      : fetchError.data?.message || 'Laporan belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

const openBudgetModal = () => {
  budgetForm.annual_budget = settings.value ? Number(settings.value.annual_budget) : null
  saveError.value = ''
  isBudgetModalOpen.value = true
}

const saveBudget = async () => {
  if (!authToken.value || !settings.value || budgetForm.annual_budget === null) return
  isSavingBudget.value = true
  saveError.value = ''

  try {
    const response = await $fetch<{ settings: FinanceSettings }>('http://localhost:8000/api/finance/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: {
        annual_budget: budgetForm.annual_budget,
        payment_methods: settings.value.payment_methods
      }
    })
    settings.value = response.settings
    isBudgetModalOpen.value = false
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal menyimpan anggaran tahunan.', error)
    saveError.value = fetchError.data?.message || 'Anggaran belum dapat disimpan.'
  } finally {
    isSavingBudget.value = false
  }
}

const exportReport = () => {
  const header = ['Tanggal Pembayaran', 'ID Transaksi', 'Jenis', 'Pemohon', 'Role', 'Departemen', 'Tujuan', 'Nominal Realisasi', 'Status', 'Referensi']
  const rows = reportTransactions.value.map((transaction) => [
    transaction.payment_date || transaction.requested_at,
    transaction.transaction_id,
    transaction.transaction_type === 'REIMBURSEMENT' ? 'Reimbursement' : 'Uang Muka',
    transaction.applicant_name,
    transaction.role,
    transaction.department,
    transaction.destination,
    reportActualAmount(transaction),
    statusLabel(transaction),
    transaction.payment_reference || ''
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `laporan-keuangan-${reportYear}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(loadReport)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-serif text-2xl font-bold text-[#173b30]">Laporan Keuangan Perjalanan Dinas</h1>
        <p class="mt-1 text-xs text-[#718078]">Realisasi transaksi reimbursement dan pencairan uang muka tahun {{ reportYear }}.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6]"
          @click="openBudgetModal"
        >
          Atur Anggaran
        </button>
        <button
          type="button"
          class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60"
          :disabled="isLoading || reportTransactions.length === 0"
          @click="exportReport"
        >
          Ekspor Laporan
        </button>
        <button
          type="button"
          class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60"
          :disabled="isLoading"
          @click="loadReport"
        >
          Muat Ulang
        </button>
      </div>
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
      <section class="rounded-xl border border-l-[3px] border-l-[#c8702a] border-[#dfe8dc] bg-white px-4 py-3">
        <p class="text-[10px] font-medium text-[#718078]">Sisa Anggaran Tahunan</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">
          {{ remainingBudget === null ? '—' : formatCompactCurrency(remainingBudget) }}
        </p>
        <p class="mt-1 text-[10px] text-[#7b8980]">
          {{ settings ? `dari ${formatCompactCurrency(Number(settings.annual_budget))}` : 'Anggaran belum tersedia' }}
        </p>
      </section>
    </div>

    <section class="rounded-xl border border-[#dfe8dc] bg-white px-4 py-4" aria-labelledby="monthly-expense-heading">
      <h2 id="monthly-expense-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengeluaran Aktual per Bulan ({{ reportYear }})</h2>
      <p v-if="isLoading" class="py-14 text-center text-xs text-[#7b8980]">Memuat laporan...</p>
      <p v-else-if="actualTransactions.length === 0" class="py-14 text-center text-xs text-[#7b8980]">Belum ada transaksi yang dibayar/dicairkan pada tahun ini.</p>
      <div v-else class="mt-4">
        <div class="flex h-40 items-end gap-3 border-b border-[#e8eee5] sm:gap-5">
          <div v-for="month in monthlyTotals" :key="month.label" class="flex h-full flex-1 items-end justify-center">
            <div
              class="w-full max-w-[56px] rounded-t-md bg-gradient-to-b from-[#8fbc84] to-[#4a7a4a]"
              :style="{ height: barHeight(month.total) }"
              :title="`${month.label}: ${formatCurrency(month.total)}`"
              role="img"
              :aria-label="`${month.label}: ${formatCurrency(month.total)}`"
            />
          </div>
        </div>
        <div class="mt-2 flex gap-3 sm:gap-5">
          <span v-for="month in monthlyTotals" :key="month.label" class="flex-1 text-center text-[9px] text-[#718078]">{{ month.label }}</span>
        </div>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="department-expense-heading">
        <div class="border-b border-[#e8eee5] px-4 py-3">
          <h2 id="department-expense-heading" class="font-serif text-sm font-bold text-[#173b30]">Realisasi per Departemen</h2>
        </div>
        <div class="overflow-x-auto px-3.5">
          <table class="w-full min-w-[280px] border-collapse text-left text-[10px]">
            <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
              <tr><th class="px-2.5 py-2.5">Departemen</th><th class="px-2.5 py-2.5">Total Dibayar</th></tr>
            </thead>
            <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
              <tr v-if="departmentTotals.length === 0"><td colspan="2" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada realisasi.</td></tr>
              <tr v-for="row in departmentTotals" v-else :key="row.department">
                <td class="px-2.5 py-3">{{ row.department }}</td>
                <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(row.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="destination-expense-heading">
        <div class="border-b border-[#e8eee5] px-4 py-3">
          <h2 id="destination-expense-heading" class="font-serif text-sm font-bold text-[#173b30]">Realisasi per Tujuan</h2>
        </div>
        <div class="overflow-x-auto px-3.5">
          <table class="w-full min-w-[280px] border-collapse text-left text-[10px]">
            <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
              <tr><th class="px-2.5 py-2.5">Kota Tujuan</th><th class="px-2.5 py-2.5">Transaksi</th><th class="px-2.5 py-2.5">Total</th></tr>
            </thead>
            <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
              <tr v-if="destinationTotals.length === 0"><td colspan="3" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada realisasi.</td></tr>
              <tr v-for="row in destinationTotals" v-else :key="row.destination">
                <td class="px-2.5 py-3">{{ row.destination }}</td>
                <td class="px-2.5 py-3">{{ row.transactions }}</td>
                <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCompactCurrency(row.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="transaction-list-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="transaction-list-heading" class="font-serif text-sm font-bold text-[#173b30]">Transaksi Keuangan Tahun {{ reportYear }}</h2>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[1000px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th class="px-2.5 py-2.5">Tanggal</th><th class="px-2.5 py-2.5">ID</th><th class="px-2.5 py-2.5">Jenis</th>
              <th class="px-2.5 py-2.5">Pemohon</th><th class="px-2.5 py-2.5">Departemen</th><th class="px-2.5 py-2.5">Tujuan</th>
              <th class="px-2.5 py-2.5">Realisasi</th><th class="px-2.5 py-2.5">Status</th><th class="px-2.5 py-2.5">Referensi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading"><td colspan="9" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat transaksi...</td></tr>
            <tr v-else-if="reportTransactions.length === 0"><td colspan="9" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada transaksi untuk tahun ini.</td></tr>
            <tr v-for="transaction in reportTransactions" v-else :key="transaction.transaction_id" class="hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(transaction.payment_date || transaction.requested_at) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ transaction.transaction_id }}</td>
              <td class="px-2.5 py-3">{{ transaction.transaction_type === 'REIMBURSEMENT' ? 'Reimbursement' : 'Uang Muka' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ transaction.applicant_name }}</td>
              <td class="px-2.5 py-3">{{ transaction.department }}</td>
              <td class="px-2.5 py-3">{{ transaction.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(reportActualAmount(transaction)) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ statusLabel(transaction) }}</td>
              <td class="px-2.5 py-3">{{ transaction.payment_reference || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="isBudgetModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6" @click.self="isBudgetModalOpen = false">
      <form class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl" role="dialog" aria-modal="true" @submit.prevent="saveBudget">
        <h2 class="font-serif text-base font-bold text-[#173b30]">Anggaran Tahunan {{ reportYear }}</h2>
        <label class="mt-4 block">
          <span class="mb-1 block text-[10px] font-medium text-[#718078]">Total anggaran (Rp)</span>
          <input v-model.number="budgetForm.annual_budget" type="number" min="0" step="1" required class="h-9 w-full rounded-md border border-[#dfe8dc] px-3 text-[11px]">
        </label>
        <p v-if="saveError" class="mt-3 text-[10px] text-rose-700" role="alert">{{ saveError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px]" @click="isBudgetModalOpen = false">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] disabled:opacity-50" :disabled="isSavingBudget">
            {{ isSavingBudget ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
