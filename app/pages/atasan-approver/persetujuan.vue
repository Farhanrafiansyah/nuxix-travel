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

const authToken = useCookie<string | null>('auth_token')
const travels = ref<PendingTravel[]>([])
const isLoading = ref(true)
const loadError = ref('')
const actionError = ref('')
const processingId = ref<number | null>(null)

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}).format(new Date(value))

const loadPendingTravels = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const response = await $fetch<{ pending: PendingTravel[] }>(
      'http://localhost:8000/api/approvals',
      { headers: { Authorization: `Bearer ${authToken.value}` } }
    )
    travels.value = response.pending
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memuat pengajuan perjalanan untuk persetujuan.', error)
    loadError.value = fetchError.data?.message || 'Daftar pengajuan belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

const processTravel = async (travelId: number, action: 'APPROVE' | 'REJECT') => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  processingId.value = travelId
  actionError.value = ''

  try {
    await $fetch(`http://localhost:8000/api/approvals/${travelId}/action`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: { action }
    })
    await loadPendingTravels()
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    console.error('Gagal memproses persetujuan perjalanan.', error)
    actionError.value = fetchError.data?.message || 'Perubahan status belum dapat disimpan.'
  } finally {
    processingId.value = null
  }
}

onMounted(loadPendingTravels)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Persetujuan Perjalanan</h1>
        <p class="mt-1 text-xs text-[#718078]">Tinjau dan putuskan pengajuan perjalanan dinas.</p>
      </div>
      <button
        type="button"
        class="h-9 rounded-md border border-[#dfe8dc] bg-white px-3 text-xs font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6] disabled:opacity-50"
        :disabled="isLoading"
        @click="loadPendingTravels"
      >
        Muat Ulang
      </button>
    </div>

    <div v-if="loadError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ loadError }}
    </div>
    <div v-if="actionError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ actionError }}
    </div>
    <div class="rounded-lg border border-[#eadfbe] bg-[#fff9e9] px-3.5 py-3 text-[11px] leading-relaxed text-[#755b24]" role="note">
      Backend saat ini menyediakan ID pemohon, tujuan, tanggal perjalanan, dan keperluan. Nama, departemen, serta estimasi biaya belum tersedia di endpoint.
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="trip-approval-heading">
      <div class="border-b border-[#e8eee5] px-4 py-3">
        <h2 id="trip-approval-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengajuan Menunggu</h2>
      </div>
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[900px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">ID</th>
              <th scope="col" class="px-2.5 py-2.5">Pemohon</th>
              <th scope="col" class="px-2.5 py-2.5">Tujuan</th>
              <th scope="col" class="px-2.5 py-2.5">Tanggal</th>
              <th scope="col" class="px-2.5 py-2.5">Keperluan</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="6" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat pengajuan dari server...</td>
            </tr>
            <tr v-else-if="travels.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-xs text-[#7b8980]">Tidak ada pengajuan yang menunggu persetujuan.</td>
            </tr>
            <tr v-for="travel in travels" v-else :key="travel.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3 font-medium">PD-{{ String(travel.id).padStart(4, '0') }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">Pemohon #{{ travel.user_id }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ travel.destination }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ formatDate(travel.start_date) }} – {{ formatDate(travel.end_date) }}</td>
              <td class="max-w-sm px-2.5 py-3">{{ travel.purpose }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-md border border-[#c9dec2] bg-[#e1efdc] px-3 py-1.5 text-[10px] font-semibold text-[#3f6b3a] hover:bg-[#d6e9cf] disabled:opacity-50"
                    :disabled="processingId !== null"
                    @click="processTravel(travel.id, 'APPROVE')"
                  >
                    {{ processingId === travel.id ? 'Memproses...' : 'Setujui' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-3 py-1.5 text-[10px] font-semibold text-[#a8403a] hover:bg-[#f8d6d3] disabled:opacity-50"
                    :disabled="processingId !== null"
                    @click="processTravel(travel.id, 'REJECT')"
                  >
                    Tolak
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
