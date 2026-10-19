<script setup lang="ts">
type CashAdvance = {
  id: number
  user_id: number
  travel_request_id: number
  estimated_cost: string
  requested_amount: string
  returned_amount: string
  status: 'WAITING_PAYMENT' | 'DISBURSED'
  created_at: string
  user: {
    id: number
    name: string
    department: string
  }
  travelRequest: {
    id: number
    destination: string
    start_date: string
    end_date: string
  }
}

const authToken = useCookie<string | null>('auth_token')
const advances = ref<CashAdvance[]>([])
const isLoading = ref(true)
const loadError = ref('')
const searchQuery = ref('')
const selectedStatus = ref('Semua Status')
const currentPage = ref(1)
const pageSize = 8
const selectedAdvance = ref<CashAdvance | null>(null)

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

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const loadAdvances = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const response = await $fetch<{ pending: CashAdvance[] }>(
      'http://localhost:8000/api/cash-advances/pending',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )

    if (!Array.isArray(response.pending)) {
      throw new Error('Respons server tidak memiliki daftar pengajuan yang valid.')
    }

    advances.value = response.pending
  } catch (error) {
    const fetchError = error as {
      status?: number
      statusCode?: number
      data?: { message?: string }
      message?: string
    }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat daftar uang muka Tim Keuangan.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Masuklah menggunakan akun Tim Keuangan atau Super Admin.'
      : fetchError.data?.message || fetchError.message || 'Daftar uang muka belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

const filteredAdvances = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')

  return advances.value.filter((advance) => {
    const matchesSearch = !query || [
      `UM-${String(advance.id).padStart(4, '0')}`,
      advance.user?.name,
      advance.user?.department,
      advance.travelRequest?.destination
    ].some((value) => value?.toLocaleLowerCase('id-ID').includes(query))

    const matchesStatus = selectedStatus.value === 'Semua Status'
      || statusLabels[advance.status] === selectedStatus.value

    return matchesSearch && matchesStatus
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAdvances.value.length / pageSize)))
const paginatedAdvances = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAdvances.value.slice(start, start + pageSize)
})
const totalRequestedAmount = computed(() => advances.value.reduce(
  (total, advance) => total + Number(advance.requested_amount || 0),
  0
))

watch([searchQuery, selectedStatus], () => {
  currentPage.value = 1
})

onMounted(loadAdvances)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Pengajuan Uang Muka</h1>
        <p class="mt-1 text-xs text-[#718078]">Pantau pengajuan uang muka perjalanan dari seluruh pengguna.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        @click="loadAdvances"
      >
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" />
        </svg>
        Muat Ulang
      </button>
    </div>

    <div class="rounded-lg border border-[#eadfbe] bg-[#fff9e9] px-3.5 py-3 text-[11px] leading-relaxed text-[#755b24]" role="note">
      Daftar ini memuat pengajuan dari seluruh pengguna yang menunggu pembayaran. Data uang muka yang sudah dicairkan belum tersedia melalui endpoint backend saat ini.
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <section class="rounded-xl border border-[#dfe8dc] bg-white px-4 py-3" aria-label="Jumlah pengajuan">
        <p class="text-[10px] font-medium uppercase tracking-wide text-[#718078]">Pengajuan menunggu pembayaran</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ advances.length }}</p>
      </section>
      <section class="rounded-xl border border-[#dfe8dc] bg-white px-4 py-3" aria-label="Total uang muka">
        <p class="text-[10px] font-medium uppercase tracking-wide text-[#718078]">Total nominal diminta</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ formatCurrency(totalRequestedAmount) }}</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="cash-advance-list-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee5] px-4 py-3">
        <h2 id="cash-advance-list-heading" class="font-serif text-sm font-bold text-[#173b30]">Daftar Pengajuan</h2>
        <div class="flex w-full flex-wrap gap-2 sm:w-auto">
          <label class="min-w-52 flex-1 sm:w-72 sm:flex-none">
            <span class="sr-only">Cari karyawan, ID, atau tujuan</span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Cari karyawan, ID, atau tujuan..."
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] placeholder:text-[#8b968e] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label>
            <span class="sr-only">Filter status</span>
            <select
              v-model="selectedStatus"
              class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option>Semua Status</option>
              <option>Menunggu Pembayaran</option>
            </select>
          </label>
        </div>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[760px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">ID</th>
              <th scope="col" class="px-2.5 py-2.5">Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Nominal</th>
              <th scope="col" class="px-2.5 py-2.5">Tanggal</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
              <th scope="col" class="px-2.5 py-2.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat pengajuan uang muka...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="filteredAdvances.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                {{ advances.length ? 'Tidak ada pengajuan yang cocok dengan pencarian atau filter.' : 'Belum ada pengajuan uang muka yang menunggu pembayaran.' }}
              </td>
            </tr>
            <tr v-for="advance in paginatedAdvances" v-else :key="advance.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">UM-{{ String(advance.id).padStart(4, '0') }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(advance.user?.name || `Karyawan ${advance.user_id}`) }}
                  </span>
                  <span>
                    <span class="block font-semibold">{{ advance.user?.name || `Karyawan #${advance.user_id}` }}</span>
                    <span class="mt-0.5 block text-[9px] text-[#7b8980]">{{ advance.user?.department || '—' }}</span>
                  </span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ advance.travelRequest?.destination || 'Perjalanan Dinas' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(advance.requested_amount) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(advance.created_at) }}</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[advance.status]">
                  {{ statusLabels[advance.status] }}
                </span>
              </td>
              <td class="px-2.5 py-3 text-center">
                <button
                  type="button"
                  class="rounded-md border border-[#dfe8dc] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6]"
                  @click="selectedAdvance = advance"
                >
                  Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-end gap-2 border-t border-[#e8eee5] px-4 py-3">
        <button
          type="button"
          :disabled="currentPage === 1"
          class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] text-[#31513f] disabled:cursor-not-allowed disabled:opacity-40"
          @click="currentPage -= 1"
        >
          Sebelumnya
        </button>
        <span class="text-[10px] text-[#718078]">Halaman {{ currentPage }} dari {{ totalPages }}</span>
        <button
          type="button"
          :disabled="currentPage === totalPages"
          class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] text-[#31513f] disabled:cursor-not-allowed disabled:opacity-40"
          @click="currentPage += 1"
        >
          Berikutnya
        </button>
      </div>
    </section>

    <div
      v-if="selectedAdvance"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6"
      role="presentation"
      @click.self="selectedAdvance = null"
    >
      <section
        class="w-full max-w-lg rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-advance-detail-heading"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="cash-advance-detail-heading" class="font-serif text-base font-bold text-[#173b30]">Detail Uang Muka</h2>
            <p class="mt-1 text-[10px] text-[#718078]">UM-{{ String(selectedAdvance.id).padStart(4, '0') }}</p>
          </div>
          <button
            type="button"
            class="rounded px-2 text-lg leading-none text-[#718078] hover:text-[#173b30]"
            aria-label="Tutup detail"
            @click="selectedAdvance = null"
          >
            ×
          </button>
        </div>

        <dl class="mt-5 grid gap-x-5 gap-y-4 text-xs sm:grid-cols-2">
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Karyawan</dt>
            <dd class="mt-1 text-[#263b31]">{{ selectedAdvance.user?.name || `Karyawan #${selectedAdvance.user_id}` }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Departemen</dt>
            <dd class="mt-1 text-[#263b31]">{{ selectedAdvance.user?.department || '—' }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Tujuan Perjalanan</dt>
            <dd class="mt-1 text-[#263b31]">{{ selectedAdvance.travelRequest?.destination || 'Perjalanan Dinas' }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Tanggal Pengajuan</dt>
            <dd class="mt-1 text-[#263b31]">{{ formatDate(selectedAdvance.created_at) }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Tanggal Perjalanan</dt>
            <dd class="mt-1 text-[#263b31]">{{ formatDate(selectedAdvance.travelRequest?.start_date) }} – {{ formatDate(selectedAdvance.travelRequest?.end_date) }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Status</dt>
            <dd class="mt-1 text-[#263b31]">{{ statusLabels[selectedAdvance.status] }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Estimasi Biaya</dt>
            <dd class="mt-1 text-[#263b31]">{{ formatCurrency(selectedAdvance.estimated_cost) }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Nominal Diminta</dt>
            <dd class="mt-1 font-semibold text-[#173b30]">{{ formatCurrency(selectedAdvance.requested_amount) }}</dd>
          </div>
          <div>
            <dt class="text-[9px] font-semibold uppercase tracking-wide text-[#718078]">Nominal Dikembalikan</dt>
            <dd class="mt-1 text-[#263b31]">{{ formatCurrency(selectedAdvance.returned_amount) }}</dd>
          </div>
        </dl>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]"
            @click="selectedAdvance = null"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  </section>
</template>