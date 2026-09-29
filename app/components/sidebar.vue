<script setup lang="ts">
const route = useRoute()
const currentUser = useCurrentUser()

const menuItems = [
  { label: 'Dashboard', icon: 'grid', to: '/dashboard' },
  { label: 'Perjalanan Dinas', icon: 'briefcase', to: '/dinas' },
  { label: 'Uang Muka', icon: 'wallet', to: '/uang-muka' },
  { label: 'Reimbursement', icon: 'receipt', to: '/reimbursement', badge: '1' },
  { label: 'Notifikasi', icon: 'bell', to: '/notifikasi' },
  { label: 'Profil', icon: 'user', to: '/profil' }
]

const icons = {
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  briefcase: '<rect x="3.5" y="7" width="17" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3.5 12h17M10 12v2h4v-2"/>',
  wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M4 7h14a2 2 0 0 1 2 2v2h-5a2 2 0 1 0 0 4h5v2"/><circle cx="15" cy="13" r=".8" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M6 3.5h12v17l-2.5-1.5-2.5 1.5-2.5-1.5L8 20.5 6 22V3.5Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  collapse: '<path d="M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3M14 8l4 4-4 4M9 12h9"/>',
  logout: '<path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M10 12h9"/>'
}

const actions = [
  { label: 'Ciutkan Menu', icon: 'collapse' },
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
  <aside class="fixed inset-y-0 left-0 z-40 flex h-screen w-[190px] flex-col overflow-y-auto bg-[#171d4d] px-2.5 py-4 text-white">
      <div class="mb-7 flex items-center gap-2.5 px-1.5">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f6a623] text-white">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 17.5 12 4l7 13.5M8.2 13h7.6M6.8 16.5h10.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div>
          <p class="text-xs font-bold leading-none">Nuvix Travel</p>
          <p class="mt-1 text-[8px] font-medium leading-none text-blue-200">Corporate Travel System</p>
        </div>
      </div>

      <div class="mb-4 px-1.5">
        <span class="inline-flex max-w-full truncate rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-medium text-blue-100">
          {{ currentUser?.role || 'Akun' }}
        </span>
      </div>

      <nav class="flex-1 space-y-1" aria-label="Menu utama">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.label"
          :to="item.to"
          :class="[
            'group flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-[11px] font-medium transition-colors',
            route.path === item.to
              ? 'bg-[#394578] text-white'
              : 'text-blue-100 hover:bg-white/10 hover:text-white'
          ]"
          :aria-current="route.path === item.to ? 'page' : undefined"
        >
          <span class="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" v-html="icons[item.icon as keyof typeof icons]" />
          </span>
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <span v-if="item.badge" class="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-[#1e295b]">{{ item.badge }}</span>
        </NuxtLink>
      </nav>

      <div class="space-y-1 border-t border-white/10 pt-3">
        <button
          v-for="action in actions"
          :key="action.label"
          type="button"
          @click="handleAction(action)"
          :class="[
            'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[10px] font-medium text-blue-100 transition-colors',
            action.danger ? 'hover:bg-rose-400/15 hover:text-rose-200' : 'hover:bg-white/10 hover:text-white'
          ]"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="icons[action.icon as keyof typeof icons]" />
          <span>{{ action.label }}</span>
        </button>
      </div>
  </aside>
</template>
