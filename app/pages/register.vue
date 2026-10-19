<script setup lang="ts">
definePageMeta({
  layout: false
})

const name = ref('')
const nik = ref('')
const email = ref('')
const companyCode = ref('')
const department = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeTerms = ref(false)

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const departments = [
  'IT & Engineering',
  'Operations',
  'Sales & Marketing',
  'Finance & Accounting',
  'Human Resources',
  'Logistik'
]

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok.'
    return
  }

  if (!agreeTerms.value) {
    errorMessage.value = 'Anda harus menyetujui syarat penggunaan dan kebijakan privasi.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch('http://localhost:8000/api/auth/register', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        password: password.value,
        department: department.value,
        role: 'Karyawan'
      }
    })

    if (response.token) {
      const tokenCookie = useCookie('auth_token')
      tokenCookie.value = response.token
      useCurrentUser().value = response.user

      navigateTo('/dashboard')
    }
  } catch (error: any) {
    console.error('Register Error:', error)
    const responseData = typeof error === 'object' && error !== null && 'data' in error
      ? error.data
      : undefined
    const message = typeof responseData === 'object' && responseData !== null
      && 'message' in responseData && typeof responseData.message === 'string'
      ? responseData.message
      : undefined
    errorMessage.value = message || error.data?.message || 'Gagal membuat akun. Silakan periksa data Anda dan coba lagi.'
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
      <div class="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-12 lg:gap-10 lg:[zoom:0.82] xl:[zoom:0.88] 2xl:[zoom:0.92]">
        
        <!-- Left Card: Panduan & Langkah Memulai -->
        <section class="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-5">
          <!-- Card Header Banner -->
          <div class="flex h-12 items-center bg-[#dfedd9] px-6 text-xs font-medium text-[#376b48]">
            Portal dinas corporate
          </div>

          <!-- Card Content Body -->
          <div class="p-6 sm:px-19">
            <!-- Badge -->
            <span class="inline-flex items-center rounded-full bg-[#dcf0ee] px-3 py-1 text-[11px] font-semibold text-[#256864]">
              Pendaftaran akun karyawan
            </span>

            <!-- Main Heading -->
            <h1 class="mt-4 text-2xl font-bold tracking-tight text-[#16443c] sm:text-3xl lg:text-[28px] lg:leading-[1.25]">
              Awal perjalanan dinas yang lebih mudah
            </h1>

            <p class="mt-3 text-xs leading-relaxed text-[#597b66] sm:text-sm">
              Daftar ke Nuvix Travel untuk mengelola pengajuan, persetujuan, dan laporan perjalanan kantor Anda.
            </p>

            <!-- Tiga Langkah Untuk Memulai -->
            <div class="mt-7">
              <h2 class="text-xs font-bold text-[#1e4e46]">Tiga langkah untuk memulai</h2>

              <ul class="mt-4 space-y-4">
                <!-- Langkah 1 -->
                <li class="flex items-start gap-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dfedd9] text-xs font-bold text-[#2a6341]" aria-hidden="true">
                    01
                  </span>
                  <div>
                    <h3 class="text-xs font-semibold text-[#18443d] sm:text-sm">Lengkapi data karyawan</h3>
                    <p class="mt-0.5 text-xs leading-relaxed text-[#678274]">
                      Gunakan email kantor dan data sesuai identitas karyawan Anda.
                    </p>
                  </div>
                </li>

                <!-- Langkah 2 -->
                <li class="flex items-start gap-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dfedd9] text-xs font-bold text-[#2a6341]" aria-hidden="true">
                    02
                  </span>
                  <div>
                    <h3 class="text-xs font-semibold text-[#18443d] sm:text-sm">Verifikasi email &amp; akun</h3>
                    <p class="mt-0.5 text-xs leading-relaxed text-[#678274]">
                      Konfirmasi email Anda, lalu admin perusahaan akan memverifikasi data pendaftaran.
                    </p>
                  </div>
                </li>

                <!-- Langkah 3 -->
                <li class="flex items-start gap-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dfedd9] text-xs font-bold text-[#2a6341]" aria-hidden="true">
                    03
                  </span>
                  <div>
                    <h3 class="text-xs font-semibold text-[#18443d] sm:text-sm">Mulai perjalanan dinas</h3>
                    <p class="mt-0.5 text-xs leading-relaxed text-[#678274]">
                      Setelah akun aktif, ajukan perjalanan dan pantau persetujuan dalam satu tempat.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Separator & Note -->
            <hr class="my-6 border-[#e2ece2]" />

            <div class="space-y-1.5 text-xs text-[#678274]">
              <p>Pendaftaran hanya untuk karyawan perusahaan yang terdaftar di Nuvix Travel.</p>
              <p>
                <a href="mailto:admin@nuvixtravel.id" class="font-bold text-[#205d59] hover:underline">
                  Butuh bantuan? Hubungi admin perusahaan
                </a>
              </p>
            </div>
          </div>
        </section>

        <!-- Right Card: Form Registrasi -->
        <section class="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-7">
          <!-- Card Header Banner -->
          <div class="flex h-12 items-center justify-between bg-[#dfedd9] px-6 text-xs font-medium text-[#376b48]">
            <span>Daftar akun baru</span>
            <span class="font-normal text-[#4d7b5c]">Akun karyawan</span>
          </div>

          <!-- Card Content Body -->
          <div class="p-6 sm:p-8">
            <h2 class="text-xl font-bold tracking-tight text-[#16443c] sm:text-2xl">
              Buat akun Nuvix Travel
            </h2>
            <p class="mt-1.5 text-xs leading-relaxed text-[#5e7f6c] sm:text-sm">
              Lengkapi data di bawah untuk mendaftar. Akun Anda akan diverifikasi oleh admin perusahaan.
            </p>

            <form class="mt-5 space-y-3.5" @submit.prevent="handleRegister">
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

              <!-- Baris 1: Nama Lengkap & NIK -->
              <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label for="name" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                    Nama lengkap <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    v-model="name"
                    type="text"
                    required
                    minlength="2"
                    autocomplete="name"
                    placeholder="Nama sesuai data karyawan"
                    class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                  />
                </div>

                <div>
                  <label for="nik" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                    Nomor induk karyawan <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="nik"
                    v-model="nik"
                    type="text"
                    required
                    placeholder="Masukkan NIK"
                    class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                  />
                </div>
              </div>

              <!-- Baris 2: Email Kantor -->
              <div>
                <label for="email" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                  Email kantor <span class="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="nama@perusahaan.co.id"
                  class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                />
              </div>

              <!-- Baris 3: Kode Perusahaan & Departemen -->
              <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label for="companyCode" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                    Kode perusahaan <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="companyCode"
                    v-model="companyCode"
                    type="text"
                    required
                    placeholder="Kode dari admin"
                    class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                  />
                </div>

                <div>
                  <label for="department" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                    Departemen <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <select
                      id="department"
                      v-model="department"
                      required
                      class="h-10 w-full appearance-none rounded-lg border border-[#d6e3d7] bg-white px-3.5 pr-8 text-xs text-[#1e4941] shadow-sm transition-all focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                    >
                      <option value="" disabled selected>Pilih departemen</option>
                      <option v-for="dept in departments" :key="dept" :value="dept">
                        {{ dept }}
                      </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#748c80]">
                      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Baris 4: Kata Sandi & Konfirmasi Kata Sandi -->
              <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label for="password" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                    Kata sandi <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      id="password"
                      v-model="password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      minlength="6"
                      autocomplete="new-password"
                      placeholder="Buat kata sandi"
                      class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 pr-10 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                    />
                    <button
                      type="button"
                      class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#748c80] hover:text-[#2e6d73] transition-colors"
                      :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                      @click="showPassword = !showPassword"
                    >
                      <svg v-if="showPassword" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                      <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label for="confirmPassword" class="mb-1 block text-xs font-semibold text-[#1a443d]">
                    Konfirmasi kata sandi <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      id="confirmPassword"
                      v-model="confirmPassword"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      required
                      minlength="6"
                      autocomplete="new-password"
                      placeholder="Ulangi kata sandi"
                      class="h-10 w-full rounded-lg border border-[#d6e3d7] bg-white px-3.5 pr-10 text-xs text-[#1e4941] shadow-sm transition-all placeholder:text-[#9bb2a4] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20 sm:text-sm"
                    />
                    <button
                      type="button"
                      class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#748c80] hover:text-[#2e6d73] transition-colors"
                      :aria-label="showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
                      @click="showConfirmPassword = !showConfirmPassword"
                    >
                      <svg v-if="showConfirmPassword" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                      <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Petunjuk Password -->
              <p class="text-[11px] text-[#678274]">
                Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
              </p>

              <!-- Checkbox Persetujuan -->
              <div class="pt-1">
                <label class="flex items-start gap-2.5 text-xs text-[#52745e] cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="agreeTerms"
                    required
                    class="mt-0.5 h-4 w-4 rounded border-[#d6e3d7] text-[#2e6d73] focus:ring-[#2e6d73]/20"
                  />
                  <span class="leading-relaxed">
                    Saya menyetujui
                    <a href="#" class="font-semibold text-[#1a5753] hover:underline">Syarat penggunaan</a>
                    dan
                    <a href="#" class="font-semibold text-[#1a5753] hover:underline">Kebijakan privasi</a>
                    Nuvix Travel.
                  </span>
                </label>
              </div>

              <!-- Tombol Daftar -->
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
                  Mendaftarkan...
                </template>
                <template v-else>
                  Daftar akun
                </template>
              </button>
            </form>

            <!-- Footer Card Link -->
            <div class="mt-5 text-center text-xs text-[#6e8578]">
              <span>Sudah punya akun? </span>
              <NuxtLink to="/login" class="font-bold text-[#1f5753] transition-colors hover:text-[#184643] hover:underline">
                Masuk di sini
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