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
type TransportationSelection = TransportationMode | 'Tidak diperlukan' | ''
const transportationOptions: { label: string; value: TransportationSelection; icon: string }[] = [
  { label: 'Pesawat', value: 'Pesawat', icon: 'M3 11 21 3l-8 18-2-8-8-2Z' },
  { label: 'Kereta Api', value: 'Kereta Api', icon: 'M7 3h10a2 2 0 0 1 2 2v11a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2Zm0 5h10M8 20l-2 2m10-2 2 2M8 14h.01M16 14h.01' },
  { label: 'Mobil', value: 'Mobil Kantor', icon: 'M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14v7H5zm2 7v2m10-2v2M8 14h.01M16 14h.01' },
  { label: 'Tidak diperlukan', value: 'Tidak diperlukan', icon: 'M5 12h14' }
]
const tripTypes = ['Pulang pergi', 'Satu arah'] as const
type TripType = typeof tripTypes[number]
const flightClasses = ['Ekonomi', 'Bisnis', 'First Class'] as const
const hotelRoomTypes = [
  '1 kamar: Single / non-smoking',
  '1 kamar: Double / non-smoking',
  '1 kamar: Twin / non-smoking',
  '1 kamar: Single / smoking',
  '1 kamar: Double / smoking'
] as const
type TravelDraft = {
  destination: string
  purpose: string
  startDate: string
  endDate: string
  notes: string
  transportationMode: TransportationSelection
  departureCity: string
  tripType: TripType
  flightClass: typeof flightClasses[number]
  needsHotel: boolean
  checkInDate: string
  checkOutDate: string
  hotelArea: string
  hotelRoomType: typeof hotelRoomTypes[number]
  accommodationNotes: string
  step: number
}

const draftStorageKey = 'nuvix-travel-request-draft'
const activeStep = ref(0)
const destination = ref('')
const purpose = ref('')
const startDate = ref('')
const endDate = ref('')
const notes = ref('')
const transportationMode = ref<TransportationSelection>('')
const departureCity = ref('')
const tripType = ref<TripType>('Pulang pergi')
const flightClass = ref<typeof flightClasses[number]>('Ekonomi')
const needsHotel = ref(false)
const checkInDate = ref('')
const checkOutDate = ref('')
const hotelArea = ref('')
const hotelRoomType = ref<typeof hotelRoomTypes[number]>('1 kamar: Single / non-smoking')
const accommodationNotes = ref('')
const documentFile = ref<File | null>(null)
const isSubmitting = ref(false)
const submitError = ref('')
const successMessage = ref('')
const draftMessage = ref('')

const lodgingDuration = computed(() => {
  if (!checkInDate.value || !checkOutDate.value) return 0
  const start = new Date(`${checkInDate.value}T00:00:00`)
  const end = new Date(`${checkOutDate.value}T00:00:00`)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
})

const handleHotelToggle = () => {
  if (needsHotel.value) {
    checkInDate.value = startDate.value
    checkOutDate.value = endDate.value
  }
}

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

  if (step === 1 && needsHotel.value) {
    if (!checkInDate.value || !checkOutDate.value) {
      submitError.value = 'Tanggal check-in dan check-out hotel wajib diisi.'
      return false
    }
    if (checkInDate.value > checkOutDate.value) {
      submitError.value = 'Tanggal check-out hotel tidak boleh sebelum tanggal check-in.'
      return false
    }
    if (checkInDate.value < startDate.value || checkOutDate.value > endDate.value) {
      submitError.value = 'Tanggal hotel harus berada dalam rentang tanggal perjalanan.'
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

  while (activeStep.value < step) {
    if (!validateStep(activeStep.value)) return
    activeStep.value += 1
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
    departureCity: departureCity.value,
    tripType: tripType.value,
    flightClass: flightClass.value,
    needsHotel: needsHotel.value,
    checkInDate: checkInDate.value,
    checkOutDate: checkOutDate.value,
    hotelArea: hotelArea.value,
    hotelRoomType: hotelRoomType.value,
    accommodationNotes: accommodationNotes.value,
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

  for (let step = 0; step <= 1; step += 1) {
    if (!validateStep(step)) {
      activeStep.value = step
      return
    }
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
  if (transportationMode.value && transportationMode.value !== 'Tidak diperlukan') {
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
    await navigateTo('/karyawan/dinas')
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
    transportationMode.value = transportationOptions.some((option) => option.value === draft.transportationMode)
      ? draft.transportationMode as TransportationSelection
      : ''
    departureCity.value = typeof draft.departureCity === 'string' ? draft.departureCity : ''
    tripType.value = tripTypes.includes(draft.tripType as TripType) ? draft.tripType as TripType : 'Pulang pergi'
    flightClass.value = flightClasses.includes(draft.flightClass as typeof flightClasses[number])
      ? draft.flightClass as typeof flightClasses[number]
      : 'Ekonomi'
    needsHotel.value = typeof draft.needsHotel === 'boolean' ? draft.needsHotel : false
    checkInDate.value = typeof draft.checkInDate === 'string' ? draft.checkInDate : ''
    checkOutDate.value = typeof draft.checkOutDate === 'string' ? draft.checkOutDate : ''
    hotelArea.value = typeof draft.hotelArea === 'string' ? draft.hotelArea : ''
    hotelRoomType.value = hotelRoomTypes.includes(draft.hotelRoomType as typeof hotelRoomTypes[number])
      ? draft.hotelRoomType as typeof hotelRoomTypes[number]
      : '1 kamar: Single / non-smoking'
    accommodationNotes.value = typeof draft.accommodationNotes === 'string' ? draft.accommodationNotes : ''
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
            :class="activeStep === index ? 'border-[#c58b20] bg-[#c58b20] text-white' : activeStep > index ? 'border-[#1b5a4e] bg-[#1b5a4e] text-white' : 'border-[#e5e0d7] text-[#77766f]'"
          >
            {{ activeStep > index ? '✓' : index + 1 }}
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

        <div v-else-if="activeStep === 1" class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 class="text-xs font-bold text-[#173b30]">Kebutuhan Perjalanan</h2>
              <p class="mt-1 text-[10px] text-[#718078]">Pilih transportasi dan akomodasi yang Anda butuhkan selama perjalanan dinas.</p>
            </div>
            <span class="text-[9px] text-[#718078]">Contoh pengisian</span>
          </div>

          <fieldset>
            <legend class="mb-2 text-[10px] font-semibold text-[#52675b]">Kebutuhan Transportasi</legend>
            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <label
                v-for="option in transportationOptions"
                :key="option.label"
                class="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[10px] transition-colors"
                :class="transportationMode === option.value ? 'border-[#6e9a82] bg-[#eff6ef] text-[#173b30]' : 'border-[#dfe8dc] bg-white text-[#52675b] hover:bg-[#f8faf6]'"
              >
                <input
                  v-model="transportationMode"
                  type="radio"
                  name="transportation-mode"
                  :value="option.value"
                  class="sr-only"
                >
                <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path :d="option.icon" />
                </svg>
                <span class="flex-1 font-medium">{{ option.label }}</span>
                <span
                  class="flex h-3 w-3 items-center justify-center rounded-full border"
                  :class="transportationMode === option.value ? 'border-[#1b5a4e]' : 'border-[#d2dfd1]'"
                  aria-hidden="true"
                >
                  <span v-if="transportationMode === option.value" class="h-1.5 w-1.5 rounded-full bg-[#1b5a4e]" />
                </span>
              </label>
            </div>
          </fieldset>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Kota Keberangkatan</span>
              <input
                v-model="departureCity"
                type="text"
                autocomplete="address-level2"
                placeholder="Contoh: Jakarta"
                class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] placeholder:text-[#9aa59d] focus:border-[#6e9a82] focus:outline-none"
              >
            </label>
            <label class="block">
              <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Kota Tujuan</span>
              <input
                :value="destination"
                type="text"
                readonly
                class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#f6f8f4] px-2.5 text-[10px] text-[#52675b] focus:outline-none"
              >
            </label>
            <label class="block">
              <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Jenis Perjalanan</span>
              <select
                v-model="tripType"
                class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] focus:border-[#6e9a82] focus:outline-none"
              >
                <option v-for="type in tripTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Kelas Penerbangan</span>
              <select
                v-model="flightClass"
                :disabled="transportationMode !== 'Pesawat'"
                class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] focus:border-[#6e9a82] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f3f5f1] disabled:text-[#98a198]"
              >
                <option v-for="flightClassOption in flightClasses" :key="flightClassOption" :value="flightClassOption">{{ flightClassOption }}</option>
              </select>
            </label>
          </div>

          <div class="border-t border-[#e3ebdf] pt-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-[10px] font-semibold text-[#52675b]">Kebutuhan Akomodasi</h3>
              <label class="inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-medium text-[#263b31]">
                <input
                  v-model="needsHotel"
                  type="checkbox"
                  class="h-3 w-3 rounded border-[#cbd9ca] accent-[#1b5a4e]"
                  @change="handleHotelToggle"
                >
                Saya membutuhkan hotel
              </label>
            </div>

            <div v-if="needsHotel" class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Tanggal Check-in</span>
                <input
                  v-model="checkInDate"
                  required
                  type="date"
                  :min="startDate"
                  :max="endDate"
                  class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] focus:border-[#6e9a82] focus:outline-none"
                >
              </label>
              <label class="block">
                <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Tanggal Check-out</span>
                <input
                  v-model="checkOutDate"
                  required
                  type="date"
                  :min="checkInDate || startDate"
                  :max="endDate"
                  class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] focus:border-[#6e9a82] focus:outline-none"
                >
              </label>
              <label class="block">
                <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Area / Lokasi Hotel</span>
                <input
                  v-model="hotelArea"
                  type="text"
                  placeholder="Contoh: Surabaya Pusat, dekat lokasi pertemuan"
                  class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] placeholder:text-[#9aa59d] focus:border-[#6e9a82] focus:outline-none"
                >
              </label>
              <label class="block">
                <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Tipe Kamar</span>
                <select
                  v-model="hotelRoomType"
                  class="h-8 w-full rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 text-[10px] text-[#263b31] focus:border-[#6e9a82] focus:outline-none"
                >
                  <option v-for="roomType in hotelRoomTypes" :key="roomType" :value="roomType">{{ roomType }}</option>
                </select>
              </label>
              <p class="text-[9px] text-[#718078] sm:col-span-2">
                Durasi menginap: {{ lodgingDuration }} malam, sesuai tanggal perjalanan.
              </p>
              <label class="block sm:col-span-2">
                <span class="mb-1 block text-[10px] font-semibold text-[#52675b]">Catatan Kebutuhan (opsional)</span>
                <textarea
                  v-model="accommodationNotes"
                  rows="2"
                  placeholder="Tambahkan kebutuhan khusus akomodasi jika ada..."
                  class="w-full resize-y rounded-md border border-[#dfe8dc] bg-[#fbfcfa] px-2.5 py-2 text-[10px] text-[#263b31] placeholder:text-[#9aa59d] focus:border-[#6e9a82] focus:outline-none"
                />
              </label>
            </div>
            <p v-else class="mt-2 text-[9px] text-[#718078]">Akomodasi hotel tidak diperlukan untuk perjalanan ini.</p>
          </div>

          <p class="rounded-md border border-[#eadfbe] bg-[#fff9e9] px-3 py-2 text-[9px] leading-relaxed text-[#755b24]">
            Info: sistem saat ini hanya menyimpan moda transportasi. Data kota keberangkatan, jenis perjalanan, kelas penerbangan, dan kebutuhan hotel belum tersimpan ke server.
          </p>
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
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Kota Keberangkatan</dt>
              <dd class="mt-1 text-[#272621]">{{ departureCity || '—' }}</dd>
            </div>
            <div>
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Jenis Perjalanan</dt>
              <dd class="mt-1 text-[#272621]">{{ tripType }}</dd>
            </div>
            <div v-if="transportationMode === 'Pesawat'">
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Kelas Penerbangan</dt>
              <dd class="mt-1 text-[#272621]">{{ flightClass }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-[10px] font-semibold uppercase tracking-wide text-[#77766f]">Akomodasi</dt>
              <dd v-if="needsHotel" class="mt-1 whitespace-pre-wrap text-[#272621]">
                Hotel: {{ hotelArea || 'area belum ditentukan' }} · {{ hotelRoomType }} · {{ checkInDate || '—' }} hingga {{ checkOutDate || '—' }} ({{ lodgingDuration }} malam)
                <span v-if="accommodationNotes"> — {{ accommodationNotes }}</span>
              </dd>
              <dd v-else class="mt-1 text-[#272621]">Tidak membutuhkan hotel</dd>
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
          @click="navigateTo('/karyawan/dinas')"
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