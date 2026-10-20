<script setup lang="ts">
type TravelRequest = {
  id: number
  destination: string
  start_date: string
  end_date: string
  status: string
}

type CashAdvance = {
  id: number
  travel_request_id: number
  estimated_cost: string
  requested_amount: string
  returned_amount: string
  status: 'WAITING_PAYMENT' | 'DISBURSED'
  status_label: string
  travel: {
    id: number
    destination: string
    start_date: string
    end_date: string
  }
}

const authToken = useCookie<string | null>('auth_token')
const advances = ref<CashAdvance[]>([])
const eligibleTravels = ref<TravelRequest[]>([])
const isLoading = ref(true)
const isLoadingTravels = ref(false)
const isSubmitting = ref(false)
const isFormOpen = ref(false)
const loadError = ref('')
const formError = ref('')
const successMessage = ref('')
const selectedTravelId = ref('')
const estimatedCost = ref('')
const requestedAmount = ref('')

const statusLabels: Record<CashAdvance['status'], string> = {
  WAITING_PAYMENT: 'Menunggu Pembayaran',
  DISBURSED: 'Dicairkan'
}

const statusStyles: Record<CashAdvance['status'], string> = {
  WAITING_PAYMENT: 'bg-[#fff0df] text-[#b75d11]',
  DISBURSED: 'bg-[#e4f0e1] text-[#456d43]'
}

const formatCurrency = (amount: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

const travelLabel = (travel: TravelRequest | CashAdvance['travel']) =>
  `${travel.destination} (TRV-${String(travel.id).padStart(4, '0')})`

const loadAdvances = async () => {
  isLoading.value = true
  loadError.value = ''

  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  try {
    const response = await $fetch<{ cashAdvances: CashAdvance[] }>(
      'http://localhost:8000/api/cash-advances/my',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    advances.value = response.cashAdvances
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    loadError.value = fetchError.data?.message || 'Riwayat uang muka belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

const openRequestForm = async () => {
  isFormOpen.value = true
  formError.value = ''
  successMessage.value = ''

  if (eligibleTravels.value.length || isLoadingTravels.value) return

  isLoadingTravels.value = true
  try {
    const response = await $fetch<{ requests: TravelRequest[] }>(
      'http://localhost:8000/api/travels/my-requests',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    eligibleTravels.value = response.requests.filter((travel) =>
      ['APPROVED', 'FULFILLED'].includes(travel.status)
    )
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    formError.value = fetchError.data?.message || 'Daftar perjalanan untuk pengajuan belum dapat dimuat.'
  } finally {
    isLoadingTravels.value = false
  }
}

const submitRequest = async () => {
  formError.value = ''
  const travelId = Number(selectedTravelId.value)
  const estimated = Number(estimatedCost.value)
  const requested = Number(requestedAmount.value)

  if (!Number.isInteger(travelId) || travelId <= 0) {
    formError.value = 'Pilih perjalanan dinas yang disetujui terlebih dahulu.'
    return
  }
  if (!Number.isFinite(estimated) || estimated <= 0 || !Number.isFinite(requested) || requested <= 0) {
    formError.value = 'Estimasi biaya dan jumlah diminta harus lebih besar dari nol.'
    return
  }
  if (requested > estimated) {
    formError.value = 'Jumlah uang muka tidak boleh melebihi estimasi biaya.'
    return
  }

  isSubmitting.value = true
  try {
    const response = await $fetch<{ message: string }>('http://localhost:8000/api/cash-advances', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: {
        travel_id: travelId,
        estimated_cost: estimated,
        requested_amount: requested
      }
    })
    successMessage.value = response.message || 'Pengajuan uang muka berhasil dikirim.'
    await loadAdvances()
    isFormOpen.value = false
    selectedTravelId.value = ''
    estimatedCost.value = ''
    requestedAmount.value = ''
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    formError.value = fetchError.data?.message || 'Pengajuan uang muka belum dapat dikirim.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(loadAdvances)
</script>

<template>
  <section class="dashboard-page space-y-4 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Pengajuan Uang Muka</h1>
        <p class="mt-1 text-xs font-medium text-[#718078]">Ajukan dan pantau uang muka perjalanan dinas Anda.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-md bg-[#f5a623] px-4 text-xs font-semibold text-[#173b30] transition-colors hover:bg-[#e99514]"
        @click="openRequestForm"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajukan Uang Muka
      </button>
    </div>

    <div v-if="successMessage" class="rounded-md border border-[#d5e8d1] bg-[#edf6ea] px-3 py-2 text-[10px] text-[#456d43]" role="status">
      {{ successMessage }}
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="advance-history-heading">
      <h2 id="advance-history-heading" class="px-4 pb-2 pt-3 font-serif text-sm font-bold text-[#173b30]">
        Riwayat Uang Muka
      </h2>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[680px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2">ID</th>
              <th scope="col" class="px-2.5 py-2">Perjalanan</th>
              <th scope="col" class="px-2.5 py-2">Estimasi Biaya</th>
              <th scope="col" class="px-2.5 py-2">Jumlah Diminta</th>
              <th scope="col" class="px-2.5 py-2">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat riwayat uang muka...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#a33c32]">{{ loadError }}</td>
            </tr>
            <tr v-else-if="advances.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-xs text-[#7b8980]">Belum ada data pengajuan uang muka.</td>
            </tr>
            <tr v-for="advance in advances" v-else :key="advance.id">
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">UM-{{ String(advance.id).padStart(4, '0') }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ travelLabel(advance.travel) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatCurrency(advance.estimated_cost) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatCurrency(advance.requested_amount) }}</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[advance.status]">
                  {{ statusLabels[advance.status] }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="h-2" />
    </section>

    <div
      v-if="isFormOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/30 px-4 py-6"
      role="presentation"
      @click.self="isFormOpen = false"
    >
      <section
        class="w-full max-w-lg rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-form-heading"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="request-form-heading" class="font-serif text-base font-bold text-[#173b30]">Ajukan Uang Muka</h2>
            <p class="mt-1 text-[10px] text-[#718078]">Pilih perjalanan yang disetujui dan isi nominal sesuai kebutuhan.</p>
          </div>
          <button type="button" class="text-lg leading-none text-[#718078] hover:text-[#173b30]" aria-label="Tutup" @click="isFormOpen = false">×</button>
        </div>

        <form class="mt-4 space-y-3" @submit.prevent="submitRequest">
          <label class="block">
            <span class="mb-1 block text-[9px] font-semibold text-[#728078]">Perjalanan</span>
            <select
              v-model="selectedTravelId"
              required
              :disabled="isLoadingTravels || !eligibleTravels.length"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31] focus:border-[#9ab397] focus:outline-none disabled:text-[#9ca3af]"
            >
              <option value="" disabled>
                {{ isLoadingTravels ? 'Memuat perjalanan...' : 'Pilih perjalanan' }}
              </option>
              <option v-for="travel in eligibleTravels" :key="travel.id" :value="String(travel.id)">
                {{ travelLabel(travel) }}
              </option>
            </select>
            <span v-if="!isLoadingTravels && !eligibleTravels.length" class="mt-1 block text-[9px] text-[#8b968e]">
              Tidak ada perjalanan berstatus disetujui atau berlangsung.
            </span>
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-[9px] font-semibold text-[#728078]">Estimasi Biaya</span>
              <input v-model="estimatedCost" required min="1" step="1" type="number" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
            </label>
            <label class="block">
              <span class="mb-1 block text-[9px] font-semibold text-[#728078]">Jumlah Diminta</span>
              <input v-model="requestedAmount" required min="1" step="1" type="number" class="h-9 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-3 text-[10px] text-[#263b31] focus:border-[#9ab397] focus:outline-none">
            </label>
          </div>

          <p v-if="formError" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700" role="alert">
            {{ formError }}
          </p>

          <div class="flex justify-end gap-2 pt-1">
            <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#263b31] hover:bg-[#f8faf6]" @click="isFormOpen = false">
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting || isLoadingTravels || !eligibleTravels.length"
              class="h-8 rounded-md bg-[#f5a623] px-3 text-[10px] font-semibold text-[#173b30] hover:bg-[#e99514] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSubmitting ? 'Mengirim...' : 'Ajukan' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>
