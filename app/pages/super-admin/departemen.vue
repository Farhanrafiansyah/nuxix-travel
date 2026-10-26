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

type FetchErrorLike = {
  status?: number
  statusCode?: number
  data?: { message?: string, errors?: Record<string, string[]> }
  message?: string
}

type ActiveModal = 'form' | 'confirm' | null

const runtimeConfig = useRuntimeConfig()
const API_BASE_URL = String(runtimeConfig.public.apiBase || 'http://localhost:8000/api')

const statusLabels: Record<DepartmentStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif'
}

const statusStyles: Record<DepartmentStatus, string> = {
  ACTIVE: 'bg-[#e4f0e1] text-[#456d43]',
  INACTIVE: 'bg-[#eceeea] text-[#6f7a73]'
}

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

const departments = ref<DepartmentRecord[]>([])
const managers = ref<ManagerOption[]>([])
const isLoading = ref(true)
const loadError = ref('')
const notice = ref('')

const loadDepartments = async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    // Mengambil data pengguna riil untuk agregasi departemen
    const raw = await $fetch<{ users?: any[] }>(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken.value}`,
        Accept: 'application/json'
      }
    })

    const users = raw?.users || []

    // Ekstrak manajer / Atasan
    managers.value = users
      .filter((u) => u.role === 'Atasan')
      .map((u) => ({ id: u.id, name: u.name }))

    // Kelompokkan departemen berdasarkan data riil pengguna
    const deptMap = new Map<string, { count: number; manager: ManagerOption | null }>()

    users.forEach((user) => {
      const deptName = user.department || 'Umum'
      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, { count: 0, manager: null })
      }
      const entry = deptMap.get(deptName)!
      entry.count += 1
      if (user.role === 'Atasan' && !entry.manager) {
        entry.manager = { id: user.id, name: user.name }
      }
    })

    let idCounter = 1
    departments.value = [...deptMap.entries()].map(([name, data]) => ({
      id: idCounter++,
      name,
      employee_count: data.count,
      manager: data.manager,
      status: 'ACTIVE'
    }))
  } catch (error) {
    if (getStatusCode(error) === 401) {
      authToken.value = null
      await navigateTo('/login')
      return
    }
    console.error('Gagal memuat departemen:', error)
    loadError.value = describeError(error, 'Daftar departemen belum dapat dimuat dari server.')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDepartments()
})

const activeModal = ref<ActiveModal>(null)
const editingDepartment = ref<DepartmentRecord | null>(null)
const deletingDepartment = ref<DepartmentRecord | null>(null)
const isSubmitting = ref(false)
const formError = ref('')

const form = reactive<DepartmentPayload>({
  name: '',
  manager_id: null,
  status: 'ACTIVE'
})

const closeModal = () => {
  activeModal.value = null
  editingDepartment.value = null
  deletingDepartment.value = null
  formError.value = ''
}

const openCreateModal = () => {
  editingDepartment.value = null
  Object.assign(form, { name: '', manager_id: managers.value[0]?.id ?? null, status: 'ACTIVE' })
  formError.value = ''
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
  activeModal.value = 'form'
}

const openDeleteConfirm = (department: DepartmentRecord) => {
  deletingDepartment.value = department
  formError.value = ''
  activeModal.value = 'confirm'
}

const submitForm = () => {
  isSubmitting.value = true

  // Simulasi penambahan/pengubahan lokal karena endpoint /departments belum disediakan backend
  if (editingDepartment.value) {
    const target = departments.value.find((d) => d.id === editingDepartment.value?.id)
    if (target) {
      target.name = form.name.trim()
      target.status = form.status
      target.manager = managers.value.find((m) => m.id === form.manager_id) ?? null
    }
    notice.value = `Departemen ${form.name} berhasil diperbarui (Simulasi lokal). Butuh endpoint backend /api/departments untuk persistensi.`
  } else {
    departments.value.push({
      id: Date.now(),
      name: form.name.trim(),
      employee_count: 0,
      manager: managers.value.find((m) => m.id === form.manager_id) ?? null,
      status: form.status
    })
    notice.value = `Departemen ${form.name} berhasil ditambahkan (Simulasi lokal). Butuh endpoint backend /api/departments untuk persistensi.`
  }

  isSubmitting.value = false
  closeModal()
}

const confirmDelete = () => {
  if (!deletingDepartment.value) return
  const deletedName = deletingDepartment.value.name
  departments.value = departments.value.filter((d) => d.id !== deletingDepartment.value?.id)
  notice.value = `Departemen ${deletedName} berhasil dihapus (Simulasi lokal).`
  closeModal()
}
</script>

<template>
  <section class="space-y-5 pb-8">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Departemen</h1>
        <p class="mt-1 text-xs text-[#718078]">Kelola struktur unit kerja dan penugasan atasan (Data Real dari Pengguna).</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f0ad4e] px-4 text-xs font-semibold text-[#3b2a0d] transition-colors hover:bg-[#e9a443] shadow-sm"
        @click="openCreateModal"
      >
        <span aria-hidden="true">+</span>
        Tambah Departemen
      </button>
    </div>

    <!-- Alert Notifikasi -->
    <div v-if="notice" class="flex items-start justify-between gap-3 rounded-lg border border-[#c9dec2] bg-[#eef6ea] px-3.5 py-3 text-[11px] text-[#3f6b3a]" role="status">
      <p>{{ notice }}</p>
      <button type="button" class="text-base leading-none text-[#3f6b3a] hover:text-[#173b30]" @click="notice = ''">×</button>
    </div>

    <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="rounded-md border border-rose-200 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" @click="loadDepartments">
        Coba Lagi
      </button>
    </div>

    <!-- Tabel Departemen -->
    <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white shadow-sm">
      <div class="overflow-x-auto px-3.5 pt-3">
        <table class="w-full min-w-[700px] border-collapse text-left text-[10px]">
          <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
            <tr>
              <th scope="col" class="px-3 py-2.5">Nama Departemen</th>
              <th scope="col" class="px-3 py-2.5">Manajer / Atasan Unit</th>
              <th scope="col" class="px-3 py-2.5">Jumlah Karyawan</th>
              <th scope="col" class="px-3 py-2.5">Status</th>
              <th scope="col" class="px-3 py-2.5">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
            <tr v-if="isLoading">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#7b8980]">Memuat daftar departemen...</td>
            </tr>
            <tr v-else-if="departments.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada departemen terdaftar.</td>
            </tr>
            <tr v-for="dept in departments" v-else :key="dept.id" class="transition-colors hover:bg-[#fbfcfa]">
              <td class="whitespace-nowrap px-3 py-3 font-semibold text-[#173b30]">{{ dept.name }}</td>
              <td class="whitespace-nowrap px-3 py-3">
                <span v-if="dept.manager" class="font-medium text-[#2f5e51]">{{ dept.manager.name }}</span>
                <span v-else class="text-[#8c9890]">—</span>
              </td>
              <td class="whitespace-nowrap px-3 py-3 font-medium">{{ dept.employee_count }} pengguna</td>
              <td class="px-3 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="statusStyles[dept.status]">
                  {{ statusLabels[dept.status] }}
                </span>
              </td>
              <td class="px-3 py-3">
                <div class="flex items-center gap-1.5">
                  <button
                    type="button"
                    class="rounded-md border border-[#dfe8dc] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#173b30] hover:bg-[#f8faf6]"
                    @click="openEditModal(dept)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-[#f0c6c2] bg-[#fbe3e1] px-2.5 py-1 text-[10px] font-semibold text-[#a8403a] hover:bg-[#f8d6d3]"
                    @click="openDeleteConfirm(dept)"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="px-4 py-3 border-t border-slate-100 text-[10px] text-[#718078]">
        {{ departments.length }} departemen aktif
      </div>
    </section>

    <!-- Modal Form Tambah / Edit Departemen -->
    <div
      v-if="activeModal === 'form'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      @click.self="!isSubmitting && closeModal()"
    >
      <form
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-2xl"
        @submit.prevent="submitForm"
      >
        <h2 class="font-serif text-base font-bold text-[#173b30]">
          {{ editingDepartment ? 'Edit Departemen' : 'Tambah Departemen' }}
        </h2>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nama Departemen</span>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: Engineering, Sales, HR"
              class="h-9 w-full rounded-md border border-[#dfe8dc] px-3 text-[11px]"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Manajer / Atasan Unit</span>
            <select
              v-model="form.manager_id"
              class="h-9 w-full rounded-md border border-[#dfe8dc] px-3 text-[11px]"
            >
              <option :value="null">Pilih Manajer (Opsional)</option>
              <option v-for="manager in managers" :key="manager.id" :value="manager.id">{{ manager.name }}</option>
            </select>
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border px-3 text-[10px]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-bold text-[#3b2a0d]">Simpan</button>
        </div>
      </form>
    </div>

    <!-- Modal Konfirmasi Hapus -->
    <div
      v-if="activeModal === 'confirm' && deletingDepartment"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-2xl">
        <h2 class="font-serif text-base font-bold text-[#173b30]">Hapus Departemen</h2>
        <p class="mt-2 text-xs leading-relaxed text-[#4f6a5a]">
          Apakah Anda yakin ingin menghapus departemen <strong>{{ deletingDepartment.name }}</strong>?
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border px-3 text-[10px]" @click="closeModal">Batal</button>
          <button type="button" class="h-8 rounded-md bg-rose-600 px-3 text-[10px] font-bold text-white" @click="confirmDelete">Ya, Hapus</button>
        </div>
      </div>
    </div>
  </section>
</template>
