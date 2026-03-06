# Tier_Log

Tier_Log adalah aplikasi backend untuk sistem bimbingan skripsi dengan fitur transkripsi dan feedback cerdas. Aplikasi ini dibangun dengan Go (Golang), menggunakan framework backend Gin dan ORM GORM.

## 1. Struktur Folder & Manajemen File (Storage)
Sistem memiliki arsitektur penyimpanan file yang bersih untuk memastikan database tidak *bloat* oleh text panjang:
* `storage/audio/`     - Tempat menyimpan rekaman bimbingan mahasiswa (format `.mp3`).
* `storage/transcript/` - Tempat menyimpan transkrip teks hasil konversi audio (format `.txt`).
* `storage/feedback/`   - Tempat penyimpanan file feedback dari sistem atau dosen.

> **Aturan Penyimpanan:** Teks transkripsi sesi bimbingan yang dikonversi dari AI Speech tidak disimpan di database string. Sebagai gantinya, file `.txt` diletakkan terpisah di directory `storage/transcript/`. Model file `ConsultationLog` di database MySQL hanya akan menyimpan path `audio_filename` dan `transcript_filename`.

## 2. Desain Database & Model (GORM)
Aplikasi ini memiliki relasi One-to-Many antara `ConsultationLog` dan `FeedbackItem`.
- **`ConsultationLog`**: Menyimpan referensi konsultasi meliputi: `id`, `user_id`, `audio_filename` (string referensi ke file penyimpanan), dan `transcript_filename` (string referensi ke file terpisah). Ini juga mengandung slice relasional ke item feedback.
- **`FeedbackItem`**: Merepresentasikan daftar item evaluasi menggunakan enum `category` ('Minor', 'Major') dan `status` pengerjaan ('Fixed', 'Pending'). `log_id` adalah Foreign Key merujuk ke konsultasi.

## 3. Dokumentasi REST API (Gin Framework)

Sistem sudah mendukung basic CRUD untuk entitas konsultasi tanpa menjalankan transkripsi AI yang sebenarnya:

### A. Upload Consultation Log
API ini menerima upload audio dan membuat representasi file teks dummy transkrip sebelum menyimpannya ke database.

* **URL:** `/api/consultation`
* **Method:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parameters:**
  * `user_id` (integer) - ID user mahasiswa/dosen yang mengupload rekaman
  * `audio` (file) - File binary audio berformat dilarang selain `.mp3`.

#### Cara Pengujian Menggunakan Postman:
1. Buka aplikasi **Postman**, atur Request Method menjadi **POST**.
2. Masukkan URL: `http://localhost:8080/api/consultation`
3. Masuk ke tab **Body**, kemudian sentuh opsi **form-data**.
4. Tambah field parameter data berikut:
   - Key: `user_id`, Value: `1` (atau ID valid manapun)
5. Tambahkan field file uploader:
   - Key: arahkan mouse ke baris key ketik nama `audio`. Di ujung ada teks tulisan warna abu kecil "*Text*". Klik tulisan tersebut, lalu pilih menjadi **File**.
   - Value: Secara otomatis akan memberikan tombol *Select Files*. Pilih file dengan ekstensi `.mp3` dari rekap komputer anda.
6. Tekan tombol **Send**.
7. Response JSON semestinya memberikan format *201 Created* jika berhasil, lalu program Go akan mengekskusi *c.FormFile()*. File mp3 akan tersimpan di dalam folder `storage/audio/`, serta placeholder template transcript dihasilkan ke dalam `storage/transcript/`.

### B. Get All Consultation Logs
API ini memunculkan seluruh rekaman konsultasi beserta menyertakan list objek feedback item yang bersangkutan menggunakan `Preload` GORM untuk optimasi kueri.

* **URL:** `/api/consultation`
* **Method:** `GET`
* **Content-Type:** `application/json`

#### Cara Pengujian Menggunakan Postman:
1. Buka aplikasi **Postman**, atur Request Method menjadi **GET**.
2. Masukkan URL endpoints: `http://localhost:8080/api/consultation`
3. Tekan **Send**. Anda akan menerima balasan array log yang berisi relasi list array entitas di property struct `feedback_items` nya.

## Requirement Tech Stack
- **Gin Web Framework:** `github.com/gin-gonic/gin`
- **GORM:** `gorm.io/gorm`
- Penanganan File menggunakan library standar Golang: `os` & `path/filepath`.
- Skema database mentah dapat ditemukan di rekam file terpisah `struct_go.sql` yang sudah sinkron dengan versi model Golang.
