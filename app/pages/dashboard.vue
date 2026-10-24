<script setup lang="ts">
const authToken = useCookie<string | null>('auth_token')
const currentUser = useCurrentUser()
const loadError = ref('')

const dashboardPaths: Record<string, string> = {
  Karyawan: '/karyawan/dashboard-karyawan',
  Atasan: '/atasan-approver/dashboard-atasan',
  'Tim Keuangan': '/tim-keuangan/dashboard-keuangan',
  'Admin Travel': '/admin-travel/dashboard-travel',
  'Super Admin': '/super-admin/dashboard-admin'
}

if (!authToken.value) {
  await navigateTo('/login', { replace: true })
} else {
  try {
    if (!currentUser.value) {
      currentUser.value = await $fetch('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken.value}` }
      })
    }

    const destination = dashboardPaths[currentUser.value.role]
    if (destination) {
      await navigateTo(destination, { replace: true })
    }
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401 || statusCode === 404) {
      authToken.value = null
      currentUser.value = null
      await navigateTo('/login', { replace: true })
    } else {
      console.error('Gagal menentukan dashboard pengguna.', error)
      loadError.value = 'Dashboard belum dapat dibuka. Coba muat ulang halaman.'
    }
  }
}
</script>

<template>
  <section class="rounded-xl border border-[#dfe8dc] bg-white p-6 text-sm text-[#718078]">
    <p v-if="loadError" role="alert">{{ loadError }}</p>
    <p v-else>Dashboard untuk role {{ currentUser?.role || 'akun ini' }} belum tersedia.</p>
  </section>
</template>
