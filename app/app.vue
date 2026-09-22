<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <NuxtPage v-if="route.path === '/login'" />

  <div v-else class="flex min-h-screen bg-[#fdfbf7]">
    <Sidebar />

    <div class="flex min-h-screen flex-1 flex-col">
      <Navbar />

      <main class="flex-1 p-8">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>