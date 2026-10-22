<script setup lang="ts">
type DepartmentStatus = 'ACTIVE' | 'INACTIVE'

type ManagerOption = {
  id: number
  name: string
}

type DepartmentRecord = {
  id: number
  name: string
  manager: ManagerOption | null
  employee_count: number
  status: DepartmentStatus
}

type DepartmentPayload = {
  name: string
  manager_id: number | null
  status: DepartmentStatus
}

type RawDepartmentsResponse = { data?: DepartmentRecord[] }
type RawManagersResponse = { data?: ManagerOption[] }

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string, errors?: Record<string, string[]> }
  message?: string
}

type ActiveModal = 'form' | 'confirm' | null

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')

const endpoints = {
  list: '/departments',
  create: '/departments',
  update: (id: number) => `/departments/${id}`,
  remove: (id: number) => `/departments/${id}`,
  managers: '/users'
}

const statusLabels: Record<DepartmentStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif'
}

const statusStyles: Record<DepartmentStatus, string> = {
  ACTIVE: 'bg-[#e4f0e1] text-[#456d43]',
  INACTIVE: 'bg-[#eceeea] text-[#6f7a73]'
}

const toDepartments = (raw: RawDepartmentsResponse): DepartmentRecord[] => Array.isArray(raw.data) ? raw.data : []

const toManagerOptions = (raw: RawManagersResponse): ManagerOption[] => (Array.isArray(raw.data) ? raw.data : [])
  .map((user) => ({ id: user.id, name: user.name }))

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

const departments = ref<DepartmentRecord[]>([])
const managers = ref<ManagerOption[]>([])
const isLoading = ref(true)
const loadError = ref('')
const notice = ref('')

let latestRequestId = 0

const loadDepartments = async () => {
  const requestId = ++latestRequestId
  isLoading.value = true
  loadError.value = ''

  try {
    const raw = await apiRequest<RawDepartmentsResponse>(endpoints.list)
    if (requestId !== latestRequestId) return

    departments.value = toDepartments(raw)
  } catch (error) {
    if (requestId !== latestRequestId || getStatusCode(error) === 401) return

    console.error('Gagal memuat daftar departemen.', error)
    departments.value = []
    loadError.value = describeError(error, 'Daftar departemen belum dapat dimuat dari server.')
  } finally {
    if (requestId === latestRequestId) isLoading.value = false
  }
}

const loadManagers = async () => {
  try {
    const raw = await apiRequest<RawManagersResponse>(endpoints.managers, {
      query: { per_page: 100, status: 'ACTIVE' }
    })
    managers.value = toManagerOptions(raw)
  } catch (error) {
    if (getStatusCode(error) !== 401) console.error('Gagal memuat daftar manajer.', error)
  }
}

onMounted(() => {
  loadDepartments()
  loadManagers()
})

const activeModal = ref<ActiveModal>(null)
const editingDepartment = ref<DepartmentRecord | null>(null)
const deleteTarget = ref<DepartmentRecord | null>(null)
const isSubmitting = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

const form = reactive<DepartmentPayload>({
  name: '',
  manager_id: null,
  status: 'ACTIVE'
})

const fieldError = (field: keyof DepartmentPayload) => fieldErrors.value[field]?.[0] ?? ''

const closeModal = () => {
  activeModal.value = null
  editingDepartment.value = null
  deleteTarget.value = null
  formError.value = ''
  fieldErrors.value = {}
}

const openCreateModal = () => {
  editingDepartment.value = null
  Object.assign(form, { name: '', manager_id: null, status: 'ACTIVE' })
  formError.value = ''
  fieldErrors.value = {}
  activeModal.value = 'form'
}

const openEditModal = (department: DepartmentRecord) => {
  editingDepartment.value = department
  Object.assign(form, {
    name: department.name,
    manager_id: department.manager?.id ?? null,
    status: department.status
  })
  formError.value = ''
  fieldErrors.value = {}
  activeModal.value = 'form'
}

const openDeleteModal = (department: DepartmentRecord) => {
  deleteTarget.value = department
  formError.value = ''
  activeModal.value = 'confirm'
}

const submitForm = async () => {
  isSubmitting.value = true
  formError.value = ''
  fieldErrors.value = {}

  const payload: DepartmentPayload = {
    name: form.name.trim(),
    manager_id: form.manager_id,
    status: form.status
  }

  try {
    if (editingDepartment.value) {
      await apiRequest(endpoints.update(editingDepartment.value.id), { method: 'PUT', body: payload })
      notice.value = `Departemen ${payload.name} berhasil diperbarui.`
    } else {
      await apiRequest(endpoints.create, { method: 'POST', body: payload })
      notice.value = `Departemen ${payload.name} berhasil ditambahkan.`
    }

    closeModal()
    await loadDepartments()
  } catch (error) {
    if (getStatusCode(error) === 401) return

    fieldErrors.value = getFieldErrors(error)
    formError.value = describeError(error, 'Data departemen belum dapat disimpan.')
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = async () => {
  const target = deleteTarget.value
  if (!target) return

  isSubmitting.value = true
  formError.value = ''

  try {
    await apiRequest(endpoints.remove(target.id), { method: 'DELETE' })
    notice.value = `Departemen ${target.name} berhasil dihapus.`

    closeModal()
    await loadDepartments()
  } catch (error) {
    if (getStatusCode(error) === 401) return

    formError.value = describeError(error, 'Departemen belum dapat dihapus.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Manajemen Departemen</h1>
        <p class="mt-1 text-xs text-[#718078]">Kelola daftar departemen dan penanggung jawabnya.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443]"
        @click="openCreateModal"
      >
        <span aria-hidden="true">+</span>
        Tambah Departemen
      </button>
    </div>

    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <p>{{ notice }}</p>
      <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" aria-label="Tutup pemberitahuan" @click="notice = ''">×</button>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadDepartments">
        Coba Lagi
      </button>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="department-list-heading">
      <h2 id="department-list-heading" class="sr-only">Daftar Departemen</h2>

      <div class="overflow-x-auto px-3.5 py-2">
        <table class="w-full min-w-[720px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Nama Departemen</th>
              <th scope="col" class="px-2.5 py-2.5">Manajer</th>
              <th scope="col" class="px-2.5 py-2.5">Jumlah Karyawan</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat departemen...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="departments.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada departemen terdaftar.</td>
            </tr>
            <tr v-for="department in departments" v-else :key="department.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3.5 font-medium">{{ department.name }}</td>
              <td class="whitespace-nowrap px-2.5 py-3.5">{{ department.manager?.name || '—' }}</td>
              <td class="whitespace-nowrap px-2.5 py-3.5">{{ department.employee_count }}</td>
              <td class="px-2.5 py-3.5">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[department.status]">
                  {{ statusLabels[department.status] }}
                </span>
              </td>
              <td class="px-2.5 py-3.5">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-md border border-[#dfe8dc] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#173b30] transition-colors hover:bg-[#f8faf6]"
                    @click="openEditModal(department)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-3 py-1.5 text-[10px] font-semibold text-[#a8403a] transition-colors hover:bg-[#f8d6d3]"
                    @click="openDeleteModal(department)"
                  >
                    Hapus
                  </button>
                </div>
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
      @click.self="!isSubmitting && closeModal()"
    >
      <form
        v-if="activeModal === 'form'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-form-heading"
        @submit.prevent="submitForm"
      >
        <h2 id="department-form-heading" class="font-serif text-base font-bold text-[#173b30]">
          {{ editingDepartment ? 'Edit Departemen' : 'Tambah Departemen' }}
        </h2>

        <p v-if="formError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700" role="alert">{{ formError }}</p>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nama departemen</span>
            <input
              v-model="form.name"
              type="text"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <span v-if="fieldError('name')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('name') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Manajer</span>
            <select
              v-model="form.manager_id"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option :value="null">Belum ditentukan</option>
              <option v-for="manager in managers" :key="manager.id" :value="manager.id">{{ manager.name }}</option>
            </select>
            <span v-if="fieldError('manager_id')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('manager_id') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Status</span>
            <select
              v-model="form.status"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option v-for="(label, status) in statusLabels" :key="status" :value="status">{{ label }}</option>
            </select>
            <span v-if="fieldError('status')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('status') }}</span>
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60" @click="closeModal">Batal</button>
          <button type="submit" :disabled="isSubmitting" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443] disabled:cursor-not-allowed disabled:opacity-60">
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>

      <section
        v-else-if="activeModal === 'confirm' && deleteTarget"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-delete-heading"
      >
        <h2 id="department-delete-heading" class="font-serif text-base font-bold text-[#173b30]">Hapus Departemen</h2>
        <p class="mt-2 text-xs leading-relaxed text-[#4f6a5a]">
          Hapus departemen {{ deleteTarget.name }}? Tindakan ini tidak dapat dibatalkan.
        </p>

        <p v-if="formError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700" role="alert">{{ formError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60" @click="closeModal">Batal</button>
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-3 text-[10px] font-semibold text-[#a8403a] hover:bg-[#f8d6d3] disabled:cursor-not-allowed disabled:opacity-60" @click="confirmDelete">
            {{ isSubmitting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>