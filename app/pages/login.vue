<script setup lang="ts">
definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const activeFeature = ref(0)

const featureTabs = [
  { label: 'Perjalanan', icon: 'route' },
  { label: 'Uang Muka', icon: 'wallet' },
  { label: 'Reimbursement', icon: 'receipt' }
]

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value
      }
    })

    if (response.token) {
      const tokenCookie = useCookie('auth_token')
      tokenCookie.value = response.token

      navigateTo('/dashboard')
    }
  } catch (error) {
    console.error('Login Error:', error)
    errorMessage.value = error.data?.message || 'Gagal login. Periksa email dan password Anda.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#f5f2e9] text-[#151b38] lg:grid lg:grid-cols-[54%_46%]">
    <section class="relative hidden min-h-screen overflow-hidden bg-[#17204e] px-10 py-11 text-white lg:flex lg:flex-col lg:justify-between xl:px-12">
      <div class="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-white/10" />
      <div class="pointer-events-none absolute -right-2 -top-3 h-56 w-56 rounded-full border border-white/10" />
      <div class="pointer-events-none absolute bottom-24 left-24 h-72 w-72 rounded-full border border-white/[0.03]" />

      <div class="relative">
        <div class="flex items-center gap-3">
          <div class="flex h-14 w-14 items-center justify-center overflow-hidden bg-white shadow-lg">
            <img src="/favicon.ico" alt="Nuvix Travel" class="h-11 w-11 object-contain" />
          </div>
          <div>
            <h1 class="font-serif text-[17px] font-bold leading-none tracking-tight">Nuvix Travel</h1>
            <p class="mt-1 text-[8px] uppercase tracking-[0.13em] text-[#aeb8e2]">Corporate Travel Management System</p>
          </div>
        </div>

        <div class="mt-44 max-w-[570px] xl:mt-48">
          <h2 class="font-serif text-[31px] font-bold leading-[1.18] tracking-[-0.01em] xl:text-[35px]">
            Perjalanan dinas yang tertata, dari pengajuan hingga pencairan.
          </h2>
          <p class="mt-5 max-w-[560px] text-[12px] leading-6 text-[#c3c9e0]">
            Satu sistem untuk karyawan, atasan, admin travel, dan tim keuangan — transparan di setiap tahap persetujuan.
          </p>

          <div class="mt-12 space-y-5">
            <div class="flex items-center gap-3">
              <span class="flex h-7 w-7 items-center justify-center rounded-md border border-[#c99a2e] text-[#e2ae35]" aria-hidden="true">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 19V9m0 0 5-4 4 4 5-4v10l-5 4-4-4-5 4" />
                  <circle cx="5" cy="9" r="1.5" />
                </svg>
              </span>
              <div>
                <p class="text-[11px] font-semibold">Alur persetujuan berjenjang</p>
                <p class="mt-0.5 text-[9px] text-[#aeb8d7]">Pantau status pengajuan secara real-time di setiap tahap.</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="flex h-7 w-7 items-center justify-center rounded-md border border-[#c99a2e] text-[#e2ae35]" aria-hidden="true">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16M8 14h3" />
                </svg>
              </span>
              <div>
                <p class="text-[11px] font-semibold">Uang muka &amp; reimbursement</p>
                <p class="mt-0.5 text-[9px] text-[#aeb8d7]">Ajukan, verifikasi, dan cairkan dana perjalanan dalam satu tempat.</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="flex h-7 w-7 items-center justify-center rounded-md border border-[#c99a2e] text-[#e2ae35]" aria-hidden="true">
                <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" />
                </svg>
              </span>
              <div>
                <p class="text-[11px] font-semibold">Laporan keuangan real-time</p>
                <p class="mt-0.5 text-[9px] text-[#aeb8d7]">Anggaran, realisasi, dan sisa dana selalu terpantau.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p class="relative text-[9px] text-[#7884ad]">© 2026 Nuvix Travel — Internal system, tidak untuk didistribusikan.</p>
    </section>

    <section class="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
      <div class="w-full max-w-[375px] rounded-[11px] border border-[#e6dfd2] bg-white px-6 py-7 shadow-[0_18px_38px_rgba(41,35,22,0.08)] sm:px-7 sm:py-8">
        <div class="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#f8edc9] px-2.5 py-1 text-[8px] font-semibold text-[#86651d]">
          <span aria-hidden="true">✦</span>
          Sistem Resmi Perjalanan Dinas Nuvix Group
        </div>

        <h3 class="font-serif text-[22px] font-bold leading-tight text-[#1c2237]">Masuk ke akun Anda</h3>
        <p class="mt-1.5 text-[10px] text-[#85837d]">Kelola perjalanan dinas perusahaan Anda dengan mudah.</p>

        <div class="mt-5 grid grid-cols-3 divide-x divide-[#e5dfd2] rounded-md border border-[#e5dfd2] bg-[#faf8f2]">
          <button
            v-for="(tab, index) in featureTabs"
            :key="tab.label"
            type="button"
            class="flex h-10 flex-col items-center justify-center gap-0.5 text-[7px] font-medium transition-colors"
            :class="activeFeature === index ? 'text-[#b17c18]' : 'text-[#272725]'"
            @click="activeFeature = index"
          >
            <svg v-if="tab.icon === 'route'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19V9m0 0 5-4 4 4 5-4v10l-5 4-4-4-5 4" /></svg>
            <svg v-else-if="tab.icon === 'wallet'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h13v14H6a2 2 0 0 1-2-2V7Z" /><path d="M4 8h15M16 12h3" /></svg>
            <svg v-else class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12v17l-3-2-3 2-3-2-3 2V4Z" /><path d="M9 9h6M9 13h6" /></svg>
            {{ tab.label }}
          </button>
        </div>

        <form class="mt-5 space-y-3.5" @submit.prevent="handleLogin">
          <div v-if="errorMessage" class="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-[10px] text-red-600">
            {{ errorMessage }}
          </div>

          <div>
            <label for="email" class="mb-1.5 block text-[9px] font-semibold text-[#25262a]">Email / NIP</label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="nama@nuvix.co.id"
              class="h-8 w-full rounded-md border border-[#e4ded3] bg-white px-3 text-[9px] text-[#31312e] outline-none transition-colors placeholder:text-[#a7a39a] focus:border-[#b99035]"
            />
          </div>

          <div>
            <label for="password" class="mb-1.5 block text-[9px] font-semibold text-[#25262a]">Password</label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="6"
                autocomplete="current-password"
                placeholder="Masukkan password Anda"
                class="h-8 w-full rounded-md border border-[#e4ded3] bg-white px-3 pr-9 text-[9px] text-[#31312e] outline-none transition-colors placeholder:text-[#a7a39a] focus:border-[#b99035]"
              />
              <button type="button" class="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-[#77736a]" :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'" @click="showPassword = !showPassword">
                <svg v-if="showPassword" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.7 10.7 0 0 1 12 5c5 0 8.5 4.5 9.5 7a15.8 15.8 0 0 1-3.1 4.6M6.2 6.2C4.4 7.5 3.2 9.3 2.5 12c1 2.5 4.5 7 9.5 7 1 0 2-.2 2.9-.5" /></svg>
                <svg v-else class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></svg>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 text-[8px]">
            <label class="flex cursor-pointer items-center gap-1.5 text-[#77756f]">
              <input type="checkbox" class="h-3 w-3 rounded border-[#d8d2c7] text-[#17204e] focus:ring-0" />
              <span>Ingat saya</span>
            </label>
            <button type="button" class="font-medium text-[#bd861d] hover:underline">Lupa password?</button>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="mt-2 h-10 w-full rounded-md bg-[#17204e] text-[9px] font-semibold text-white shadow-[0_5px_12px_rgba(23,32,78,0.18)] transition-colors hover:bg-[#202d69] disabled:cursor-wait disabled:opacity-60"
          >
            {{ isLoading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <div class="my-4 flex items-center gap-3">
          <span class="h-px flex-1 bg-[#e8e1d6]" />
          <span class="text-[8px] text-[#918d83]">Belum punya akun?</span>
          <button type="button" class="text-[8px] font-semibold text-[#bd861d] hover:underline">Buat akun</button>
          <span class="h-px flex-1 bg-[#e8e1d6]" />
        </div>

        <p class="text-center text-[8px] leading-4 text-[#a09b91]">Akses terbatas untuk karyawan Nuvix Group.</p>
      </div>
    </section>
  </div>
</template>