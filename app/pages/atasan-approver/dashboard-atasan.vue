<script setup lang="ts">
interface PendingTravel {
  id: number
  user_id: number
  destination: string
  start_date: string
  end_date: string
  purpose: string
  status: 'PENDING'
}

interface TravelStats {
  upcoming: number
  ongoing: number
  completed: number
}

const authToken = useCookie<string | null>('auth_token')
const pendingTravels = ref<PendingTravel[]>([])
const stats = ref<TravelStats | null>(null)
const isLoading = ref(true)
const loadError = ref('')

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}).format(new Date(value))

const statCards = computed(() => [
  { label: 'Menunggu Persetujuan', value: pendingTravels.value.length, accent: 'border-l-[#c8702a]' },
  { label: 'Perjalanan Disetujui', value: stats.value?.upcoming ?? '—', accent: 'border-l-[#3f6b4f]' },
  { label: 'Perjalanan Berlangsung', value: stats.value?.ongoing ?? '—', accent: 'border-l-[#2f6b5e]' },
  { label: 'Perjalanan Selesai', value: stats.value?.completed ?? '—', accent: 'border-l-[#e0a93a]' }
])

const loadDashboard = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const [approvalResponse, statsResponse] = await Promise.all([
      $fetch<{ pending: PendingTravel[] }>('http://localhost:8000/api/approvals', { headers }),
      $fetch<TravelStats>('http://localhost:8000/api/dashboard/stats', { headers })
    ])

    pendingTravels.value = approvalResponse.pending
    stats.value = statsResponse
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat dashboard Atasan.', error)
    loadError.value = fetchError.data?.message || 'Data dashboard belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Dashboard Persetujuan</h1>
      <p class="mt-1 text-xs text-[#718078]">Ringkasan perjalanan dan pengajuan yang menunggu persetujuan.</p>
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
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
      </section>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="pending-approval-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="pending-approval-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengajuan Menunggu Persetujuan</h2>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[760px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">ID Pengajuan</th>
              <th scope="col" class="px-2.5 py-2.5">Pemohon</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Tanggal Perjalanan</th>
              <th scope="col" class="px-2.5 py-2.5">Keperluan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat data dari server...</td>
            </tr>
            <tr v-else-if="pendingTravels.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#7b8980]">Tidak ada pengajuan yang menunggu persetujuan.</td>
            </tr>
            <tr v-for="travel in pendingTravels" v-else :key="travel.id">
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">PD-{{ String(travel.id).padStart(4, '0') }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">Pemohon #{{ travel.user_id }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ travel.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(travel.start_date) }} – {{ formatDate(travel.end_date) }}</td>
              <td class="max-w-sm px-2.5 py-3">{{ travel.purpose }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
