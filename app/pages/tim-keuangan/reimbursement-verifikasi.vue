<script setup lang="ts">
type ReimbursementStatus = 'SUBMITTED' | 'NEEDS_DOCUMENTS' | 'VERIFIED' | 'PAID' | 'REJECTED'

interface ReimbursementItem {
  id?: number
  category: string
  amount: number | string
  receipt_url?: string | null
  description?: string | null
}

interface ReimbursementRow {
  id: number
  displayId: string
  userId: number
  employeeName: string
  initials: string
  department: string
  destination: string
  totalAmount: number
  proofStatus: 'Lengkap' | 'Kurang'
  status: ReimbursementStatus
  date: string
  items: ReimbursementItem[]
}

const authToken = useCookie<string | null>('auth_token')
const isLoading = ref(true)
const loadError = ref('')

// Filter State
const searchQuery = ref('')
const selectedStatus = ref<string>('Semua Status')
const selectedDepartment = ref<string>('Semua Departemen')
const selectedDateFilter = ref<string>('Semua Tanggal')
const selectedNominalFilter = ref<string>('Semua Nominal')

// Pagination
const currentPage = ref(1)
const pageSize = 5

// Modal Detail & Verifikasi
const isModalOpen = ref(false)
const selectedItem = ref<ReimbursementRow | null>(null)
const verificationNotes = ref('')
const isProcessing = ref(false)
const actionFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// 100% Real Data dari API / Database Seeder (Tanpa Mock Data)
const reimbursementList = ref<ReimbursementRow[]>([])

// Status Label Mapping sesuai Backend_UKK/src/routes/reimbursement.ts
const statusLabels: Record<ReimbursementStatus, string> = {
  SUBMITTED: 'Menunggu Verifikasi',
  NEEDS_DOCUMENTS: 'Bukti Kurang',
  VERIFIED: 'Terverifikasi',
  PAID: 'Selesai',
  REJECTED: 'Dikembalikan'
}

// Styling Badge Status
const statusBadgeStyles: Record<ReimbursementStatus, string> = {
  SUBMITTED: 'bg-[#feeedb] text-[#b45309]',
  NEEDS_DOCUMENTS: 'bg-[#fde2e2] text-[#c53030]',
  VERIFIED: 'bg-[#e0f2fe] text-[#0369a1]',
  PAID: 'bg-[#dcf0de] text-[#2c7744]',
  REJECTED: 'bg-[#fce7e7] text-[#be123c]'
}

// Styling Badge Bukti
const proofBadgeStyles = {
  Lengkap: 'bg-[#dcf0de] text-[#2c7744]',
  Kurang: 'bg-[#fde2e2] text-[#c53030]'
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'KP'
}

// Fetch Real Backend Data
const fetchPendingReimbursements = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const res = await $fetch<{ pending: any[] }>('http://localhost:8000/api/reimbursements/pending', { headers })

    if (res?.pending && Array.isArray(res.pending)) {
      const rows: ReimbursementRow[] = []

      for (const item of res.pending) {
        let destination = 'Perjalanan Dinas'
        let employeeName = item.user?.name || `Karyawan #${item.user_id}`
        let department = item.user?.department || 'Umum'
        let items: ReimbursementItem[] = item.items || []

        // Ambil info perjalanan via GET /api/travels/:id jika belum ada relasi dari backend
        if (item.travel_request_id && !item.travelRequest) {
          try {
            const travel = await $fetch<any>(`http://localhost:8000/api/travels/${item.travel_request_id}`, { headers })
            if (travel?.destination) {
              destination = travel.destination
            }
          } catch (e) {
            console.warn(`Gagal fetch travel ID ${item.travel_request_id}:`, e)
          }
        } else if (item.travelRequest?.destination) {
          destination = item.travelRequest.destination
        }

        // Tentukan kelengkapan bukti berdasarkan keberadaan receipt_url pada item
        const hasMissingReceipt = items.length > 0 && items.some((i) => !i.receipt_url)
        const proofStatus: 'Lengkap' | 'Kurang' = hasMissingReceipt ? 'Kurang' : 'Lengkap'

        rows.push({
          id: item.id,
          displayId: `RB-${String(item.id).padStart(4, '0')}`,
          userId: item.user_id,
          employeeName,
          initials: getInitials(employeeName),
          department,
          destination,
          totalAmount: Number(item.total_amount) || 0,
          proofStatus,
          status: item.status,
          date: item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          items
        })
      }

      reimbursementList.value = rows
    } else {
      reimbursementList.value = []
    }
  } catch (error: any) {
    console.error('Error fetching reimbursements:', error)
    loadError.value = error?.data?.message || 'Gagal memuat data dari API. Pastikan Anda login dengan akun Tim Keuangan.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPendingReimbursements()
})

// Filter Logic
const filteredData = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return reimbursementList.value.filter((item) => {
    // 1. Text Search (Nama, ID, Tujuan)
    const matchesSearch = !query ||
      item.employeeName.toLowerCase().includes(query) ||
      item.displayId.toLowerCase().includes(query) ||
      item.destination.toLowerCase().includes(query)

    // 2. Filter Status
    const matchesStatus =
      selectedStatus.value === 'Semua Status' ||
      statusLabels[item.status] === selectedStatus.value

    // 3. Filter Departemen
    const matchesDepartment =
      selectedDepartment.value === 'Semua Departemen' ||
      item.department === selectedDepartment.value

    // 4. Filter Nominal
    let matchesNominal = true
    if (selectedNominalFilter.value === '< 1 Juta') {
      matchesNominal = item.totalAmount < 1000000
    } else if (selectedNominalFilter.value === '1 - 5 Juta') {
      matchesNominal = item.totalAmount >= 1000000 && item.totalAmount <= 5000000
    } else if (selectedNominalFilter.value === '> 5 Juta') {
      matchesNominal = item.totalAmount > 5000000
    }

    return matchesSearch && matchesStatus && matchesDepartment && matchesNominal
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / pageSize)))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredData.value.slice(start, start + pageSize)
})

watch([searchQuery, selectedStatus, selectedDepartment, selectedNominalFilter], () => {
  currentPage.value = 1
})

// Buka Modal Detail
const openDetail = (item: ReimbursementRow) => {
  selectedItem.value = { ...item }
  verificationNotes.value = ''
  actionFeedback.value = null
  isModalOpen.value = true
}

// Proses Verifikasi ke Real Backend API: POST /api/reimbursements/:id/process
const handleProcess = async (newStatus: ReimbursementStatus) => {
  if (!selectedItem.value) return

  isProcessing.value = true
  actionFeedback.value = null

  try {
    await $fetch(`http://localhost:8000/api/reimbursements/${selectedItem.value.id}/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: {
        status: newStatus,
        notes: verificationNotes.value || undefined
      }
    })

    actionFeedback.value = {
      type: 'success',
      message: `Status berhasil diubah menjadi: ${statusLabels[newStatus]}`
    }

    // Refresh data asli dari database setelah proses
    setTimeout(async () => {
      isModalOpen.value = false
      await fetchPendingReimbursements()
    }, 800)
  } catch (error: any) {
    console.error('Error proses verifikasi:', error)
    actionFeedback.value = {
      type: 'error',
      message: error?.data?.message || 'Gagal memproses verifikasi di backend.'
    }
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Judul & Keterangan Halaman -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight text-[#16382b] sm:text-[32px]">
        Verifikasi Reimbursement
      </h1>
      <p class="mt-1 text-xs text-[#5d7768] sm:text-sm">
        Kelola dan verifikasi seluruh pengajuan reimbursement karyawan.
      </p>
    </div>

    <!-- Error State Alert -->
    <div
      v-if="loadError"
      class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"
    >
      {{ loadError }}
    </div>

    <!-- Main Container Card -->
    <div class="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
      <!-- Toolbar Filter & Search -->
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <!-- Input Search Bar -->
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari karyawan, ID, atau tujuan..."
            class="h-10 w-full rounded-xl border border-[#e2e8f0] bg-white px-4 text-xs text-[#1e293b] placeholder:text-[#94a3b8] transition-all focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20"
          />
        </div>

        <!-- 4 Tombol Filter Dropdown -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Filter 1: Status -->
          <div class="relative">
            <select
              v-model="selectedStatus"
              class="h-10 appearance-none rounded-xl border border-[#e2e8f0] bg-white px-4 pr-8 text-xs font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50 focus:border-[#2e6d73] focus:outline-none"
            >
              <option>Semua Status</option>
              <option>Menunggu Verifikasi</option>
              <option>Bukti Kurang</option>
              <option>Terverifikasi</option>
              <option>Selesai</option>
              <option>Dikembalikan</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94a3b8]">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Filter 2: Departemen -->
          <div class="relative">
            <select
              v-model="selectedDepartment"
              class="h-10 appearance-none rounded-xl border border-[#e2e8f0] bg-white px-4 pr-8 text-xs font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50 focus:border-[#2e6d73] focus:outline-none"
            >
              <option>Semua Departemen</option>
              <option>Sales</option>
              <option>Operations</option>
              <option>IT</option>
              <option>Human Resources</option>
              <option>Logistik</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94a3b8]">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Filter 3: Tanggal -->
          <div class="relative">
            <select
              v-model="selectedDateFilter"
              class="h-10 appearance-none rounded-xl border border-[#e2e8f0] bg-white px-4 pr-8 text-xs font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50 focus:border-[#2e6d73] focus:outline-none"
            >
              <option>Semua Tanggal</option>
              <option>Bulan Ini</option>
              <option>Bulan Lalu</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94a3b8]">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Filter 4: Nominal -->
          <div class="relative">
            <select
              v-model="selectedNominalFilter"
              class="h-10 appearance-none rounded-xl border border-[#e2e8f0] bg-white px-4 pr-8 text-xs font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50 focus:border-[#2e6d73] focus:outline-none"
            >
              <option>Semua Nominal</option>
              <option>&lt; 1 Juta</option>
              <option>1 - 5 Juta</option>
              <option>&gt; 5 Juta</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#94a3b8]">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State Indicator -->
      <div v-if="isLoading" class="py-16 text-center text-xs text-slate-400">
        <svg class="mx-auto mb-2 h-6 w-6 animate-spin text-[#2e6d73]" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
        Memuat data pengajuan dari server...
      </div>

      <!-- Tabel Data Reimbursement Murni Real API -->
      <div v-else class="mt-6 overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-dashed border-[#e2e8f0] pb-3 text-xs font-semibold text-[#64748b]">
              <th class="pb-3 pr-4 font-semibold">ID</th>
              <th class="pb-3 pr-4 font-semibold">Karyawan</th>
              <th class="pb-3 pr-4 font-semibold">Tujuan</th>
              <th class="pb-3 pr-4 font-semibold">Nominal</th>
              <th class="pb-3 pr-4 font-semibold">Bukti</th>
              <th class="pb-3 pr-4 font-semibold">Status</th>
              <th class="pb-3 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="item in paginatedData"
              :key="item.id"
              class="group transition-colors hover:bg-slate-50/70"
            >
              <!-- ID -->
              <td class="py-4 pr-4 text-xs font-medium text-[#334155]">
                {{ item.displayId }}
              </td>

              <!-- Karyawan -->
              <td class="py-4 pr-4">
                <div class="flex items-center gap-2.5">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[11px] font-bold text-[#8a5408]">
                    {{ item.initials }}
                  </div>
                  <span class="text-xs font-semibold text-[#1e293b]">{{ item.employeeName }}</span>
                </div>
              </td>

              <!-- Tujuan -->
              <td class="py-4 pr-4 text-xs text-[#334155]">
                {{ item.destination }}
              </td>

              <!-- Nominal -->
              <td class="py-4 pr-4 text-xs font-semibold text-[#1e293b]">
                {{ formatCurrency(item.totalAmount) }}
              </td>

              <!-- Bukti -->
              <td class="py-4 pr-4">
                <span
                  :class="[
                    'inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold',
                    proofBadgeStyles[item.proofStatus]
                  ]"
                >
                  {{ item.proofStatus }}
                </span>
              </td>

              <!-- Status -->
              <td class="py-4 pr-4">
                <span
                  :class="[
                    'inline-block rounded-full px-3 py-1 text-[11px] font-semibold',
                    statusBadgeStyles[item.status]
                  ]"
                >
                  {{ statusLabels[item.status] }}
                </span>
              </td>

              <!-- Aksi -->
              <td class="py-4 text-center">
                <button
                  type="button"
                  @click="openDetail(item)"
                  class="rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-1 text-xs font-medium text-[#334155] shadow-sm transition-colors hover:bg-slate-50 active:scale-95"
                >
                  Detail
                </button>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-if="paginatedData.length === 0">
              <td colspan="7" class="py-14 text-center text-xs text-slate-400">
                <div class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </div>
                Belum ada pengajuan reimbursement baru yang menunggu verifikasi dari database.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="mt-6 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-4">
        <!-- Prev Button -->
        <button
          type="button"
          :disabled="currentPage <= 1"
          @click="currentPage--"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white text-xs font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &lsaquo;
        </button>

        <!-- Page Numbers -->
        <button
          v-for="page in totalPages"
          :key="page"
          type="button"
          @click="currentPage = page"
          :class="[
            'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors',
            currentPage === page
              ? 'bg-[#18392b] text-white shadow-sm'
              : 'border border-[#cbd5e1] bg-white text-[#475569] hover:bg-slate-50'
          ]"
        >
          {{ page }}
        </button>

        <!-- Next Button -->
        <button
          type="button"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white text-xs font-medium text-[#475569] shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &rsaquo;
        </button>
      </div>
    </div>

    <!-- Modal Dialog Detail & Verifikasi -->
    <div
      v-if="isModalOpen && selectedItem"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-7">
        <div class="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center gap-2.5">
              <span class="text-xs font-semibold text-[#2e6d73]">{{ selectedItem.displayId }}</span>
              <span
                :class="[
                  'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                  statusBadgeStyles[selectedItem.status]
                ]"
              >
                {{ statusLabels[selectedItem.status] }}
              </span>
            </div>
            <h3 class="mt-1 text-lg font-bold text-[#1e293b]">Verifikasi Reimbursement</h3>
          </div>
          <button
            type="button"
            @click="isModalOpen = false"
            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Info Pemohon -->
        <div class="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-xs">
          <div>
            <p class="text-slate-500">Nama Pemohon</p>
            <p class="font-bold text-[#1e293b]">{{ selectedItem.employeeName }}</p>
          </div>
          <div>
            <p class="text-slate-500">Departemen</p>
            <p class="font-bold text-[#1e293b]">{{ selectedItem.department }}</p>
          </div>
          <div>
            <p class="text-slate-500">Tujuan Perjalanan</p>
            <p class="font-bold text-[#1e293b]">{{ selectedItem.destination }}</p>
          </div>
          <div>
            <p class="text-slate-500">Tanggal Pengajuan</p>
            <p class="font-bold text-[#1e293b]">{{ selectedItem.date }}</p>
          </div>
        </div>

        <!-- Rincian Item Biaya -->
        <div class="mt-5">
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Biaya &amp; Bukti Kuitansi</h4>
          <div class="mt-2.5 overflow-hidden rounded-xl border border-slate-200">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-600">
                <tr>
                  <th class="px-3.5 py-2 font-semibold">Kategori</th>
                  <th class="px-3.5 py-2 font-semibold">Deskripsi</th>
                  <th class="px-3.5 py-2 font-semibold">Nominal</th>
                  <th class="px-3.5 py-2 text-center font-semibold">Dokumen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(item, idx) in selectedItem.items" :key="idx">
                  <td class="px-3.5 py-2.5 font-medium text-slate-800">{{ item.category }}</td>
                  <td class="px-3.5 py-2.5 text-slate-500">{{ item.description || '-' }}</td>
                  <td class="px-3.5 py-2.5 font-semibold text-slate-800">{{ formatCurrency(Number(item.amount) || 0) }}</td>
                  <td class="px-3.5 py-2.5 text-center">
                    <a
                      v-if="item.receipt_url"
                      :href="item.receipt_url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 font-semibold text-[#2e6d73] hover:underline"
                    >
                      Lihat Bukti
                    </a>
                    <span v-else class="text-rose-500 font-medium">Tidak ada</span>
                  </td>
                </tr>
                <tr v-if="selectedItem.items.length === 0">
                  <td colspan="4" class="px-3.5 py-3 text-center text-slate-400">
                    Rincian nota kuitansi tersimpan di database untuk pengajuan ini.
                  </td>
                </tr>
              </tbody>
              <tfoot class="bg-slate-50 font-bold text-slate-800">
                <tr>
                  <td colspan="2" class="px-3.5 py-2.5 text-right">Total Reimbursement:</td>
                  <td colspan="2" class="px-3.5 py-2.5 text-emerald-800">{{ formatCurrency(selectedItem.totalAmount) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Form Tindakan Verifikasi -->
        <div class="mt-5 space-y-3">
          <label class="block text-xs font-semibold text-slate-700">Catatan Verifikasi (Opsional):</label>
          <textarea
            v-model="verificationNotes"
            rows="2"
            placeholder="Tuliskan catatan untuk karyawan jika bukti kurang atau ditolak..."
            class="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20"
          ></textarea>

          <div v-if="actionFeedback" :class="['rounded-lg p-2.5 text-xs', actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800']">
            {{ actionFeedback.message }}
          </div>
        </div>

        <!-- Tombol Aksi Verifikasi -->
        <div class="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            @click="isModalOpen = false"
            class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Batal
          </button>

          <!-- Tolak -->
          <button
            type="button"
            :disabled="isProcessing"
            @click="handleProcess('REJECTED')"
            class="rounded-lg bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
          >
            Tolak
          </button>

          <!-- Bukti Kurang -->
          <button
            type="button"
            :disabled="isProcessing"
            @click="handleProcess('NEEDS_DOCUMENTS')"
            class="rounded-lg bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            Minta Bukti Ulang
          </button>

          <!-- Selesai / Cairkan -->
          <button
            type="button"
            :disabled="isProcessing"
            @click="handleProcess('PAID')"
            class="rounded-lg bg-[#2e6d73] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#2e6d73]/20 transition-colors hover:bg-[#255b60] disabled:opacity-50"
          >
            {{ isProcessing ? 'Memproses...' : 'Verifikasi & Selesai' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
