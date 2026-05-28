# 🧠 TierLog: AI Gateway Blueprint & Knowledge Base

File ini adalah referensi utama untuk seluruh arsitektur, logika, dan pedoman desain proyek **TierLog AI Gateway**. Digunakan untuk menjaga konsistensi sistem dan mencegah deviasi logika pada pengembangan di masa depan.

---

## 1. 📂 Overview Sistem
**TierLog** adalah platform asisten revisi skripsi berbasis AI yang mengadopsi model **Hybrid AI Gateway**. Sistem ini memungkinkan pengguna menggunakan model AI bawaan atau menghubungkan kunci API pribadi mereka sendiri (Plug-and-Play).

### Core Philosophy:
- **Neural Interface**: Antarmuka minimalis, gelap, dan futuristik.
- **Privacy First**: API Key disimpan secara terenkripsi (atau diatur di level user).
- **Hybrid Feedback**: Menggabungkan analisis transkrip konsultasi dengan analisis file draf skripsi.

---

## 2. 🏗️ Arsitektur Teknik
TierLog menggunakan arsitektur **Bridge-Proxy**:

- **Backend AI (Go/Gin)**: 
  - Bertanggung jawab atas pemrosesan berat AI, parsing file, dan manajemen prompt.
  - Port Default: `8080`.
  - Berinteraksi langsung dengan Provider (OpenAI, Gemini, Anthropic, NVIDIA NIM).
- **Frontend & Auth (Laravel/Inertia/Vue 3)**:
  - Mengelola autentikasi user, penyimpanan data persisten (MySQL), dan UI.
  - Bertindak sebagai proxy yang meneruskan permintaan chat ke Go Backend.

---

## 3. 🤖 AI Gateway Logic
Fitur paling kritikal yang membedakan TierLog dari aplikasi chat biasa.

### Mekanisme Pemilihan Model:
1. **Master Mind (Default)**: Menggunakan model sistem yang diatur di `.env` (biasanya NVIDIA NIM Llama 3.1 atau Groq).
2. **User Overrides**: Jika user memasukkan API Key di Settings, mereka bisa memilih model spesifik (GPT-4o, Claude 3.5, Gemini 1.5 Pro).
3. **Dynamic Model Discovery**: 
   - Sistem tidak lagi bergantung pada daftar model statis (hard-coded).
   - Backend (Go) menyediakan endpoint `/api/ai/models` untuk mengambil daftar model terbaru secara langsung dari provider (terutama NVIDIA NIM).
4. **Parameter Passing**:
   - Frontend mengirim parameter `model` ke Laravel.
   - Laravel meneruskan header/body ke Go.
   - Go mengecek: "Apakah ada API Key user?" → Jika ya, gunakan key user + model terpilih. Jika tidak, fallback ke sistem.

---

## 4. 🔑 Sistem Aktivasi (Redeem Code)
Fitur AI Gateway dikunci di balik sistem **Redeem Code** untuk kontrol akses atau monetisasi.

- **Tabel `redeem_codes`**: Menyimpan kode unik.
- **Workflow**: 
  - User memasukkan kode → `is_gateway_active` pada tabel `users` menjadi `true`.
  - Tab "AI Gateway" di Settings terbuka.
  - User dapat memasukkan API Key pribadi.

---

## 5. 🗄️ Blueprint Database (GORM Models)
Struktur data utama yang digunakan dalam Go:

| Tabel | Deskripsi |
| :--- | :--- |
| `users` | Auth, Role (Student/Lecturer), API Keys, `is_gateway_active`. |
| `students` | Profile mahasiswa, judul skripsi, link ke dosen pembimbing. |
| `lecturers` | Profile dosen, NIP, fakultas. |
| `consultation_logs` | Metadata sesi: transkrip text, nama file audio, nama file draf. |
| `feedback_items` | Poin revisi dari AI: Kategori (Major/Minor), Status (Pending/Fixed/Validated). |
| `redeem_codes` | Kode aktivasi gateway. |

---

## 6. 🎨 Design System (Neural Aesthetics)
Aturan visual untuk menjaga tampilan tetap premium dan modern:

- **Warna Utama**: 
  - Background: Dark Slate/Zinc (`#020617`).
  - Accent: Indigo-500 (`#6366f1`) & Purple-500.
  - Border: White/10 (Subtle glassmorphism).
- **Typography**: Inter / Sans Serif dengan tracking tight.
- **Komponen**:
  - `Card`: Border-radius besar (`rounded-3xl`), border tipis, backdrop-blur.
  - `Badge`: Huruf kapital, tracking wide, font-black, size extra small.
  - `Animations`: Gunakan `animate-in` dengan durasi `0.7s` dan `cubic-bezier`.

---

## 7. 🛠️ Pengetahuan & Skill Khusus (Assistant Rules)

### Skill Coding:
- **Go**: Gunakan GORM untuk DB, Gin untuk router. Pisahkan logic di `controller`.
- **Laravel**: Gunakan `Http` client untuk komunikasi ke Go. Jangan duplikasi logic AI di Laravel.
- **Vue**: Gunakan script setup (`<script setup>`) dan Tailwind CSS v3/v4.

### Pengetahuan Penting (Anti-Halu):
1. **API Key Priority**: Selalu cek kunci user di tabel `users` sebelum fallback ke `.env`.
2. **JSON Parsing**: AI sering mengirim Markdown. Go harus memiliki fungsi `CleanJSON` untuk membersihkan backticks sebelum parsing.
3. **CORS**: Pastikan Laravel diizinkan mengakses Go (biasanya via Proxy di Laravel).
4. **Dynamic Model Fetching**: Selalu gunakan endpoint `/api/ai/models` di backend untuk mengisi dropdown model di frontend agar mendukung model-model baru secara otomatis tanpa update kode.
5. **NVIDIA NIM Fallback**: Beberapa model NVIDIA (seperti Bytedance Seed OSS) tidak mendukung `json_object` mode. Backend harus memiliki mekanisme *retry* tanpa parameter JSON jika request pertama gagal dengan error format.
6. **Port Management**: 
   - Laravel: `8000`
   - Go: `8080`
   - Vite: `5173`

---

## 8. 🚨 Troubleshooting Common Issues
- **Error 403 Forbidden di Chat**: Gateway belum aktif atau API Key tidak valid.
- **Error 500 saat Upload**: Biasanya folder `storage/paper` atau `storage/audio` belum ada atau permission denied.
- **Error 404/500 pada Model Tertentu (NVIDIA)**: Pastikan model ID menggunakan format kanonikal (contoh: `bytedance/seed-oss-36b-instruct`). Jika gagal, sistem akan mencoba memproses tanpa format JSON ketat.
- **Model Inconsistency**: Pastikan `PreferredModel` di database sesuai dengan string yang dikenali oleh Provider (contoh: `gpt-4o` bukan `GPT 4`).

---

**Last Updated**: 2026-05-13
**Status**: Active Development
**Lead Assistant**: Antigravity AI
