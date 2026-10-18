<script setup lang="ts">
type ReimbursementStatus = 'SUBMITTED' | 'NEEDS_DOCUMENTS' | 'VERIFIED' | 'PAID' | 'REJECTED'

type ReimbursementItem = {
  id: number
  category: string
  amount: string
  receipt_url: string | null
  description: string | null
}

type ReimbursementRecord = {
  id: number
  travel_request_id: number
  total_amount: string
  status: ReimbursementStatus
  created_at: string
  travelRequest: { destination: string } | null
  items: ReimbursementItem[]
}

const route = useRoute()
const authToken = useCookie<string | null>('auth_token')
const reimbursement = ref<ReimbursementRecord | null>(null)
const isLoading = ref(true)
const loadError = ref('')

const reimbursementId = computed(() => {
  const id = Number(route.query.id)
  return Number.isInteger(id) && id > 0 ? id : null
})

const reimbursementCode = computed(() => reimbursement.value
  ? `RB-${String(reimbursement.value.id).padStart(4, '0')}`
  : '')

const statusLabels: Record<ReimbursementStatus, string> = {
  SUBMITTED: 'Menunggu Verifikasi',
  NEEDS_DOCUMENTS: 'Bukti Kurang',
  VERIFIED: 'Terverifikasi',
  PAID: 'Selesai',
  REJECTED: 'Dikembalikan'
}

const statusStyles: Record<ReimbursementStatus, string> = {
  SUBMITTED: 'bg-[#fff0df] text-[#b75d11]',
  NEEDS_DOCUMENTS: 'bg-[#fff4d6] text-[#9a6700]',
  VERIFIED: 'bg-[#e8f0fb] text-[#3566a8]',
  PAID: 'bg-[#e3f2e9] text-[#287849]',
  REJECTED: 'bg-[#fcebea] text-[#c5392f]'
}

const verificationSteps = computed(() => {
  const status = reimbursement.value?.status
  const submitted = status !== undefined
  const verified = status === 'VERIFIED' || status === 'PAID'
  const paid = status === 'PAID'
  const needsDocuments = status === 'NEEDS_DOCUMENTS'
  const rejected = status === 'REJECTED'

  return [
    {
      title: 'Diajukan',
      description: submitted && reimbursement.value ? formatDate(reimbursement.value.created_at) : 'Menunggu pengajuan',
      state: submitted ? 'complete' : 'upcoming'
    },
    {
      title: 'Verifikasi Tim Keuangan',
      description: needsDocuments
        ? 'Bukti perlu dilengkapi'
        : rejected
          ? 'Pengajuan dikembalikan'
          : verified
            ? 'Verifikasi selesai'
            : 'Menunggu verifikasi',
      state: rejected || needsDocuments ? 'attention' : verified ? 'complete' : 'current'
    },
    {
      title: 'Pembayaran Diterima',
      description: paid ? 'Pembayaran selesai' : verified ? 'Menunggu pembayaran' : 'Belum diproses',
      state: paid ? 'complete' : 'upcoming'
    }
  ]
})

const formatCurrency = (amount: number | string) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(value))

const loadReimbursement = async () => {
  isLoading.value = true
  loadError.value = ''

  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  if (!reimbursementId.value) {
    loadError.value = 'ID reimbursement tidak valid atau tidak ditemukan di URL.'
    isLoading.value = false
    return
  }

  try {
    const response = await $fetch<{ reimbursements: ReimbursementRecord[] }>(
      'http://localhost:8000/api/reimbursements/my',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    reimbursement.value = response.reimbursements.find((record) => record.id === reimbursementId.value) || null
    if (!reimbursement.value) {
      loadError.value = 'Detail reimbursement tidak ditemukan.'
    }
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    loadError.value = fetchError.data?.message || 'Detail reimbursement belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

watch(() => route.query.id, loadReimbursement)
onMounted(loadReimbursement)
</script>

<template>
  <section class="dashboard-page space-y-4 pb-8">
    <div v-if="isLoading" class="rounded-lg border border-[#dfe8dc] bg-white px-5 py-12 text-center text-xs text-[#718078]">
      Memuat detail reimbursement...
    </div>

    <div v-else-if="loadError" class="rounded-lg border border-[#eadfce] bg-white px-5 py-12 text-center text-xs text-[#9b3a32]">
      {{ loadError }}
    </div>

    <template v-else-if="reimbursement">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[10px] text-[#728078]">Reimbursement / {{ reimbursementCode }}</p>
          <h1 class="font-serif text-xl font-bold leading-tight text-[#173b30]">
            {{ reimbursement.travelRequest?.destination || `Perjalanan #${reimbursement.travel_request_id}` }}
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full px-2.5 py-2 text-[9px] font-semibold" :class="statusStyles[reimbursement.status]">
            {{ statusLabels[reimbursement.status] }}
          </span>
          <NuxtLink
            to="/karyawan/reimbursement"
            class="inline-flex h-8 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-[10px] font-semibold text-[#263b31] transition-colors hover:bg-[#f8faf6]"
          >
            Kembali
          </NuxtLink>
        </div>
      </header>

      <div class="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
        <article class="min-h-[166px] rounded-lg border border-[#dfe8dc] bg-white p-3.5">
          <h2 class="font-serif text-xs font-bold text-[#173b30]">Rincian Pengeluaran</h2>

          <div class="mt-3 overflow-x-auto">
            <table class="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr class="border-b border-[#edf1eb] text-[9px] font-semibold text-[#728078]">
                  <th scope="col" class="px-2 py-2">Kategori</th>
                  <th scope="col" class="px-2 py-2">Deskripsi</th>
                  <th scope="col" class="px-2 py-2">Nominal</th>
                  <th scope="col" class="px-2 py-2">Bukti</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#edf1eb]">
                <tr v-for="item in reimbursement.items" :key="item.id" class="text-[10px] text-[#263b31]">
                  <td class="px-2 py-2.5">{{ item.category }}</td>
                  <td class="px-2 py-2.5">{{ item.description || '—' }}</td>
                  <td class="whitespace-nowrap px-2 py-2.5">{{ formatCurrency(item.amount) }}</td>
                  <td class="px-2 py-2.5">
                    <a
                      v-if="item.receipt_url"
                      :href="item.receipt_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="whitespace-nowrap font-semibold text-[#9b6816] hover:underline"
                    >
                      Lihat nota
                    </a>
                    <span v-else class="text-[#8b968e]">—</span>
                  </td>
                </tr>
                <tr v-if="!reimbursement.items.length">
                  <td colspan="4" class="px-2 py-5 text-center text-[10px] text-[#7b8980]">
                    Tidak ada rincian pengeluaran.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-2 border-t border-dashed border-[#e5ece2] pt-2 text-right">
            <p class="text-[9px] font-medium text-[#728078]">Total Reimbursement</p>
            <p class="font-serif text-xl font-bold leading-tight text-[#173b30]">
              {{ formatCurrency(reimbursement.total_amount) }}
            </p>
          </div>
        </article>

        <article class="min-h-[166px] rounded-lg border border-[#dfe8dc] bg-white p-3.5">
          <h2 class="font-serif text-xs font-bold text-[#173b30]">Status Verifikasi Keuangan</h2>
          <ol class="mt-3">
            <li
              v-for="(step, index) in verificationSteps"
              :key="step.title"
              class="relative flex min-h-[34px] gap-2.5 pb-2 last:min-h-0 last:pb-0"
            >
              <span
                v-if="index < verificationSteps.length - 1"
                class="absolute left-[3px] top-[8px] h-[calc(100%-2px)] w-px"
                :class="step.state === 'complete' ? 'bg-[#91b48b]' : 'bg-[#e1e9de]'"
                aria-hidden="true"
              />
              <span
                class="relative z-10 mt-0.5 h-[7px] w-[7px] shrink-0 rounded-full"
                :class="{
                  'bg-[#5b8358]': step.state === 'complete',
                  'bg-[#f4b23f] ring-4 ring-[#fff0d1]': step.state === 'current',
                  'bg-[#cfdbca]': step.state === 'upcoming',
                  'bg-[#d17942] ring-4 ring-[#fff0d1]': step.state === 'attention'
                }"
                aria-hidden="true"
              />
              <div class="min-w-0">
                <p class="text-[10px] font-semibold leading-4 text-[#263b31]">{{ step.title }}</p>
                <p class="text-[9px] leading-3 text-[#728078]">{{ step.description }}</p>
              </div>
            </li>
          </ol>
        </article>
      </div>
    </template>
  </section>
</template>
