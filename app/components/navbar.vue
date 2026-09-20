<template>
  <header class="flex h-14 items-center justify-between border-b border-[#e9e5dc] bg-[#fdfbf7] px-6">
    <!-- 1. Breadcrumb (Kiri) -->
    <div class="flex items-center gap-1.5 text-[10px] leading-none">
      <span class="font-medium text-[#a6a29a]">Karyawan</span>
      <span class="text-[#c9c4ba]">/</span>
      <span class="font-semibold text-[#272621]">Dashboard</span>
    </div>

    <!-- 2. Search Bar (Tengah) -->
    <div class="relative mx-6 w-full max-w-[300px]">
      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#a6a29a]">
        <!-- Search Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Cari ID, nama karyawan, atau tujuan..."
        class="w-full rounded-full border border-[#e8e3da] bg-white/70 py-1.5 pl-8 pr-3 text-[9px] text-[#4d4a43] shadow-none outline-none transition-all placeholder:text-[#aaa59c] focus:border-[#c9c2b7] focus:bg-white"
      />
    </div>

    <!-- 3. Action / Profil (Kanan) -->
    <div class="flex items-center gap-2">
      <!-- Dark/Light Mode Toggle -->
      <button class="rounded-full p-1.5 text-[#6d6a63] transition-colors hover:bg-[#f1eee8] hover:text-[#272621]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      <!-- Notification Bell with Badge -->
      <button class="relative rounded-full p-1.5 text-[#6d6a63] transition-colors hover:bg-[#f1eee8] hover:text-[#272621]">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-0.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <!-- Red Notification Badge -->
        <span class="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#c94c3f] px-0.5 text-[7px] font-bold text-white">
          3
        </span>
      </button>

      <!-- User Profile Avatar & Name -->
      <div class="flex items-center gap-2 border-l border-[#e5e0d7] pl-3">
        <div class="flex h-7 w-7 items-center justify-center rounded-full bg-[#d49a28] text-[9px] font-bold text-white">
          NH
        </div>
        <div class="flex flex-col text-left">
          <span class="text-[9px] font-semibold leading-tight text-[#272621]">Nazwa Hasibuan</span>
          <span class="text-[8px] leading-tight text-[#a6a29a]">Karyawan</span>
        </div>
      </div>
    </div>
  </header>
</template>