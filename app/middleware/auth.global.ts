export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie<string | null>('auth_token')

  if (to.path !== '/login' && to.path !== '/register' && !token.value) {
    return navigateTo('/login')
  }
})
