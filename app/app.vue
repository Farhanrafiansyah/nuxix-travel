<script setup lang="ts">
const route = useRoute()
const currentUser = useCurrentUser()
const authToken = useCookie<string | null>('auth_token')

onMounted(async () => {
  if (!authToken.value) {
    currentUser.value = null
    return
  }

  try {
    currentUser.value = await $fetch('http://localhost:8000/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken.value}` }
    })
  } catch (error) {
    const fetchError = error as { status?: number; statusCode?: number }
    const statusCode = fetchError.statusCode ?? fetchError.status

    if (statusCode === 401 || statusCode === 404) {
      authToken.value = null
      currentUser.value = null
      await navigateTo('/login')
    }
  }
})
</script>

<template>
  <NuxtPage v-if="route.path === '/login' || route.path === '/register'" />

  <div v-else class="flex min-h-screen bg-[#fdfbf7]">
    <Sidebar />

    <div class="ml-[190px] flex min-h-screen min-w-0 flex-1 flex-col">
      <Navbar />

      <main class="flex-1 px-5 pb-5 pt-[76px] xl:px-6 xl:pb-6">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>