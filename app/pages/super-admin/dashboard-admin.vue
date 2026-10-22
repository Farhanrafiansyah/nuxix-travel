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

const STORAGE_KEY = 'dashboard-super-admin-state-v1'
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

const users = ref<SystemUser[]>([])
const trips = ref<TripRecord[]>([])
const isHydrated = ref(false)
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

const isInMonth = (date: string, reference: Date) => {
  const parsedDate = new Date(date)
  return parsedDate.getMonth() === reference.getMonth() && parsedDate.getFullYear() === reference.getFullYear()
}

// ---------- Statistik ----------
const activeEmployees = computed(() => users.value.filter(
  (user) => user.role === 'Karyawan' && user.status === 'ACTIVE'
))

const employeeDepartmentCount = computed(() => new Set(
  activeEmployees.value.map((user) => user.department).filter(Boolean)
).size)

const waitingTripCount = computed(() => trips.value.filter((trip) => trip.status === 'WAITING').length)

const tripsThisMonth = computed(() => trips.value.filter((trip) => isInMonth(trip.date, today)))
const tripsLastMonth = computed(() => {
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return trips.value.filter((trip) => isInMonth(trip.date, lastMonth))
})

const tripGrowthNote = computed(() => {
  const previous = tripsLastMonth.value.length
  const current = tripsThisMonth.value.length

  if (!previous) return 'Belum ada data bulan lalu'
  if (current === previous) return 'Sama dengan bulan lalu'

  const percentage = Math.round((Math.abs(current - previous) / previous) * 100)
  return `${current > previous ? 'Naik' : 'Turun'} ${percentage}% dari bulan lalu`
})

const statCards = computed(() => [
  {
    label: 'Total Pengguna',
    value: users.value.length,
    note: 'Seluruh role sistem',
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
    value: waitingTripCount.value,
    note: 'Perlu tindakan berjenjang',
    accent: 'border-l-[#c8702a]'
  },
  {
    label: 'Total Perjalanan Bulan Ini',
    value: tripsThisMonth.value.length,
    note: tripGrowthNote.value,
    accent: 'border-l-[#2f6b5e]'
  }
])

// ---------- Grafik per departemen ----------
const departmentTrips = computed(() => {
  const groups = new Map<string, number>()
  trips.value.forEach((trip) => {
    groups.set(trip.department, (groups.get(trip.department) ?? 0) + 1)
  })

  return [...groups.entries()]
    .map(([department, total]) => ({ department, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, chartDepartmentLimit)
})

const maxDepartmentTrips = computed(() => Math.max(...departmentTrips.value.map((item) => item.total), 0))

const barHeight = (total: number) => `${Math.max((total / maxDepartmentTrips.value) * 100, 4)}%`

// ---------- Pengguna terbaru ----------
const recentUsers = computed(() => [...users.value]
  .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
  .slice(0, recentUserLimit))

const departmentOptions = computed(() => [
  ...new Set([
    ...users.value.map((user) => user.department),
    ...trips.value.map((trip) => trip.department)
  ].filter(Boolean))
].sort())

// ---------- Aksi ----------
const nextId = (items: { id: number }[]) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1

const closeModal = () => {
  activeModal.value = null
}

const openUserModal = () => {
  userForm.name = ''
  userForm.role = 'Karyawan'
  userForm.department = ''
  userForm.status = 'ACTIVE'
  activeModal.value = 'user'
}

const openTripModal = () => {
  tripForm.department = ''
  tripForm.date = toDateInput(new Date())
  tripForm.status = 'WAITING'
  activeModal.value = 'trip'
}

const submitUser = () => {
  users.value.push({
    id: nextId(users.value),
    name: userForm.name.trim(),
    role: userForm.role,
    department: userForm.department.trim(),
    status: userForm.status,
    created_at: new Date().toISOString()
  })
  closeModal()
}

const submitTrip = () => {
  trips.value.push({
    id: nextId(trips.value),
    department: tripForm.department.trim(),
    date: tripForm.date,
    status: tripForm.status
  })
  closeModal()
}

const removeUser = (id: number) => {
  users.value = users.value.filter((user) => user.id !== id)
}

// Data disimpan di browser. Ganti bagian ini dengan pemanggilan API
// ($fetch + Authorization Bearer) ketika endpoint Super Admin sudah tersedia.
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
      const parsed = JSON.parse(saved)
      users.value = parsed.users ?? []
      trips.value = parsed.trips ?? []
    }
  } catch (error) {
    console.error('Gagal membaca data dashboard Super Admin dari penyimpanan lokal.', error)
  }

  isHydrated.value = true
})

watch([users, trips], () => {
  if (!isHydrated.value) return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ users: users.value, trips: trips.value }))
  } catch (error) {
    console.error('Gagal menyimpan data dashboard Super Admin ke penyimpanan lokal.', error)
  }
}, { deep: true })
</script>

<template>
  <section class="space-y-5 pb-8">
    <div>
      <h1 class="font-serif text-2xl font-bold leading-tight text-[#173b30]">Dashboard Super Admin</h1>
      <p class="mt-1 text-xs text-[#718078]">Ringkasan sistem, pengguna, dan aktivitas perjalanan dinas perusahaan.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <section
        v-for="card in statCards"
        :key="card.label"
        class="rounded-xl border border-l-[3px] border-[#dfe8dc] bg-white px-4 py-3"
        :class="card.accent"
        :aria-label="card.label"
      >
        <p class="text-[10px] font-medium text-[#718078]">{{ card.label }}</p>
        <p class="mt-1 font-serif text-xl font-bold text-[#173b30]">{{ card.value }}</p>
        <p class="mt-1 text-[10px] text-[#7b8980]">{{ card.note }}</p>
      </section>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <section class="rounded-xl border border-[#dfe8dc] bg-white px-4 py-4" aria-labelledby="department-trip-heading">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="department-trip-heading" class="font-serif text-sm font-bold text-[#173b30]">Perjalanan per Departemen</h2>
          <button
            type="button"
            class="rounded-md border border-[#dfe8dc] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6]"
            @click="openTripModal"
          >
            + Tambah Perjalanan
          </button>
        </div>

        <p v-if="departmentTrips.length === 0" class="py-20 text-center text-xs text-[#7b8980]">Belum ada data perjalanan.</p>

        <div v-else class="mt-5 px-2">
          <div class="flex h-48 items-end gap-4 border-b border-[#e8eee5] sm:gap-6">
            <div
              v-for="item in departmentTrips"
              :key="item.department"
              class="flex h-full flex-1 items-end justify-center"
            >
              <div
                class="w-full max-w-[56px] rounded-t-md bg-gradient-to-b from-[#8fbc84] to-[#4a7a4a]"
                :style="{ height: barHeight(item.total) }"
                :title="`${item.department}: ${item.total} perjalanan`"
                role="img"
                :aria-label="`${item.department}: ${item.total} perjalanan`"
              />
            </div>
          </div>
          <div class="mt-2 flex gap-4 sm:gap-6">
            <span
              v-for="item in departmentTrips"
              :key="item.department"
              class="flex-1 truncate text-center text-[9px] font-medium text-[#718078]"
              :title="item.department"
            >
              {{ item.department }}
            </span>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl border border-[#dfe8dc] bg-white" aria-labelledby="recent-users-heading">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-4">
          <h2 id="recent-users-heading" class="font-serif text-sm font-bold text-[#173b30]">Pengguna Terbaru</h2>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-md border border-[#dfe8dc] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#31513f] transition-colors hover:bg-[#f8faf6]"
              @click="openUserModal"
            >
              + Tambah
            </button>
            <NuxtLink to="/pengguna" class="text-[10px] font-semibold text-[#9a5a12] hover:underline">
              Kelola Pengguna
            </NuxtLink>
          </div>
        </div>

        <div class="overflow-x-auto px-3.5 pb-2">
          <table class="w-full min-w-[360px] border-collapse text-left text-[10px]">
            <thead class="border-b border-dashed border-[#dfe8dc] text-[9px] font-semibold text-[#728078]">
              <tr>
                <th scope="col" class="px-2.5 py-2.5">Nama</th>
                <th scope="col" class="px-2.5 py-2.5">Role</th>
                <th scope="col" class="px-2.5 py-2.5">Status</th>
                <th scope="col" class="w-8 px-2.5 py-2.5"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e8eee5] text-[#263b31]">
              <tr v-if="recentUsers.length === 0">
                <td colspan="4" class="px-4 py-12 text-center text-xs text-[#7b8980]">Belum ada pengguna.</td>
              </tr>
              <tr v-for="user in recentUsers" v-else :key="user.id" class="transition-colors hover:bg-[#fbfcfa]">
                <td class="whitespace-nowrap px-2.5 py-3">
                  <div class="flex items-center gap-2">
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
                      {{ userInitials(user.name) }}
                    </span>
                    <span class="font-medium">{{ user.name }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-2.5 py-3">{{ user.role }}</td>
                <td class="px-2.5 py-3">
                  <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold" :class="userStatusStyles[user.status]">
                    {{ userStatusLabels[user.status] }}
                  </span>
                </td>
                <td class="px-2.5 py-3 text-center">
                  <button
                    type="button"
                    class="rounded px-1.5 text-sm leading-none text-[#718078] transition-colors hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Hapus pengguna"
                    @click="removeUser(user.id)"
                  >
                    ×
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div
      v-if="activeModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#173b30]/40 px-4 py-6"
      role="presentation"
      @click.self="closeModal"
    >
      <form
        v-if="activeModal === 'user'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-add-heading"
        @submit.prevent="submitUser"
      >
        <h2 id="user-add-heading" class="font-serif text-base font-bold text-[#173b30]">Tambah Pengguna</h2>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Nama</span>
            <input
              v-model="userForm.name"
              type="text"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Role</span>
            <select
              v-model="userForm.role"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option v-for="role in userRoles" :key="role" :value="role">{{ role }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Departemen</span>
            <input
              v-model="userForm.department"
              type="text"
              list="admin-department-options"
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Status</span>
            <select
              v-model="userForm.status"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option v-for="(label, status) in userStatusLabels" :key="status" :value="status">{{ label }}</option>
            </select>
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443]">Simpan</button>
        </div>
      </form>

      <form
        v-else-if="activeModal === 'trip'"
        class="w-full max-w-sm rounded-xl border border-[#dfe8dc] bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trip-add-heading"
        @submit.prevent="submitTrip"
      >
        <h2 id="trip-add-heading" class="font-serif text-base font-bold text-[#173b30]">Tambah Perjalanan</h2>

        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Departemen</span>
            <input
              v-model="tripForm.department"
              type="text"
              list="admin-department-options"
              required
              autocomplete="off"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Tanggal perjalanan</span>
            <input
              v-model="tripForm.date"
              type="date"
              required
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-medium text-[#718078]">Status pengajuan</span>
            <select
              v-model="tripForm.status"
              class="h-9 w-full rounded-md border border-[#dfe8dc] bg-white px-3 text-[11px] text-[#263b31] focus:border-[#9ab397] focus:outline-none"
            >
              <option v-for="(label, status) in tripStatusLabels" :key="status" :value="status">{{ label }}</option>
            </select>
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-8 rounded-md border border-[#dfe8dc] px-3 text-[10px] font-semibold text-[#31513f] hover:bg-[#f8faf6]" @click="closeModal">Batal</button>
          <button type="submit" class="h-8 rounded-md bg-[#f0ad4e] px-3 text-[10px] font-semibold text-[#3b2a0d] hover:bg-[#e9a443]">Simpan</button>
        </div>
      </form>

      <datalist id="admin-department-options">
        <option v-for="department in departmentOptions" :key="department" :value="department" />
      </datalist>
    </div>
  </section>
</template>