<script setup lang="ts">
type ReimbursementStatus = 'SUBMITTED' | 'NEEDS_DOCUMENTS' | 'VERIFIED' | 'PAID' | 'REJECTED'

interface ReimbursementItem {
  category: string
  amount: string | number
  receipt_url: string | null
}

interface ReimbursementRecord {
  id: number
  user_id: number
  total_amount: string | number
  status: ReimbursementStatus
  created_at: string
  user: { name: string; department: string } | null
  travelRequest: { destination: string } | null
  items: ReimbursementItem[]
}

interface CashAdvanceRecord {
  id: number
  user_id: number
  requested_amount: string | number
  status: 'WAITING_PAYMENT' | 'DISBURSED'
  created_at: string
  user: { name: string; department: string } | null
  travelRequest: { destination: string } | null
}

const authToken = useCookie<string | null>('auth_token')
const reimbursements = ref<ReimbursementRecord[]>([])
const advances = ref<CashAdvanceRecord[]>([])
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const actionSuccess = ref('')
const processingKey = ref<string | null>(null)

const formatCurrency = (amount: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

const submittedReimbursements = computed(() => reimbursements.value
  .filter((item) => item.status === 'SUBMITTED')
  .sort((a, b) => a.created_at.localeCompare(b.created_at)))

const waitingAdvances = computed(() => advances.value
  .filter((item) => item.status === 'WAITING_PAYMENT')
  .sort((a, b) => a.created_at.localeCompare(b.created_at)))

const incompleteReceiptCount = computed(() => submittedReimbursements.value.filter(
  (item) => item.items.length === 0 || item.items.some((entry) => !entry.receipt_url)
).length)

const totalReimbursementWaiting = computed(() => submittedReimbursements.value.reduce(
  (sum, item) => sum + Number(item.total_amount || 0),
  0
))

const totalAdvanceWaiting = computed(() => waitingAdvances.value.reduce(
  (sum, item) => sum + Number(item.requested_amount || 0),
  0
))

const paidReimbursementTotal = computed(() => reimbursements.value
  .filter((item) => item.status === 'PAID')
  .reduce((sum, item) => sum + Number(item.total_amount || 0), 0))

const statCards = computed(() => [
  {
    label: 'Reimbursement Menunggu Verifikasi',
    value: String(submittedReimbursements.value.length),
    note: `Total ${formatCurrency(totalReimbursementWaiting.value)}`,
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Uang Muka Menunggu Pencairan',
    value: String(waitingAdvances.value.length),
    note: `Total ${formatCurrency(totalAdvanceWaiting.value)}`,
    accent: 'border-l-[#e0a93a]'
  },
  {
    label: 'Reimbursement Berstatus Dibayar',
    value: formatCurrency(paidReimbursementTotal.value),
    note: 'Total seluruh waktu; backend belum menyediakan tanggal pembayaran',
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Bukti Reimbursement Tidak Lengkap',
    value: String(incompleteReceiptCount.value),
    note: 'Dihitung dari item tanpa tautan bukti',
    accent: 'border-l-[#a8403a]'
  }
])

const loadDashboard = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''
  actionError.value = ''

  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const [reimbursementResponse, advanceResponse] = await Promise.all([
      $fetch<{ reimbursements: ReimbursementRecord[] }>(
        'http://localhost:8000/api/reimbursements',
        { headers }
      ),
      $fetch<{ pending: CashAdvanceRecord[] }>(
        'http://localhost:8000/api/cash-advances/pending',
        { headers }
      )
    ])

    reimbursements.value = reimbursementResponse.reimbursements
    advances.value = advanceResponse.pending
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

const processReimbursement = async (
  id: number,
  status: Extract<ReimbursementStatus, 'VERIFIED' | 'NEEDS_DOCUMENTS' | 'REJECTED'>
) => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  processingKey.value = `reimbursement-${id}`
  actionError.value = ''
  actionSuccess.value = ''

  try {
    await $fetch(`http://localhost:8000/api/reimbursements/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: { status }
    })
    actionSuccess.value = `Status reimbursement RB-${String(id).padStart(4, '0')} berhasil diperbarui.`
    await loadDashboard()
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memproses reimbursement.', error)
    actionError.value = fetchError.data?.message || 'Reimbursement belum dapat diproses.'
  } finally {
    processingKey.value = null
  }
}

const processAdvance = async (id: number) => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  processingKey.value = `advance-${id}`
  actionError.value = ''
  actionSuccess.value = ''

  try {
    await $fetch(`http://localhost:8000/api/cash-advances/${id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    actionSuccess.value = `Uang muka UM-${String(id).padStart(4, '0')} berhasil dicairkan.`
    await loadDashboard()
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal mencairkan uang muka.', error)
    actionError.value = fetchError.data?.message || 'Uang muka belum dapat dicairkan.'
  } finally {
    processingKey.value = null
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Dashboard Tim Keuangan</h1>
        <p class="mt-1 text-xs text-[#718078]">Pantau reimbursement dan uang muka yang memerlukan tindak lanjut.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isLoading"
        @click="loadDashboard"
      >
        {{ isLoading ? 'Memuat...' : 'Muat Ulang' }}
      </button>
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
    </div>
    <div v-if="actionError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ actionError }}
    </div>
    <div v-if="actionSuccess" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800" role="status">
      {{ actionSuccess }}
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
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ isLoading ? '…' : card.value }}</p>
        <p class="mt-1 text-[10px] text-[#7b8980]">{{ card.note }}</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="reimbursement-queue-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee5] px-4 py-3">
        <h2 id="reimbursement-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Antrean Verifikasi Reimbursement</h2>
        <NuxtLink to="/tim-keuangan/reimbursement-verifikasi" class="text-[10px] font-semibold text-[#9a5a12] hover:underline">
          Lihat semua
        </NuxtLink>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[800px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Pemohon</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Rincian</th>
              <th scope="col" class="px-2.5 py-2.5">Nominal</th>
              <th scope="col" class="px-2.5 py-2.5">Bukti</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="6" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat reimbursement...</td>
            </tr>
            <tr v-else-if="submittedReimbursements.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-xs text-[#7b8980]">Tidak ada reimbursement yang menunggu verifikasi.</td>
            </tr>
            <tr v-for="item in submittedReimbursements.slice(0, 4)" v-else :key="item.id">
              <td class="whitespace-nowrap px-2.5 py-3">
                {{ item.user?.name || `Pemohon #${item.user_id}` }}
                <span class="mt-0.5 block text-[9px] text-[#7b8980]">RB-{{ String(item.id).padStart(4, '0') }}</span>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ item.travelRequest?.destination || '—' }}</td>
              <td class="px-2.5 py-3">{{ item.items.map((entry) => entry.category).join(', ') || 'Tidak ada rincian' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.total_amount) }}</td>
              <td class="px-2.5 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold"
                  :class="item.items.length > 0 && item.items.every((entry) => entry.receipt_url)
                    ? 'bg-[#e4f0e1] text-[#456d43]'
                    : 'bg-[#fbe3e1] text-[#a8403a]'"
                >
                  {{ item.items.length > 0 && item.items.every((entry) => entry.receipt_url) ? 'Lengkap' : 'Kurang' }}
                </span>
              </td>
              <td class="px-2.5 py-3">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-if="item.items.length > 0 && item.items.every((entry) => entry.receipt_url)"
                    type="button"
                    class="rounded-md border border-[#c9dec2] bg-[#e1efdc] px-2.5 py-1.5 text-[9px] font-semibold text-[#3f6b3a] disabled:opacity-50"
                    :disabled="processingKey !== null"
                    @click="processReimbursement(item.id, 'VERIFIED')"
                  >
                    Verifikasi
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-2.5 py-1.5 text-[9px] font-semibold text-[#a8403a] disabled:opacity-50"
                    :disabled="processingKey !== null"
                    @click="processReimbursement(item.id, 'NEEDS_DOCUMENTS')"
                  >
                    Minta Bukti
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="advance-queue-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee5] px-4 py-3">
        <h2 id="advance-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Uang Muka Menunggu Pencairan</h2>
        <NuxtLink to="/tim-keuangan/uang-muka" class="text-[10px] font-semibold text-[#9a5a12] hover:underline">
          Lihat semua
        </NuxtLink>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[640px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Pemohon</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Nominal Diminta</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="4" class="px-4 py-10 text-center text-xs text-[#7b8980]">Memuat uang muka...</td>
            </tr>
            <tr v-else-if="waitingAdvances.length === 0">
              <td colspan="4" class="px-4 py-10 text-center text-xs text-[#7b8980]">Tidak ada uang muka yang menunggu pencairan.</td>
            </tr>
            <tr v-for="advance in waitingAdvances.slice(0, 3)" v-else :key="advance.id">
              <td class="whitespace-nowrap px-2.5 py-3">
                {{ advance.user?.name || `Pemohon #${advance.user_id}` }}
                <span class="mt-0.5 block text-[9px] text-[#7b8980]">UM-{{ String(advance.id).padStart(4, '0') }}</span>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ advance.travelRequest?.destination || '—' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(advance.requested_amount) }}</td>
              <td class="px-2.5 py-3">
                <button
                  type="button"
                  class="rounded-md border border-[#c9dec2] bg-[#e1efdc] px-3 py-1.5 text-[9px] font-semibold text-[#3f6b3a] disabled:opacity-50"
                  :disabled="processingKey !== null"
                  @click="processAdvance(advance.id)"
                >
                  {{ processingKey === `advance-${advance.id}` ? 'Memproses...' : 'Cairkan' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-xl border border-[#eadfbe] bg-[#fff9e9] p-4 text-[11px] leading-relaxed text-[#755b24]" role="note">
      Endpoint backend belum menyediakan anggaran bulanan, tanggal pembayaran, atau riwayat pencairan uang muka. Karena itu dashboard ini tidak menampilkan sisa anggaran maupun total pembayaran bulan berjalan.
    </section>
  </section>
</template>
