<script setup lang="ts">
type ExpenseType = 'Reimbursement' | 'Uang Muka'

type Expense = {
  id: number
  date: string
  type: ExpenseType
  department: string
  destination: string
  amount: number
}

type ActiveModal = 'add' | 'budget' | null

const STORAGE_KEY = 'laporan-keuangan-state-v1'
const expenseTypes: ExpenseType[] = ['Reimbursement', 'Uang Muka']
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const today = new Date()
const reportYear = today.getFullYear()

const expenses = ref<Expense[]>([])
const budget = ref<number | null>(null)
const isHydrated = ref(false)
const activeModal = ref<ActiveModal>(null)

const toDateInput = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const addForm = reactive({
  date: toDateInput(today),
  type: 'Reimbursement' as ExpenseType,
  department: '',
  destination: '',
  amount: null as number | null
})
const budgetForm = reactive({ amount: null as number | null })

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

const sumAmount = (items: Expense[]) => items.reduce((total, item) => total + Number(item.amount || 0), 0)

const yearExpenses = computed(() => expenses.value.filter(
  (expense) => new Date(expense.date).getFullYear() === reportYear
))

const sortedExpenses = computed(() => [...yearExpenses.value].sort(
  (a, b) => b.date.localeCompare(a.date) || b.id - a.id
))

const reimbursementExpenses = computed(() => yearExpenses.value.filter((expense) => expense.type === 'Reimbursement'))
const cashAdvanceExpenses = computed(() => yearExpenses.value.filter((expense) => expense.type === 'Uang Muka'))

const totalExpense = computed(() => sumAmount(yearExpenses.value))
const remainingBudget = computed(() => budget.value === null ? null : budget.value - totalExpense.value)

const statCards = computed(() => [
  {
    label: 'Total Pengeluaran',
    value: formatCompactCurrency(totalExpense.value),
    note: `Tahun ${reportYear}`,
    accent: 'border-l-[#e0a93a]'
  },
  {
    label: 'Total Reimbursement',
    value: formatCompactCurrency(sumAmount(reimbursementExpenses.value)),
    note: `${reimbursementExpenses.value.length} transaksi`,
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Total Uang Muka',
    value: formatCompactCurrency(sumAmount(cashAdvanceExpenses.value)),
    note: `${cashAdvanceExpenses.value.length} transaksi`,
    accent: 'border-l-[#2f6b5e]'
  }
])

const monthlyTotals = computed(() => monthLabels
  .slice(0, today.getMonth() + 1)
  .map((label, month) => ({
    label,
    total: sumAmount(yearExpenses.value.filter((expense) => new Date(expense.date).getMonth() === month))
  })))

const maxMonthlyTotal = computed(() => Math.max(...monthlyTotals.value.map((month) => month.total), 0))

const barHeight = (total: number) => total > 0
  ? `${Math.max((total / maxMonthlyTotal.value) * 100, 3)}%`
  : '0%'

const departmentTotals = computed(() => {
  const groups = new Map<string, number>()
  yearExpenses.value.forEach((expense) => {
    groups.set(expense.department, (groups.get(expense.department) ?? 0) + expense.amount)
  })

  return [...groups.entries()]
    .map(([department, total]) => ({ department, total }))
    .sort((a, b) => b.total - a.total)
})

const destinationTotals = computed(() => {
  const groups = new Map<string, { trips: number, total: number }>()
  yearExpenses.value.forEach((expense) => {
    const current = groups.get(expense.destination) ?? { trips: 0, total: 0 }
    groups.set(expense.destination, { trips: current.trips + 1, total: current.total + expense.amount })
  })

  return [...groups.entries()]
    .map(([destination, value]) => ({ destination, ...value }))
    .sort((a, b) => b.total - a.total)
})

const departmentOptions = computed(() => [...new Set(expenses.value.map((expense) => expense.department))])
const destinationOptions = computed(() => [...new Set(expenses.value.map((expense) => expense.destination))])

const closeModal = () => {
  activeModal.value = null
}

const openAddModal = () => {
  addForm.date = toDateInput(new Date())
  addForm.type = 'Reimbursement'
  addForm.department = ''
  addForm.destination = ''
  addForm.amount = null
  activeModal.value = 'add'
}

const openBudgetModal = () => {
  budgetForm.amount = budget.value
  activeModal.value = 'budget'
}

const submitAdd = () => {
  expenses.value.push({
    id: Date.now(),
    date: addForm.date,
    type: addForm.type,
    department: addForm.department.trim(),
    destination: addForm.destination.trim(),
    amount: Number(addForm.amount)
  })
  closeModal()
}

const submitBudget = () => {
  budget.value = budgetForm.amount === null || budgetForm.amount === ('' as unknown)
    ? null
    : Number(budgetForm.amount)
  closeModal()
}

const removeExpense = (id: number) => {
  expenses.value = expenses.value.filter((expense) => expense.id !== id)
}

const exportReport = () => {
  const header = ['Tanggal', 'Jenis', 'Departemen', 'Kota Tujuan', 'Nominal']
  const rows = sortedExpenses.value.map((expense) => [
    expense.date,
    expense.type,
    expense.department,
    expense.destination,
    expense.amount
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

// Data disimpan di browser. Ganti bagian ini dengan pemanggilan API
// ($fetch + Authorization Bearer) ketika endpoint laporan sudah tersedia.
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const parsed = JSON.parse(saved)
      expenses.value = parsed.expenses ?? []
      budget.value = parsed.budget ?? null
    }
  } catch (error) {
    console.error('Gagal membaca data laporan keuangan dari penyimpanan lokal.', error)
  }

  isHydrated.value = true
})

watch([expenses, budget], () => {
  if (!isHydrated.value) return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      expenses: expenses.value,
      budget: budget.value
    }))
  } catch (error) {
    console.error('Gagal menyimpan data laporan keuangan ke penyimpanan lokal.', error)
  }
}, { deep: true })
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Laporan Keuangan Perjalanan Dinas</h1>
        <p class="mt-1 text-xs text-[#718078]">Analisis pengeluaran perjalanan dinas perusahaan.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6]"
          @click="openAddModal"
        >
          + Tambah Pengeluaran
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="sortedExpenses.length === 0"
          @click="exportReport"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          Ekspor Laporan
        </button>
      </div>
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

      <section class="relative rounded-xl border border-l-[3px] border-[#dfe8dc] border-l-[#c8702a] bg-white px-4 py-3" aria-label="Sisa anggaran">
        <button
          type="button"
          class="absolute right-3 top-2.5 rounded px-1.5 py-0.5 text-[10px] text-[#718078] transition-colors hover:bg-[#f1f5ee] hover:text-[#173b30]"
          @click="openBudgetModal"
        >
          Atur
        </button>
        <p class="text-[10px] font-medium text-[#718078]">Sisa Anggaran</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">
          {{ remainingBudget === null ? '—' : formatCompactCurrency(remainingBudget) }}
        </p>
        <p class="mt-1 text-[10px] text-[#7b8980]">
          {{ budget === null ? 'Anggaran belum diatur' : `dari ${formatCompactCurrency(budget)}` }}
        </p>
      </section>
    </div>

    <section class="rounded-xl border border-[#dfe8dc] bg-white px-4 py-4" aria-labelledby="monthly-expense-heading">
      <h2 id="monthly-expense-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengeluaran per Bulan ({{ reportYear }})</h2>

      <p v-if="totalExpense === 0" class="py-14 text-center text-xs text-[#7b8980]">Belum ada data pengeluaran.</p>

      <div v-else class="mt-4">
        <div class="flex h-40 items-end gap-3 border-b border-[#e8eee5] sm:gap-5">
          <div
            v-for="month in monthlyTotals"
            :key="month.label"
            class="flex h-full flex-1 items-end justify-center"
          >
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
          <span v-for="month in monthlyTotals" :key="month.label" class="flex-1 text-center text-[9px] text-[#718078]">
            {{ month.label }}
          </span>
        </div>
      </div>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="department-expense-heading">
        <div class="border-b border-[#e8eee5] px-4 py-3">
          <h2 id="department-expense-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengeluaran per Departemen</h2>
        </div>
        <div class="overflow-x-auto px-3.5">
          <table class="w-full min-w-[280px] border-collapse text-left text-[10px]">
            <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
              <tr>
                <th scope="col" class="px-2.5 py-2.5">Departemen</th>
                <th scope="col" class="px-2.5 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
              <tr v-if="departmentTotals.length === 0">
                <td colspan="2" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada data departemen.</td>
              </tr>
              <tr v-for="row in departmentTotals" v-else :key="row.department" class="transition-colors hover:bg-[#fbfcfa]">
                <td class="px-2.5 py-3">{{ row.department }}</td>
                <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(row.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="destination-expense-heading">
        <div class="border-b border-[#e8eee5] px-4 py-3">
          <h2 id="destination-expense-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengeluaran per Tujuan</h2>
        </div>
        <div class="overflow-x-auto px-3.5">
          <table class="w-full min-w-[280px] border-collapse text-left text-[10px]">
            <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
              <tr>
                <th scope="col" class="px-2.5 py-2.5">Kota Tujuan</th>
                <th scope="col" class="px-2.5 py-2.5">Perjalanan</th>
                <th scope="col" class="px-2.5 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
              <tr v-if="destinationTotals.length === 0">
                <td colspan="3" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada data tujuan.</td>
              </tr>
              <tr v-for="row in destinationTotals" v-else :key="row.destination" class="transition-colors hover:bg-[#fbfcfa]">
                <td class="px-2.5 py-3">{{ row.destination }}</td>
                <td class="px-2.5 py-3">{{ row.trips }}</td>
                <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCompactCurrency(row.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="expense-list-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="expense-list-heading" class="font-serif text-sm font-bold text-[#173b30]">Data Pengeluaran</h2>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[640px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Tanggal</th>
              <th scope="col" class="px-2.5 py-2.5">Jenis</th>
              <th scope="col" class="px-2.5 py-2.5">Departemen</th>
              <th scope="col" class="px-2.5 py-2.5">Kota Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Nominal</th>
              <th scope="col" class="px-2.5 py-2.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="sortedExpenses.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada data pengeluaran.</td>
            </tr>
            <tr v-for="expense in sortedExpenses" v-else :key="expense.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(expense.date) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ expense.type }}</td>
              <td class="px-2.5 py-3">{{ expense.department }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ expense.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(expense.amount) }}</td>
              <td class="px-2.5 py-3 text-center">
                <button
                  type="button"
                  class="rounded px-1.5 text-sm leading-none text-[#718078] transition-colors hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Hapus pengeluaran"
                  @click="removeExpense(expense.id)"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="activeModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6"
      role="presentation"
      @click.self="closeModal"
    >
      <form
        v-if="activeModal === 'add'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-add-heading"
        @submit.prevent="submitAdd"
      >
        <h2 id="expense-add-heading" class="font-serif text-base font-bold text-[#173b30]">Tambah Pengeluaran</h2>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Tanggal</span>
            <input
              v-model="addForm.date"
              type="date"
              required
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Jenis</span>
            <select
              v-model="addForm.type"
              required
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option v-for="type in expenseTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Departemen</span>
            <input
              v-model="addForm.department"
              type="text"
              list="department-options"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <datalist id="department-options">
              <option v-for="option in departmentOptions" :key="option" :value="option" />
            </datalist>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Kota tujuan</span>
            <input
              v-model="addForm.destination"
              type="text"
              list="destination-options"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <datalist id="destination-options">
              <option v-for="option in destinationOptions" :key="option" :value="option" />
            </datalist>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nominal (Rp)</span>
            <input
              v-model.number="addForm.amount"
              type="number"
              min="1"
              step="1"
              required
              inputmode="numeric"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443]">Simpan</button>
        </div>
      </form>

      <form
        v-else-if="activeModal === 'budget'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-heading"
        @submit.prevent="submitBudget"
      >
        <h2 id="budget-heading" class="font-serif text-base font-bold text-[#173b30]">Anggaran Perjalanan Dinas {{ reportYear }}</h2>

        <label class="mt-4 block">
          <span class="mb-1 block text-[10px] font-medium text-[#718078]">Total anggaran (Rp)</span>
          <input
            v-model.number="budgetForm.amount"
            type="number"
            min="0"
            step="1"
            inputmode="numeric"
            class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
          >
        </label>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443]">Simpan</button>
        </div>
      </form>
    </div>
  </section>
</template>