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
const loadError = ref('')
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

const loadRolePermissions = async () => {
  isLoading.value = true
  loadError.value = ''

  try {
    applyResponse(await apiRequest<RawRolePermissionResponse>(endpoints.show))
  } catch (error) {
    if (getStatusCode(error) === 401) return

    console.error('Gagal memuat role dan hak akses.', error)
    loadError.value = describeError(error, 'Data role dan hak akses belum dapat dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

const saveRolePermissions = async () => {
  isSaving.value = true
  saveError.value = ''
  notice.value = ''

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

    if (raw?.data?.roles) applyResponse(raw)
    else savedSnapshot.value = serialize(selectedCells.value)

    notice.value = 'Hak akses berhasil disimpan.'
  } catch (error) {
    if (getStatusCode(error) === 401) return

    saveError.value = describeError(error, 'Hak akses belum dapat disimpan.')
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

    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <p>{{ notice }}</p>
      <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" aria-label="Tutup pemberitahuan" @click="notice = ''">×</button>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadRolePermissions">
        Coba Lagi
      </button>
    </div>

    <div v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      {{ saveError }}
    </div>

    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="role-permission-heading">
      <h2 id="role-permission-heading" class="sr-only">Matriks Hak Akses</h2>

      <div class="overflow-x-auto px-3.5 py-2">
        <table class="w-full min-w-[760px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-2.5 py-3">Hak Akses</th>
              <th v-for="role in roles" :key="role.id" scope="col" class="px-2.5 py-3 text-center">{{ role.name }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td :colspan="roles.length + 1" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat hak akses...</td>
            </tr>
            <tr v-else-if="loadError">
              <td :colspan="roles.length + 1" class="px-4 py-12 text-center text-xs text-[#a33c32]">Data belum dapat ditampilkan.</td>
            </tr>
            <tr v-else-if="permissions.length === 0">
              <td :colspan="roles.length + 1" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada hak akses terdaftar.</td>
            </tr>
            <tr v-for="permission in permissions" v-else :key="permission.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-2.5 py-3">{{ permission.name }}</td>
              <td v-for="role in roles" :key="role.id" class="px-2.5 py-3 text-center">
                <label class="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    class="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[#d5dfd0] bg-white transition-colors checked:border-[#f0ad4e] checked:bg-[#f0ad4e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3f6b4f] disabled:cursor-not-allowed disabled:opacity-60"
                    :checked="isChecked(role.id, permission.id)"
                    :disabled="isSaving"
                    :aria-label="`${role.name}: ${permission.name}`"
                    @change="toggleCell(role.id, permission.id, $event)"
                  >
                  <svg class="pointer-events-none absolute hidden h-2.5 w-2.5 text-[#3b2a0d] peer-checked:block" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
      :disabled="isLoading || isSaving || !isDirty || Boolean(loadError)"
      class="inline-flex h-9 items-center rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443] disabled:cursor-not-allowed disabled:opacity-60"
      @click="saveRolePermissions"
    >
      {{ isSaving ? 'Menyimpan...' : 'Simpan Perubahan' }}
    </button>
  </section>
</template>