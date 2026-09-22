export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie<string | null>('auth_token')

  if (to.path === '/login' && token.value) {
    return navigateTo('/')
  }

  if (to.path !== '/login' && !token.value) {
    return navigateTo('/login')
  }
})
