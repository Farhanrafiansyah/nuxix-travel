<script setup lang="ts">
type PaymentType = 'REIMBURSEMENT' | 'CASH_ADVANCE'

interface PaymentMethod {
  code: string
  label: string
  description: string
}

interface PaymentQueueItem {
  id: number
  transaction_id: string
  transaction_type: PaymentType
  applicant_name: string
  role: string
  department: string
  destination: string
  amount: string | number
  requested_at: string
  status: string
}

interface PaymentHistoryItem {
  id: number
  transaction_id: string
  transaction_type: PaymentType
  applicant_name: string
  role: string
  department: string
  destination: string
  amount: string | number
  payment_date: string | null
  payment_reference: string | null
  payment_method: string | null
  status: 'PAID' | 'DISBURSED'
  processor: { id: number; name: string; role: string } | null
}

interface FinanceSettings {
  annual_budget: string | number
  payment_methods: PaymentMethod[]
}

const authToken = useCookie<string | null>('auth_token')
const queue = ref<PaymentQueueItem[]>([])
const history = ref<PaymentHistoryItem[]>([])
const settings = ref<FinanceSettings | null>(null)
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const actionSuccess = ref('')

const activeModal = ref<'pay' | 'settings' | null>(null)
const selectedPayment = ref<PaymentQueueItem | null>(null)
const isProcessing = ref(false)
const isSavingSettings = ref(false)
const payForm = reactive({ reference: '', method: '' })
const settingsForm = reactive({
  annual_budget: null as number | null,
  payment_methods: [] as PaymentMethod[]
})

const formatCurrency = (amount: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

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

const paidThisMonth = computed(() => {
  const now = new Date()
  return history.value.filter((item) => {
    if (!item.payment_date) return false
    const paidDate = new Date(item.payment_date)
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear()
  })
})

const paidThisMonthAmount = computed(() => paidThisMonth.value.reduce(
  (sum, item) => sum + Number(item.amount || 0),
  0
))

const statCards = computed(() => [
  {
    label: 'Antrean Pembayaran',
    value: String(queue.value.length),
    note: `Total ${formatCurrency(queue.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))}`,
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Dibayarkan Bulan Ini',
    value: formatCurrency(paidThisMonthAmount.value),
    note: `${paidThisMonth.value.length} transaksi`,
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Riwayat Pembayaran',
    value: String(history.value.length),
    note: 'Reimbursement dibayar dan uang muka dicairkan',
    accent: 'border-l-[#e0a93a]'
  }
])

const loadPayments = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const [queueResponse, historyResponse, settingsResponse] = await Promise.all([
      $fetch<{ queue: PaymentQueueItem[] }>('http://localhost:8000/api/finance/payments/queue', { headers }),
      $fetch<{ history: PaymentHistoryItem[] }>('http://localhost:8000/api/finance/payments/history', { headers }),
      $fetch<{ settings: FinanceSettings }>('http://localhost:8000/api/finance/settings', { headers })
    ])

    queue.value = queueResponse.queue
    history.value = historyResponse.history
    settings.value = settingsResponse.settings
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat data pembayaran.', error)
    loadError.value = statusCode === 403
      ? 'Akses ditolak. Masuklah menggunakan akun Tim Keuangan atau Super Admin.'
      : fetchError.data?.message || 'Data pembayaran belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

const openPayModal = (item: PaymentQueueItem) => {
  selectedPayment.value = item
  payForm.reference = ''
  payForm.method = settings.value?.payment_methods[0]?.code || ''
  actionError.value = ''
  actionSuccess.value = ''
  activeModal.value = 'pay'
}

const closeModal = () => {
  activeModal.value = null
  selectedPayment.value = null
}

const submitPayment = async () => {
  if (!selectedPayment.value || !authToken.value) return
  isProcessing.value = true
  actionError.value = ''

  const pathType = selectedPayment.value.transaction_type === 'REIMBURSEMENT'
    ? 'reimbursement'
    : 'cash-advance'

  try {
    await $fetch(
      `http://localhost:8000/api/finance/payments/${pathType}/${selectedPayment.value.id}/process`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken.value}` },
        body: {
          payment_reference: payForm.reference.trim(),
          payment_method: payForm.method
        }
      }
    )
    actionSuccess.value = `${selectedPayment.value.transaction_id} berhasil diproses.`
    closeModal()
    await loadPayments()
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memproses pembayaran.', error)
    actionError.value = fetchError.data?.message || 'Pembayaran belum dapat diproses.'
  } finally {
    isProcessing.value = false
  }
}

const openSettingsModal = () => {
  if (!settings.value) return
  settingsForm.annual_budget = Number(settings.value.annual_budget)
  settingsForm.payment_methods = settings.value.payment_methods.map((method) => ({ ...method }))
  actionError.value = ''
  activeModal.value = 'settings'
}

const addPaymentMethod = () => {
  settingsForm.payment_methods.push({ code: '', label: '', description: '' })
}

const saveSettings = async () => {
  if (!authToken.value || settingsForm.annual_budget === null) return
  isSavingSettings.value = true
  actionError.value = ''

  try {
    const response = await $fetch<{ settings: FinanceSettings }>('http://localhost:8000/api/finance/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: {
        annual_budget: settingsForm.annual_budget,
        payment_methods: settingsForm.payment_methods
      }
    })
    settings.value = response.settings
    actionSuccess.value = 'Pengaturan keuangan berhasil disimpan.'
    closeModal()
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status
    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal menyimpan pengaturan keuangan.', error)
    actionError.value = fetchError.data?.message || 'Pengaturan belum dapat disimpan.'
  } finally {
    isSavingSettings.value = false
  }
}

onMounted(loadPayments)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Pembayaran</h1>
        <p class="mt-1 text-xs text-[#718078]">Proses transaksi siap bayar dan lihat riwayat yang tercatat di backend.</p>
      </div>
      <button
        type="button"
        class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60"
        :disabled="isLoading"
        @click="loadPayments"
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
      >
        <p class="text-[10px] font-medium text-[#718078]">{{ card.label }}</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ isLoading ? '…' : card.value }}</p>
        <p class="mt-1 text-[10px] text-[#7b8980]">{{ card.note }}</p>
      </section>
      <section class="relative rounded-xl border border-l-[3px] border-[#dfe8dc] border-l-[#2f6b5e] bg-white px-4 py-3">
        <button type="button" class="absolute right-3 top-2.5 rounded px-1.5 py-0.5 text-[10px] text-[#718078] hover:bg-[#f1f5ee]" @click="openSettingsModal">
          Ubah
        </button>
        <p class="text-[10px] font-medium text-[#718078]">Metode Pembayaran</p>
        <p class="mt-1 font-serif text-base font-bold text-[#173b30]">
          {{ settings?.payment_methods.map((method) => method.label).join(', ') || '—' }}
        </p>
        <p class="mt-1 text-[10px] text-[#7b8980]">Diatur melalui pengaturan keuangan</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="payment-queue-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="payment-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Antrean Pembayaran</h2>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[900px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th class="px-2.5 py-2.5">ID Transaksi</th>
              <th class="px-2.5 py-2.5">Pemohon</th>
              <th class="px-2.5 py-2.5">Role / Departemen</th>
              <th class="px-2.5 py-2.5">Jenis</th>
              <th class="px-2.5 py-2.5">Tujuan</th>
              <th class="px-2.5 py-2.5">Nominal</th>
              <th class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat antrean pembayaran...</td>
            </tr>
            <tr v-else-if="queue.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Tidak ada transaksi yang siap dibayar.</td>
            </tr>
            <tr v-for="item in queue" v-else :key="item.transaction_id" class="hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ item.transaction_id }}</td>
              <td class="px-2.5 py-3 font-semibold">{{ item.applicant_name }}</td>
              <td class="px-2.5 py-3">{{ item.role }} · {{ item.department }}</td>
              <td class="px-2.5 py-3">{{ item.transaction_type === 'REIMBURSEMENT' ? 'Reimbursement' : 'Uang Muka' }}</td>
              <td class="px-2.5 py-3">{{ item.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.amount) }}</td>
              <td class="px-2.5 py-3">
                <button
                  type="button"
                  class="rounded-md bg-[#f0ad4e] px-3 py-1.5 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443] disabled:opacity-50"
                  :disabled="!settings?.payment_methods.length"
                  @click="openPayModal(item)"
                >
                  Bayar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="payment-history-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="payment-history-heading" class="font-serif text-sm font-bold text-[#173b30]">Riwayat Transaksi</h2>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[1000px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th class="px-2.5 py-2.5">Tanggal</th>
              <th class="px-2.5 py-2.5">ID Transaksi</th>
              <th class="px-2.5 py-2.5">Pemohon</th>
              <th class="px-2.5 py-2.5">Jenis</th>
              <th class="px-2.5 py-2.5">Nominal</th>
              <th class="px-2.5 py-2.5">Referensi</th>
              <th class="px-2.5 py-2.5">Metode</th>
              <th class="px-2.5 py-2.5">Diproses oleh</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="8" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat riwayat transaksi...</td>
            </tr>
            <tr v-else-if="history.length === 0">
              <td colspan="8" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada transaksi yang tercatat.</td>
            </tr>
            <tr v-for="item in history" v-else :key="item.transaction_id" class="hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(item.payment_date) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ item.transaction_id }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-semibold">{{ item.applicant_name }}</td>
              <td class="px-2.5 py-3">{{ item.transaction_type === 'REIMBURSEMENT' ? 'Reimbursement' : 'Uang Muka' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.amount) }}</td>
              <td class="px-2.5 py-3">{{ item.payment_reference || '—' }}</td>
              <td class="px-2.5 py-3">{{ settings?.payment_methods.find((method) => method.code === item.payment_method)?.label || item.payment_method || '—' }}</td>
              <td class="px-2.5 py-3">{{ item.processor?.name || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="activeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6" @click.self="closeModal">
      <form
        v-if="activeModal === 'pay' && selectedPayment"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        @submit.prevent="submitPayment"
      >
        <h2 class="font-serif text-base font-bold text-[#173b30]">Konfirmasi Pembayaran</h2>
        <p class="mt-1 text-[10px] text-[#718078]">
          {{ selectedPayment.transaction_id }} · {{ formatCurrency(selectedPayment.amount) }}
        </p>
        <label class="mt-4 block">
          <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nomor referensi transaksi</span>
          <input v-model="payForm.reference" type="text" required maxlength="100" class="h-9 w-full rounded-md border border-[#dfe8dc] px-3 text-[11px]">
        </label>
        <label class="mt-3 block">
          <span class="mb-1 block text-[10px] font-medium text-[#718078]">Metode pembayaran</span>
          <select v-model="payForm.method" required class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px]">
            <option v-for="method in settings?.payment_methods || []" :key="method.code" :value="method.code">
              {{ method.label }}
            </option>
          </select>
        </label>
        <p v-if="actionError" class="mt-3 text-[10px] text-rose-700" role="alert">{{ actionError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] disabled:opacity-50" :disabled="isProcessing">
            {{ isProcessing ? 'Memproses...' : 'Konfirmasi Bayar' }}
          </button>
        </div>
      </form>

      <form
        v-else-if="activeModal === 'settings'"
        class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        @submit.prevent="saveSettings"
      >
        <h2 class="font-serif text-base font-bold text-[#173b30]">Pengaturan Keuangan</h2>
        <label class="mt-4 block">
          <span class="mb-1 block text-[10px] font-medium text-[#718078]">Anggaran tahunan (Rp)</span>
          <input v-model.number="settingsForm.annual_budget" type="number" min="0" step="1" required class="h-9 w-full rounded-md border border-[#dfe8dc] px-3 text-[11px]">
        </label>
        <div class="mt-4 flex items-center justify-between">
          <h3 class="text-xs font-semibold text-[#31513f]">Metode pembayaran</h3>
          <button type="button" class="text-[10px] font-semibold text-[#9a5a12]" @click="addPaymentMethod">+ Tambah</button>
        </div>
        <div v-for="(method, index) in settingsForm.payment_methods" :key="index" class="mt-3 rounded-lg border border-[#e8eee5] p-3">
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="text-[10px] text-[#718078]">
              Kode
              <input v-model="method.code" type="text" required maxlength="100" class="mt-1 h-8 w-full rounded border border-[#dfe8dc] px-2 text-[10px]">
            </label>
            <label class="text-[10px] text-[#718078]">
              Nama metode
              <input v-model="method.label" type="text" required maxlength="100" class="mt-1 h-8 w-full rounded border border-[#dfe8dc] px-2 text-[10px]">
            </label>
          </div>
          <label class="mt-2 block text-[10px] text-[#718078]">
            Keterangan
            <input v-model="method.description" type="text" maxlength="500" class="mt-1 h-8 w-full rounded border border-[#dfe8dc] px-2 text-[10px]">
          </label>
          <button v-if="settingsForm.payment_methods.length > 1" type="button" class="mt-2 text-[10px] text-rose-700" @click="settingsForm.payment_methods.splice(index, 1)">
            Hapus metode
          </button>
        </div>
        <p v-if="actionError" class="mt-3 text-[10px] text-rose-700" role="alert">{{ actionError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] disabled:opacity-50" :disabled="isSavingSettings">
            {{ isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
