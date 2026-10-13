<script setup lang="ts">
type Notification = {
  id: string
  title: string
  details: string
  date: string
  isRead: boolean
}

const notifications = ref<Notification[]>([
  {
    id: 'travel-approved-bali',
    title: 'Perjalanan dinas Anda telah disetujui.',
    details: 'Faris Hidayat — Bali, 2–5 Okt 2026',
    date: '2–5 Okt 2026',
    isRead: false
  },
  {
    id: 'reimbursement-verified-singapore',
    title: 'Reimbursement perjalanan Anda telah diverifikasi.',
    details: 'Budi Santoso — Singapore, Rp11.850.000',
    date: '18–21 Sep 2026',
    isRead: false
  },
  {
    id: 'reimbursement-paid-jakarta',
    title: 'Reimbursement perjalanan Anda telah dibayar.',
    details: 'Alicia Putri — Jakarta, Rp7.250.000',
    date: '12–14 Sep 2026',
    isRead: false
  },
  {
    id: 'travel-pending-bandung',
    title: 'Pengajuan perjalanan dinas menunggu persetujuan.',
    details: 'Budi Santoso — Bandung, 15–16 Okt 2026',
    date: '15–16 Okt 2026',
    isRead: true
  },
  {
    id: 'travel-fulfillment-singapore',
    title: 'Transportasi dan akomodasi perjalanan telah disiapkan.',
    details: 'Budi Santoso — Singapore, 18–21 Sep 2026',
    date: '18–21 Sep 2026',
    isRead: true
  }
])

const markAllAsRead = () => {
  notifications.value = notifications.value.map((notification) => ({
    ...notification,
    isRead: true
  }))
}

const markAsRead = (id: string) => {
  const notification = notifications.value.find((item) => item.id === id)

  if (notification) {
    notification.isRead = true
  }
}
</script>

<template>
  <section class="dashboard-page space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Notifikasi</h1>
        <p class="text-xs font-medium text-[#777b87]">Semua pemberitahuan terkait aktivitas perjalanan dinas Anda.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center rounded-md border border-[#e8e1d6] bg-white px-3 text-[10px] font-semibold text-[#272621] transition-colors hover:bg-[#faf9f6]"
        @click="markAllAsRead"
      >
        Tandai Semua Dibaca
      </button>
    </div>

    <ul
      v-if="notifications.length"
      class="overflow-hidden rounded-lg border border-[#eadfce] bg-white"
      aria-label="Daftar notifikasi"
    >
      <li
        v-for="notification in notifications"
        :key="notification.id"
        class="border-b border-[#eee7dc] last:border-b-0"
      >
        <button
          type="button"
          class="grid w-full grid-cols-[8px_32px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#faf9f6] sm:px-4"
          :aria-label="`${notification.title} ${notification.details}. Tandai sudah dibaca.`"
          @click="markAsRead(notification.id)"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="notification.isRead ? 'bg-[#c5cbe0]' : 'bg-[#d49a28]'"
            aria-hidden="true"
          />
          <span
            class="flex h-8 w-8 items-center justify-center rounded-full"
            :class="notification.isRead ? 'bg-[#faf9f6] text-[#817b6d]' : 'bg-[#f5ecd6] text-[#c58a1f]'"
            aria-hidden="true"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </span>
          <span class="min-w-0 py-0.5">
            <span
              class="block truncate text-[10px] leading-4"
              :class="notification.isRead ? 'font-medium text-[#34343a]' : 'font-semibold text-[#272621]'"
            >
              {{ notification.title }}
            </span>
            <span class="block truncate text-[9px] leading-3 text-[#858078]">
              {{ notification.details }}
            </span>
          </span>
          <span class="whitespace-nowrap pl-2 text-right text-[9px] text-[#858078]">
            {{ notification.date }}
          </span>
        </button>
      </li>
    </ul>

    <div
      v-else
      class="rounded-lg border border-[#eadfce] bg-white px-4 py-10 text-center text-xs text-[#858078]"
    >
      Belum ada notifikasi.
    </div>
  </section>
</template>