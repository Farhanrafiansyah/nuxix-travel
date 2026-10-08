<script setup lang="ts">
type ReimbursementStatus = 'SUBMITTED' | 'VERIFIED' | 'PAID' | 'REJECTED'

type Reimbursement = {
  id: string
  destination: string
  totalAmount: number
  receiptComplete: boolean
  status: ReimbursementStatus
  date: string
}

const reimbursements: Reimbursement[] = [
  {
    id: '',
    destination: 'Jakarta',
    totalAmount: 7250000,
    receiptComplete: true,
    status: 'PAID',
    date: ''
  },
  {
    id: '',
    destination: 'Singapore',
    totalAmount: 11850000,
    receiptComplete: true,
    status: 'VERIFIED',
    date: ''
  },
  {
    id: '',
    destination: 'Bali',
    totalAmount: 6400000,
    receiptComplete: true,
    status: 'SUBMITTED',
    date: ''
  }
]

const statusLabels: Record<ReimbursementStatus, string> = {
  SUBMITTED: 'Menunggu Verifikasi',
  VERIFIED: 'Terverifikasi',
  PAID: 'Selesai',
  REJECTED: 'Dikembalikan'
}

const statusStyles: Record<ReimbursementStatus, string> = {
  SUBMITTED: 'bg-[#fbf1df] text-[#b77912]',
  VERIFIED: 'bg-[#e8f0fb] text-[#3566a8]',
  PAID: 'bg-[#e3f2e9] text-[#287849]',
  REJECTED: 'bg-[#fcebea] text-[#c5392f]'
}

const searchQuery = ref('')
const selectedStatus = ref<'ALL' | ReimbursementStatus>('ALL')
const currentPage = ref(1)
const pageSize = 5

const filteredReimbursements = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')

  return reimbursements.filter((reimbursement) => {
    const matchesStatus = selectedStatus.value === 'ALL' || reimbursement.status === selectedStatus.value
    const matchesQuery = !query || [
      reimbursement.id,
      reimbursement.destination,
      reimbursement.totalAmount.toString(),
      statusLabels[reimbursement.status]
    ].some((value) => value.toLocaleLowerCase('id-ID').includes(query))

    return matchesStatus && matchesQuery
  })
})

const totalPages = computed(() => Math.ceil(filteredReimbursements.value.length / pageSize))
const visibleReimbursements = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredReimbursements.value.slice(start, start + pageSize)
})
const firstVisibleRow = computed(() => filteredReimbursements.value.length
  ? (currentPage.value - 1) * pageSize + 1
  : 0)
const lastVisibleRow = computed(() => Math.min(currentPage.value * pageSize, filteredReimbursements.value.length))

watch([searchQuery, selectedStatus], () => {
  currentPage.value = 1
})

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(amount)
</script>

<template>
  <section class="dashboard-page space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Reimbursement Saya</h1>
        <p class="text-xs font-medium text-[#777b87]">Kelola pengajuan penggantian biaya perjalanan dinas.</p>
      </div>
      <button type="button" class="inline-flex h-10 items-center gap-2 rounded-md bg-[#f6a623] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#e99514]">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajukan Reimbursement
      </button>
    </div>

    <section class="overflow-hidden rounded-lg border border-[#eadfce] bg-white" aria-label="Daftar reimbursement">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee7dc] px-2.5 py-2">
        <label class="relative">
          <span class="sr-only">Filter berdasarkan status</span>
          <select
            v-model="selectedStatus"
            class="h-7 appearance-none rounded-md border border-[#eadfce] bg-white py-1 pl-2 pr-6 text-[9px] text-[#34343a] focus:border-[#d79a2e] focus:outline-none"
          >
            <option value="ALL">Status: Semua</option>
            <option value="SUBMITTED">Menunggu Verifikasi</option>
            <option value="VERIFIED">Terverifikasi</option>
            <option value="PAID">Selesai</option>
            <option value="REJECTED">Dikembalikan</option>
          </select>
          <svg class="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#77736a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </label>

        <label class="relative w-full sm:w-[170px]">
          <span class="sr-only">Cari berdasarkan ID atau tujuan</span>
          <svg class="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#77736a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari berdasarkan ID atau tujuan..."
            class="h-7 w-full rounded-md border border-[#eadfce] bg-white pl-6 pr-2 text-[9px] text-[#34343a] placeholder:text-[#8c887f] focus:border-[#d79a2e] focus:outline-none"
          >
        </label>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[680px] border-collapse text-left text-[9px]">
          <thead class="bg-[#faf9f6] text-[8px] font-semibold text-[#77736a]">
            <tr>
              <th scope="col" class="px-3 py-2 font-semibold">ID</th>
              <th scope="col" class="px-3 py-2 font-semibold">Perjalanan</th>
              <th scope="col" class="px-3 py-2 font-semibold">Total Biaya</th>
              <th scope="col" class="px-3 py-2 font-semibold">Bukti</th>
              <th scope="col" class="px-3 py-2 font-semibold">Status</th>
              <th scope="col" class="px-3 py-2 font-semibold">Tanggal</th>
              <th scope="col" class="px-3 py-2 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reimbursement in visibleReimbursements" :key="`${reimbursement.destination}-${reimbursement.status}`" class="border-t border-[#eee7dc] text-[#171717]">
              <td class="whitespace-nowrap px-3 py-2.5 font-medium">{{ reimbursement.id }}</td>
              <td class="whitespace-nowrap px-3 py-2.5">{{ reimbursement.destination }}</td>
              <td class="whitespace-nowrap px-3 py-2.5 font-medium">{{ formatCurrency(reimbursement.totalAmount) }}</td>
              <td class="px-3 py-2.5">
                <span
                  v-if="reimbursement.receiptComplete"
                  class="inline-flex rounded px-1.5 py-0.5 text-[8px] font-semibold"
                  :class="statusStyles.PAID"
                >
                  Lengkap
                </span>
              </td>
              <td class="px-3 py-2.5">
                <span class="inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-semibold" :class="statusStyles[reimbursement.status]">
                  {{ statusLabels[reimbursement.status] }}
                </span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 text-[#77736a]">{{ reimbursement.date }}</td>
              <td class="px-3 py-2 text-center">
                <button type="button" class="rounded border border-[#e8e1d6] bg-white px-2 py-1 text-[8px] font-medium text-[#171717] hover:bg-[#faf9f6]">
                  Detail
                </button>
              </td>
            </tr>
            <tr v-if="visibleReimbursements.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-[10px] text-[#8b877f]">
                Tidak ada data reimbursement yang cocok.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee7dc] px-2.5 py-2 text-[9px] text-[#77736a]">
        <span>Menampilkan {{ firstVisibleRow }}–{{ lastVisibleRow }} dari {{ filteredReimbursements.length }} pengajuan</span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="currentPage <= 1"
            class="h-6 rounded-md border border-[#e8e1d6] px-2 text-[8px] disabled:cursor-not-allowed disabled:text-[#a6a29a]"
            :class="currentPage > 1 ? 'text-[#514d45] hover:bg-[#faf9f6]' : ''"
            @click="currentPage--"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            :disabled="currentPage >= totalPages"
            class="h-6 rounded-md border border-[#e8e1d6] px-2 text-[8px] disabled:cursor-not-allowed disabled:text-[#a6a29a]"
            :class="currentPage < totalPages ? 'text-[#514d45] hover:bg-[#faf9f6]' : ''"
            @click="currentPage++"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </section>
    </section>


</template>