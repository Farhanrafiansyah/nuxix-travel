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

const formatCurrency = (amount: number) => {
  if (amount <= 0) return 'Rp0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

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
  formData.append('items', JSON.stringify({
    items: expenses.value.map((expense) => ({
      category: expense.category,
      description: expense.description.trim(),
      amount: Number(expense.amount),
      expense_date: expenseDate.value || undefined
    }))
  }))
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
    successMessage.value = response.message || 'Pengajuan reimbursement berhasil dikirim!'
  } catch (error) {
    const fetchError = error as {
      status?: number
      statusCode?: number
      data?: {
        message?: string
        error?: string
        details?: {
          formErrors?: string[]
          fieldErrors?: Record<string, string[]>
        }
      }
    }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    const detailMsg = fetchError.data?.details?.formErrors?.[0]
      || Object.values(fetchError.data?.details?.fieldErrors || {})[0]?.[0]

    submitError.value = fetchError.data?.message
      || detailMsg
      || fetchError.data?.error
      || 'Pengajuan reimbursement belum dapat dikirim.'
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
    travelRequests.value = response.requests || []
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    loadError.value = fetchError.data?.message || 'Data perjalanan dinas belum dapat dimuat.'
  } finally {
    isLoadingTravels.value = false
  }
})
</script>

<template>
  <section class="dashboard-page max-w-5xl space-y-5 pb-8">
    <!-- Page Header -->
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#1f2937]">Ajukan Reimbursement</h1>
      <p class="mt-0.5 text-xs text-[#6b7280]">Lampirkan bukti pengeluaran perjalanan dinas Anda.</p>
    </div>

    <form class="space-y-4" @submit.prevent="submitReimbursement">
      <!-- Section 1: Pilih Perjalanan Dinas -->
      <section class="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs" aria-labelledby="travel-selection-heading">
        <h2 id="travel-selection-heading" class="mb-4 border-b border-[#f3f4f6] pb-3 font-serif text-sm font-bold text-[#1f2937]">
          Pilih Perjalanan Dinas
        </h2>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Dropdown ID Perjalanan -->
          <div>
            <label for="travel-id-select" class="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
              ID PERJALANAN
            </label>
            <div class="relative">
              <select
                id="travel-id-select"
                v-model="selectedTravelId"
                required
                :disabled="isLoadingTravels || travelRequests.length === 0"
                class="h-10 w-full appearance-none rounded-lg border border-[#e5e7eb] bg-white px-3 pr-9 text-xs text-[#1f2937] shadow-xs transition-colors focus:border-[#d49a28] focus:outline-none disabled:bg-[#f9fafb] disabled:text-[#9ca3af]"
              >
                <option value="" disabled>
                  {{ isLoadingTravels ? 'Memuat perjalanan...' : 'Pilih perjalanan dinas...' }}
                </option>
                <option v-for="travel in travelRequests" :key="travel.id" :value="String(travel.id)">
                  {{ formatTravelOption(travel) }}
                </option>
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Input Tanggal Pengeluaran -->
          <div>
            <label for="expense-date" class="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
              TANGGAL PENGELUARAN
            </label>
            <div class="relative">
              <input
                id="expense-date"
                v-model="expenseDate"
                required
                type="date"
                placeholder="Pilih tanggal..."
                class="h-10 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 pr-9 text-xs text-[#1f2937] shadow-xs transition-colors focus:border-[#d49a28] focus:outline-none"
              >
              <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
          </div>
        </div>

        <p v-if="loadError" class="mt-3 text-xs text-red-600" role="alert">{{ loadError }}</p>
        <p v-else-if="!isLoadingTravels && travelRequests.length === 0" class="mt-3 text-xs text-[#9ca3af]">
          Belum ada riwayat perjalanan dinas untuk diajukan reimbursement.
        </p>
      </section>

      <!-- Section 2: Rincian Pengeluaran -->
      <section class="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs" aria-labelledby="expense-details-heading">
        <h2 id="expense-details-heading" class="mb-4 border-b border-[#f3f4f6] pb-3 font-serif text-sm font-bold text-[#1f2937]">
          Rincian Pengeluaran
        </h2>

        <!-- Table / Grid Header -->
        <div class="hidden grid-cols-[150px_minmax(0,1fr)_150px_40px] gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] sm:grid">
          <span>Kategori</span>
          <span>Deskripsi</span>
          <span>Nominal</span>
          <span class="text-center">Hapus</span>
        </div>

        <!-- Expense Rows -->
        <div class="space-y-3">
          <div
            v-for="(expense, index) in expenses"
            :key="expense.id"
            class="grid gap-2.5 rounded-lg border border-[#f3f4f6] p-3 sm:grid-cols-[150px_minmax(0,1fr)_150px_40px] sm:items-center sm:border-0 sm:p-0"
          >
            <!-- Kategori -->
            <div>
              <span class="mb-1 block text-[10px] font-semibold uppercase text-[#6b7280] sm:sr-only">Kategori</span>
              <div class="relative">
                <select
                  v-model="expense.category"
                  :aria-label="`Kategori pengeluaran ${index + 1}`"
                  class="h-9 w-full appearance-none rounded-lg border border-[#e5e7eb] bg-white px-3 pr-8 text-xs text-[#1f2937] shadow-xs focus:border-[#d49a28] focus:outline-none"
                >
                  <option>Transportasi</option>
                  <option>Akomodasi</option>
                  <option>Makan</option>
                  <option>Perjalanan Lokal</option>
                  <option>Lainnya</option>
                </select>
                <svg class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            <!-- Deskripsi -->
            <div>
              <span class="mb-1 block text-[10px] font-semibold uppercase text-[#6b7280] sm:sr-only">Deskripsi</span>
              <input
                v-model="expense.description"
                required
                type="text"
                :aria-label="`Deskripsi pengeluaran ${index + 1}`"
                placeholder="Contoh: Tiket taksi bandara, Grab..."
                class="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-xs text-[#1f2937] placeholder:text-[#9ca3af] shadow-xs focus:border-[#d49a28] focus:outline-none"
              >
            </div>

            <!-- Nominal -->
            <div>
              <span class="mb-1 block text-[10px] font-semibold uppercase text-[#6b7280] sm:sr-only">Nominal</span>
              <input
                v-model="expense.amount"
                required
                min="1"
                step="1"
                type="number"
                :aria-label="`Nominal pengeluaran ${index + 1}`"
                placeholder="Rp 0"
                class="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3 text-xs text-[#1f2937] placeholder:text-[#9ca3af] shadow-xs focus:border-[#d49a28] focus:outline-none"
              >
            </div>

            <!-- Hapus Icon Button -->
            <div class="flex justify-end sm:justify-center">
              <button
                type="button"
                :disabled="expenses.length === 1"
                :aria-label="`Hapus pengeluaran ${index + 1}`"
                class="flex h-8 w-8 items-center justify-center rounded-md border border-[#fca5a5] text-[#e05252] transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#e5e7eb] disabled:text-[#d1d5db]"
                @click="removeExpense(expense.id)"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Tambah Pengeluaran Button -->
        <button
          type="button"
          class="mt-3.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 text-xs font-medium text-[#374151] shadow-xs transition-colors hover:bg-gray-50"
          @click="addExpense"
        >
          <span class="text-sm font-bold leading-none">+</span>
          <span>Tambah Pengeluaran</span>
        </button>

        <!-- Upload Dropzone -->
        <label
          for="receipt-file"
          class="mt-4 flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-xl bg-[#faf9f6] border border-[#f0eee9] px-4 py-4 text-center transition-colors hover:bg-[#f5f1e8]"
        >
          <svg class="mb-1.5 h-6 w-6 text-[#d49a28]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span class="text-xs font-semibold text-[#1f2937]">
            {{ receiptFile?.name || 'Unggah Dokumen / Bukti Nota' }}
          </span>
          <span class="mt-0.5 text-[10px] text-[#6b7280]">PDF, JPG, atau PNG (Maks 5MB)</span>
          <input
            id="receipt-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            class="sr-only"
            @change="handleFileChange"
          >
        </label>

        <div v-if="receiptFile" class="mt-1 flex items-center justify-between text-xs">
          <span class="text-emerald-600 font-medium text-[11px]">✓ File terpilih: {{ receiptFile.name }}</span>
          <button
            type="button"
            class="text-[11px] font-medium text-red-600 hover:underline"
            @click="clearReceiptFile"
          >
            Hapus file
          </button>
        </div>

        <!-- Bottom Total Row -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#e5e7eb] pt-4">
          <p class="text-xs text-[#6b7280]">Pastikan semua nota sesuai sebelum mengirim.</p>
          <p class="text-xs text-[#1f2937]">
            Total:
            <span class="ml-1 font-serif text-lg font-bold text-[#d49a28]">
              {{ formatCurrency(totalAmount) }}
            </span>
          </p>
        </div>
      </section>

      <!-- Alert Messages -->
      <div v-if="submitError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
        {{ submitError }}
      </div>
      <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700" role="status">
        {{ successMessage }}
        <NuxtLink to="/reimbursement" class="ml-1 font-semibold underline">Kembali ke Reimbursement</NuxtLink>
      </div>

      <!-- Action Buttons: Batal & Ajukan Reimbursement -->
      <div class="flex items-center justify-between gap-3 pt-2">
        <NuxtLink
          to="/reimbursement"
          class="inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-5 text-xs font-medium text-[#4b5563] shadow-xs transition-colors hover:bg-gray-50"
        >
          Batal
        </NuxtLink>

        <button
          type="submit"
          :disabled="isSubmitting || isLoadingTravels || Boolean(successMessage)"
          class="inline-flex h-9 items-center justify-center rounded-lg bg-[#d49a28] px-5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#c28b22] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isSubmitting ? 'Mengirim...' : 'Ajukan Reimbursement' }}
        </button>
      </div>
    </form>
  </section>
</template>
