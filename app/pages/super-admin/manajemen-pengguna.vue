<script setup lang="ts">
type UserRole = 'Super Admin' | 'Karyawan' | 'Atasan' | 'Admin Travel' | 'Tim Keuangan'
type UserStatus = 'ACTIVE' | 'INACTIVE'

type UserRecord = {
  id: number
  nip: string
  name: string
  email: string
  role: UserRole
  department: string
  status: UserStatus
  company_id?: number | null
  supervisor_id?: number | null
  created_at?: string
}

type UserPayload = {
  nip: string
  name: string
  email: string
  password?: string
  role: UserRole
  department: string
  company_id?: number | null
  supervisor_id?: number | null
}

type PageMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string, errors?: Record<string, string[]> }
  message?: string
}

type ConfirmState = { type: 'status' | 'reset' | 'delete', user: UserRecord }
type ActiveModal = 'form' | 'confirm' | null

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')
const PAGE_SIZE = 6

const endpoints = {
  list: '/users',
  create: '/users',
  update: (id: number) => `/users/${id}`,
  delete: (id: number) => `/users/${id}`,
  resetPassword: (id: number) => `/users/${id}/reset-password`
}

const roleLabels: Record<UserRole, string> = {
  'Super Admin': 'Super Admin',
  'Karyawan': 'Karyawan',
  'Atasan': 'Atasan',
  'Admin Travel': 'Admin Travel',
  'Tim Keuangan': 'Tim Keuangan'
}

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif'
}

const statusStyles: Record<UserStatus, string> = {
  ACTIVE: 'bg-[#e4f0e1] text-[#456d43]',
  INACTIVE: 'bg-[#eceeea] text-[#6f7a73]'
}

const roleOptions: UserRole[] = ['Super Admin', 'Karyawan', 'Atasan', 'Admin Travel', 'Tim Keuangan']

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

// Master State dari Database Seeder
const allUsers = ref<UserRecord[]>([])
const departments = ref<string[]>([])
const isLoading = ref(true)
const loadError = ref('')
const notice = ref<{ message: string, secret: string } | null>(null)

// Filter & Pencarian
const searchQuery = ref('')
const selectedRole = ref<'' | UserRole>('')
const selectedDepartment = ref('')
const selectedStatus = ref<'' | UserStatus>('')
const currentPage = ref(1)

const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return allUsers.value.filter((user) => {
    const matchesSearch = !query ||
      user.name.toLowerCase().includes(query) ||
      user.nip.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)

    const matchesRole = !selectedRole.value || user.role === selectedRole.value
    const matchesDepartment = !selectedDepartment.value || user.department === selectedDepartment.value
    const matchesStatus = !selectedStatus.value || user.status === selectedStatus.value

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  })
})

const meta = computed<PageMeta>(() => {
  const total = filteredUsers.value.length
  return {
    current_page: currentPage.value,
    last_page: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    per_page: PAGE_SIZE,
    total
  }
})

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredUsers.value.slice(start, start + PAGE_SIZE)
})

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
  isLoading.value = true
  loadError.value = ''

  try {
    const raw = await apiRequest<{ users?: any[], data?: any[] }>(endpoints.list)
    const list = Array.isArray(raw.users) ? raw.users : (Array.isArray(raw.data) ? raw.data : [])

    allUsers.value = list.map((item: any) => ({
      id: item.id,
      nip: item.nik || (item.id ? `320${String(item.id).padStart(7, '0')}` : '-'),
      name: item.name,
      email: item.email,
      role: (roleOptions.includes(item.role) ? item.role : 'Karyawan') as UserRole,
      department: item.department || 'Umum',
      status: (item.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE') as UserStatus,
      company_id: item.company_id ?? 1,
      supervisor_id: item.supervisor_id,
      created_at: item.created_at
    }))

    // Ekstrak departemen riil dari database
    departments.value = [...new Set(allUsers.value.map((u) => u.department).filter(Boolean))].sort()
  } catch (error) {
    if (getStatusCode(error) === 401) return
    console.error('Gagal memuat daftar pengguna:', error)
    loadError.value = describeError(error, 'Daftar pengguna belum dapat dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

const goToPage = (page: number) => {
  if (page < 1 || page > meta.value.last_page || page === currentPage.value) return
  currentPage.value = page
}

watch([searchQuery, selectedRole, selectedDepartment, selectedStatus], () => {
  currentPage.value = 1
})

onMounted(() => {
  loadUsers()
})

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
  password: '',
  role: 'Karyawan',
  department: '',
  company_id: 1,
  supervisor_id: null
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
  Object.assign(form, {
    nip: '',
    name: '',
    email: '',
    password: '',
    role: 'Karyawan',
    department: departments.value[0] || 'IT',
    company_id: 1,
    supervisor_id: null
  })
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
    password: '',
    role: user.role,
    department: user.department,
    company_id: user.company_id ?? 1,
    supervisor_id: user.supervisor_id ?? null
  })
  formError.value = ''
  fieldErrors.value = {}
  activeModal.value = 'form'
}

const submitForm = async () => {
  isSubmitting.value = true
  formError.value = ''
  fieldErrors.value = {}

  let supervisorId = form.supervisor_id
  if (form.role === 'Karyawan' && !supervisorId) {
    const defaultAtasan = allUsers.value.find((u) => u.role === 'Atasan' && u.company_id === (form.company_id || 1))
    supervisorId = defaultAtasan ? defaultAtasan.id : (allUsers.value.find((u) => u.role === 'Atasan')?.id ?? 26)
  }

  const payload: Record<string, any> = {
    name: form.name.trim(),
    email: form.email.trim(),
    role: form.role,
    department: form.department.trim(),
    company_id: form.company_id || 1,
    supervisor_id: form.role === 'Karyawan' ? supervisorId : null
  }

  if (form.password && form.password.trim().length >= 6) {
    payload.password = form.password.trim()
  } else if (!editingUser.value) {
    payload.password = 'Password123!'
  }

  try {
    if (editingUser.value) {
      await apiRequest(endpoints.update(editingUser.value.id), { method: 'PUT', body: payload })
      notice.value = { message: `Data pengguna ${payload.name} berhasil diperbarui di server.`, secret: '' }
    } else {
      await apiRequest(endpoints.create, { method: 'POST', body: payload })
      notice.value = {
        message: `Pengguna ${payload.name} berhasil didaftarkan ke sistem.`,
        secret: payload.password
      }
    }

    closeModal()
    await loadUsers()
  } catch (error) {
    if (getStatusCode(error) === 401) return

    fieldErrors.value = getFieldErrors(error)
    formError.value = describeError(error, 'Data pengguna belum dapat disimpan ke server.')
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
  if (state.type === 'delete') return 'Hapus Pengguna'
  return state.user.status === 'ACTIVE' ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'
})

const confirmMessage = computed(() => {
  const state = confirmState.value
  if (!state) return ''
  if (state.type === 'reset') return `Reset kata sandi ${state.user.name}? Server akan membuat kata sandi sementara otomatis.`
  if (state.type === 'delete') return `Apakah Anda yakin ingin menghapus akun ${state.user.name}? Tindakan ini permanen di server.`
  return state.user.status === 'ACTIVE'
    ? `Nonaktifkan akun ${state.user.name}? Pengguna yang dinonaktifkan tidak akan dapat login ke sistem.`
    : `Aktifkan kembali akun ${state.user.name}?`
})

const runConfirm = async () => {
  const state = confirmState.value
  if (!state) return

  isSubmitting.value = true
  formError.value = ''

  try {
    if (state.type === 'status') {
      const nextStatus = state.user.status === 'ACTIVE' ? 'REJECTED' : 'ACTIVE'
      await apiRequest(endpoints.update(state.user.id), {
        method: 'PUT',
        body: { status: nextStatus }
      })
      state.user.status = nextStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'
      notice.value = {
        message: `Status akun ${state.user.name} berhasil diubah menjadi ${nextStatus === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}.`,
        secret: ''
      }
    } else if (state.type === 'reset') {
      const res = await apiRequest<{ message?: string, temporary_password?: string }>(endpoints.resetPassword(state.user.id), {
        method: 'POST'
      })
      notice.value = {
        message: res.message || `Kata sandi ${state.user.name} berhasil direset.`,
        secret: res.temporary_password || ''
      }
    } else if (state.type === 'delete') {
      await apiRequest(endpoints.delete(state.user.id), {
        method: 'DELETE'
      })
      notice.value = {
        message: `Akun pengguna ${state.user.name} berhasil dihapus dari sistem.`,
        secret: ''
      }
      await loadUsers()
    }

    closeModal()
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
        <p class="mt-1 text-xs text-[#718078]">Kelola akun dan hak akses seluruh pengguna sistem (Data Real Database).</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443] active:scale-95 shadow-sm"
        @click="openCreateModal"
      >
        <span aria-hidden="true">+</span>
        Tambah Pengguna
      </button>
    </div>

    <!-- Alert Notifikasi -->
    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <div>
        <p class="font-medium">{{ notice.message }}</p>
        <p v-if="notice.secret" class="mt-1">
          Kata sandi baru sementara: <span class="rounded bg-white px-2 py-0.5 font-mono font-bold text-[#173b30] border border-slate-200 select-all">{{ notice.secret }}</span>
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

    <!-- Container Tabel -->
    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white shadow-sm" aria-labelledby="user-list-heading">
      <h2 id="user-list-heading" class="sr-only">Daftar Pengguna</h2>

      <!-- Toolbar Filter & Search -->
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

      <!-- Tabel Data -->
      <div class="overflow-x-auto px-3.5">
        <table class="w-full min-w-[920px] border-collapse text-left text-[10px]">
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
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat daftar pengguna dari server database...</td>
            </tr>
            <tr v-else-if="loadError">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="paginatedUsers.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-xs text-[#7b8980]">
                {{ hasActiveFilters ? 'Tidak ada pengguna yang cocok dengan pencarian atau filter.' : 'Belum ada pengguna terdaftar.' }}
              </td>
            </tr>
            <tr v-for="user in paginatedUsers" v-else :key="user.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                    {{ userInitials(user.name) }}
                  </span>
                  <span class="font-medium">{{ user.name }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-2.5 py-3 font-mono text-[9px]">{{ user.nip }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">{{ user.email }}</td>
              <td class="whitespace-nowrap px-2.5 py-3">
                <span class="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  {{ roleLabels[user.role] ?? user.role }}
                </span>
              </td>
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
                    class="rounded-md border border-[#dfe8dc] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#173b30] transition-colors hover:bg-[#f8faf6]"
                    @click="openEditModal(user)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f3d3aa] bg-[#fff0df] px-2.5 py-1 text-[10px] font-semibold text-[#b75d11] transition-colors hover:bg-[#fde6cc]"
                    @click="openConfirm('reset', user)"
                  >
                    Reset Sandi
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#dfe8dc] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#546b5d] transition-colors hover:bg-[#f8faf6]"
                    @click="openConfirm('status', user)"
                  >
                    {{ user.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-2.5 py-1 text-[10px] font-semibold text-[#a8403a] transition-colors hover:bg-[#f8d6d3]"
                    @click="openConfirm('delete', user)"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
        <p class="text-[10px] text-[#718078]">{{ meta.total }} pengguna terdaftar</p>

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

    <!-- Modal Form Tambah / Edit -->
    <div
      v-if="activeModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      @click.self="!isSubmitting && closeModal()"
    >
      <form
        v-if="activeModal === 'form'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-heading"
        @submit.prevent="submitForm"
      >
        <h2 id="user-form-heading" class="font-serif text-base font-bold text-[#173b30]">
          {{ editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru' }}
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
              placeholder="Masukkan nama lengkap"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <span v-if="fieldError('name')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('name') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Email kantor</span>
            <input
              v-model="form.email"
              type="email"
              required
              autocomplete="off"
              placeholder="nama@nuvix.local"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
            <span v-if="fieldError('email')" class="mt-1 block text-[10px] text-rose-600">{{ fieldError('email') }}</span>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">
              {{ editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi Awal' }}
            </span>
            <input
              v-model="form.password"
              type="password"
              :placeholder="editingUser ? '••••••••' : 'Min. 6 karakter (default: Password123!)'"
              minlength="6"
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Peran / Role</span>
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
              required
              list="user-department-options"
              autocomplete="off"
              placeholder="Pilih atau ketik departemen"
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

      <!-- Modal Konfirmasi Status / Reset / Delete -->
      <section
        v-else-if="activeModal === 'confirm' && confirmState"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-confirm-heading"
      >
        <h2 id="user-confirm-heading" class="font-serif text-base font-bold text-[#173b30]">{{ confirmTitle }}</h2>
        <p class="mt-2 text-xs leading-relaxed text-[#4f6a5a]">{{ confirmMessage }}</p>

        <p v-if="formError" class="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] text-rose-700" role="alert">{{ formError }}</p>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" :disabled="isSubmitting" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6] disabled:opacity-60" @click="closeModal">Batal</button>
          <button
            type="button"
            :disabled="isSubmitting"
            :class="[
              'h-8 rounded-md px-3 text-[10px] font-semibold disabled:cursor-not-allowed disabled:opacity-60',
              confirmState.type === 'delete' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-[#f0ad4e] text-[#3b2a0d] hover:bg-[#e9a443]'
            ]"
            @click="runConfirm"
          >
            {{ isSubmitting ? 'Memproses...' : 'Ya, Lanjutkan' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
