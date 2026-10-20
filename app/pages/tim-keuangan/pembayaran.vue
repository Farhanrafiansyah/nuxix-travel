<script setup lang="ts">
type PaymentType = 'Reimbursement' | 'Uang Muka'

type PaymentQueueItem = {
  id: number
  employee_name: string
  type: PaymentType
  amount: number
  created_at: string
}

type PaymentHistoryItem = PaymentQueueItem & {
  reference: string
  paid_at: string
}

type ActiveModal = 'add' | 'pay' | 'method' | null

const STORAGE_KEY = 'pembayaran-state-v1'
const paymentTypes: PaymentType[] = ['Reimbursement', 'Uang Muka']

const queue = ref<PaymentQueueItem[]>([])
const history = ref<PaymentHistoryItem[]>([])
const paymentMethod = ref('')
const paymentMethodNote = ref('')
const isHydrated = ref(false)

const activeModal = ref<ActiveModal>(null)
const payingId = ref<number | null>(null)

const addForm = reactive({
  employee_name: '',
  type: 'Reimbursement' as PaymentType,
  amount: null as number | null
})
const payForm = reactive({ reference: '' })
const methodForm = reactive({ method: '', note: '' })

const formatCurrency = (amount: string | number) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(Number(amount))

const formatCompactCurrency = (amount: number) => {
  if (amount < 1_000_000) return formatCurrency(amount)

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

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const totalQueueAmount = computed(() => queue.value.reduce(
  (total, item) => total + Number(item.amount || 0),
  0
))

const paidThisMonth = computed(() => {
  const now = new Date()

  return history.value.filter((item) => {
    const paidAt = new Date(item.paid_at)
    return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear()
  })
})

const paidThisMonthAmount = computed(() => paidThisMonth.value.reduce(
  (total, item) => total + Number(item.amount || 0),
  0
))

const averageProcessDays = computed(() => {
  const rows = history.value.filter((item) => item.created_at && item.paid_at)
  if (!rows.length) return null

  const totalMs = rows.reduce(
    (total, item) => total + (new Date(item.paid_at).getTime() - new Date(item.created_at).getTime()),
    0
  )

  return totalMs / rows.length / 86_400_000
})

const statCards = computed(() => [
  {
    label: 'Antrean Pembayaran',
    value: String(queue.value.length),
    note: `Total ${formatCurrency(totalQueueAmount.value)}`,
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Dibayarkan Bulan Ini',
    value: formatCompactCurrency(paidThisMonthAmount.value),
    note: `${paidThisMonth.value.length} transaksi`,
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Rata-rata Waktu Proses',
    value: averageProcessDays.value === null
      ? '—'
      : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(averageProcessDays.value)} hari`,
    note: 'Sejak verifikasi',
    accent: 'border-l-[#e0a93a]'
  }
])

const closeModal = () => {
  activeModal.value = null
  payingId.value = null
}

const openAddModal = () => {
  addForm.employee_name = ''
  addForm.type = 'Reimbursement'
  addForm.amount = null
  activeModal.value = 'add'
}

const openPayModal = (id: number) => {
  payingId.value = id
  payForm.reference = ''
  activeModal.value = 'pay'
}

const openMethodModal = () => {
  methodForm.method = paymentMethod.value
  methodForm.note = paymentMethodNote.value
  activeModal.value = 'method'
}

const submitAdd = () => {
  queue.value.push({
    id: Date.now(),
    employee_name: addForm.employee_name.trim(),
    type: addForm.type,
    amount: Number(addForm.amount),
    created_at: new Date().toISOString()
  })
  closeModal()
}

const removeFromQueue = (id: number) => {
  queue.value = queue.value.filter((item) => item.id !== id)
}

const submitPay = () => {
  const item = queue.value.find((queued) => queued.id === payingId.value)
  if (!item) return closeModal()

  history.value.unshift({
    ...item,
    reference: payForm.reference.trim(),
    paid_at: new Date().toISOString()
  })
  removeFromQueue(item.id)
  closeModal()
}

const submitMethod = () => {
  paymentMethod.value = methodForm.method.trim()
  paymentMethodNote.value = methodForm.note.trim()
  closeModal()
}

// Data disimpan di browser. Ganti bagian ini dengan pemanggilan API
// ($fetch + Authorization Bearer) ketika endpoint pembayaran sudah tersedia.
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const parsed = JSON.parse(saved)
      queue.value = parsed.queue ?? []
      history.value = parsed.history ?? []
      paymentMethod.value = parsed.paymentMethod ?? ''
      paymentMethodNote.value = parsed.paymentMethodNote ?? ''
    }
  } catch (error) {
    console.error('Gagal membaca data pembayaran dari penyimpanan lokal.', error)
  }

  isHydrated.value = true
})

watch([queue, history, paymentMethod, paymentMethodNote], () => {
  if (!isHydrated.value) return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      queue: queue.value,
      history: history.value,
      paymentMethod: paymentMethod.value,
      paymentMethodNote: paymentMethodNote.value
    }))
  } catch (error) {
    console.error('Gagal menyimpan data pembayaran ke penyimpanan lokal.', error)
  }
}, { deep: true })
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Pembayaran</h1>
      <p class="mt-1 text-xs text-[#718078]">Antrean pembayaran dan riwayat transaksi perjalanan dinas.</p>
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

      <section class="relative rounded-xl border border-l-[3px] border-[#dfe8dc] border-l-[#2f6b5e] bg-white px-4 py-3" aria-label="Metode pembayaran">
        <button
          type="button"
          class="absolute right-3 top-2.5 rounded px-1.5 py-0.5 text-[10px] text-[#718078] transition-colors hover:bg-[#f1f5ee] hover:text-[#173b30]"
          @click="openMethodModal"
        >
          Ubah
        </button>
        <p class="text-[10px] font-medium text-[#718078]">Metode Pembayaran</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ paymentMethod || '—' }}</p>
        <p class="mt-1 text-[10px] text-[#7b8980]">{{ paymentMethodNote || '\u00A0' }}</p>
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="payment-queue-heading">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eee5] px-4 py-3">
        <h2 id="payment-queue-heading" class="font-serif text-sm font-bold text-[#173b30]">Antrean Pembayaran</h2>
        <button
          type="button"
          class="inline-flex h-8 items-center rounded-md border border-[#dfe8dc] bg-white px-3 text-[10px] font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6]"
          @click="openAddModal"
        >
          + Tambah Antrean
        </button>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[640px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Jenis</th>
              <th scope="col" class="px-2.5 py-2.5">Nominal</th>
              <th scope="col" class="px-2.5 py-2.5">Referensi</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="queue.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada antrean pembayaran.</td>
            </tr>
            <tr v-for="item in queue" v-else :key="item.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(item.employee_name) }}
                  </span>
                  <span class="font-semibold">{{ item.employee_name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ item.type }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.amount) }}</td>
              <td class="px-2.5 py-3">—</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full bg-[#fff0df] px-2.5 py-1 text-[9px] font-semibold text-[#b75d11]">
                  Menunggu Pembayaran
                </span>
              </td>
              <td class="px-2.5 py-3">
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="rounded-md bg-[#f0ad4e] px-3 py-1.5 text-[10px] font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443]"
                    @click="openPayModal(item.id)"
                  >
                    Bayar
                  </button>
                  <button
                    type="button"
                    class="rounded px-1.5 text-sm leading-none text-[#718078] transition-colors hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Hapus dari antrean"
                    @click="removeFromQueue(item.id)"
                  >
                    ×
                  </button>
                </div>
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
        <table class="w-full min-w-[640px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Tanggal</th>
              <th scope="col" class="px-2.5 py-2.5">Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Jenis</th>
              <th scope="col" class="px-2.5 py-2.5">Nominal</th>
              <th scope="col" class="px-2.5 py-2.5">Referensi</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="history.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada riwayat transaksi.</td>
            </tr>
            <tr v-for="item in history" v-else :key="item.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(item.paid_at) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-semibold">{{ item.employee_name }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ item.type }}</td>
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">{{ formatCurrency(item.amount) }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ item.reference }}</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full bg-[#e4f0e1] px-2.5 py-1 text-[9px] font-semibold text-[#456d43]">
                  Dibayar
                </span>
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
        aria-labelledby="payment-add-heading"
        @submit.prevent="submitAdd"
      >
        <h2 id="payment-add-heading" class="font-serif text-base font-bold text-[#173b30]">Tambah Antrean Pembayaran</h2>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nama karyawan</span>
            <input
              v-model="addForm.employee_name"
              type="text"
              required
              autocomplete="off"
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
              <option v-for="type in paymentTypes" :key="type" :value="type">{{ type }}</option>
            </select>
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
        v-else-if="activeModal === 'pay'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-pay-heading"
        @submit.prevent="submitPay"
      >
        <h2 id="payment-pay-heading" class="font-serif text-base font-bold text-[#173b30]">Tandai Sudah Dibayar</h2>

        <label class="mt-4 block">
          <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nomor referensi transaksi</span>
          <input
            v-model="payForm.reference"
            type="text"
            required
            autocomplete="off"
            class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
          >
        </label>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443]">Bayar</button>
        </div>
      </form>

      <form
        v-else-if="activeModal === 'method'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-method-heading"
        @submit.prevent="submitMethod"
      >
        <h2 id="payment-method-heading" class="font-serif text-base font-bold text-[#173b30]">Metode Pembayaran</h2>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Metode</span>
            <input
              v-model="methodForm.method"
              type="text"
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Keterangan</span>
            <input
              v-model="methodForm.note"
              type="text"
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443]">Simpan</button>
        </div>
      </form>
    </div>
  </section>
</template>