<script setup lang="ts">
type TravelApproval = {
  id: number
  approver_id: number
  status: 'APPROVED' | 'REJECTED'
  notes: string | null
  created_at: string
}

type TravelDetail = {
  id: number
  user_id: number
  destination: string
  start_date: string
  end_date: string
  purpose: string
  transportation_mode: string | null
  document_url: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'COMPLETED'
  created_at: string
  updated_at: string
  approvals: TravelApproval[]
  lpj_status: string
  lpj_due_date: string
  lpj_reminder: string | null
  cash_advance_reminder: string | null
  remaining_advance_amount: number
}

const route = useRoute()
const authToken = useCookie<string | null>('auth_token')
const travel = ref<TravelDetail | null>(null)
const isLoading = ref(true)
const loadError = ref('')

const travelId = computed(() => {
  const id = Number(route.query.id)
  return Number.isInteger(id) && id > 0 ? id : null
})

const travelCode = computed(() => travel.value
  ? `TRV-${String(travel.value.id).padStart(4, '0')}`
  : '')

const statusLabels: Record<TravelDetail['status'], string> = {
  PENDING: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  FULFILLED: 'Berlangsung',
  COMPLETED: 'Selesai'
}

const statusStyles: Record<TravelDetail['status'], string> = {
  PENDING: 'bg-[#fef3c7] text-[#b45309]',
  APPROVED: 'bg-[#e6f4ea] text-[#137333]',
  REJECTED: 'bg-[#fce8e6] text-[#c5221f]',
  FULFILLED: 'bg-[#e0f2fe] text-[#0284c7]',
  COMPLETED: 'bg-[#e8f0fe] text-[#1967d2]'
}

const formatDate = (value: string) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}).format(new Date(value))

const formatDateTime = (value: string) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value))

const loadTravel = async () => {
  isLoading.value = true
  loadError.value = ''

  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  if (!travelId.value) {
    loadError.value = 'ID perjalanan tidak valid atau tidak ditemukan di URL.'
    isLoading.value = false
    return
  }

  try {
    travel.value = await $fetch<TravelDetail>(`http://localhost:8000/api/travels/${travelId.value}`, {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    loadError.value = fetchError.data?.message || 'Detail perjalanan belum dapat dimuat dari server.'
  } finally {
    isLoading.value = false
  }
}

watch(() => route.query.id, loadTravel)
onMounted(loadTravel)
</script>

<template>
  <section class="dashboard-page space-y-4 pb-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <NuxtLink
          to="/karyawan/dinas"
          aria-label="Kembali ke daftar perjalanan"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e5e0d7] bg-white text-lg text-[#272621] hover:bg-[#faf9f6]"
        >
          ‹
        </NuxtLink>
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="font-serif text-xl font-bold leading-tight text-[#1f2937]">
              {{ travel?.destination || 'Detail Perjalanan' }}
            </h1>
            <span
              v-if="travel"
              class="rounded px-2 py-1 text-[10px] font-semibold"
              :class="statusStyles[travel.status]"
            >
              {{ statusLabels[travel.status] }}
            </span>
          </div>
          <p v-if="travel" class="mt-0.5 text-[10px] text-[#77766f]">ID Perjalanan: {{ travelCode }}</p>
        </div>
      </div>
      <NuxtLink
        to="/karyawan/dinas"
        class="rounded-md border border-[#e5e0d7] bg-white px-3 py-2 text-[11px] font-medium text-[#272621] hover:bg-[#faf9f6]"
      >
        Kembali
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="rounded-xl border border-[#e9e5dc] bg-white px-4 py-12 text-center text-xs text-[#77766f]">
      Memuat detail perjalanan...
    </div>
    <div v-else-if="loadError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-xs text-red-700" role="alert">
      {{ loadError }}
    </div>
    <div v-else-if="travel" class="grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
      <div class="space-y-4">
        <section class="rounded-xl border border-[#e9e5dc] bg-white p-4 sm:p-5" aria-labelledby="travel-information-title">
          <h2 id="travel-information-title" class="border-b border-[#eee9e0] pb-3 font-serif text-sm font-bold text-[#272621]">
            Informasi Perjalanan
          </h2>
          <dl class="grid gap-x-6 gap-y-4 pt-4 sm:grid-cols-2">
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">ID Perjalanan</dt>
              <dd class="mt-1 text-xs font-medium text-[#272621]">{{ travelCode }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">ID Karyawan</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ travel.user_id }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Kota Tujuan</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ travel.destination }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Status Pengajuan</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ statusLabels[travel.status] }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Tanggal Berangkat</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ formatDate(travel.start_date) }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Tanggal Kembali</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ formatDate(travel.end_date) }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Keperluan Perjalanan</dt>
              <dd class="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[#272621]">{{ travel.purpose }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Diajukan Pada</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ formatDateTime(travel.created_at) }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Terakhir Diperbarui</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ formatDateTime(travel.updated_at) }}</dd>
            </div>
          </dl>
        </section>

        <section class="rounded-xl border border-[#e9e5dc] bg-white p-4 sm:p-5" aria-labelledby="transport-title">
          <h2 id="transport-title" class="border-b border-[#eee9e0] pb-3 font-serif text-sm font-bold text-[#272621]">
            Transportasi
          </h2>
          <dl class="pt-4">
            <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Moda Transportasi</dt>
            <dd class="mt-1 text-xs text-[#272621]">{{ travel.transportation_mode || 'Belum ada informasi transportasi.' }}</dd>
          </dl>
        </section>

        <section class="rounded-xl border border-[#e9e5dc] bg-white p-4 sm:p-5" aria-labelledby="documents-title">
          <h2 id="documents-title" class="border-b border-[#eee9e0] pb-3 font-serif text-sm font-bold text-[#272621]">
            Dokumen Pendukung
          </h2>
          <div v-if="travel.document_url" class="pt-4">
            <a
              :href="travel.document_url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex max-w-full items-center gap-2 rounded-md border border-[#e9e5dc] px-2.5 py-2 text-[10px] text-[#272621] hover:bg-[#faf9f6]"
            >
              <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span class="truncate">{{ travel.document_url.split('/').pop() || 'Buka dokumen' }}</span>
            </a>
          </div>
          <p v-else class="pt-4 text-xs text-[#77766f]">Tidak ada dokumen pendukung.</p>
        </section>
      </div>

      <aside class="space-y-4">
        <section class="rounded-xl border border-[#e9e5dc] bg-white p-4 sm:p-5" aria-labelledby="approval-title">
          <h2 id="approval-title" class="border-b border-[#eee9e0] pb-3 font-serif text-sm font-bold text-[#272621]">
            Status Persetujuan
          </h2>
          <div class="space-y-0 pt-4">
            <article class="relative flex gap-3 pb-5">
              <span
                v-if="travel.approvals.length"
                class="absolute left-[7px] top-4 h-[calc(100%-12px)] w-px bg-[#e8e1d6]"
                aria-hidden="true"
              />
              <span class="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-600 bg-emerald-50 text-emerald-700">
                <svg class="h-2.5 w-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m3 8 3 3 7-7" />
                </svg>
              </span>
              <div class="min-w-0">
                <h3 class="text-[11px] font-semibold text-[#272621]">Pengajuan Dibuat</h3>
                <p class="mt-1 text-[10px] text-[#77766f]">{{ formatDateTime(travel.created_at) }}</p>
                <p class="mt-1 text-[10px] italic text-[#77766f]">ID karyawan {{ travel.user_id }}</p>
              </div>
            </article>
            <article v-for="(approval, index) in travel.approvals" :key="approval.id" class="relative flex gap-3 pb-5 last:pb-0">
              <span
                v-if="index < travel.approvals.length - 1"
                class="absolute left-[7px] top-4 h-[calc(100%-12px)] w-px bg-[#e8e1d6]"
                aria-hidden="true"
              />
              <span
                class="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
                :class="approval.status === 'APPROVED' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-600'"
              >
                <svg v-if="approval.status === 'APPROVED'" class="h-2.5 w-2.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="m3 8 3 3 7-7" />
                </svg>
                <span v-else class="text-[10px] font-bold" aria-hidden="true">×</span>
              </span>
              <div class="min-w-0">
                <h3 class="text-[11px] font-semibold text-[#272621]">
                  {{ approval.status === 'APPROVED' ? 'Disetujui' : 'Ditolak' }}
                  <span class="font-normal text-[#77766f]">· ID atasan {{ approval.approver_id }}</span>
                </h3>
                <p class="mt-1 text-[10px] text-[#77766f]">{{ formatDateTime(approval.created_at) }}</p>
                <p v-if="approval.notes" class="mt-1 text-[10px] italic leading-relaxed text-[#77766f]">{{ approval.notes }}</p>
              </div>
            </article>
          </div>
          <p v-if="!travel.approvals.length" class="pt-3 text-[10px] text-[#77766f]">Belum ada catatan persetujuan.</p>
        </section>

        <section class="rounded-xl border border-[#e9e5dc] bg-white p-4 sm:p-5" aria-labelledby="lpj-title">
          <h2 id="lpj-title" class="border-b border-[#eee9e0] pb-3 font-serif text-sm font-bold text-[#272621]">
            Laporan Perjalanan (LPJ)
          </h2>
          <dl class="grid gap-3 pt-4">
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Status LPJ</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ travel.lpj_status }}</dd>
            </div>
            <div>
              <dt class="text-[9px] font-medium uppercase tracking-wide text-[#77766f]">Batas Waktu LPJ</dt>
              <dd class="mt-1 text-xs text-[#272621]">{{ formatDate(travel.lpj_due_date) }}</dd>
            </div>
            <div v-if="travel.lpj_reminder || travel.cash_advance_reminder" class="space-y-2">
              <p v-if="travel.lpj_reminder" class="rounded-md bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
                {{ travel.lpj_reminder }}
              </p>
              <p v-if="travel.cash_advance_reminder" class="rounded-md bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800">
                {{ travel.cash_advance_reminder }}
              </p>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  </section>
</template>
