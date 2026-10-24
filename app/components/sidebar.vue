<script setup lang="ts">
const route = useRoute()
const currentUser = useCurrentUser()

type MenuItem = {
  label: string
  icon: 'grid' | 'briefcase' | 'wallet' | 'receipt' | 'bell' | 'user' | 'chart-bar' | 'banknotes' | 'check' | 'time' | 'users' | 'setting' | 'paper' | 'planet'
  to: string
  activePaths?: string[]
  badge?: number | string
}

const roleMenuItems: Partial<Record<string, MenuItem[]>> = {
  Karyawan: [
    { label: 'Dashboard', icon: 'grid', to: '/karyawan/dashboard-karyawan' },
    { label: 'Perjalanan Dinas', icon: 'briefcase', to: '/karyawan/dinas', activePaths: ['/karyawan/dinas-ajukan', '/karyawan/dinas-detail'] },
    { label: 'Uang Muka', icon: 'wallet', to: '/karyawan/uang-muka' },
    { label: 'Reimbursement', icon: 'receipt', to: '/karyawan/reimbursement', activePaths: ['/karyawan/reimbursement-ajukan', '/karyawan/reimbursement-detail'] },
    { label: 'Profil', icon: 'user', to: '/karyawan/profil' }
  ],
  'Tim Keuangan': [
    { label: 'Dashboard', icon: 'grid', to: '/tim-keuangan/dashboard-keuangan' },
    { label: 'Verifikasi', icon: 'receipt', to: '/tim-keuangan/reimbursement-verifikasi' },
    { label: 'Uang Muka', icon: 'wallet', to: '/tim-keuangan/uang-muka' },
    { label: 'Pembayaran', icon: 'chart-bar', to: '/tim-keuangan/pembayaran' },
    { label: 'Laporan Keuangan', icon: 'banknotes', to: '/tim-keuangan/laporan-keuangan' }
  ],
  Atasan: [
    { label: 'Dashboard', icon: 'grid', to: '/atasan-approver/dashboard-atasan' },
    { label: 'Persetujuan', icon: 'check', to: '/atasan-approver/persetujuan' },
    { label: 'Riwayat Persetujuan', icon: 'time', to: '/atasan-approver/persetujuan-riwayat' }
  ],
  'Super Admin': [
    { label: 'Dashboard', icon: 'grid', to: '/super-admin/dashboard-admin' },
    { label: 'Manajemen Pengguna', icon: 'users', to: '/super-admin/manajemen-pengguna' },
    { label: 'Departemen', icon: 'setting', to: '/super-admin/departemen' },
    { label: 'Kebijakan Perjalanan', icon: 'paper', to: '/super-admin/kebijakan' },
    { label: 'Role & Permission', icon: 'setting', to: '/super-admin/role' }
  ],
  'Admin Travel': [
    { label: 'Dashboard', icon: 'grid', to: '/admin-travel/dashboard-travel' },
    { label: 'Antrean Perjalanan', icon: 'planet', to: '/admin-travel/antrean' },
    { label: 'Booking Management', icon: 'paper', to: '/admin-travel/booking' }
  ]
}

const sharedMenuItems: MenuItem[] = [
  { label: 'Notifikasi', icon: 'bell', to: '/notifikasi' }
]

const primaryMenuItems = computed(() => currentUser.value
  ? roleMenuItems[currentUser.value.role] || []
  : [])

const menuGroups = computed(() => [
  { title: 'Menu Utama', items: primaryMenuItems.value },
  { title: 'Lainnya', items: sharedMenuItems }
].filter((group) => group.items.length > 0))

const userRole = computed(() => currentUser.value?.role || 'Akun')
const userName = computed(() => (currentUser.value as { name?: string } | null)?.name ?? '')

const userInitials = computed(() => (userName.value || userRole.value)
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'KP')

const isMenuItemActive = (item: MenuItem) =>
  route.path === item.to || Boolean(item.activePaths?.includes(route.path))

const icons = {
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  briefcase: '<rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3.5 12h17M10 12v2h4v-2"/>',
  wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M4 7h14a2 2 0 0 1 2 2v2h-5a2 2 0 1 0 0 4h5v2"/><circle cx="15" cy="13" r=".8" fill="currentColor" stroke="none"/>',
  'chart-bar': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  receipt: '<path d="M6 3.5h12v17l-2.5-1.5-2.5 1.5-2.5-1.5L8 20.5 6 22V3.5Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  banknotes: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  collapse: '<path d="M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3M14 8l4 4-4 4M9 12h9"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M10 12h9"/>',
  check: '<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />',
  time: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />',
  users: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />',
  setting: '<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />',
  paper: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />',
  planet: '<path stroke-linecap="round" stroke-linejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 0 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.25 2.25 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 0 1-5.276 3.67m0 0a9 9 0 0 1-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25" />'
}

const actions = [
  { label: 'Keluar', icon: 'logout', danger: true, to: '/login' }
]

const handleAction = async (action: (typeof actions)[number]) => {
  if (action.to === '/login') {
    const token = useCookie<string | null>('auth_token')
    token.value = null
  }

  if (action.to) {
    await navigateTo(action.to)
  }
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 flex h-screen w-[190px] flex-col overflow-y-auto bg-gradient-to-b from-[#164A41] to-[#12403a] px-2.5 py-4 text-white [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]"
  >
    <div class="mb-6 flex items-center gap-2.5 px-1.5">
      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f6a623] text-white">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 17.5 12 4l7 13.5M8.2 13h7.6M6.8 16.5h10.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="min-w-0">
        <p class="truncate font-serif text-[13px] font-bold leading-none">Nuvix Travel</p>
        <p class="mt-1 truncate text-[8px] font-medium leading-none text-[#9fc2b8]">Corporate Travel System</p>
      </div>
    </div>

    <div class="mb-4 px-1.5">
      <span class="inline-flex max-w-full truncate rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-medium text-[#cfe3dc]">
        {{ userRole }}
      </span>
    </div>

    <nav class="flex-1 space-y-3" aria-label="Menu utama">
      <div
        v-for="(group, index) in menuGroups"
        :key="group.title"
        :class="['space-y-0.5', index > 0 ? 'border-t border-white/10 pt-3' : '']"
      >
        <NuxtLink
          v-for="item in group.items"
          :key="item.label"
          :to="item.to"
          :class="[
            'group relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6a623]/60',
            isMenuItemActive(item)
              ? 'bg-white/10 text-white'
              : 'text-[#cfe3dc] hover:bg-white/[0.07] hover:text-white'
          ]"
          :aria-current="isMenuItemActive(item) ? 'page' : undefined"
        >
          <span
            v-if="isMenuItemActive(item)"
            class="absolute -left-2.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[#f6a623]"
            aria-hidden="true"
          />
          <span
            :class="[
              'flex h-4 w-4 shrink-0 items-center justify-center transition-colors',
              isMenuItemActive(item) ? 'text-[#f6a623]' : 'text-[#a9cbc1] group-hover:text-white'
            ]"
            aria-hidden="true"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="icons[item.icon as keyof typeof icons]" />
          </span>
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <span
            v-if="item.badge"
            class="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f6a623] px-1 text-[9px] font-bold text-[#164A41]"
          >
            {{ item.badge }}
          </span>
        </NuxtLink>
      </div>
    </nav>

    <div class="mt-4 space-y-1 border-t border-white/10 pt-3">
      <div class="flex items-center gap-2 px-2 py-1.5">
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fae4ba] text-[9px] font-bold text-[#8a5408]">
          {{ userInitials }}
        </span>
        <div class="min-w-0">
          <p class="truncate text-[11px] font-semibold leading-tight text-white">{{ userName || userRole }}</p>
          <p v-if="userName" class="mt-0.5 truncate text-[9px] leading-tight text-[#9fc2b8]">{{ userRole }}</p>
        </div>
      </div>

      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        :class="[
          'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[11px] font-medium text-[#cfe3dc] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f6a623]/60',
          action.danger ? 'hover:bg-rose-400/15 hover:text-rose-200' : 'hover:bg-white/10 hover:text-white'
        ]"
        @click="handleAction(action)"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="icons[action.icon as keyof typeof icons]" />
        <span>{{ action.label }}</span>
      </button>
    </div>
  </aside>
</template>