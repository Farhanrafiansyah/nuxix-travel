<script setup lang="ts">
type PolicyKey =
  | 'max_hotel_per_night'
  | 'allowed_hotel_class'
  | 'flight_class'
  | 'max_local_transport_per_day'
  | 'daily_meal_allowance'
  | 'max_cash_advance_percent'
  | 'report_deadline_days'

type FieldKind = 'text' | 'currency' | 'percent' | 'days'

type PolicyField = {
  key: PolicyKey
  label: string
  kind: FieldKind
}

type PolicySection = {
  title: string
  fields: PolicyField[]
}

type RawPolicyResponse = { data?: Partial<Record<PolicyKey, string | number | null>> }

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string, errors?: Record<string, string[]> }
  message?: string
}

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')

const endpoints = {
  show: '/travel-policy',
  update: '/travel-policy'
}

const sections: PolicySection[] = [
  {
    title: 'Batas Akomodasi',
    fields: [
      { key: 'max_hotel_per_night', label: 'Batas Maksimal Hotel / Malam', kind: 'currency' },
      { key: 'allowed_hotel_class', label: 'Kelas Hotel Diizinkan', kind: 'text' }
    ]
  },
  {
    title: 'Kebijakan Transportasi',
    fields: [
      { key: 'flight_class', label: 'Kelas Penerbangan', kind: 'text' },
      { key: 'max_local_transport_per_day', label: 'Batas Maksimal Transportasi Lokal / Hari', kind: 'currency' }
    ]
  },
  {
    title: 'Uang Makan Harian',
    fields: [
      { key: 'daily_meal_allowance', label: 'Uang Makan / Hari', kind: 'currency' }
    ]
  },
  {
    title: 'Kebijakan Uang Muka & Reimbursement',
    fields: [
      { key: 'max_cash_advance_percent', label: 'Maksimal Uang Muka', kind: 'percent' },
      { key: 'report_deadline_days', label: 'Batas Waktu Pelaporan', kind: 'days' }
    ]
  }
]

const policyFields = sections.flatMap((section) => section.fields)

const fieldAffixes: Record<FieldKind, { prefix?: string, suffix?: string }> = {
  text: {},
  currency: { prefix: 'Rp' },
  percent: { suffix: '% dari estimasi biaya' },
  days: { suffix: 'hari setelah perjalanan' }
}

const emptyForm = (): Record<PolicyKey, string> => Object.fromEntries(
  policyFields.map((field) => [field.key, ''])
) as Record<PolicyKey, string>

const toForm = (raw: RawPolicyResponse): Record<PolicyKey, string> => Object.fromEntries(
  policyFields.map((field) => {
    const value = raw.data?.[field.key]
    return [field.key, value === null || value === undefined ? '' : String(value)]
  })
) as Record<PolicyKey, string>

const toPayload = (values: Record<PolicyKey, string>) => Object.fromEntries(
  policyFields.map((field) => {
    const value = values[field.key].trim()
    if (field.kind === 'text') return [field.key, value]
    return [field.key, value === '' ? null : Number(value)]
  })
)

const authToken = useCookie<string | null>('auth_token')

const getStatusCode = (error: unknown) => {
  const fetchError = error as FetchErrorLike
  return fetchError.statusCode ?? fetchError.status
}

const describeError = (error: unknown, fallback: string) => {
  const fetchError = error as FetchErrorLike

  if (getStatusCode(error) === 403) {
    return 'Akses ditolak. Masuklah menggunakan akun Super Admin.'
  }

  return fetchError.data?.message || fetchError.message || fallback
}

const getFieldErrors = (error: unknown): Record<string, string[]> => (error as FetchErrorLike).data?.errors ?? {}

const apiRequest = async <T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    query?: Record<string, string | number | undefined>
    body?: Record<string, unknown>
  } = {}
): Promise<T> => {
  if (!authToken.value) {
    await navigateTo('/login')
    throw Object.assign(new Error('Sesi berakhir. Silakan masuk kembali.'), { statusCode: 401 })
  }

  try {
    return await $fetch<T>(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      query: options.query,
      body: options.body,
      headers: {
        Authorization: `Bearer ${authToken.value}`,
        Accept: 'application/json'
      }
    })
  } catch (error) {
    if (getStatusCode(error) === 401) {
      authToken.value = null
      await navigateTo('/login')
    }
    throw error
  }
}

const form = reactive<Record<PolicyKey, string>>(emptyForm())
const isLoading = ref(true)
const isSaving = ref(false)
const loadError = ref('')
const saveError = ref('')
const notice = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

const fieldError = (key: PolicyKey) => fieldErrors.value[key]?.[0] ?? ''

const loadPolicy = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    const raw = await apiRequest<RawPolicyResponse>(endpoints.show)
    Object.assign(form, toForm(raw))
  } catch (error) {
    if (getStatusCode(error) === 401) return

    console.error('Gagal memuat kebijakan perjalanan.', error)
    loadError.value = describeError(error, 'Kebijakan perjalanan belum dapat dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

const submitPolicy = async () => {
  isSaving.value = true
  saveError.value = ''
  notice.value = ''
  fieldErrors.value = {}

  try {
    const raw = await apiRequest<RawPolicyResponse>(endpoints.update, {
      method: 'PUT',
      body: toPayload(form)
    })

    if (raw?.data) Object.assign(form, toForm(raw))
    notice.value = 'Kebijakan perjalanan berhasil disimpan.'
  } catch (error) {
    if (getStatusCode(error) === 401) return

    fieldErrors.value = getFieldErrors(error)
    saveError.value = describeError(error, 'Kebijakan perjalanan belum dapat disimpan.')
  } finally {
    isSaving.value = false
  }
}

onMounted(loadPolicy)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Kebijakan Perjalanan</h1>
      <p class="mt-1 text-xs text-[#718078]">Atur batas anggaran dan kebijakan perjalanan dinas perusahaan.</p>
    </div>

    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <p>{{ notice }}</p>
      <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" aria-label="Tutup pemberitahuan" @click="notice = ''">×</button>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadPolicy">
        Coba Lagi
      </button>
    </div>

    <div v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ saveError }}
    </div>

    <form class="space-y-5" @submit.prevent="submitPolicy">
      <fieldset :disabled="isLoading || isSaving" class="grid items-start gap-5 lg:grid-cols-2">
        <section
          v-for="section in sections"
          :key="section.title"
          class="rounded-xl border border-[#dfe8dc] bg-white px-5 py-4"
        >
          <h2 class="font-serif text-sm font-bold text-[#173b30]">{{ section.title }}</h2>

          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div v-for="field in section.fields" :key="field.key" class="flex flex-col">
              <label :for="`policy-${field.key}`" class="mb-1 text-[10px] font-medium leading-snug text-[#718078]">
                {{ field.label }}
              </label>
              <div class="mt-auto flex h-9 items-center gap-1.5 rounded-md border border-[#dfe8dc] bg-[#fafcf8] px-3 focus-within:border-[#9ab397]">
                <span v-if="fieldAffixes[field.kind].prefix" class="text-[11px] text-[#718078]">{{ fieldAffixes[field.kind].prefix }}</span>
                <input
                  :id="`policy-${field.key}`"
                  v-model="form[field.key]"
                  :type="field.kind === 'text' ? 'text' : 'number'"
                  :min="field.kind === 'text' ? undefined : 0"
                  :max="field.kind === 'percent' ? 100 : undefined"
                  :step="field.kind === 'text' ? undefined : 1"
                  :inputmode="field.kind === 'text' ? undefined : 'numeric'"
                  autocomplete="off"
                  class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] text-[#263b31] focus:outline-none"
                >
                <span v-if="fieldAffixes[field.kind].suffix" class="whitespace-nowrap text-[10px] text-[#718078]">{{ fieldAffixes[field.kind].suffix }}</span>
              </div>
              <span v-if="fieldError(field.key)" class="mt-1 block text-[10px] text-rose-600">{{ fieldError(field.key) }}</span>
            </div>
          </div>
        </section>
      </fieldset>

      <button
        type="submit"
        :disabled="isLoading || isSaving || Boolean(loadError)"
        class="inline-flex h-9 items-center rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ isSaving ? 'Menyimpan...' : 'Simpan Kebijakan' }}
      </button>
    </form>
  </section>
</template>