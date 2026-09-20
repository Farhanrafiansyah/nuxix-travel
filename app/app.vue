<template>
  <div class="flex min-h-screen bg-[#fdfbf7]">
    <!-- 1. Sidebar -->
    <Sidebar />

    <!-- 2. Main Layout Kanan -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Navbar Atas -->
      <Navbar />

      <!-- Area Konten Utama -->
      <main class="p-8 flex-1">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>