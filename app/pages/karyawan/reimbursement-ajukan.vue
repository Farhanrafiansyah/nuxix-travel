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
  receipt_url: string
}

const authToken = useCookie<string | null>('auth_token')
const travelRequests = ref<TravelRequest[]>([])
const selectedTravelId = ref('')
const expenses = ref<ExpenseItem[]>([
  { id: 1, category: '', description: '', amount: '', receipt_url: '' }
])
const isLoadingTravels = ref(true)
const isSubmitting = ref(false)
const loadError = ref('')
const submitError = ref('')
const successMessage = ref('')
let nextExpenseId = 2
const expenseCategories = [
  'Transportasi',
  'Akomodasi',
  'Makan & Kebutuhan Rapat',
  'Perjalanan Lokal',
  'Perlengkapan Workshop'
]
const selectedTravel = computed(() => travelRequests.value.find((travel) => String(travel.id) === selectedTravelId.value))

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

const formatDateRange = (travel: TravelRequest) => {
  const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))

  return `${formatDate(travel.start_date)} – ${formatDate(travel.end_date)}`
}

const addExpense = () => {
  expenses.value.push({
    id: nextExpenseId++,
    category: '',
    description: '',
    amount: '',
    receipt_url: ''
  })
}

const removeExpense = (id: number) => {
  if (expenses.value.length > 1) {
    expenses.value = expenses.value.filter((expense) => expense.id !== id)
  }
}

const submitReimbursement = async () => {
  submitError.value = ''
  successMessage.value = ''

  if (!selectedTravelId.value) {
    submitError.value = 'Pilih perjalanan dinas terlebih dahulu.'
    return
  }

  const travelId = Number(selectedTravelId.value)
  if (!Number.isInteger(travelId) || travelId <= 0) {
    submitError.value = 'Perjalanan yang dipilih tidak valid. Silakan pilih ulang.'
    return
  }

  if (expenses.value.some((expense) => !expense.category.trim() || !expense.description.trim() || !Number.isFinite(Number(expense.amount)) || Number(expense.amount) <= 0)) {
    submitError.value = 'Lengkapi kategori, deskripsi, dan nominal setiap pengeluaran dengan benar.'
    return
  }

  for (const expense of expenses.value) {
    if (expense.receipt_url.trim()) {
      try {
        new URL(expense.receipt_url)
      } catch {
        submitError.value = 'Tautan bukti harus berupa URL yang valid.'
        return
      }
    }
  }

  isSubmitting.value = true

  try {
    const response = await $fetch<{ message: string }>(
      `http://localhost:8000/api/reimbursements/${travelId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken.value}` },
        body: {
          items: expenses.value.map((expense) => ({
            category: expense.category.trim(),
            description: expense.description.trim(),
            amount: Number(expense.amount),
            receipt_url: expense.receipt_url.trim()
          }))
        }
      }
    )
    successMessage.value = response.message || 'Pengajuan reimbursement berhasil dikirim!'
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    submitError.value = fetchError.data?.message === 'Travel id must be a number.'
      ? 'Perjalanan yang dipilih tidak valid. Silakan pilih ulang.'
      : fetchError.data?.message || 'Pengajuan reimbursement belum dapat dikirim.'
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
  <section class="dashboard-page space-y-3 pb-8">
    <!-- Page Header -->
    <div>
      <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Ajukan Reimbursement</h1>
      <p class="mt-0.5 text-[10px] text-[#718078]">Lampirkan rincian pengeluaran perjalanan dinas Anda.</p>
    </div>

    <form class="space-y-3" @submit.prevent="submitReimbursement">
      <!-- Section 1: Pilih Perjalanan Dinas -->
      <section class="rounded-lg border border-[#dfe8dc] bg-white p-3.5" aria-labelledby="travel-selection-heading">
        <h2 id="travel-selection-heading" class="sr-only">Pilih Perjalanan Dinas</h2>
        <div class="grid gap-2.5 sm:grid-cols-2">
          <!-- Dropdown ID Perjalanan -->
          <div>
            <label for="travel-id-select" class="mb-1 block text-[9px] font-semibold text-[#728078]">
              ID Perjalanan
            </label>
            <div class="relative">
              <select
                id="travel-id-select"
                v-model="selectedTravelId"
                required
                :disabled="isLoadingTravels || travelRequests.length === 0"
                class="h-8 w-full appearance-none rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 pr-9 text-[10px] text-[#263b31] transition-colors focus:border-[#9ab397] focus:outline-none disabled:text-[#9ca3af]"
              >
                <option value="" disabled>
                  {{ isLoadingTravels ? 'Memuat perjalanan...' : 'Pilih perjalanan dinas...' }}
                </option>
                <option v-for="travel in travelRequests" :key="travel.id" :value="String(travel.id)">
                  {{ formatTravelOption(travel) }}
                </option>
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7b8980]" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-[9px] font-semibold text-[#728078]">Periode Perjalanan</label>
            <div class="flex h-8 items-center rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31]">
              {{ selectedTravel ? formatDateRange(selectedTravel) : 'Pilih perjalanan untuk melihat periode' }}
            </div>
          </div>
        </div>

        <p v-if="loadError" class="mt-2 text-xs text-red-600" role="alert">{{ loadError }}</p>
        <p v-else-if="!isLoadingTravels && travelRequests.length === 0" class="mt-2 text-[10px] text-[#9ca3af]">
          Belum ada riwayat perjalanan dinas untuk diajukan reimbursement.
        </p>
      </section>

      <!-- Section 2: Rincian Pengeluaran -->
      <section class="rounded-lg border border-[#dfe8dc] bg-white p-3.5" aria-labelledby="expense-details-heading">
        <h2 id="expense-details-heading" class="mb-3 font-serif text-xs font-bold text-[#173b30]">
          Rincian Pengeluaran
        </h2>

        <!-- Table / Grid Header -->
        <div class="hidden grid-cols-[minmax(150px,1fr)_minmax(180px,1fr)_minmax(140px,1fr)_46px] gap-2 pb-1 text-[9px] font-semibold text-[#728078] sm:grid">
          <span>Kategori</span>
          <span>Deskripsi</span>
          <span>Nominal</span>
          <span class="text-center"></span>
        </div>

        <!-- Expense Rows -->
        <div class="space-y-3">
          <div
            v-for="(expense, index) in expenses"
            :key="expense.id"
            class="grid gap-2 sm:grid-cols-[minmax(150px,1fr)_minmax(180px,1fr)_minmax(140px,1fr)_46px] sm:items-center"
          >
            <!-- Kategori -->
            <div>
              <span class="mb-1 block text-[9px] font-semibold text-[#728078] sm:sr-only">Kategori</span>
              <div class="relative">
                <select
                  v-model="expense.category"
                  :aria-label="`Kategori pengeluaran ${index + 1}`"
                  required
                  class="h-8 w-full appearance-none rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 pr-8 text-[10px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
                >
                  <option value="" disabled>Pilih kategori</option>
                  <option v-for="category in expenseCategories" :key="category" :value="category">{{ category }}</option>
                </select>
                <svg class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7b8980]" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            <!-- Deskripsi -->
            <div>
              <span class="mb-1 block text-[9px] font-semibold text-[#728078] sm:sr-only">Deskripsi</span>
              <input
                v-model="expense.description"
                required
                type="text"
                :aria-label="`Deskripsi pengeluaran ${index + 1}`"
                placeholder="Deskripsi pengeluaran"
                class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31] placeholder:text-[#8b968e] focus:border-[#9ab397] focus:outline-none"
              >
            </div>

            <!-- Nominal -->
            <div>
              <span class="mb-1 block text-[9px] font-semibold text-[#728078] sm:sr-only">Nominal</span>
              <input
                v-model="expense.amount"
                required
                min="1"
                step="1"
                type="number"
                :aria-label="`Nominal pengeluaran ${index + 1}`"
                placeholder="Rp 0"
                class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31] placeholder:text-[#8b968e] focus:border-[#9ab397] focus:outline-none"
              >
            </div>

            <!-- Hapus Icon Button -->
            <div class="flex justify-end sm:justify-center">
              <button
                type="button"
                :disabled="expenses.length === 1"
                :aria-label="`Hapus pengeluaran ${index + 1}`"
                class="flex h-7 items-center justify-center rounded-md border border-[#dfe8dc] bg-white px-2 text-[9px] font-medium text-[#263b31] transition-colors hover:bg-[#f8faf6] disabled:cursor-not-allowed disabled:text-[#aab4ac]"
                @click="removeExpense(expense.id)"
              >
                Hapus
              </button>
            </div>

            <div class="sm:col-span-4">
              <label :for="`receipt-url-${expense.id}`" class="sr-only">URL bukti atau nota pengeluaran {{ index + 1 }}</label>
              <input
                :id="`receipt-url-${expense.id}`"
                v-model="expense.receipt_url"
                type="url"
                :aria-label="`URL bukti atau nota pengeluaran ${index + 1}`"
                placeholder="URL bukti atau nota (opsional)"
                class="h-8 w-full rounded-md border border-dashed border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31] placeholder:text-[#7b8980] focus:border-[#9ab397] focus:outline-none"
              >
            </div>
          </div>
        </div>

        <!-- Tambah Pengeluaran Button -->
        <button
          type="button"
          class="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md border border-[#dfe8dc] bg-white px-3 text-[10px] font-semibold text-[#263b31] transition-colors hover:bg-[#f8faf6]"
          @click="addExpense"
        >
          <span class="text-sm font-bold leading-none">+</span>
          <span>Tambah Pengeluaran</span>
        </button>

        <p class="mt-2 rounded-md border border-dashed border-[#dfe8dc] bg-[#fbfcfa] px-3 py-3 text-center text-[9px] text-[#728078]">
          Bukti nota dikirim sebagai URL untuk setiap pengeluaran. API saat ini belum menyediakan unggah file.
        </p>

        <!-- Bottom Total Row -->
        <div class="mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-dashed border-[#dfe8dc] pt-2">
          <p class="text-[9px] font-medium text-[#728078]">Total Pengeluaran</p>
          <p class="font-serif text-xl font-bold leading-tight text-[#173b30]">
              {{ formatCurrency(totalAmount) }}
          </p>
        </div>
      </section>

      <!-- Alert Messages -->
      <div v-if="submitError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-[10px] text-red-700" role="alert">
        {{ submitError }}
      </div>
      <div v-if="successMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-700" role="status">
        {{ successMessage }}
        <NuxtLink to="/karyawan/reimbursement" class="ml-1 font-semibold underline">Kembali ke Reimbursement</NuxtLink>
      </div>

      <!-- Action Buttons: Batal & Ajukan Reimbursement -->
      <div class="flex items-center justify-end gap-2 pt-0.5">
        <NuxtLink
          to="/karyawan/reimbursement"
          class="inline-flex h-8 items-center rounded-md border border-[#dfe8dc] bg-white px-4 text-[10px] font-semibold text-[#263b31] transition-colors hover:bg-[#f8faf6]"
        >
          Batal
        </NuxtLink>

        <button
          type="submit"
          :disabled="isSubmitting || isLoadingTravels || Boolean(successMessage)"
          class="inline-flex h-8 items-center justify-center rounded-md bg-[#f5a623] px-4 text-[10px] font-semibold text-[#173b30] transition-colors hover:bg-[#e99514] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ isSubmitting ? 'Mengirim...' : 'Ajukan Reimbursement' }}
        </button>
      </div>
    </form>
  </section>
</template>
