# 🧪 TierLog — Panduan Pengujian & Demo Kredensial

Selamat datang di Panduan Pengujian Sistem Bimbingan Skripsi Cerdas **TierLog**. Dokumen ini dirancang untuk memudahkan Anda (dan Dosen Penguji) untuk mendemokan serta menguji seluruh fitur sistem bimbingan, termasuk fitur komunikasi real-time **Laravel Reverb (WebSockets)** dan **AI Oracle Assistant** yang baru saja diintegrasikan.

---

## 👥 1. Akun Pengguna Demo & Kredensial

Untuk keperluan demonstrasi, database telah dilengkapi dengan dua akun utama (Dosen Pembimbing dan Mahasiswa Bimbingan).

### 📋 Tabel Kredensial Demo

| Peran (Role) | Nama Lengkap | Email / Username | Password | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Lecturer (Dosen)** | **Dr. Arsitek Go, M.Kom** | `dosen1@university.ac.id` | **`password`** | Dosen Pembimbing Utama (NIP: `198001012005011001`) |
| **Student (Mahasiswa)** | **Budi Mahasiswa** | `mhs1@university.ac.id` | **`password`** | Mahasiswa Bimbingan (NIM: `2200010001`) |

> [!IMPORTANT]
> **Catatan Sinkronisasi Password Baru (Jika Password Masih Kosong di SQL Dump)**:
> Jika Anda baru saja mengimpor file `struct_go.sql` dan mendapati kolom `password` pada akun di atas kosong, jalankan perintah **Artisan Tinker** berikut di terminal direktori `tierlog_v2` untuk menyetel password mereka menjadi **`password`**:
> ```bash
> php artisan tinker --execute="App\Models\User::whereIn('id', [5, 6])->update(['password' => Hash::make('password')])"
> ```
> *Alternatif*: Anda juga dapat membuat akun baru secara instan melalui tombol **Register** yang ada di halaman utama aplikasi.

---

## 🚀 2. Cara Menjalankan Semua Server (Langkah Demi Langkah)

TierLog menggunakan arsitektur modern yang memisahkan **Go Backend** (untuk pengolahan dokumen, parser, GORM) dengan **Laravel Backend** (untuk autentikasi, dashboard Vue/Inertia, dan WebSockets).

Pastikan Anda menjalankan seluruh komponen berikut di terminal terpisah:

### 📥 Langkah A: Pastikan Database MySQL Menyala
Pastikan database MySQL Anda menyala (port default `3306`) dan database `struct_go` telah diimpor dengan file `struct_go.sql`.

### 🟢 Langkah B: Jalankan Go Backend (Port `8080`)
1. Buka terminal baru di root folder `Tier_Log`.
2. Jalankan aplikasi Go:
   ```bash
   go run main.go
   ```
   *Output yang diharapkan:* `Koneksi database berhasil!` & `Server berjalan pada port :8080`.

### 🔴 Langkah C: Jalankan Laravel Web Server (Port `8000`)
1. Buka terminal baru di folder `tierlog_v2`.
2. Jalankan server Laravel:
   ```bash
   php artisan serve
   ```
   *Output yang diharapkan:* `Server running on [http://127.0.0.1:8000]`.

### ⚡ Langkah D: Jalankan Laravel Reverb WebSocket Server (Port `8080` WS)
1. Buka terminal baru di folder `tierlog_v2`.
2. Jalankan server WebSocket Reverb:
   ```bash
   php artisan reverb:start
   ```
   *Output yang diharapkan:* `Starting server on 0.0.0.0:8080`.

### 🔵 Langkah E: Jalankan Vite Asset Compiler (Port `5173`)
1. Buka terminal baru di folder `tierlog_v2`.
2. Jalankan Vite compiler untuk menyajikan frontend Vue:
   ```bash
   npm run dev
   ```

---

## 🧪 3. Skenario Pengujian Fitur secara Lengkap

Berikut adalah checklist pengujian terstruktur untuk memastikan semua fitur berjalan sempurna dari sisi Mahasiswa maupun Dosen.

### 📁 Fitur A: Multi-Format Logbook & Analisis Dokumen (GORM + Go Backend)
*Tujuan: Menguji kemampuan mahasiswa dalam mengunggah rekaman suara bimbingan (`.mp3`) dan draf skripsi (`.docx`).*

1. **Login sebagai Mahasiswa**:
   * Buka browser dan akses `http://localhost:8000/login`.
   * Masuk menggunakan akun Mahasiswa: `mhs1@university.ac.id` / `password`.
2. **Unggah Sesi Bimbingan Baru**:
   * Masuk ke menu **Consultation Workspace**.
   * Klik tombol **Add Consultation Log / Upload New Consultation**.
   * Unggah file audio rekaman bimbingan (`.mp3`) dan file draft skripsi (`.docx`).
   * Klik **Submit**.
3. **Hasil yang Diharapkan**:
   * Dokumen `.docx` akan dikirim ke Go Backend untuk diekstrak teksnya.
   * AI akan menganalisis konten bimbingan, menyusun transkrip bimbingan secara otomatis, dan membagi poin revisi menjadi kategori **Major** & **Minor** dalam status **Pending**.

---

### 🤖 Fitur B: Guarded AI Oracle Assistant
*Tujuan: Menguji asisten AI pintar yang tidak akan memberi jawaban ngawur (halusinasi) selain berdasarkan arahan bimbingan resmi dari dosen.*

1. **Gunakan Menu Tanya Oracle**:
   * Pada ruang konsultasi Mahasiswa, cari kolom input chat di bagian kanan bawah bertuliskan **“Communicate with Oracle...”**.
2. **Kirim Pertanyaan Terkait Revisi**:
   * Ketik: *"Bagaimana cara saya memperbaiki bagian metodologi sesuai instruksi dosen?"*
   * Tekan **Enter**.
3. **Hasil yang Diharapkan**:
   * AI Oracle akan memberikan saran implementasi yang konkret untuk membimbing mahasiswa menyelesaikan revisi tersebut.
4. **Uji Mekanisme Guarded (Anti-Halu)**:
   * Ketik pertanyaan di luar revisi, contoh: *"Buatkan saya kode pemrograman Python untuk membuat game ular"* atau *"Siapa presiden pertama Indonesia?"*
   * **Hasil yang Diharapkan**: AI akan memblokir dan memberikan respons guarded: *"Maaf, saya hanya dapat membantu Anda menjawab pertanyaan yang berkaitan dengan poin revisi resmi dari dosen pembimbing Anda."*

---

### 🔧 Fitur C: Real-Time Feedback Status Syncing (WebSockets)
*Tujuan: Menguji sinkronisasi perubahan status revisi secara langsung (instant) tanpa reload halaman.*

> [!TIP]
> **Cara Pengujian Terbaik**: Gunakan dua browser berbeda (misalnya Chrome biasa untuk Mahasiswa dan Microsoft Edge / Chrome Incognito untuk Dosen) secara bersebelahan (*split-screen*).

```
+------------------------------------+------------------------------------+
|                                    |                                    |
|       BROWSER A (MAHASISWA)        |         BROWSER B (DOSEN)          |
|    mhs1@university.ac.id           |    dosen1@university.ac.id         |
|                                    |                                    |
+------------------------------------+------------------------------------+
```

1. **Buka Dua Browser Bersebelahan**:
   * **Browser A (Kiri)**: Login sebagai Mahasiswa (`mhs1@university.ac.id`). Masuk ke halaman **Consultation Workspace** dan pilih salah satu log konsultasi aktif.
   * **Browser B (Kanan)**: Login sebagai Dosen (`dosen1@university.ac.id`). Pilih log konsultasi mahasiswa Budi di **Activity Stream**.
2. **Mahasiswa Menandai Revisi sebagai Selesai**:
   * Di **Browser A (Mahasiswa)**, arahkan kursor ke kartu revisi berstatus `Pending`.
   * Klik tombol **Mark as Fixed (ikon centang 🔧)**.
   * **Hasil Instan (Tanpa Reload)**:
     * **Mahasiswa**: Badge revisi langsung berubah warna menjadi kuning **`Fixed`**.
     * **Dosen**: Muncul notifikasi toast melayang di pojok kanan bawah: *“Budi Mahasiswa telah menandai revisi [Nama Revisi] sebagai 'Fixed'!”*.
     * **Dosen**: Status revisi pada layar dosen otomatis ikut berubah menjadi kuning **`Fixed`**.
     * **Dosen**: Angka counter pada kartu "Validation Queue" langsung bertambah 1 secara dinamis!
3. **Dosen Memvalidasi Revisi**:
   * Di **Browser B (Dosen)**, cari revisi berstatus `Fixed` tersebut.
   * Klik tombol **Approve Revision (ikon centang hijau ✅)**.
   * **Hasil Instan (Tanpa Reload)**:
     * **Dosen**: Badge revisi berubah menjadi hijau **`Validated`** dan angka antrean validasi berkurang.
     * **Mahasiswa**: Muncul notifikasi toast melayang di layar mahasiswa: *“Dosen pembimbing Anda telah memvalidasi revisi [Nama Revisi]!”*.
     * **Mahasiswa**: Badge revisi di layar mahasiswa langsung otomatis berubah menjadi hijau **`Validated`**.

---

### 👁️ Fitur D: Live AI Chat Monitoring Oversight (WebSockets)
*Tujuan: Menguji kemampuan Dosen untuk memantau obrolan antara Mahasiswa dengan AI Oracle secara real-time demi transparansi akademik.*

1. **Buka Workspace Secara Bersamaan**:
   * **Browser A (Mahasiswa)** berada di kolom konsultasi dan bersiap mengirim chat ke Oracle.
   * **Browser B (Dosen)** melihat detail konsultasi mahasiswa Budi. Perhatikan bagian kanan atas dashboard dosen pada kolom **Live AI Chat Oversight** bertuliskan: *"Standing by. Student messages to the AI Oracle will stream here in real time..."*
2. **Mahasiswa Mengirim Obrolan ke AI**:
   * Di **Browser A (Mahasiswa)**, ketik pertanyaan ke AI Oracle: *"Saya bingung tentang batasan masalah di Bab 1, apa yang harus saya lakukan?"* lalu kirim.
3. **Hasil Instan (Tanpa Reload)**:
   * Di **Browser B (Dosen)**, pada kolom **Live AI Chat Oversight** akan langsung muncul pesan bubble baru berlabel **Student** berisi pesan yang diketik mahasiswa di atas secara real-time disertai animasi ketik halus (*smooth fade-in*).
   * Begitu AI Oracle selesai merespons di layar mahasiswa, pesan balasan dari **Oracle AI** juga akan langsung muncul secara dinamis di layar Dosen.

---

## 🛠️ 4. Panduan Pemecahan Masalah (Troubleshooting)

| Masalah | Penyebab | Solusi |
| :--- | :--- | :--- |
| **Gagal login akun demo** | Password di database tidak sinkron / kosong. | Jalankan perintah `php artisan tinker` di atas untuk melakukan enkripsi ulang password. |
| **Real-time websocket tidak berfungsi** | Server Laravel Reverb belum dinyalakan atau port bentrok. | Pastikan `php artisan reverb:start` telah dijalankan di terminal dan berjalan di port `8080`. |
| **Error 403 / 500 saat chat dengan Oracle** | Kunci API Gemini belum disetel di file `.env`. | Buka file `.env` di folder `tierlog_v2` dan pastikan `GEMINI_API_KEY` telah berisi API key yang valid. |
| **File bimbingan tidak tersimpan** | Folder penyimpanan belum terbentuk atau dibatasi permission. | Pastikan direktori `storage/app/public` dan folder terkait memiliki hak akses read/write penuh. |

---

*TierLog — Menghubungkan bimbingan, revisi, dan keunggulan akademik secara instan.*
