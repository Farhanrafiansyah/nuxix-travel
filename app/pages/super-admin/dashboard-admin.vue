<script setup lang="ts">
type UserRole = 'Karyawan' | 'Atasan' | 'Admin Travel' | 'Tim Keuangan' | 'Super Admin'
type UserStatus = 'ACTIVE' | 'INACTIVE'
type TripStatus = 'WAITING' | 'PROCESSED'
type ActiveModal = 'user' | 'trip' | null

type SystemUser = {
  id: number
  name: string
  role: UserRole
  department: string
  status: UserStatus
  created_at: string
}

type TripRecord = {
  id: number
  department: string
  date: string
  status: TripStatus
}

const recentUserLimit = 5
const chartDepartmentLimit = 6

const userRoles: UserRole[] = ['Karyawan', 'Atasan', 'Admin Travel', 'Tim Keuangan', 'Super Admin']

const userStatusLabels: Record<UserStatus, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Nonaktif'
}

const userStatusStyles: Record<UserStatus, string> = {
  ACTIVE: 'bg-[#e4f0e1] text-[#456d43]',
  INACTIVE: 'bg-[#eceeea] text-[#6f7a73]'
}

const tripStatusLabels: Record<TripStatus, string> = {
  WAITING: 'Menunggu persetujuan',
  PROCESSED: 'Sudah diproses'
}

const today = new Date()

const authToken = useCookie<string | null>('auth_token')
const users = ref<SystemUser[]>([])
const trips = ref<TripRecord[]>([])
const liveStats = ref<{ upcoming: number; ongoing: number; completed: number } | null>(null)
const isLoading = ref(true)
const activeModal = ref<ActiveModal>(null)

const toDateInput = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const userForm = reactive({
  name: '',
  role: 'Karyawan' as UserRole,
  department: '',
  status: 'ACTIVE' as UserStatus
})
const tripForm = reactive({
  department: '',
  date: toDateInput(today),
  status: 'WAITING' as TripStatus
})

const userInitials = (name: string) => name
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP'

// ---------- Statistik Real Server ----------
const activeEmployees = computed(() => users.value.filter(
  (user) => user.role === 'Karyawan' && user.status === 'ACTIVE'
))

const employeeDepartmentCount = computed(() => new Set(
  users.value.map((user) => user.department).filter(Boolean)
).size)

const statCards = computed(() => [
  {
    label: 'Total Pengguna',
    value: users.value.length,
    note: 'Seluruh role sistem terdaftar',
    accent: 'border-l-[#e0a93a]'
  },
  {
    label: 'Karyawan Aktif',
    value: activeEmployees.value.length,
    note: `Dari ${employeeDepartmentCount.value} departemen`,
    accent: 'border-l-[#3f6b4f]'
  },
  {
    label: 'Pengajuan Menunggu',
    value: liveStats.value?.upcoming ?? 0,
    note: 'Perlu persetujuan / fulfillment',
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Perjalanan Berjalan',
    value: liveStats.value?.ongoing ?? 0,
    note: `${liveStats.value?.completed ?? 0} perjalanan telah selesai`,
    accent: 'border-l-[#2f6b5e]'
  }
])

// ---------- Distribusi Departemen Real ----------
const departmentTrips = computed(() => {
  const groups = new Map<string, number>()
  users.value.forEach((user) => {
    if (user.department) {
      groups.set(user.department, (groups.get(user.department) ?? 0) + 1)
    }
  })

  return [...groups.entries()]
    .map(([department, total]) => ({ department, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, chartDepartmentLimit)
})

const maxDepartmentTrips = computed(() => Math.max(...departmentTrips.value.map((item) => item.total), 1))

const barHeight = (total: number) => `${Math.max((total / maxDepartmentTrips.value) * 100, 10)}%`

// ---------- Pengguna terbaru ----------
const recentUsers = computed(() => [...users.value]
  .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.id - a.id)
  .slice(0, recentUserLimit))

const departmentOptions = computed(() => [
  ...new Set(users.value.map((user) => user.department).filter(Boolean))
].sort())

const closeModal = () => {
  activeModal.value = null
}

const openUserModal = () => {
  userForm.name = ''
  userForm.role = 'Karyawan'
  userForm.department = departmentOptions.value[0] || 'IT'
  userForm.status = 'ACTIVE'
  activeModal.value = 'user'
}

const submitUser = async () => {
  if (!authToken.value) return

  try {
    const payload = {
      name: userForm.name.trim(),
      email: `${userForm.name.trim().toLowerCase().replace(/\s+/g, '')}@nuvix.local`,
      password: 'Password123!',
      role: userForm.role,
      department: userForm.department.trim(),
      company_id: 1,
      supervisor_id: 26
    }

    const created = await $fetch<any>('http://localhost:8000/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: payload
    })

    if (created?.user) {
      users.value.unshift({
        id: created.user.id,
        name: created.user.name,
        role: created.user.role,
        department: created.user.department,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Gagal tambah pengguna via dashboard:', error)
  }

  closeModal()
}

// Mengambil data murni dari endpoint Backend_UKK (/api/users dan /api/dashboard/stats)
onMounted(async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  isLoading.value = true

  try {
    const headers = { Authorization: `Bearer ${authToken.value}` }
    const [usersRes, statsRes] = await Promise.all([
      $fetch<{ users: any[] }>('http://localhost:8000/api/users', { headers }),
      $fetch<{ upcoming: number; ongoing: number; completed: number }>('http://localhost:8000/api/dashboard/stats', { headers }).catch(() => null)
    ])

    if (usersRes?.users) {
      users.value = usersRes.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        department: u.department,
        status: (u.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE') as UserStatus,
        created_at: u.created_at || new Date().toISOString()
      }))
    }

    if (statsRes) {
      liveStats.value = statsRes
    }
  } catch (error) {
    console.error('Gagal memuat data dashboard real:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Dashboard Super Admin</h1>
      <p class="mt-1 text-xs text-[#718078]">Ringkasan sistem, pengguna, dan aktivitas perjalanan dinas perusahaan (Real Database).</p>
    </div>

    <!-- 4 Kartu Statistik -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <section
        v-for="card in statCards"
        :key="card.label"
        class="rounded-xl border border-l-[3px] border-[#dfe8dc] bg-white px-4 py-3 shadow-sm"
        :class="card.accent"
        :aria-label="card.label"
      >
        <p class="text-[10px] font-medium text-[#718078]">{{ card.label }}</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ card.value }}</p>
        <p class="mt-0.5 text-[9px] text-[#7b8980]">{{ card.note }}</p>
      </section>
    </div>

    <!-- Grafik Departemen & Ringkasan Pengguna -->
    <div class="grid gap-4 lg:grid-cols-3">
      <!-- Grafik Pengguna per Departemen -->
      <section class="rounded-xl border border-[#dfe8dc] bg-white p-4 shadow-sm lg:col-span-2">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-serif text-sm font-bold text-[#173b30]">Distribusi Pengguna per Departemen</h2>
            <p class="text-[10px] text-[#718078]">Jumlah karyawan & staf yang terdaftar berdasarkan unit kerja.</p>
          </div>
          <NuxtLink to="/super-admin/departemen" class="text-[10px] font-semibold text-[#1f6655] hover:underline">
            Lihat Semua →
          </NuxtLink>
        </div>

        <div v-if="departmentTrips.length === 0" class="flex h-44 items-center justify-center text-xs text-[#7b8980]">
          Memuat data departemen...
        </div>

        <div v-else class="mt-6 flex h-44 items-end justify-between gap-3 border-b border-dashed border-[#dfe8dc] pb-2">
          <div
            v-for="item in departmentTrips"
            :key="item.department"
            class="flex flex-1 flex-col items-center gap-1.5 h-full justify-end"
          >
            <span class="text-[9px] font-bold text-[#173b30]">{{ item.total }} user</span>
            <div
              class="w-full max-w-[42px] rounded-t-md bg-[#2e6d73] transition-all hover:bg-[#1f565b]"
              :style="{ height: barHeight(item.total) }"
            />
            <span class="truncate text-center text-[9px] font-medium text-[#718078] max-w-[60px]" :title="item.department">
              {{ item.department }}
            </span>
          </div>
        </div>
      </section>

      <!-- Pengguna Terbaru -->
      <section class="rounded-xl border border-[#dfe8dc] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-serif text-sm font-bold text-[#173b30]">Pengguna Terbaru</h2>
          <NuxtLink to="/super-admin/manajemen-pengguna" class="text-[10px] font-semibold text-[#1f6655] hover:underline">
            Semua →
          </NuxtLink>
        </div>

        <div class="mt-4 divide-y divide-[#edf3eb]">
          <div
            v-for="user in recentUsers"
            :key="user.id"
            class="flex items-center justify-between py-2.5 text-[10px]"
          >
            <div class="flex items-center gap-2">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                {{ userInitials(user.name) }}
              </span>
              <div>
                <p class="font-semibold text-[#173b30]">{{ user.name }}</p>
                <p class="text-[9px] text-[#718078]">{{ user.department }}</p>
              </div>
            </div>
            <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-600">
              {{ user.role }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- Quick Action Tambah Pengguna Modal -->
    <div
      v-if="activeModal === 'user'"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 class="font-serif text-sm font-bold text-[#173b30]">Tambah Pengguna Cepat</h3>
        <div class="mt-3 space-y-2.5 text-xs">
          <div>
            <label class="block text-[10px] font-medium text-[#718078]">Nama Lengkap</label>
            <input v-model="userForm.name" type="text" class="h-8 w-full rounded border border-[#dfe8dc] px-2.5 text-[11px]" placeholder="Nama pengguna" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-[#718078]">Peran</label>
            <select v-model="userForm.role" class="h-8 w-full rounded border border-[#dfe8dc] px-2 text-[11px]">
              <option v-for="role in userRoles" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-[#718078]">Departemen</label>
            <input v-model="userForm.department" type="text" class="h-8 w-full rounded border border-[#dfe8dc] px-2.5 text-[11px]" placeholder="Departemen" />
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2 text-xs">
          <button type="button" @click="closeModal" class="rounded border px-3 py-1 text-[10px]">Batal</button>
          <button type="button" @click="submitUser" class="rounded bg-[#f0ad4e] px-3 py-1 text-[10px] font-bold text-[#3b2a0d]">Simpan</button>
        </div>
      </div>
    </div>
  </section>
</template>
