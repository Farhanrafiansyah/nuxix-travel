<template>

    <section class="dashboard-page space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="mt-1 text-2xl font-bold leading-tight text-[#20233e]">Pengajuan Uang Muka</h1>
        <p class="text-xs font-medium text-[#777b87]">Ajukan dan pantau uang muka perjalanan dinas Anda.</p>
      </div>
      <button type="button" class="inline-flex h-10 items-center gap-2 rounded-md bg-[#f6a623] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#e99514]">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Ajukan Uang Muka
      </button>
    </div>

    <section class="overflow-hidden rounded-lg border border-[#eadfce] bg-white" aria-labelledby="advance-history-heading">
      <h2 id="advance-history-heading" class="border-b border-[#eee7dc] px-4 py-3 font-medium text-sm font-bold text-[#20233e]">
        Riwayat Pengajuan Uang Muka
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left text-[10px]">
          <thead class="bg-[#faf9f6] text-[9px] font-semibold text-[#77736a]">
            <tr>
              <th scope="col" class="px-4 py-2.5 font-semibold">ID</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Perjalanan</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Estimasi Biaya</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Jumlah Diminta</th>
              <th scope="col" class="px-4 py-2.5 font-semibold">Status</th>
              <th scope="col" class="px-4 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="6" class="px-4 py-10 text-center text-xs text-[#8b877f]">
                Belum ada data pengajuan uang muka.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee7dc] px-4 py-2.5 text-[10px] text-[#77736a]">
        <span>Menampilkan 0 dari 0 pengajuan</span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            disabled
            class="h-7 rounded-md border border-[#e8e1d6] px-2.5 text-[9px] text-[#a6a29a] disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          <button
            type="button"
            disabled
            class="h-7 rounded-md border border-[#e8e1d6] px-2.5 text-[9px] text-[#a6a29a] disabled:cursor-not-allowed"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </section>
  </section>
</template>
