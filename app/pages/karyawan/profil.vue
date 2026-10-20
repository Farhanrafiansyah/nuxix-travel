<script setup lang="ts">
const currentUser = useCurrentUser()
const authToken = useCookie<string | null>('auth_token')
const isLoadingUser = ref(false)

// Form Keamanan Akun
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const isSubmittingPassword = ref(false)
const passwordFeedback = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

// Edit Informasi Modal
const isEditModalOpen = ref(false)
const editPhone = ref('0812-3456-7890')
const userPhone = ref('0812-3456-7890')
const editFeedback = ref<string | null>(null)

// NIP diturunkan secara konsisten dari ID user seeder
const userNip = computed(() => {
  if (!currentUser.value?.id) return '242510359'
  return `24251035${currentUser.value.id}`
})

// Jabatan diturunkan dari role dan departemen seeder
const userJabatan = computed(() => {
  if (!currentUser.value) return 'Staf Karyawan'
  if (currentUser.value.role === 'Karyawan') {
    return `Staf ${currentUser.value.department || 'Operasional'}`
  }
  return currentUser.value.role
})

onMounted(async () => {
  if (!authToken.value) {
    await navigateTo('/login')
    return
  }

  // Jika currentUser belum ada di state, ambil data terbaru dari endpoint /api/auth/me
  if (!currentUser.value) {
    isLoadingUser.value = true
    try {
      const userData = await $fetch('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken.value}` }
      })
      currentUser.value = userData as any
    } catch (error) {
      console.error('Gagal mengambil data user /me:', error)
    } finally {
      isLoadingUser.value = false
    }
  }
})

const handleChangePassword = async () => {
  passwordFeedback.value = null

  if (!currentPassword.value || !newPassword.value || !confirmNewPassword.value) {
    passwordFeedback.value = {
      type: 'error',
      message: 'Semua kolom kata sandi wajib diisi.'
    }
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    passwordFeedback.value = {
      type: 'error',
      message: 'Konfirmasi password baru tidak cocok.'
    }
    return
  }

  if (newPassword.value.length < 6) {
    passwordFeedback.value = {
      type: 'error',
      message: 'Password baru minimal harus 6 karakter.'
    }
    return
  }

  isSubmittingPassword.value = true

  try {
    // Mencoba memanggil endpoint keamanan akun di backend
    await $fetch('http://localhost:8000/api/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken.value}` },
      body: {
        current_password: currentPassword.value,
        new_password: newPassword.value
      }
    })

    passwordFeedback.value = {
      type: 'success',
      message: 'Kata sandi berhasil diperbarui!'
    }
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (error: any) {
    console.error('Change password error:', error)
    const status = error?.status || error?.statusCode
    if (status === 404) {
      passwordFeedback.value = {
        type: 'info',
        message: 'Endpoint API ubah password (/api/auth/change-password) belum tersedia di Backend.'
      }
    } else {
      passwordFeedback.value = {
        type: 'error',
        message: error?.data?.message || 'Gagal mengubah kata sandi. Pastikan password saat ini benar.'
      }
    }
  } finally {
    isSubmittingPassword.value = false
  }
}

const openEditModal = () => {
  editPhone.value = userPhone.value
  editFeedback.value = null
  isEditModalOpen.value = true
}

const saveEditInfo = () => {
  userPhone.value = editPhone.value
  editFeedback.value = 'Informasi telepon berhasil disimpan.'
  setTimeout(() => {
    isEditModalOpen.value = false
  }, 700)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Page -->
    <div>
      <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Profil Saya</h1>
      <p class="mt-1 text-xs text-[#64748b]">Kelola informasi akun dan keamanan Anda.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingUser" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
      Memuat informasi profil dari server...
    </div>

    <!-- Grid 2 Kolom -->
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Kartu 1: Informasi Pribadi -->
      <section class="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-7">
        <div>
          <h2 class="text-base font-bold text-[#1e293b]">Informasi Pribadi</h2>

          <div class="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <!-- Nama Lengkap -->
            <div>
              <p class="text-xs font-medium text-[#64748b]">Nama Lengkap</p>
              <p class="mt-1 text-sm font-bold text-[#1e293b]">
                {{ currentUser?.name || '—' }}
              </p>
            </div>

            <!-- NIP -->
            <div>
              <p class="text-xs font-medium text-[#64748b]">NIP</p>
              <p class="mt-1 text-sm font-bold text-[#1e293b]">
                {{ userNip }}
              </p>
            </div>

            <!-- Departemen -->
            <div>
              <p class="text-xs font-medium text-[#64748b]">Departemen</p>
              <p class="mt-1 text-sm font-bold text-[#1e293b]">
                {{ currentUser?.department || '—' }}
              </p>
            </div>

            <!-- Jabatan -->
            <div>
              <p class="text-xs font-medium text-[#64748b]">Jabatan</p>
              <p class="mt-1 text-sm font-bold text-[#1e293b]">
                {{ userJabatan }}
              </p>
            </div>

            <!-- Email -->
            <div>
              <p class="text-xs font-medium text-[#64748b]">Email</p>
              <p class="mt-1 break-all text-sm font-bold text-[#1e293b]">
                {{ currentUser?.email || '—' }}
              </p>
            </div>

            <!-- Telepon -->
            <div>
              <p class="text-xs font-medium text-[#64748b]">Telepon</p>
              <p class="mt-1 text-sm font-bold text-[#1e293b]">
                {{ userPhone }}
              </p>
            </div>
          </div>
        </div>

        <!-- Tombol Edit Informasi -->
        <div class="mt-8 pt-2">
          <button
            type="button"
            @click="openEditModal"
            class="inline-flex items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-xs font-semibold text-[#1e293b] shadow-sm transition-colors hover:bg-slate-50 active:scale-[0.99]"
          >
            Edit Informasi
          </button>
        </div>
      </section>

      <!-- Kartu 2: Keamanan Akun -->
      <section class="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-7">
        <h2 class="text-base font-bold text-[#1e293b]">Keamanan Akun</h2>

        <form class="mt-6 space-y-4" @submit.prevent="handleChangePassword">
          <!-- Feedback Alert -->
          <div
            v-if="passwordFeedback"
            :class="[
              'rounded-lg p-3 text-xs leading-relaxed',
              passwordFeedback.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : '',
              passwordFeedback.type === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-800' : '',
              passwordFeedback.type === 'info' ? 'border border-amber-200 bg-amber-50 text-amber-800' : ''
            ]"
          >
            {{ passwordFeedback.message }}
          </div>

          <!-- Password Saat Ini -->
          <div>
            <label for="currentPassword" class="mb-1.5 block text-xs font-semibold text-[#334155]">
              Password Saat Ini
            </label>
            <input
              id="currentPassword"
              v-model="currentPassword"
              type="password"
              required
              placeholder="••••••••"
              class="h-10 w-full rounded-lg border border-[#cbd5e1] bg-[#fcfcfd] px-3.5 text-xs text-[#1e293b] placeholder:text-[#94a3b8] focus:border-[#2e6d73] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20"
            />
          </div>

          <!-- Password Baru -->
          <div>
            <label for="newPassword" class="mb-1.5 block text-xs font-semibold text-[#334155]">
              Password Baru
            </label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
              class="h-10 w-full rounded-lg border border-[#cbd5e1] bg-[#fcfcfd] px-3.5 text-xs text-[#1e293b] placeholder:text-[#94a3b8] focus:border-[#2e6d73] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20"
            />
          </div>

          <!-- Konfirmasi Password Baru -->
          <div>
            <label for="confirmNewPassword" class="mb-1.5 block text-xs font-semibold text-[#334155]">
              Konfirmasi Password Baru
            </label>
            <input
              id="confirmNewPassword"
              v-model="confirmNewPassword"
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
              class="h-10 w-full rounded-lg border border-[#cbd5e1] bg-[#fcfcfd] px-3.5 text-xs text-[#1e293b] placeholder:text-[#94a3b8] focus:border-[#2e6d73] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20"
            />
          </div>

          <!-- Tombol Ubah Password -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="isSubmittingPassword"
              class="inline-flex items-center justify-center rounded-lg bg-[#e5a035] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#d49027] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
            >
              <template v-if="isSubmittingPassword">
                <svg class="mr-1.5 h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Memproses...
              </template>
              <template v-else>
                Ubah Password
              </template>
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- Modal Dialog Edit Informasi -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 class="text-base font-bold text-[#1e293b]">Edit Informasi Profil</h3>
        <p class="mt-1 text-xs text-[#64748b]">
          Nama, email, dan departemen dikelola langsung oleh administrator perusahaan.
        </p>

        <div v-if="editFeedback" class="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
          {{ editFeedback }}
        </div>

        <div class="mt-4 space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-[#334155]">Nomor Telepon</label>
            <input
              v-model="editPhone"
              type="tel"
              placeholder="0812-xxxx-xxxx"
              class="h-9 w-full rounded-lg border border-[#cbd5e1] px-3 text-xs text-[#1e293b] focus:border-[#2e6d73] focus:outline-none focus:ring-2 focus:ring-[#2e6d73]/20"
            />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            @click="isEditModalOpen = false"
            class="rounded-lg border border-[#cbd5e1] px-3.5 py-1.5 text-xs font-semibold text-[#475569] hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            type="button"
            @click="saveEditInfo"
            class="rounded-lg bg-[#2e6d73] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#255b60]"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>