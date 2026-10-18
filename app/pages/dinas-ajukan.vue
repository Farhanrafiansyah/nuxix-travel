<script setup lang="ts">
const authToken = useCookie<string | null>('auth_token')

const steps = [
  'Informasi Perjalanan',
  'Kebutuhan Perjalanan',
  'Dokumen Pendukung',
  'Review & Submit'
]
const transportationModes = ['Pesawat', 'Kereta Api', 'Travel', 'Mobil Kantor'] as const
type TransportationMode = typeof transportationModes[number]
type TravelDraft = {
  destination: string
  purpose: string
  startDate: string
  endDate: string
  notes: string
  transportationMode: TransportationMode | ''
  step: number
}

const draftStorageKey = 'nuvix-travel-request-draft'
const activeStep = ref(0)
const destination = ref('')
const purpose = ref('')
const startDate = ref('')
const endDate = ref('')
const notes = ref('')
const transportationMode = ref<TransportationMode | ''>('')
const documentFile = ref<File | null>(null)
const isSubmitting = ref(false)
const submitError = ref('')
const successMessage = ref('')
const draftMessage = ref('')

const validateStep = (step: number) => {
  if (step === 0) {
    if (destination.value.trim().length < 2) {
      submitError.value = 'Kota tujuan wajib diisi minimal 2 karakter.'
      return false
    }
    if (purpose.value.trim().length < 5) {
      submitError.value = 'Keperluan perjalanan wajib diisi minimal 5 karakter.'
      return false
    }
    if (!startDate.value || !endDate.value) {
      submitError.value = 'Tanggal berangkat dan tanggal kembali wajib diisi.'
      return false
    }
    if (startDate.value > endDate.value) {
      submitError.value = 'Tanggal kembali tidak boleh sebelum tanggal berangkat.'
      return false
    }
  }

  submitError.value = ''
  return true
}

const goToStep = (step: number) => {
  if (step <= activeStep.value) {
    activeStep.value = step
    submitError.value = ''
    return
  }

  if (validateStep(activeStep.value)) {
    activeStep.value = step
  }
}

const nextStep = () => {
  if (validateStep(activeStep.value) && activeStep.value < steps.length - 1) {
    activeStep.value += 1
  }
}

const previousStep = () => {
  if (activeStep.value > 0) {
    activeStep.value -= 1
    submitError.value = ''
  }
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  submitError.value = ''

  if (!file) {
    documentFile.value = null
    return
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    input.value = ''
    documentFile.value = null
    submitError.value = 'Format dokumen harus PDF, JPG, atau PNG.'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    input.value = ''
    documentFile.value = null
    submitError.value = 'Ukuran dokumen maksimal 5 MB.'
    return
  }

  documentFile.value = file
}

const clearDocument = () => {
  documentFile.value = null
  const input = document.querySelector<HTMLInputElement>('#travel-document')
  if (input) input.value = ''
}

const saveDraft = () => {
  const draft: TravelDraft = {
    destination: destination.value,
    purpose: purpose.value,
    startDate: startDate.value,
    endDate: endDate.value,
    notes: notes.value,
    transportationMode: transportationMode.value,
    step: activeStep.value
  }

  localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  draftMessage.value = 'Draf tersimpan di perangkat ini.'
  submitError.value = ''
}

const submittedPurpose = computed(() => {
  const trimmedNotes = notes.value.trim()
  return trimmedNotes
    ? `${purpose.value.trim()}\n\nCatatan tambahan:\n${trimmedNotes}`
    : purpose.value.trim()
})

const submitRequest = async () => {
  submitError.value = ''
  successMessage.value = ''

  if (!validateStep(0)) {
    activeStep.value = 0
    return
  }

  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  const formData = new FormData()
  formData.append('destination', destination.value.trim())
  formData.append('start_date', startDate.value)
  formData.append('end_date', endDate.value)
  formData.append('purpose', submittedPurpose.value)
  if (transportationMode.value) {
    formData.append('transportation_mode', transportationMode.value)
  }
  if (documentFile.value) {
    formData.append('document', documentFile.value)
  }

  isSubmitting.value = true

  try {
    const response = await $fetch<{ message: string }>('http://localhost:8000/api/travels', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: formData
    })
    localStorage.removeItem(draftStorageKey)
    successMessage.value = response.message || 'Pengajuan perjalanan dinas berhasil dikirim.'
    await navigateTo('/dinas')
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number; data?: { message?: string } }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }

    submitError.value = fetchError.data?.message || 'Pengajuan perjalanan dinas belum dapat dikirim.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  const savedDraft = localStorage.getItem(draftStorageKey)
  if (!savedDraft) return

  try {
    const draft = JSON.parse(savedDraft) as Partial<TravelDraft>
    destination.value = typeof draft.destination === 'string' ? draft.destination : ''
    purpose.value = typeof draft.purpose === 'string' ? draft.purpose : ''
    startDate.value = typeof draft.startDate === 'string' ? draft.startDate : ''
    endDate.value = typeof draft.endDate === 'string' ? draft.endDate : ''
    notes.value = typeof draft.notes === 'string' ? draft.notes : ''
    transportationMode.value = transportationModes.includes(draft.transportationMode as TransportationMode)
      ? draft.transportationMode as TransportationMode
      : ''
    activeStep.value = typeof draft.step === 'number'
      ? Math.min(Math.max(draft.step, 0), steps.length - 1)
      : 0
    draftMessage.value = 'Draf sebelumnya dipulihkan dari perangkat ini.'
  } catch (error) {
    localStorage.removeItem(draftStorageKey)
    console.error('Gagal memulihkan draf perjalanan dinas.', error)
    draftMessage.value = 'Draf tersimpan tidak dapat dibaca dan telah dihapus.'
  }
})
</script>

<template>
  <section class="dashboard-page space-y-4 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#1f2937]">Ajukan Perjalanan Dinas</h1>
      <p class="mt-0.5 text-xs text-[#6b7280]">Lengkapi formulir berikut untuk mengajukan perjalanan dinas baru.</p>
    </div>

    <form class="overflow-hidden rounded-xl border border-[#e9e5dc] bg-white shadow-xs" @submit.prevent="submitRequest">
      <nav class="grid grid-cols-2 border-b border-[#e9e5dc] bg-[#faf9f6] sm:grid-cols-4" aria-label="Tahapan pengajuan">
        <button
          v-for="(step, index) in steps"
          :key="step"
          type="button"
          class="flex min-h-14 items-center gap-2 border-b-2 px-3 py-2 text-left text-[10px] transition-colors sm:justify-center sm:px-4"
          :class="activeStep === index ? 'border-[#c58b20] text-[#272621]' : 'border-transparent text-[#77766f] hover:text-[#272621]'"
          :aria-current="activeStep === index ? 'step' : undefined"
          @click="goToStep(index)"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold"
            :class="activeStep === index ? 'border-[#c58b20] bg-[#c58b20] text-white' : 'border-[#e5e0d7] text-[#77766f]'"
          >
            {{ index + 1 }}
          </span>
          <span class="font-medium">{{ step }}</span>
          <span v-if="index < steps.length - 1" class="ml-auto hidden h-px w-6 bg-[#e9e5dc] lg:block" aria-hidden="true" />
        </button>
      </nav>

      <div class="space-y-4 px-5 py-5 sm:px-7">
        <div v-if="activeStep === 0" class="grid gap-x-5 gap-y-3 sm:grid-cols-2">
          <div>
            <label for="travel-destination" class="mb-1 block text-[11px] font-semibold text-[#272621]">Kota Tujuan</label>
            <input
              id="travel-destination"
              v-model="destination"
              required
              minlength="2"
              type="text"
              autocomplete="off"
              placeholder="Pilih kota tujuan..."
              class="h-9 w-full rounded-md border border-[#e9e5dc] bg-white px-2.5 text-xs text-[#272621] placeholder:text-[#aaa59c] focus:border-[#c58b20] focus:outline-none"
            >
          </div>

          <div>
            <label for="travel-purpose" class="mb-1 block text-[11px] font-semibold text-[#272621]">Keperluan Perjalanan</label>
            <input
              id="travel-purpose"
              v-model="purpose"
              required
              minlength="5"
              type="text"
              placeholder="Contoh: Kunjungan klien enterprise"
              class="h-9 w-full rounded-md border border-[#e9e5dc] bg-white px-2.5 text-xs text-[#272621] placeholder:text-[#aaa59c] focus:border-[#c58b20] focus:outline-none"
            >
          </div>

          <div>
            <label for="travel-start-date" class="mb-1 block text-[11px] font-semibold text-[#272621]">Tanggal Berangkat</label>
            <input
              id="travel-start-date"
              v-model="startDate"
              required
              type="date"
              class="h-9 w-full rounded-md border border-[#e9e5dc] bg-white px-2.5 text-xs text-[#272621] focus:border-[#c58b20] focus:outline-none"
            >
          </div>

          <div>
            <label for="travel-end-date" class="mb-1 block text-[11px] font-semibold text-[#272621]">Tanggal Kembali</label>
            <input
              id="travel-end-date"
              v-model="endDate"
              required
              type="date"
              :min="startDate || undefined"
              class="h-9 w-full rounded-md border border-[#e9e5dc] bg-white px-2.5 text-xs text-[#272621] focus:border-[#c58b20] focus:outline-none"
            >
          </div>

          <div class="sm:col-span-2">
            <label for="travel-notes" class="mb-1 block text-[11px] font-semibold text-[#272621]">Catatan Tambahan</label>
            <textarea
              id="travel-notes"
              v-model="notes"
              rows="3"
              placeholder="Tuliskan detail pendukung lainnya jika ada..."
              class="w-full resize-y rounded-md border border-[#e9e5dc] bg-white px-2.5 py-2 text-xs text-[#272621] placeholder:text-[#aaa59c] focus:border-[#c58b20] focus:outline-none"
            />
          </div>
        </div>

        <div v-else-if="activeStep === 1" class="max-w-xl">
          <label for="transportation-mode" class="mb-1 block text-[11px] font-semibold text-[#272621]">Moda Transportasi</label>
          <select
            id="transportation-mode"
            v-model="transportationMode"
            class="h-9 w-full rounded-md border border-[#e9e5dc] bg-white px-2.5 text-xs text-[#272621] focus:border-[#c58b20] focus:outline-none"
          >
            <option value="">Pilih moda transportasi (opsional)</option>
            <option v-for="mode in transportationModes" :key="mode" :value="mode">{{ mode }}</option>
          </select>
          <p class="mt-2 text-[11px] text-[#77766f]">Informasi ini akan disertakan pada pengajuan perjalanan dinas Anda.</p>
        </div>

        <div v-else-if="activeStep === 2">
          <label
            for="travel-document"
            class="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#d9d3c8] bg-[#faf9f6] px-4 py-5 text-center transition-colors hover:bg-[#f5f1e8]"
          >
            <svg class="mb-2 h-7 w-7 text-[#c58b20]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18v-6m-3 3 3-3 3 3" />
            </svg>
            <span class="text-xs font-semibold text-[#272621]">{{ documentFile?.name || 'Unggah dokumen pendukung (opsional)' }}</span>
            <span class="mt-1 text-[10px] text-[#77766f]">PDF, JPG, atau PNG (maks. 5 MB)</span>
            <input
              id="travel-document"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              class="sr-only"
              @change="handleFileChange"
            >
          </label>
          <button
            v-if="documentFile"
            type="button"
            class="mt-2 text-[11px] font-medium text-red-600 hover:underline"
            @click="clearDocument"
          >
            Hapus dokumen
          </button>
        </div>

        <div v-else class="space-y-4">
          <h2 class="font-serif text-sm font-bold text-[#272621]">Periksa Informasi Pengajuan</h2>
          <dl class="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2">
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Kota Tujuan</dt>
              <dd class="mt-1 text-[#272621]">{{ destination || '—' }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Keperluan Perjalanan</dt>
              <dd class="mt-1 text-[#272621]">{{ purpose || '—' }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Tanggal Perjalanan</dt>
              <dd class="mt-1 text-[#272621]">{{ startDate || '—' }} hingga {{ endDate || '—' }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Moda Transportasi</dt>
              <dd class="mt-1 text-[#272621]">{{ transportationMode || 'Belum dipilih' }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Catatan Tambahan</dt>
              <dd class="mt-1 whitespace-pre-wrap text-[#272621]">{{ notes || 'Tidak ada' }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Dokumen Pendukung</dt>
              <dd class="mt-1 text-[#272621]">{{ documentFile?.name || 'Tidak ada' }}</dd>
            </div>
          </dl>
        </div>

        <p v-if="submitError" class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {{ submitError }}
        </p>
        <p v-if="successMessage" class="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700" role="status">
          {{ successMessage }}
        </p>
        <p v-if="draftMessage" class="text-[11px] text-[#77766f]" role="status">{{ draftMessage }}</p>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9e5dc] bg-[#faf9f6] px-3 py-3 sm:px-4">
        <button
          type="button"
          class="h-8 rounded-md border border-[#e5e0d7] bg-white px-3 text-[11px] font-medium text-[#272621] transition-colors hover:bg-[#f5f1e8]"
          @click="navigateTo('/dinas')"
        >
          Batal
        </button>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="h-8 rounded-md border border-[#e5e0d7] bg-white px-3 text-[11px] font-medium text-[#272621] transition-colors hover:bg-[#f5f1e8]"
            @click="saveDraft"
          >
            Simpan Draf
          </button>
          <button
            v-if="activeStep > 0"
            type="button"
            class="h-8 rounded-md border border-[#e5e0d7] bg-white px-3 text-[11px] font-medium text-[#272621] transition-colors hover:bg-[#f5f1e8]"
            @click="previousStep"
          >
            Kembali
          </button>
          <button
            v-if="activeStep < steps.length - 1"
            type="button"
            class="inline-flex h-8 items-center gap-2 rounded-md bg-[#bd851d] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#a97518]"
            @click="nextStep"
          >
            <span v-if="activeStep === 0" aria-hidden="true">➤</span>
            Lanjut
          </button>
          <button
            v-else
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex h-8 items-center gap-2 rounded-md bg-[#bd851d] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#a97518] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan' }}
          </button>
        </div>
      </footer>
    </form>
  </section>
</template>