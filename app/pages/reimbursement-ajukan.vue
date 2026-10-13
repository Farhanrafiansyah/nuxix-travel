<script setup lang="ts">
type TravelRequest = {
  id: number
  destination: string
  start_date: string
  end_date: string
  status: string
}

type ExpenseItem = {
  id: number
  category: string
  description: string
  amount: string
}

const authToken = useCookie<string | null>('auth_token')
const travelRequests = ref<TravelRequest[]>([])
const selectedTravelId = ref('')
const expenseDate = ref('')
const expenses = ref<ExpenseItem[]>([
  { id: 1, category: 'Transportasi', description: '', amount: '' }
])
const receiptFile = ref<File | null>(null)
const isLoadingTravels = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')
const submitError = ref('')
const successMessage = ref('')
let nextExpenseId = 2

const totalAmount = computed(() => expenses.value.reduce((total, expense) => {
  const amount = Number(expense.amount)
  return total + (Number.isFinite(amount) ? amount : 0)
}, 0))

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(amount)

const formatTravelOption = (travel: TravelRequest) =>
  `TRV-${String(travel.id).padStart(4, '0')} — ${travel.destination}`

const addExpense = () => {
  expenses.value.push({
    id: nextExpenseId++,
    category: 'Transportasi',
    description: '',
    amount: ''
  })
}

const removeExpense = (id: number) => {
  if (expenses.value.length > 1) {
    expenses.value = expenses.value.filter((expense) => expense.id !== id)
  }
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  submitError.value = ''

  if (!file) {
    receiptFile.value = null
    return
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    input.value = ''
    receiptFile.value = null
    submitError.value = 'Format bukti harus PDF, JPG, atau PNG.'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    input.value = ''
    receiptFile.value = null
    submitError.value = 'Ukuran file bukti maksimal 5 MB.'
    return
  }

  receiptFile.value = file
}

const clearReceiptFile = () => {
  receiptFile.value = null
  const input = document.querySelector<HTMLInputElement>('#receipt-file')
  if (input) input.value = ''
}

const submitReimbursement = async () => {
  submitError.value = ''
  successMessage.value = ''

  if (!selectedTravelId.value) {
    submitError.value = 'Pilih perjalanan dinas terlebih dahulu.'
    return
  }

  if (!expenseDate.value) {
    submitError.value = 'Tanggal pengeluaran wajib diisi.'
    return
  }

  if (expenses.value.some((expense) => !expense.description.trim() || Number(expense.amount) <= 0)) {
    submitError.value = 'Lengkapi deskripsi dan nominal setiap pengeluaran dengan benar.'
    return
  }

  const formData = new FormData()
  formData.append('items', JSON.stringify(expenses.value.map((expense) => ({
    category: expense.category,
    description: expense.description.trim(),
    amount: Number(expense.amount),
    expense_date: expenseDate.value
  }))))
  if (receiptFile.value) {
    formData.append('receipt_file', receiptFile.value)
  }

  isSubmitting.value = true

  try {
    const response = await $fetch<{ message: string }>(
      `http://localhost:8000/api/reimbursements/${selectedTravelId.value}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken.value}` },
        body: formData
      }
    )
    successMessage.value = response.message
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    submitError.value = fetchError.data?.message || 'Pengajuan reimbursement belum dapat dikirim.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  try {
    const response = await $fetch<{ requests: TravelRequest[] }>(
      'http://localhost:8000/api/travels/my-requests',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    travelRequests.value = response.requests
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
    isLoadingTravels.value = false
  }
})
</script>

<template>
  <section class="dashboard-page space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Ajukan Reimbursement</h1>
        <p class="text-xs font-medium text-[#777b87]">Lampirkan bukti pengeluaran perjalanan dinas Anda.</p>
      </div>
    </div>

    <form class="space-y-4" @submit.prevent="submitReimbursement">
      <section class="rounded-lg border border-[#eadfce] bg-white px-4 py-4" aria-labelledby="travel-selection-heading">
        <h2 id="travel-selection-heading" class="mb-3 border-b border-[#eee7dc] pb-3 font-serif text-sm font-bold text-[#272621]">
          Pilih Perjalanan Dinas
        </h2>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-[#77736a]">ID Perjalanan</span>
            <select
              v-model="selectedTravelId"
              required
              :disabled="isLoadingTravels || travelRequests.length === 0"
              class="h-9 w-full rounded-md border border-[#eadfce] bg-white px-2 text-[10px] text-[#272621] focus:border-[#d79a2e] focus:outline-none disabled:bg-[#faf9f6]"
            >
              <option value="" disabled>
                {{ isLoadingTravels ? 'Memuat perjalanan...' : 'Pilih perjalanan dinas' }}
              </option>
              <option v-for="travel in travelRequests" :key="travel.id" :value="String(travel.id)">
                {{ formatTravelOption(travel) }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-[#77736a]">Tanggal Pengeluaran</span>
            <input
              v-model="expenseDate"
              required
              type="date"
              class="h-9 w-full rounded-md border border-[#eadfce] bg-white px-2 text-[10px] text-[#272621] focus:border-[#d79a2e] focus:outline-none"
            >
          </label>
        </div>

        <p v-if="loadError" class="mt-3 text-[10px] text-red-600" role="alert">{{ loadError }}</p>
        <p v-else-if="!isLoadingTravels && travelRequests.length === 0" class="mt-3 text-[10px] text-[#858078]">
          Belum ada perjalanan dinas yang dapat dipilih.
        </p>
      </section>

      <section class="rounded-lg border border-[#eadfce] bg-white px-4 py-4" aria-labelledby="expense-details-heading">
        <h2 id="expense-details-heading" class="mb-3 border-b border-[#eee7dc] pb-3 font-serif text-sm font-bold text-[#272621]">
          Rincian Pengeluaran
        </h2>

        <div class="hidden grid-cols-[142px_minmax(0,1fr)_126px_28px] gap-2 pb-2 text-[9px] font-semibold uppercase tracking-wide text-[#77736a] sm:grid">
          <span>Kategori</span>
          <span>Deskripsi</span>
          <span>Nominal</span>
          <span class="text-center">Hapus</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="(expense, index) in expenses"
            :key="expense.id"
            class="grid gap-2 rounded-md border border-[#f0eadf] p-2 sm:grid-cols-[142px_minmax(0,1fr)_126px_28px] sm:items-center sm:border-0 sm:p-0"
          >
            <label class="block">
              <span class="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-[#77736a] sm:sr-only">Kategori</span>
              <select
                v-model="expense.category"
                :aria-label="`Kategori pengeluaran ${index + 1}`"
                class="h-8 w-full rounded-md border border-[#eadfce] bg-white px-2 text-[10px] text-[#272621] focus:border-[#d79a2e] focus:outline-none"
              >
                <option>Transportasi</option>
                <option>Akomodasi</option>
                <option>Makan</option>
                <option>Perjalanan Lokal</option>
                <option>Lainnya</option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-[#77736a] sm:sr-only">Deskripsi</span>
              <input
                v-model="expense.description"
                required
                type="text"
                :aria-label="`Deskripsi pengeluaran ${index + 1}`"
                placeholder="Contoh: Tiket taksi bandara, Grab..."
                class="h-8 w-full rounded-md border border-[#eadfce] bg-white px-2 text-[10px] text-[#272621] placeholder:text-[#8c887f] focus:border-[#d79a2e] focus:outline-none"
              >
            </label>

            <label class="block">
              <span class="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-[#77736a] sm:sr-only">Nominal</span>
              <input
                v-model="expense.amount"
                required
                min="1"
                step="1"
                type="number"
                :aria-label="`Nominal pengeluaran ${index + 1}`"
                placeholder="Rp 0"
                class="h-8 w-full rounded-md border border-[#eadfce] bg-white px-2 text-[10px] text-[#272621] placeholder:text-[#8c887f] focus:border-[#d79a2e] focus:outline-none"
              >
            </label>

            <button
              type="button"
              :disabled="expenses.length === 1"
              :aria-label="`Hapus pengeluaran ${index + 1}`"
              class="flex h-8 w-full items-center justify-center rounded-md border border-[#eadfce] text-[#b95040] transition-colors hover:bg-[#fdf4f2] disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7"
              @click="removeExpense(expense.id)"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 12h12M12 7l5 5-5 5" />
                <path d="M20 5v14" />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="button"
          class="mt-3 inline-flex h-7 items-center gap-1 rounded-md border border-[#eadfce] bg-white px-2.5 text-[10px] font-medium text-[#272621] transition-colors hover:bg-[#faf9f6]"
          @click="addExpense"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Tambah Pengeluaran
        </button>

        <label
          for="receipt-file"
          class="mt-3 flex min-h-[82px] cursor-pointer flex-col items-center justify-center rounded-md bg-[#faf9f6] px-4 py-3 text-center transition-colors hover:bg-[#f5f1e9]"
        >
          <svg class="mb-1 h-5 w-5 text-[#d49a28]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
            <path d="M14 3.5v4h4M8 12h8M8 16h8" />
          </svg>
          <span class="text-[10px] font-semibold text-[#272621]">
            {{ receiptFile?.name || 'Unggah Dokumen / Bukti Nota' }}
          </span>
          <span class="text-[9px] text-[#858078]">PDF, JPG, atau PNG (Maks 5MB)</span>
          <input
            id="receipt-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            class="sr-only"
            @change="handleFileChange"
          >
        </label>
        <button
          v-if="receiptFile"
          type="button"
          class="mt-1 text-[9px] font-medium text-[#a33d32] hover:underline"
          @click="clearReceiptFile"
        >
          Hapus file
        </button>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#eee7dc] pt-3">
          <p class="text-[9px] text-[#858078]">Pastikan semua nota sesuai sebelum mengirim.</p>
          <p class="text-[10px] text-[#272621]">
            Total:
            <strong class="ml-1 font-serif text-base font-bold text-[#c58a1f]">{{ formatCurrency(totalAmount) }}</strong>
          </p>
        </div>
      </section>

      <p v-if="submitError" class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-700" role="alert">
        {{ submitError }}
      </p>
      <p v-if="successMessage" class="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] text-emerald-700" role="status">
        {{ successMessage }}
        <NuxtLink to="/reimbursement" class="ml-1 font-semibold underline">Kembali ke reimbursement</NuxtLink>
      </p>

      <div class="flex items-center justify-between gap-3">
        <NuxtLink
          to="/reimbursement"
          class="inline-flex h-9 items-center rounded-md border border-[#eadfce] px-3 text-[10px] font-semibold text-[#77736a] transition-colors hover:bg-white"
        >
          Batal
        </NuxtLink>
        <button
          type="submit"
          :disabled="isSubmitting || isLoadingTravels || travelRequests.length === 0 || Boolean(successMessage)"
          class="inline-flex h-9 items-center justify-center rounded-md bg-[#d49a28] px-4 text-[10px] font-semibold text-white transition-colors hover:bg-[#bd851d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? 'Mengirim...' : 'Ajukan Reimbursement' }}
        </button>
      </div>
    </form>
  </section>
</template>
