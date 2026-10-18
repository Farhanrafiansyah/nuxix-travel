<script setup lang="ts">
type TravelRequest = {
  id: number
  user_id: number
  destination: string
  start_date: string
  end_date: string
  purpose: string
  transportation_mode: string | null
  lpj_status: string
  document_url: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'COMPLETED'
  created_at: string
  updated_at: string
}

const authToken = useCookie<string | null>('auth_token')
const requests = ref<TravelRequest[]>([])
const isLoading = ref(true)
const loadError = ref('')

// Filters & Tab states
const activeTab = ref<'ALL' | 'PENDING' | 'APPROVED' | 'FULFILLED' | 'COMPLETED' | 'REJECTED'>('ALL')
const selectedStatusFilter = ref<string>('ALL')
const selectedMonthFilter = ref<string>('ALL')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 6

const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  FULFILLED: 'Berlangsung',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak'
}

const statusStyles: Record<string, string> = {
  Disetujui: 'bg-[#e6f4ea] text-[#137333]',
  Menunggu: 'bg-[#fef3c7] text-[#b45309]',
  Selesai: 'bg-[#e8f0fe] text-[#1967d2]',
  Berlangsung: 'bg-[#e0f2fe] text-[#0284c7]',
  Ditolak: 'bg-[#fce8e6] text-[#c5221f]'
}

const statusSteps: Record<string, number> = {
  PENDING: 1,
  APPROVED: 3,
  FULFILLED: 3,
  COMPLETED: 4,
  REJECTED: 1
}

const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(date))

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const formatPart = (date: Date) => new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short'
  }).format(date)

  return `${formatPart(start)} – ${formatDate(endDate)}`
}

const statusTabs = computed(() => [
  { key: 'ALL', label: 'Semua', count: requests.value.length },
  { key: 'PENDING', label: 'Menunggu Approval', count: requests.value.filter(r => r.status === 'PENDING').length },
  { key: 'APPROVED', label: 'Disetujui', count: requests.value.filter(r => r.status === 'APPROVED').length },
  { key: 'FULFILLED', label: 'Berlangsung', count: requests.value.filter(r => r.status === 'FULFILLED').length },
  { key: 'COMPLETED', label: 'Selesai', count: requests.value.filter(r => r.status === 'COMPLETED').length },
  { key: 'REJECTED', label: 'Ditolak', count: requests.value.filter(r => r.status === 'REJECTED').length }
])

const filteredRequests = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return requests.value.filter((item) => {
    // 1. Tab filter
    if (activeTab.value !== 'ALL' && item.status !== activeTab.value) {
      return false
    }

    // 2. Select status filter
    if (selectedStatusFilter.value !== 'ALL' && item.status !== selectedStatusFilter.value) {
      return false
    }

    // 3. Search query
    if (query) {
      const codeStr = `TRV-${String(item.id).padStart(4, '0')}`.toLowerCase()
      const destinationStr = item.destination.toLowerCase()
      const purposeStr = item.purpose.toLowerCase()

      if (!codeStr.includes(query) && !destinationStr.includes(query) && !purposeStr.includes(query)) {
        return false
      }
    }

    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRequests.value.length / pageSize)))
const visibleRequests = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRequests.value.slice(start, start + pageSize)
})

watch([activeTab, selectedStatusFilter, selectedMonthFilter, searchQuery], () => {
  currentPage.value = 1
})

onMounted(async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  try {
    const response = await $fetch<{ requests: TravelRequest[] }>('http://localhost:8000/api/travels/my-requests', {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
    requests.value = response.requests || []
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    loadError.value = fetchError.data?.message || 'Data perjalanan belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="dashboard-page space-y-4">
    <!-- Header: Title and Ajukan Baru button -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold leading-tight text-[#20233e]">Perjalanan Dinas Saya</h1>
        <p class="mt-0.5 text-xs font-normal text-[#777b87]">Semua riwayat pengajuan perjalanan dinas kamu</p>
      </div>

      <NuxtLink to="/karyawan/dinas-ajukan" class="inline-flex h-10 items-center gap-2 rounded-md bg-[#f6a623] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#e99514]">
    Ajukan Perjalanan Dinas
  </NuxtLink>
    </div>

    <!-- Filter row: Status, Bulan, Search, Ekspor -->
    <div class="flex flex-wrap items-center justify-between gap-2.5 pt-1">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Status Dropdown -->
        <div class="relative">
          <select
            v-model="selectedStatusFilter"
            class="h-9 appearance-none rounded-lg border border-[#e5e7eb] bg-white py-1.5 pl-3.5 pr-8 text-xs font-medium text-[#374151] shadow-xs hover:border-[#d1d5db] focus:border-[#f6a623] focus:outline-none"
          >
            <option value="ALL">Status Semua</option>
            <option value="PENDING">Menunggu Approval</option>
            <option value="APPROVED">Disetujui</option>
            <option value="FULFILLED">Berlangsung</option>
            <option value="COMPLETED">Selesai</option>
            <option value="REJECTED">Ditolak</option>
          </select>
          <svg class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </div>

        <!-- Bulan Dropdown -->
        <div class="relative">
          <select
            v-model="selectedMonthFilter"
            class="h-9 appearance-none rounded-lg border border-[#e5e7eb] bg-white py-1.5 pl-3.5 pr-8 text-xs font-medium text-[#374151] shadow-xs hover:border-[#d1d5db] focus:border-[#f6a623] focus:outline-none"
          >
            <option value="ALL">Bulan Semua</option>
            <option value="01">Januari 2026</option>
            <option value="12">Desember 2025</option>
            <option value="11">November 2025</option>
            <option value="10">Oktober 2025</option>
          </select>
          <svg class="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b7280]" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
          </svg>
        </div>

        <!-- Search Bar -->
        <div class="w-64 sm:w-72">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari kode atau tujuan..."
            class="h-9 w-full rounded-lg border border-[#e5e7eb] bg-white px-3.5 text-xs text-[#374151] placeholder:text-[#9ca3af] shadow-xs hover:border-[#d1d5db] focus:border-[#f6a623] focus:outline-none"
          />
        </div>
      </div>

      <!-- Ekspor Button -->
      <button
        type="button"
        class="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-xs font-medium text-[#374151] shadow-xs transition-colors hover:bg-gray-50"
      >
        Ekspor
      </button>
    </div>

    <!-- Status Tabs -->
    <div class="flex items-center gap-6 overflow-x-auto border-b border-[#e5e7eb] pt-2 text-xs">
      <button
        v-for="tab in statusTabs"
        :key="tab.key"
        type="button"
        @click="activeTab = tab.key as any"
        :class="[
          'flex shrink-0 items-center gap-1.5 pb-2.5 font-medium transition-all border-b-2',
          activeTab === tab.key
            ? 'border-[#f6a623] text-[#f6a623] font-semibold'
            : 'border-transparent text-[#6b7280] hover:text-[#20233e]'
        ]"
      >
        <span>{{ tab.label }}</span>
        <span
          :class="[
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
            activeTab === tab.key ? 'text-[#f6a623]' : 'text-[#6b7280]'
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Table Card Shell -->
    <div class="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr class="border-b border-[#f0f0f0] bg-white text-[11px] font-semibold text-[#6b7280]">
              <th scope="col" class="px-4 py-3.5 font-semibold">Kode</th>
              <th scope="col" class="px-4 py-3.5 font-semibold">Tujuan</th>
              <th scope="col" class="px-4 py-3.5 font-semibold">Tanggal</th>
              <th scope="col" class="px-4 py-3.5 font-semibold">Keperluan</th>
              <th scope="col" class="px-4 py-3.5 font-semibold">Transportasi</th>
              <th scope="col" class="px-4 py-3.5 font-semibold">Status Approval</th>
              <th scope="col" class="px-4 py-3.5 font-semibold">Status LPJ</th>
              <th scope="col" class="px-4 py-3.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#f3f4f6]">
            <!-- Loading State -->
            <tr v-if="isLoading">
              <td colspan="8" class="px-4 py-12 text-center text-xs text-[#858893]">
                Memuat data perjalanan dinas dari backend...
              </td>
            </tr>

            <!-- Error State -->
            <tr v-else-if="loadError">
              <td colspan="8" class="px-4 py-12 text-center text-xs text-[#c5221f]">
                {{ loadError }}
              </td>
            </tr>

            <!-- Loaded Real Data -->
            <tr
              v-else-if="visibleRequests.length"
              v-for="item in visibleRequests"
              :key="item.id"
              class="transition-colors hover:bg-[#fafafa]"
            >
              <!-- Kode -->
              <td class="whitespace-nowrap px-4 py-3.5 font-bold text-[#1d46bb]">
                TRV-{{ String(item.id).padStart(4, '0') }}
              </td>

              <!-- Tujuan -->
              <td class="whitespace-nowrap px-4 py-3.5 font-semibold text-[#20233e]">
                {{ item.destination }}
              </td>

              <!-- Tanggal -->
              <td class="whitespace-nowrap px-4 py-3.5 text-[#4b5563]">
                {{ formatDateRange(item.start_date, item.end_date) }}
              </td>

              <!-- Keperluan -->
              <td class="max-w-[260px] truncate px-4 py-3.5 text-[#6b7280]" :title="item.purpose">
                {{ item.purpose }}
              </td>

              <!-- Transportasi -->
              <td class="whitespace-nowrap px-4 py-3.5 text-[#4b5563]">
                {{ item.transportation_mode || '—' }}
              </td>

              <!-- Status Approval: 4 progress bars + Badge -->
              <td class="whitespace-nowrap px-4 py-3.5">
                <div class="flex items-center gap-2">
                  <!-- 4 segments -->
                  <div class="flex items-center gap-1">
                    <span
                      v-for="seg in 4"
                      :key="seg"
                      class="h-1 w-3.5 rounded-full"
                      :class="seg <= (statusSteps[item.status] || 1) ? 'bg-[#f6a623]' : 'bg-[#e5e7eb]'"
                    />
                  </div>
                  <!-- Status Pill -->
                  <span
                    class="inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium"
                    :class="statusStyles[statusLabels[item.status] || item.status] || 'bg-slate-100 text-slate-700'"
                  >
                    {{ statusLabels[item.status] || item.status }}
                  </span>
                </div>
              </td>

              <!-- Status LPJ -->
              <td class="whitespace-nowrap px-4 py-3.5 text-xs text-[#4b5563]">
                {{ item.lpj_status || '—' }}
              </td>

              <!-- Aksi -->
              <td class="whitespace-nowrap px-4 py-3.5 text-right font-medium">
              

                <NuxtLink :to="{ path: '/karyawan/dinas-detail', query: { id: item.id } }" class="text-xs font-semibold text-[#1d46bb] hover:underline">
                Detail
              </NuxtLink>
              </td>
            </tr>

            <!-- Empty Shell State -->
            <tr v-else>
              <td colspan="8" class="px-4 py-12 text-center text-xs text-[#858893]">
                Belum ada pengajuan perjalanan dinas.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f0f0] px-4 py-3 text-xs text-[#6b7280]">
        <span>
          Menampilkan {{ visibleRequests.length ? (currentPage - 1) * pageSize + 1 : 0 }}–{{ Math.min(currentPage * pageSize, filteredRequests.length) }} dari {{ filteredRequests.length }} pengajuan
        </span>

        <div class="flex items-center gap-1.5">
          <!-- Tombol Sebelumnya -->
          <button
            type="button"
            :disabled="currentPage <= 1"
            class="h-7 rounded-md border border-[#e5e7eb] px-2.5 text-xs font-medium text-[#374151] transition-colors disabled:cursor-not-allowed disabled:text-[#9ca3af] disabled:hover:bg-transparent hover:bg-gray-50"
            @click="currentPage--"
          >
            Sebelumnya
          </button>

          <!-- Number buttons -->
          <button
            v-for="page in totalPages"
            :key="page"
            type="button"
            class="h-7 w-7 rounded-md text-xs font-semibold transition-colors"
            :class="[
              currentPage === page
                ? 'bg-[#f6a623] text-white shadow-xs'
                : 'border border-[#e5e7eb] text-[#374151] hover:bg-gray-50'
            ]"
            @click="currentPage = page"
          >
            {{ page }}
          </button>

          <!-- Tombol Berikutnya -->
          <button
            type="button"
            :disabled="currentPage >= totalPages"
            class="h-7 rounded-md border border-[#e5e7eb] px-2.5 text-xs font-medium text-[#374151] transition-colors disabled:cursor-not-allowed disabled:text-[#9ca3af] disabled:hover:bg-transparent hover:bg-gray-50"
            @click="currentPage++"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  </section>
</template>