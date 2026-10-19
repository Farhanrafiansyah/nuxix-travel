<script setup lang="ts">
definePageMeta({
  layout: false
})

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

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
      useCurrentUser().value = response.user

      navigateTo('/dashboard')
    }
  } catch (error: any) {
    console.error('Login Error:', error)
    errorMessage.value = error.data?.message || 'Gagal login. Periksa email dan password Anda.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#eaf3eb] text-[#194c46] antialiased selection:bg-[#2e6d73] selection:text-white">
    <!-- Top Header -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-[#e1ece1] bg-white px-6 sm:px-12">
      <div class="flex items-center gap-3">
        <!-- Logo Icon -->
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#276a66]/10 text-[#276a66]">
          <svg class="h-6 w-6" viewBox="0 0 32 32" fill="currentColor">
            <path d="M16 3C8.82 3 3 8.82 3 16s5.82 13 13 13 13-5.82 13-13S23.18 3 16 3zm0 2c6.08 0 11 4.92 11 11s-4.92 11-11 11S5 22.08 5 16 9.92 5 16 5z" opacity="0.2"/>
            <path d="M7 16l14-8-4 8 8 4-18-4z" />
          </svg>
        </div>
        
        <div class="flex items-center gap-2.5">
          <span class="text-base font-bold tracking-tight text-[#163e36]">nuvix travel</span>
          <span class="h-4 w-px bg-[#cfded3]" />
          <span class="text-xs font-normal text-[#607a6e]">Portal dinas corporate</span>
        </div>
      </div>

      <a
        href="mailto:pusatbantuan@nuvixtravel.id"
        class="text-xs font-medium text-[#29686c] transition-colors hover:text-[#184643] hover:underline"
      >
        Pusat bantuan
      </a>
    </header>

    <!-- Main Content Area -->
    <main class="flex flex-1 items-center justify-center px-4 py-5 sm:px-6 lg:px-8 lg:py-2">
      <div class="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-12 lg:gap-12 lg:[zoom:0.82] xl:[zoom:0.88] 2xl:[zoom:0.92]">
        
        <!-- Left Card: Informasi Portal Dinas -->
        <section class="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-7">
          <!-- Card Header Banner -->
          <div class="flex h-12 items-center bg-[#dfedd9] px-6 text-xs font-medium text-[#376b48]">
            Portal dinas corporate
          </div>

          <!-- Card Content Body -->
          <div class="p-6 sm:p-9">
            <!-- Badge -->
            <span class="inline-flex items-center rounded-full bg-[#dcf0ee] px-3 py-1 text-[11px] font-semibold text-[#256864]">
              Akses dinas internal
            </span>

            <!-- Main Heading -->
            <h1 class="mt-4 text-2xl font-bold tracking-tight text-[#16443c] sm:text-3xl lg:text-[32px] lg:leading-[1.2]">
              Kelola perjalanan dinas dengan lebih cepat
            </h1>

            <p class="mt-3 text-xs leading-relaxed text-[#597b66] sm:text-sm">
              Masuk ke akun Nuvix Travel untuk mengajukan permintaan perjalanan, pantau status, dan akses laporan perjalanan kantor.
            </p>

            <!-- Fitur Utama -->
            <div class="mt-7">
              <h2 class="text-xs font-bold uppercase tracking-wider text-[#1e4e46]">Fitur utama</h2>

              <ul class="mt-4 space-y-4">
                <!-- Fitur 1 -->
                <li class="flex items-start gap-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#deeeee] text-[#215e5b]" aria-hidden="true">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
                    </svg>
                  </span>
                  <div>
                    <h3 class="text-xs font-semibold text-[#18443d] sm:text-sm">Permintaan perjalanan</h3>
                    <p class="mt-0.5 text-xs leading-relaxed text-[#678274]">
                      Ajukan tiket, akomodasi, dan transportasi dengan alur persetujuan yang lebih rapi.
                    </p>
                  </div>
                </li>

                <!-- Fitur 2 -->
                <li class="flex items-start gap-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#deeeee] text-[#215e5b]" aria-hidden="true">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <div>
                    <h3 class="text-xs font-semibold text-[#18443d] sm:text-sm">Jadwal dan status</h3>
                    <p class="mt-0.5 text-xs leading-relaxed text-[#678274]">
                      Pantau jadwal keberangkatan, perubahan itinerary, dan status persetujuan dalam satu dashboard.
                    </p>
                  </div>
                </li>

                <!-- Fitur 3 -->
                <li class="flex items-start gap-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#deeeee] text-[#215e5b]" aria-hidden="true">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                  </span>
                  <div>
                    <h3 class="text-xs font-semibold text-[#18443d] sm:text-sm">Laporan dan pengajuan</h3>
                    <p class="mt-0.5 text-xs leading-relaxed text-[#678274]">
                      Kelola pengajuan, lampiran, dan laporan perjalanan dengan lebih cepat dan terorganisir.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Right Card: Form Login -->
        <section class="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-5">
          <!-- Card Header Banner -->
          <div class="flex h-12 items-center bg-[#dfedd9] px-6 text-xs font-medium text-[#376b48]">
            Masuk ke akun
          </div>

          <!-- Card Content Body -->
          <div class="p-6 sm:p-8">
            <h2 class="text-xl font-bold tracking-tight text-[#16443c] sm:text-2xl">
              Selamat datang di Nuvix Travel
            </h2>
            <p class="mt-2 text-xs leading-relaxed text-[#5e7f6c] sm:text-sm">
              Masuk untuk mengelola perjalanan dinas, permintaan, dan laporan kantor.
            </p>

            <form class="mt-6 space-y-4" @submit.prevent="handleLogin">
              <!-- Alert Error Message -->
              <div
                v-if="errorMessage"
                class="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                role="alert"
              >
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Input Email -->
              <div>
                <label for="email" class="mb-1.5 block text-xs font-semibold text-[#1a443d]">
                  Email kantor
                </label>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="nama@nuvixtravel.id"
                  class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                />
              </div>

              <!-- Input Password -->
              <div>
                <label for="password" class="mb-1.5 block text-xs font-semibold text-[#1a443d]">
                  Kata sandi
                </label>
                <div class="relative">
                  <input
                    id="password"
                    v-model="password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    minlength="6"
                    autocomplete="current-password"
                    placeholder="••••••••••••"
                    class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 pr-10 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#748c80] hover:text-[#2e6d73] transition-colors"
                    :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                    @click="showPassword = !showPassword"
                  >
                    <!-- Eye Off -->
                    <svg v-if="showPassword" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                    <!-- Eye On -->
                    <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Lupa Kata Sandi -->
              <div class="flex justify-end pt-0.5">
                <a
                  href="mailto:admin@nuvixtravel.id?subject=Permintaan%20Reset%20Kata%20Sandi"
                  class="text-xs font-semibold text-[#29686c] transition-colors hover:text-[#184643] hover:underline"
                >
                  Lupa kata sandi?
                </a>
              </div>

              <!-- Tombol Masuk -->
              <button
                type="submit"
                :disabled="isLoading"
                class="flex h-11 w-full items-center justify-center rounded-lg bg-[#2e6d73] px-4 text-sm font-semibold text-white shadow-md shadow-[#2e6d73]/20 transition-all hover:bg-[#255b60] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              >
                <template v-if="isLoading">
                  <svg class="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Memproses...
                </template>
                <template v-else>
                  Masuk
                </template>
              </button>
            </form>

            <!-- Footer Card Link -->
            <div class="mt-5 flex items-center justify-between text-xs text-[#6e8578]">
              <span>Belum punya akun?</span>
              <NuxtLink to="/register" class="font-semibold text-[#29686c] transition-colors hover:text-[#184643] hover:underline">
                Daftar akun
              </NuxtLink>
            </div>
          </div>
        </section>

      </div>
    </main>

    <!-- Bottom Footer with Rounded Top Corners -->
    <footer class="mt-auto rounded-t-2xl bg-[#dfedd9] px-6 py-3 sm:px-12">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-[#52745e] sm:flex-row">
        <span>© 2026 Nuvix Travel. Seluruh hak cipta dilindungi.</span>
        <nav class="flex flex-wrap items-center gap-5 font-medium text-[#2f5b4a]" aria-label="Informasi Footer">
          <a href="#" class="transition-colors hover:underline">Kebijakan privasi</a>
          <a href="#" class="transition-colors hover:underline">Syarat penggunaan</a>
          <span>Bahasa Indonesia</span>
        </nav>
      </div>
    </footer>
  </div>
</template>