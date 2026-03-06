# Tier_Log

Tier_Log adalah aplikasi backend untuk sistem bimbingan skripsi dengan fitur transkripsi dan feedback cerdas. Aplikasi ini dibangun dengan Go (Golang), menggunakan framework Gin dan ORM GORM.

## 1. Struktur Folder & Manajemen File
Sistem memiliki arsitektur penyimpanan file untuk memastikan database efisien:
* `storage/audio/` - Rekaman bimbingan mahasiswa (`.mp3`).
* `storage/transcript/` - Transkrip teks hasil konversi (`.txt`).
* `storage/feedback/` - File feedback tambahan.

## 2. Desain Database & Model
Aplikasi memiliki 5 tabel utama: `users`, `lecturers`, `students`, `consultation_logs`, dan `feedback_items`. Relasi utama adalah One-to-Many antara log bimbingan dan item feedback.

## 3. Dokumentasi REST API

### A. Management User (Basic) - POST & GET
**Tambah User Baru**
* **URL:** `/users`
* **Method:** `POST`
* **Body (JSON):**
```json
{
    "email": "user@gmail.com",
    "password": "password123",
    "role": "student"
}
```

**Lihat Semua User**
* **URL:** `/users`
* **Method:** `GET`

---

### B. Consultation Log (Advanced) - POST & GET
**Tambah Log Konsultasi (Upload Audio)**
* **URL:** `/api/consultation`
* **Method:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parameters:**
  * `user_id` (Text): ID User mahasiswa
  * `audio` (File): File rekaman `.mp3`

**Lihat Semua Log & Feedback**
* **URL:** `/api/consultation`
* **Method:** `GET` (Menggunakan Preload untuk join data)

---

## 4. Cara Pengujian Menggunakan Postman

### Step-by-step Test Upload:
1. Buka Postman, set method ke **POST**.
2. Masukkan URL: `http://localhost:8080/api/consultation`.
3. Ke tab **Body** -> **form-data**.
4. Key: `user_id` (Value: `2`), Key: `audio` (Ubah tipe ke **File**, masukkan file mp3).
5. Klik **Send**.

### Screenshot Bukti Pengujian (Postman):
*(Silakan upload screenshot Postman Anda ke repositori ini dan update link di bawah)*
![Screenshot Postman Placeholder](https://github.com/cruzhgggggg-coder/Tier_Log/blob/main/screenshot_postman.png?raw=true)

---

## 5. File Database
Skema database lengkap beserta data contoh (Seed Data) tersedia di file: `struct_go.sql`.
