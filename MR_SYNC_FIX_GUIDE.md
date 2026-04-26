# Patch MR Import + Sync Drive — v1.2

## Apa yang diperbaiki

Patch ini memperbaiki dua masalah utama:

1. **Import MR Excel tidak mengambil metadata lengkap**
   Sekarang parser mengambil `Delivery Address`, `Project Reference`, `MR Date Diajukan`, `Expected Date On Site`, `Department`, `Status`, dan `No. SPMK` dari template FORM PENGAJUAN MR.

2. **Sync Drive gagal `Unknown action: saveRows`**
   Apps Script sekarang mendukung action `saveRows`, sehingga tombol **Sync Drive** akan menyimpan data module ke Google Sheet di folder `MR BACKUP/sync`.

## File yang dipakai

- `POV_FINAL_COMPILED_MR_SYNC_FIXED.html` untuk versi website utama yang lebih ringan.
- `merged_project_overview_final_v11_MR_SYNC_FIXED.html` untuk versi merged/lengkap.
- `Code_MR_SYNC_FIXED.gs` untuk mengganti script Apps Script lama.

## Langkah update website GitHub

Upload salah satu HTML fixed sebagai `index.html` di repository GitHub Pages.

Rekomendasi: gunakan `POV_FINAL_COMPILED_MR_SYNC_FIXED.html`, rename menjadi `index.html`.

## Langkah update Apps Script

1. Buka project Apps Script yang sudah dibuat.
2. Replace semua isi `Code.gs` dengan isi `Code_MR_SYNC_FIXED.gs`.
3. Pastikan Script Property `API_TOKEN` tetap ada.
4. Deploy ulang sebagai Web App.
5. Jika URL berubah, update URL di modal **Koneksi Google Drive** pada website.

## Hasil sync

Saat klik **Sync Drive**, script akan membuat/mengupdate Google Sheet:

`MR BACKUP/sync/POV_SYNC_<nama_module>`

Contoh:

`MR BACKUP/sync/POV_SYNC_material_control_status`
