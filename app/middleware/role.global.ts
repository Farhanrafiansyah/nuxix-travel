export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/karyawan/')) return

  const authToken = useCookie<string | null>('auth_token')
  const currentUser = useCurrentUser()

  if (!authToken.value) {
    currentUser.value = null
    return navigateTo('/login')
  }

  if (!currentUser.value) {
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
        return navigateTo('/login')
      }

      throw createError({
        statusCode: statusCode || 503,
        statusMessage: 'Peran pengguna belum dapat diverifikasi.'
      })
    }
  }

  if (currentUser.value.role !== 'Karyawan') {
    return navigateTo('/dashboard')
  }
})
