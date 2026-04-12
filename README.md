# TierLog — Backend API

> AI-Enhanced E-Logbook for Thesis Supervision | Built with Go, Gin, GORM & MySQL

---

## 📋 Table of Contents
- [Project Description](#project-description)
- [Folder Structure](#folder-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
  - [POST /api/consultation](#post-apiconsultation)
  - [GET /api/consultation](#get-apiconsultation)
  - [POST /api/ai/assist](#post-apiaiassist)
- [Testing with Postman](#testing-with-postman)
- [Running the Server](#running-the-server)

---

## 📌 Project Description

TierLog is a backend API system for managing thesis supervision sessions between students and lecturers. It implements:
- **Audio Logbook**: Students upload consultation recordings (`.mp3`).
- **External File Storage**: Audio and transcript files are stored on disk, not in the database.
- **AI-Guarded Assistance**: An AI assistant that is strictly bound to only help students within the scope of verified lecturer feedback.
- **Minor/Major Feedback Classification**: Feedback items are tagged as `Minor` or `Major`, and tracked as `Pending` or `Fixed`.

---

## 📁 Folder Structure

```
Tier_Log/
│
├── controller/
│   ├── ai_controller.go          # Guarded AI assistance logic
│   ├── consultation_controller.go # POST/GET consultation endpoints
│   └── user_controller.go        # User, Lecturer, Student CRUD
│
├── koneksi/
│   └── koneksi.go                # MySQL database connection (GORM)
│
├── models/
│   └── models.go                 # GORM struct definitions
│
├── storage/                      # External file storage (NOT in DB)
│   ├── audio/                    # Uploaded .mp3 consultation recordings
│   └── transcript/               # Auto-generated .txt transcript placeholders
│
├── go.mod
├── go.sum
├── main.go                       # Entry point, route registration
└── README.md
```

> ⚠️ **Critical Design Rule**: The `storage/` directory holds physical files. The database only stores the **filename** (e.g., `1712900000_audio.mp3`), never the file content.

---

## 🗄️ Database Schema

| Table               | Key Fields                                                                                         |
|---------------------|----------------------------------------------------------------------------------------------------|
| `users`             | `id`, `email`, `password (hidden)`, `role ENUM('student','lecturer')`, timestamps                 |
| `lecturers`         | `id`, `user_id (FK)`, `nip`, `name`, `faculty`                                                    |
| `students`          | `id`, `user_id (FK)`, `lecturer_id (FK)`, `nim`, `name`, `prodi`, `thesis_title`                  |
| `consultation_logs` | `id`, `user_id (FK)`, `audio_filename`, `transcript_filename`, `created_at`                        |
| `feedback_items`    | `id`, `log_id (FK)`, `content`, `category ENUM('Minor','Major')`, `status ENUM('Fixed','Pending')`, `created_at` |

**Relationship**: `consultation_logs` → `feedback_items` is a **One-to-Many** relationship (`log_id` is the foreign key).

---

## 📡 API Documentation

### Base URL
```
http://localhost:8080
```

---

### POST /api/consultation

**Description**: Upload a consultation audio file. The server saves the `.mp3` to disk and creates a `.txt` transcript placeholder. Metadata (filenames only) is saved to the database.

| Property        | Value                          |
|-----------------|-------------------------------|
| **URL**         | `/api/consultation`           |
| **Method**      | `POST`                        |
| **Body Type**   | `multipart/form-data`         |

**Request Parameters (form-data):**

| Key       | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `user_id` | text   | ✅ Yes   | The ID of the student uploading      |
| `audio`   | file   | ✅ Yes   | The `.mp3` consultation recording    |

**Success Response (201 Created):**
```json
{
  "message": "Consultation log created successfully",
  "data": {
    "id": 1,
    "user_id": 3,
    "audio_filename": "1712900000_recording.mp3",
    "transcript_filename": "1712900000_transcript.txt",
    "created_at": "2026-04-12T05:30:00Z",
    "user": {},
    "feedback_items": null
  }
}
```

**Error Responses:**

| Status | Reason                          |
|--------|---------------------------------|
| `400`  | Missing `user_id` or audio file |
| `500`  | Failed to save file or DB error |

---

### GET /api/consultation

**Description**: Fetch all consultation logs. Uses GORM `.Preload("FeedbackItems")` to return each log together with all its associated Minor/Major feedback in a single response.

| Property      | Value                 |
|---------------|-----------------------|
| **URL**       | `/api/consultation`   |
| **Method**    | `GET`                 |
| **Body Type** | None                  |

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 3,
      "audio_filename": "1712900000_recording.mp3",
      "transcript_filename": "1712900000_transcript.txt",
      "created_at": "2026-04-12T05:30:00Z",
      "feedback_items": [
        {
          "id": 1,
          "log_id": 1,
          "content": "Perbaiki struktur bab 2, latar belakang masalah terlalu dangkal.",
          "category": "Major",
          "status": "Pending",
          "created_at": "2026-04-12T05:35:00Z"
        },
        {
          "id": 2,
          "log_id": 1,
          "content": "Perbaiki penulisan daftar pustaka sesuai format APA.",
          "category": "Minor",
          "status": "Fixed",
          "created_at": "2026-04-12T05:36:00Z"
        }
      ]
    }
  ]
}
```

---

### POST /api/ai/assist

**Description**: Ask the AI assistant a question. The AI is strictly bound to the verified feedback for the given log — it will **refuse** to answer questions outside of that scope.

| Property      | Value                 |
|---------------|-----------------------|
| **URL**       | `/api/ai/assist`      |
| **Method**    | `POST`                |
| **Body Type** | `application/json`    |

**Request Body (JSON):**
```json
{
  "log_id": 1,
  "query": "Bagaimana cara memperbaiki latar belakang masalah di bab 2?"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "ai_response": "[SYSTEM PROMPT]\nPeran Utama: ...\n\n[STUDENT QUERY]\nBagaimana cara memperbaiki..."
}
```

---

## 🧪 Testing with Postman

### How to Test `POST /api/consultation`

**Step 1**: Open Postman and create a new request.

**Step 2**: Set the method to **POST** and enter the URL:
```
http://localhost:8080/api/consultation
```

**Step 3**: Go to the **Body** tab and select **form-data**.

**Step 4**: Add the following keys:

| Key       | Type | Value                          |
|-----------|------|-------------------------------|
| `user_id` | Text | `1`                           |
| `audio`   | File | *(Select your .mp3 file)*    |

**Step 5**: Click **Send**.

**Step 6**: You should receive a `201 Created` response with the log metadata.

> 📸 **[INSERT SCREENSHOT HERE]** — Add a screenshot of the Postman request and the successful JSON response.

---

### How to Test `GET /api/consultation`

**Step 1**: Create a new request in Postman.

**Step 2**: Set the method to **GET** and enter the URL:
```
http://localhost:8080/api/consultation
```

**Step 3**: Click **Send**.

**Step 4**: You should receive a `200 OK` response containing all logs with their nested feedback items.

> 📸 **[INSERT SCREENSHOT HERE]** — Add a screenshot of the Postman GET response.

---

## 🚀 Running the Server

**Prerequisites:**
- Go 1.21+
- MySQL running locally (default: `root` / no password / database: `struct_go`)

**Start the server:**
```bash
go run .
```

The server will start at:
```
http://localhost:8080
```

**Storage directories** (`storage/audio` and `storage/transcript`) will be created automatically on first run.
