# TierLog Frontend Blueprint (React Native Expo)

## 1. Arsitektur & Teknologi Utama
Aplikasi frontend ini dibangun menggunakan teknologi berikut:
- **Framework:** React Native dengan **Expo** (memudahkan testing di HP maupun emulator).
- **Navigation:** `@react-navigation/native` & `@react-navigation/native-stack` (untuk perpindahan antar layar).
- **UI Library:** `react-native-paper` (Material Design untuk React Native agar UI bersih, rapi, dan cepat dibangun).
- **HTTP Client:** `axios` (untuk berkomunikasi dengan backend Go).
- **File Picker:** `expo-document-picker` (untuk upload Dokumen Skripsi dan Audio bimbingan).

## 2. Struktur Folder & Kode
Struktur folder utama berada di dalam folder `tierlog-mobile/`:

```
tierlog-mobile/
├── App.js                     # Entry point dan setup React Navigation
├── src/
│   ├── api/
│   │   └── api.js             # Konfigurasi Axios dan semua fungsi pemanggilan API ke backend (localhost:8080)
│   ├── navigation/            # (Opsional) Jika navigasi membesar, pisahkan router di sini
│   ├── components/            # Komponen UI modular (misal: Card khusus, Loading, Header)
│   └── screens/               # Halaman utama aplikasi
│       ├── Auth/
│       │   └── LoginScreen.js # Layar Login (UC01)
│       ├── Student/
│       │   ├── StudentDashboard.js   # Menampilkan daftar log bimbingan
│       │   ├── UploadScreen.js       # (Belum full) UC02 & UC03 & UC08: Layar untuk upload Skripsi/Audio
│       │   └── FeedbackScreen.js     # (Belum full) UC07: Layar melihat feedback HOC/LOC
│       └── Lecturer/
│           ├── LecturerDashboard.js  # Menampilkan seluruh data bimbingan mahasiswa
│           └── ValidationScreen.js   # (Belum full) UC06 & UC10: Validasi feedback & Approve revisi
```

## 3. Alur Pengembangan yang Belum Selesai (Bugs / TODOs)
Berikut adalah bagian-bagian yang harus dilanjutkan pada pengembangan berikutnya sesuai dengan Use Case diagram:

### A. Endpoint Backend yang Harus Disiapkan
Saat ini, Go Backend (`controller/`) memiliki `POST /consultation` dan `POST /ai/assist`, serta fitur `users`, namun belum memiliki fitur spesifik untuk:
1. **Validasi Feedback (UC06):** Butuh endpoint `PUT /api/feedback/:id/validate` untuk Dosen mengubah status dari *Pending* menjadi *Fixed*.
2. **Approve Revisi (UC10):** Butuh endpoint `POST /api/consultation/:id/approve` untuk menandai bahwa revisi diterima.
3. **Upload Revisi (UC08):** Perlu kepastian di backend apakah Upload Revisi akan memperbarui baris `consultation_logs` yang sama atau membuat `log_id` baru yang ter-link.
4. **Login:** Endpoint `/login` sementara telah saya tambahkan secara langsung ke file `user_controller.go` (Cukup simpel mencocokkan email dan password biasa, perlu di-upgrade menjadi JWT jika akan ke produksi).

### B. Penyelesaian Layar Frontend (Frontend Screens)
- **UploadScreen.js:** Tambahkan logika menggunakan `expo-document-picker` untuk memilih file `.pdf` atau `.docx` (Skripsi) dan `.mp3` / `.wav` (Audio Bimbingan). Lalu gunakan `FormData` untuk dikirim via Axios ke `/api/consultation`.
- **FeedbackScreen.js:** Layar ini harus memanggil `feedback_items` yang berelasi dengan `log_id` tertentu dan menampilkan kategori (Minor/Major) dan Status (Fixed/Pending).
- **ValidationScreen.js (Dosen):** Dosen harus dapat melihat hasil transkrip AI, membaca hasil Skripsi (bisa didownload atau dipreview), lalu menekan tombol "Validasi Feedback" dan "Approve Revisi".

## 4. Cara Menjalankan Project
Pastikan Anda sudah memiliki Node.js terinstall.

1. Jalankan Go Backend (di folder root `Tier_Log-1.3`):
   ```bash
   go run main.go
   ```
2. Jalankan Expo Frontend (di folder `tierlog-mobile`):
   ```bash
   cd tierlog-mobile
   npm start
   ```
3. Unduh aplikasi **Expo Go** di Android / iOS, lalu scan QR Code yang muncul di terminal Anda.

## 5. Mockup / Catatan Integrasi UC09 (Cek Konsistensi)
Use Case **UC09: Cek Konsistensi Versi** dilakukan oleh *AI System* dan digunakan ketika Mahasiswa melakukan UC08 (Upload Revisi). 
Pada aplikasi frontend, hal ini bisa ditampilkan sebagai indikator di log revisi (misal: "AI Consistency Check: Passed" atau "Changes Detected: 80% Match").
Ini membutuhkan logic pada Go backend untuk membandingkan `paper_filename` versi 1 dengan `paper_filename` versi 2 menggunakan LLM/Gemini. Frontend hanya tinggal bertugas menampilkan hasil API responnya.
