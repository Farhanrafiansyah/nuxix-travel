<script setup lang="ts">
type RoleRecord = {
  id: number
  name: string
  permission_ids: number[]
}

type PermissionRecord = {
  id: number
  name: string
}

type RawRolePermissionResponse = {
  data?: {
    roles?: RoleRecord[]
    permissions?: PermissionRecord[]
  }
}

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string, errors?: Record<string, string[]> }
  message?: string
}

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')

const endpoints = {
  show: '/role-permissions',
  update: '/role-permissions'
}

const defaultRoles: RoleRecord[] = [
  { id: 1, name: 'Karyawan', permission_ids: [1] },
  { id: 2, name: 'Atasan', permission_ids: [2] },
  { id: 3, name: 'Admin Travel', permission_ids: [3] },
  { id: 4, name: 'Tim Keuangan', permission_ids: [4, 5] },
  { id: 5, name: 'Super Admin', permission_ids: [2, 3, 4, 5, 6, 7] }
]

const defaultPermissions: PermissionRecord[] = [
  { id: 1, name: 'Ajukan Perjalanan' },
  { id: 2, name: 'Setujui / Tolak Perjalanan' },
  { id: 3, name: 'Kelola Booking' },
  { id: 4, name: 'Verifikasi Reimbursement' },
  { id: 5, name: 'Kelola Uang Muka' },
  { id: 6, name: 'Kelola Pengguna' },
  { id: 7, name: 'Kelola Kebijakan' }
]

const cellKey = (roleId: number, permissionId: number) => `${roleId}:${permissionId}`
const serialize = (cells: Set<string>) => [...cells].sort().join('|')

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

const roles = ref<RoleRecord[]>([])
const permissions = ref<PermissionRecord[]>([])
const selectedCells = ref<Set<string>>(new Set())
const savedSnapshot = ref('')
const isLoading = ref(true)
const isSaving = ref(false)
const saveError = ref('')
const notice = ref('')

const isDirty = computed(() => serialize(selectedCells.value) !== savedSnapshot.value)

const applyResponse = (raw: RawRolePermissionResponse) => {
  roles.value = raw.data?.roles ?? []
  permissions.value = raw.data?.permissions ?? []
  selectedCells.value = new Set(
    roles.value.flatMap((role) => (role.permission_ids ?? []).map((permissionId) => cellKey(role.id, permissionId)))
  )
  savedSnapshot.value = serialize(selectedCells.value)
}

const isChecked = (roleId: number, permissionId: number) => selectedCells.value.has(cellKey(roleId, permissionId))

const toggleCell = (roleId: number, permissionId: number, event: Event) => {
  const next = new Set(selectedCells.value)
  const key = cellKey(roleId, permissionId)

  if ((event.target as HTMLInputElement).checked) next.add(key)
  else next.delete(key)

  selectedCells.value = next
  notice.value = ''
}

const persistLocally = () => {
  if (import.meta.client) {
    const dataToSave = {
      roles: roles.value.map((role) => ({
        ...role,
        permission_ids: permissions.value
          .filter((p) => isChecked(role.id, p.id))
          .map((p) => p.id)
      })),
      permissions: permissions.value,
      selectedCells: Array.from(selectedCells.value)
    }
    localStorage.setItem('nuvix_role_permissions', JSON.stringify(dataToSave))
  }
}

const loadRolePermissions = async () => {
  isLoading.value = true

  // 1. Inisialisasi dari localStorage atau default seeder/mockup
  let hasLocal = false
  if (import.meta.client) {
    try {
      const cached = localStorage.getItem('nuvix_role_permissions')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.roles && parsed?.permissions) {
          roles.value = parsed.roles
          permissions.value = parsed.permissions
          if (Array.isArray(parsed.selectedCells)) {
            selectedCells.value = new Set(parsed.selectedCells)
          } else {
            selectedCells.value = new Set(
              roles.value.flatMap((r) => (r.permission_ids ?? []).map((pid) => cellKey(r.id, pid)))
            )
          }
          savedSnapshot.value = serialize(selectedCells.value)
          hasLocal = true
        }
      }
    } catch {
      hasLocal = false
    }
  }

  if (!hasLocal) {
    roles.value = JSON.parse(JSON.stringify(defaultRoles))
    permissions.value = JSON.parse(JSON.stringify(defaultPermissions))
    selectedCells.value = new Set(
      roles.value.flatMap((role) => (role.permission_ids ?? []).map((pid) => cellKey(role.id, pid)))
    )
    savedSnapshot.value = serialize(selectedCells.value)
  }

  // 2. Muat live data jika backend endpoint sudah tersedia
  try {
    const raw = await apiRequest<RawRolePermissionResponse>(endpoints.show)
    if (raw?.data?.roles && raw?.data?.permissions) {
      applyResponse(raw)
      persistLocally()
    }
  } catch (error) {
    if (getStatusCode(error) === 401) return
    console.warn('Backend endpoint /role-permissions belum tersedia. Menggunakan matriks role default/lokal.')
  } finally {
    isLoading.value = false
  }
}

const saveRolePermissions = async () => {
  isSaving.value = true
  saveError.value = ''
  notice.value = ''

  persistLocally()

  try {
    const raw = await apiRequest<RawRolePermissionResponse>(endpoints.update, {
      method: 'PUT',
      body: {
        roles: roles.value.map((role) => ({
          id: role.id,
          permission_ids: permissions.value
            .filter((permission) => isChecked(role.id, permission.id))
            .map((permission) => permission.id)
        }))
      }
    })

    if (raw?.data?.roles) {
      applyResponse(raw)
      persistLocally()
    } else {
      savedSnapshot.value = serialize(selectedCells.value)
    }

    notice.value = 'Hak akses berhasil disimpan ke server.'
  } catch (error) {
    if (getStatusCode(error) === 401) return

    const status = getStatusCode(error)
    if (status === 404 || status === 405) {
      savedSnapshot.value = serialize(selectedCells.value)
      notice.value = 'Perubahan hak akses berhasil disimpan secara lokal (Backend API /role-permissions belum tersedia).'
    } else {
      saveError.value = describeError(error, 'Hak akses belum dapat disimpan ke server.')
    }
  } finally {
    isSaving.value = false
  }
}

onMounted(loadRolePermissions)
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Role &amp; Permission Management</h1>
      <p class="mt-1 text-xs text-[#718078]">Atur hak akses untuk setiap role dalam sistem.</p>
    </div>

    <!-- Notice / Alert -->
    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <p>{{ notice }}</p>
      <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" aria-label="Tutup pemberitahuan" @click="notice = ''">×</button>
    </div>

    <div v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ saveError }}
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white shadow-sm" aria-labelledby="role-permission-heading">
      <h2 id="role-permission-heading" class="sr-only">Matriks Hak Akses</h2>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left text-[11px]">
          <thead class="border-b border-[#dfe8dc] bg-[#fbfdfa] text-[10px] font-semibold text-[#718078]">
            <tr>
              <th scope="col" class="px-5 py-3.5 font-semibold">Hak Akses</th>
              <th v-for="role in roles" :key="role.id" scope="col" class="px-3 py-3.5 text-center font-semibold">
                {{ role.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#edf3eb] text-[#263b31]">
            <tr v-if="isLoading">
              <td :colspan="roles.length + 1" class="px-5 py-12 text-center text-xs text-[#7b8980]">Memuat hak akses...</td>
            </tr>
            <tr v-else-if="permissions.length === 0">
              <td :colspan="roles.length + 1" class="px-5 py-12 text-center text-xs text-[#7b8980]">Belum ada hak akses terdaftar.</td>
            </tr>
            <tr v-for="permission in permissions" v-else :key="permission.id" class="transition-colors hover:bg-[#fafcf8]">
              <td class="whitespace-nowrap px-5 py-3 font-medium text-[#263b31]">{{ permission.name }}</td>
              <td v-for="role in roles" :key="role.id" class="px-3 py-3 text-center">
                <label class="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    class="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[#d5dfd0] bg-white transition-colors checked:border-[#f0ad4e] checked:bg-[#f0ad4e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3f6b4f] disabled:cursor-not-allowed disabled:opacity-60"
                    :checked="isChecked(role.id, permission.id)"
                    :disabled="isSaving"
                    :aria-label="`${role.name}: ${permission.name}`"
                    @change="toggleCell(role.id, permission.id, $event)"
                  >
                  <svg class="pointer-events-none absolute hidden h-2.5 w-2.5 text-white peer-checked:block" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
                  </svg>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <button
      type="button"
      :disabled="isLoading || isSaving || !isDirty"
      class="inline-flex h-9 items-center rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] shadow-sm transition-colors hover:bg-[#e9a443] disabled:cursor-not-allowed disabled:opacity-60"
      @click="saveRolePermissions"
    >
      {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
    </button>
  </section>
</template>
