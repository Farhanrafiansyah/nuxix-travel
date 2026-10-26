<script setup lang="ts">
const route = useRoute()
const currentUser = useCurrentUser()

const unreadCount = ref(0)

const pageLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/notifikasi': 'Notifikasi',
  '/karyawan/dashboard-karyawan': 'Dashboard',
  '/karyawan/dinas': 'Perjalanan Dinas',
  '/karyawan/dinas-ajukan': 'Ajukan Perjalanan Dinas',
  '/karyawan/uang-muka': 'Uang Muka',
  '/karyawan/reimbursement': 'Reimbursement',
  '/karyawan/reimbursement-ajukan': 'Ajukan Reimbursement',
  '/karyawan/reimbursement-detail': 'Detail Reimbursement',
  '/karyawan/profil': 'Profil Saya',
  '/tim-keuangan/dashboard-keuangan': 'Dashboard Keuangan',
  '/tim-keuangan/uang-muka': 'Uang Muka',
  '/tim-keuangan/reimbursement-verifikasi': 'Verifikasi Reimbursement',
  '/tim-keuangan/pembayaran': 'Pembayaran',
  '/tim-keuangan/laporan-keuangan': 'Laporan Keuangan',
  '/atasan-approver/dashboard-atasan': 'Dashboard Persetujuan',
  '/atasan-approver/persetujuan': 'Persetujuan',
  '/atasan-approver/persetujuan-riwayat': 'Riwayat Persetujuan',
  '/super-admin/dashboard-admin': 'Dashboard Admin',
  '/super-admin/manajemen-pengguna': 'Manajemen Pengguna',
  '/super-admin/departemen': 'Departemen',
  '/super-admin/kebijakan': 'Kebijakan Perjalanan',
  '/super-admin/role': 'Role & Permission',
  '/admin-travel/dashboard-travel': 'Dashboard Admin Travel',
  '/admin-travel/antrean': 'Antrean Perjalanan',
  '/admin-travel/booking': 'Booking Management',
  '/admin-travel/kelola-perjalanan': 'Kelola Perjalanan'
}

const currentPageLabel = computed(() => {
  if (route.path === '/karyawan/dinas-detail') {
    const id = Number(route.query.id)

    return Number.isInteger(id) && id > 0
      ? `TRV-${String(id).padStart(4, '0')}`
      : 'Detail Perjalanan'
  }

  return pageLabels[route.path] ?? 'Halaman'
})

const userInitials = computed(() => currentUser.value?.name
  ?.split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || '--')

const unreadLabel = computed(() => unreadCount.value > 9 ? '9+' : String(unreadCount.value))
</script>

<template>
  <header
    class="fixed inset-x-0 left-[190px] top-0 z-30 flex h-14 items-center justify-between border-b border-[#e3ebe5] bg-white px-6 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-gradient-to-r before:from-[#164A41] before:via-[#164A41]/30 before:to-transparent"
  >
    <nav class="flex items-center gap-2 text-xs leading-none" aria-label="Breadcrumb">
      <span class="font-medium text-[#7b8f86]">{{ currentUser?.role || 'Akun' }}</span>
      <svg class="h-3 w-3 text-[#c3d1ca]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
      <span class="flex items-center gap-1.5 font-semibold text-[#173b30]" aria-current="page">
        <span class="h-1.5 w-1.5 rounded-full bg-[#f6a623]" aria-hidden="true" />
        {{ currentPageLabel }}
      </span>
    </nav>

    <div class="relative mx-6 hidden w-full max-w-[320px] sm:block">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8aa096]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <input
        type="search"
        placeholder="Cari ID, nama karyawan, atau tujuan..."
        aria-label="Pencarian"
        class="w-full rounded-full border border-[#dfe8dc] bg-[#f7faf6] py-2 pl-9 pr-3 text-[11px] text-[#263b31] outline-none transition-all placeholder:text-[#8aa096] focus:border-[#164A41]/40 focus:bg-white focus:ring-2 focus:ring-[#164A41]/10"
      >
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        aria-label="Ganti tema"
        class="rounded-full p-1.5 text-[#6b7f76] transition-colors hover:bg-[#eef4ea] hover:text-[#164A41] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#164A41]/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      <NuxtLink
        to="/notifikasi"
        :aria-label="unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'"
        class="relative rounded-full p-1.5 text-[#6b7f76] transition-colors hover:bg-[#eef4ea] hover:text-[#164A41] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#164A41]/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-0.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span
          v-if="unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#c94c3f] px-0.5 text-[7px] font-bold text-white"
        >
          {{ unreadLabel }}
        </span>
      </NuxtLink>

      <div class="flex items-center gap-2 border-l border-[#e3ebe5] pl-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#164A41] text-[10px] font-bold text-[#fae4ba]">
          {{ userInitials }}
        </div>
        <div class="flex flex-col text-left">
          <span class="text-[11px] font-semibold leading-tight text-[#173b30]">{{ currentUser?.name || 'Memuat profil...' }}</span>
          <span class="text-[9px] leading-tight text-[#7b8f86]">{{ currentUser?.role || ' ' }}</span>
        </div>
      </div>
    </div>
  </header>
</template>