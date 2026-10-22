<script setup lang="ts">
type UserRole = 'SUPER_ADMIN' | 'EMPLOYEE' | 'SUPERVISOR' | 'TRAVEL_ADMIN' | 'FINANCE'
type UserStatus = 'ACTIVE' | 'INACTIVE'

type UserRecord = {
  id: number
  nip: string
  name: string
  email: string
  role: UserRole
  department: string
  status: UserStatus
  created_at?: string
}

type UserPayload = {
  nip: string
  name: string
  email: string
  role: UserRole
  department: string
}

type PageMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type RawUsersResponse = { data?: UserRecord[], meta?: Partial<PageMeta> } & Partial<PageMeta>
type RawDepartmentsResponse = { data?: (string | { name: string })[] }
type ResetPasswordResponse = { message?: string, temporary_password?: string }

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string, errors?: Record<string, string[]> }
  message?: string
}

type ConfirmState = { type: 'status' | 'reset', user: UserRecord }
type ActiveModal = 'form' | 'confirm' | null

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')
const PAGE_SIZE = 6

const endpoints = {
  list: '/users',
  create: '/users',
  update: (id: number) => `/users/${id}`,
  setStatus: (id: number) => `/users/${id}/status`,
  resetPassword: (id: number) => `/users/${id}/reset-password`,
  departments: '/departments'
}

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  EMPLOYEE: 'Karyawan',
  SUPERVISOR: 'Atasan',
  TRAVEL_ADMIN: 'Admin Travel',
  FINANCE: 'Tim Keuangan'
}

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif'
}

const statusStyles: Record<UserStatus, string> = {
  ACTIVE: 'bg-[#e4f0e1] text-[#456d43]',
  INACTIVE: 'bg-[#eceeea] text-[#6f7a73]'
}

const roleOptions = Object.keys(roleLabels) as UserRole[]

const toUsersPage = (raw: RawUsersResponse): { rows: UserRecord[], meta: PageMeta } => {
  const rows = Array.isArray(raw.data) ? raw.data : []
  const source = raw.meta ?? raw

  return {
    rows,
    meta: {
      current_page: source.current_page ?? 1,
      last_page: source.last_page ?? 1,
      per_page: source.per_page ?? PAGE_SIZE,
      total: source.total ?? rows.length
    }
  }
}

const toDepartmentNames = (raw: RawDepartmentsResponse): string[] => (raw.data ?? [])
  .map((department) => typeof department === 'string' ? department : department.name)
  .filter(Boolean)

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

const users = ref<UserRecord[]>([])
const departments = ref<string[]>([])
const meta = ref<PageMeta>({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 })
const isLoading = ref(true)
const loadError = ref('')
const notice = ref<{ message: string, secret: string } | null>(null)

const searchQuery = ref('')
const selectedRole = ref<'' | UserRole>('')
const selectedDepartment = ref('')
const selectedStatus = ref<'' | UserStatus>('')
const currentPage = ref(1)

let latestRequestId = 0
let searchTimer: ReturnType<typeof setTimeout> | undefined

const hasActiveFilters = computed(() => Boolean(
  searchQuery.value.trim() || selectedRole.value || selectedDepartment.value || selectedStatus.value
))

const visiblePages = computed(() => {
  const windowSize = 5
  const lastPage = meta.value.last_page
  const start = Math.max(1, Math.min(currentPage.value - 2, lastPage - windowSize + 1))
  const end = Math.min(lastPage, start + windowSize - 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

const loadUsers = async () => {
  const requestId = ++latestRequestId
  isLoading.value = true
  loadError.value = ''

  try {
    const raw = await apiRequest<RawUsersResponse>(endpoints.list, {
      query: {
        page: currentPage.value,
        per_page: PAGE_SIZE,
        search: searchQuery.value.trim() || undefined,
        role: selectedRole.value || undefined,
        department: selectedDepartment.value || undefined,
        status: selectedStatus.value || undefined
      }
    })
    if (requestId !== latestRequestId) return

    const page = toUsersPage(raw)
    users.value = page.rows
    meta.value = page.meta

    if (currentPage.value > page.meta.last_page && page.meta.last_page >= 1) {
      currentPage.value = page.meta.last_page
      await loadUsers()
    }
  } catch (error) {
    if (requestId !== latestRequestId || getStatusCode(error) === 401) return

    console.error('Gagal memuat daftar pengguna.', error)
    users.value = []
    loadError.value = describeError(error, 'Daftar pengguna belum dapat dimuat dari server.')
  } finally {
    if (requestId === latestRequestId) isLoading.value = false
  }
}

const loadDepartments = async () => {
  try {
    departments.value = toDepartmentNames(await apiRequest<RawDepartmentsResponse>(endpoints.departments))
  } catch (error) {
    if (getStatusCode(error) !== 401) console.error('Gagal memuat daftar departemen.', error)
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > meta.value.last_page || page === currentPage.value) return
  currentPage.value = page
  loadUsers()
}

watch(searchQuery, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    loadUsers()
  }, 400)
})

watch([selectedRole, selectedDepartment, selectedStatus], () => {
  currentPage.value = 1
  loadUsers()
})

onMounted(() => {
  loadUsers()
  loadDepartments()
})

onBeforeUnmount(() => clearTimeout(searchTimer))

const activeModal = ref<ActiveModal>(null)
const editingUser = ref<UserRecord | null>(null)
const confirmState = ref<ConfirmState | null>(null)
const isSubmitting = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string[]>>({})

const form = reactive<UserPayload>({
  nip: '',
  name: '',
  email: '',
  role: 'EMPLOYEE',
  department: ''
})

const fieldError = (field: keyof UserPayload) => fieldErrors.value[field]?.[0] ?? ''

const closeModal = () => {
  activeModal.value = null
  editingUser.value = null
  confirmState.value = null
  formError.value = ''
  fieldErrors.value = {}
}

const openCreateModal = () => {
  editingUser.value = null
  Object.assign(form, { nip: '', name: '', email: '', role: 'EMPLOYEE', department: '' })
  formError.value = ''
  fieldErrors.value = {}
  activeModal.value = 'form'
}

const openEditModal = (user: UserRecord) => {
  editingUser.value = user
  Object.assign(form, {
    nip: user.nip,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department
  })
  formError.value = ''
  fieldErrors.value = {}
  activeModal.value = 'form'
}

const submitForm = async () => {
  isSubmitting.value = true
  formError.value = ''
  fieldErrors.value = {}

  const payload: UserPayload = {
    nip: form.nip.trim(),
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
    department: form.department.trim()
  }

  try {
    if (editingUser.value) {
      await apiRequest(endpoints.update(editingUser.value.id), { method: 'PUT', body: payload })
      notice.value = { message: `Data ${payload.name} berhasil diperbarui.`, secret: '' }
    } else {
      await apiRequest(endpoints.create, { method: 'POST', body: payload })
      notice.value = { message: `Pengguna ${payload.name} berhasil ditambahkan.`, secret: '' }
    }

    closeModal()
    await Promise.all([loadUsers(), loadDepartments()])
  } catch (error) {
    if (getStatusCode(error) === 401) return

    fieldErrors.value = getFieldErrors(error)
    formError.value = describeError(error, 'Data pengguna belum dapat disimpan.')
  } finally {
    isSubmitting.value = false
  }
}

const openConfirm = (type: ConfirmState['type'], user: UserRecord) => {
  confirmState.value = { type, user }
  formError.value = ''
  activeModal.value = 'confirm'
}

const confirmTitle = computed(() => {
  const state = confirmState.value
  if (!state) return ''
  if (state.type === 'reset') return 'Reset Kata Sandi'
  return state.user.status === 'ACTIVE' ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'
})

const confirmMessage = computed(() => {
  const state = confirmState.value
  if (!state) return ''
  if (state.type === 'reset') return `Reset kata sandi ${state.user.name}? Kata sandi lama tidak berlaku lagi.`
  return state.user.status === 'ACTIVE'
    ? `Nonaktifkan akun ${state.user.name}? Pengguna tidak akan dapat masuk ke sistem.`
    : `Aktifkan kembali akun ${state.user.name}?`
})

const runConfirm = async () => {
  const state = confirmState.value
  if (!state) return

  isSubmitting.value = true
  formError.value = ''

  try {
    if (state.type === 'status') {
      const nextStatus: UserStatus = state.user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await apiRequest(endpoints.setStatus(state.user.id), { method: 'PATCH', body: { status: nextStatus } })
      notice.value = {
        message: `Akun ${state.user.name} berhasil ${nextStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}.`,
        secret: ''
      }
    } else {
      const response = await apiRequest<ResetPasswordResponse>(endpoints.resetPassword(state.user.id), { method: 'POST' })
      notice.value = {
        message: response.message || `Kata sandi ${state.user.name} berhasil direset.`,
        secret: response.temporary_password ?? ''
      }
    }

    closeModal()
    await loadUsers()
  } catch (error) {
    if (getStatusCode(error) === 401) return
    formError.value = describeError(error, 'Aksi belum dapat diproses oleh server.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Manajemen Pengguna</h1>
        <p class="mt-1 text-xs text-[#718078]">Kelola akun dan hak akses seluruh pengguna sistem.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443]"
        @click="openCreateModal"
      >
        <span aria-hidden="true">+</span>
        Tambah Pengguna
      </button>
    </div>

    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <div>
        <p>{{ notice.message }}</p>
        <p v-if="notice.secret" class="mt-1">
          Kata sandi sementara: <span class="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-[#173b30]">{{ notice.secret }}</span>
        </p>
      </div>
      <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" aria-label="Tutup pemberitahuan" @click="notice = null">×</button>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadUsers">
        Coba Lagi
      </button>
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="user-list-heading">
      <h2 id="user-list-heading" class="sr-only">Daftar Pengguna</h2>

      <div class="flex flex-wrap gap-2 px-4 pb-1 pt-4">
        <label class="min-w-52 flex-1">
          <span class="sr-only">Cari nama, NIP, atau email</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari nama, NIP, atau email..."
            class="h-9 w-full rounded-md border border-[#dfe8dc] bg-[#fafcf8] px-3 text-[11px] text-[#263b31] placeholder:text-[#8b968e] focus:border-[#9ab397] focus:outline-none"
          >
        </label>
        <label>
          <span class="sr-only">Filter role</span>
          <select
            v-model="selectedRole"
            class="h-9 rounded-md border border-[#dfe8dc] bg-[#fafcf8] px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
          >
            <option value="">Semua Role</option>
            <option v-for="role in roleOptions" :key="role" :value="role">{{ roleLabels[role] }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Filter departemen</span>
          <select
            v-model="selectedDepartment"
            class="h-9 rounded-md border border-[#dfe8dc] bg-[#fafcf8] px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
          >
            <option value="">Semua Departemen</option>
            <option v-for="department in departments" :key="department" :value="department">{{ department }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Filter status</span>
          <select
            v-model="selectedStatus"
            class="h-9 rounded-md border border-[#dfe8dc] bg-[#fafcf8] px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option v-for="(label, status) in statusLabels" :key="status" :value="status">{{ label }}</option>
          </select>
        </label>
      </div>

      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[900px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-2.5">Nama</th>
              <th scope="col" class="px-2.5 py-2.5">NIP</th>
              <th scope="col" class="px-2.5 py-2.5">Email</th>
              <th scope="col" class="px-2.5 py-2.5">Role</th>
              <th scope="col" class="px-2.5 py-2.5">Departemen</th>
              <th scope="col" class="px-2.5 py-2.5">Status</th>
              <th scope="col" class="px-2.5 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat pengguna...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                {{ hasActiveFilters ? 'Tidak ada pengguna yang cocok dengan pencarian atau filter.' : 'Belum ada pengguna terdaftar.' }}
              </td>
            </tr>
            <tr v-for="user in users" v-else :key="user.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(user.name) }}
                  </span>
                  <span class="font-medium">{{ user.name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ user.nip }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ user.email }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ roleLabels[user.role] ?? user.role }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ user.department || '—' }}</td>
              <td class="px-2.5 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[user.status]">
                  {{ statusLabels[user.status] }}
                </span>
              </td>
              <td class="px-2.5 py-3">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-md border border-[#dfe8dc] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#173b30] transition-colors hover:bg-[#f8faf6]"
                    @click="openEditModal(user)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f3d3aa] bg-[#fff0df] px-3 py-1.5 text-[10px] font-semibold text-[#b75d11] transition-colors hover:bg-[#fde6cc]"
                    @click="openConfirm('reset', user)"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-3 py-1.5 text-[10px] font-semibold text-[#a8403a] transition-colors hover:bg-[#f8d6d3]"
                    @click="openConfirm('status', user)"
                  >
                    {{ user.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p class="text-[10px] text-[#718078]">{{ meta.total }} pengguna</p>

        <nav v-if="meta.last_page > 1" class="flex items-center gap-1.5" aria-label="Halaman">
          <button
            type="button"
            :disabled="currentPage === 1 || isLoading"
            class="flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe8dc] text-[10px] text-[#31513f] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman sebelumnya"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          <button
            v-for="page in visiblePages"
            :key="page"
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-medium transition-colors"
            :class="page === currentPage
              ? 'border-[#173b30] bg-[#173b30] text-white'
              : 'border-[#dfe8dc] text-[#31513f] hover:bg-[#f8faf6]'"
            :aria-current="page === currentPage ? 'page' : undefined"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <button
            type="button"
            :disabled="currentPage === meta.last_page || isLoading"
            class="flex h-7 w-7 items-center justify-center rounded-md border border-[#dfe8dc] text-[10px] text-[#31513f] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Halaman berikutnya"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
        </nav>
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
        aria-labelledby="user-form-heading"
        @submit.prevent="submitForm"
      >
        <h2 id="user-form-heading" class="font-serif text-base font-bold text-[#173b30]">
          {{ editingUser ? 'Edit Pengguna' : 'Tambah Pengguna' }}
        </h2>

        <p v-if="formError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700" role="alert">{{ formError }}</p>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nama lengkap</span>
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
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">NIP</span>
            <input
              v-model="form.nip"
              type="text"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <span v-if="fieldError('nip')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('nip') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Email</span>
            <input
              v-model="form.email"
              type="email"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <span v-if="fieldError('email')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('email') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Role</span>
            <select
              v-model="form.role"
              required
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option v-for="role in roleOptions" :key="role" :value="role">{{ roleLabels[role] }}</option>
            </select>
            <span v-if="fieldError('role')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('role') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Departemen</span>
            <input
              v-model="form.department"
              type="text"
              list="user-department-options"
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <datalist id="user-department-options">
              <option v-for="department in departments" :key="department" :value="department" />
            </datalist>
            <span v-if="fieldError('department')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('department') }}</span>
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
        v-else-if="activeModal === 'confirm' && confirmState"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-confirm-heading"
      >
        <h2 id="user-confirm-heading" class="font-serif text-base font-bold text-[#173b30]">{{ confirmTitle }}</h2>
        <p class="mt-2 text-xs leading-relaxed text-[#4f6a5a]">{{ confirmMessage }}</p>

        <p v-if="formError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700" role="alert">{{ formError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60" @click="closeModal">Batal</button>
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443] disabled:cursor-not-allowed disabled:opacity-60" @click="runConfirm">
            {{ isSubmitting ? 'Memproses...' : 'Ya, Lanjutkan' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>