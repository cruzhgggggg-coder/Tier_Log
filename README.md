# 🛡️ TierLog — Intelligent Thesis Supervision System

> **AI-Powered E-Logbook & Revision Assistant**
>
> Built with high-performance Go (Gin), GORM, and Google Gemini.
> A secure, guided bridge between lecturer feedback and student execution.

---

## 📋 Table of Contents
- [✨ Core Features](#-core-features)
- [🏗️ System Architecture](#-system-architecture)
- [📂 Folder Structure](#-folder-structure)
- [🗄️ Database Schema](#-database-schema)
- [📡 API Reference](#-api-reference)
  - [Consultation Management](#consultation-management)
  - [Identity Management](#identity-management)
  - [AI Assistance](#ai-assistance)
- [🧪 Testing with Postman (Step-by-Step)](#-testing-with-postman-step-by-step)
- [🚀 Quick Start](#-quick-start)

---

## ✨ Core Features

- **Multi-Format Logbook**: Upload consultation recordings (`.mp3`) and thesis drafts (`.docx`, `.pdf`) in one session.
- **External File Storage**: High-speed disk-based storage for large files (Audio, Papers, Transcripts) with metadata separation.
- **AI-Guarded Assistant**: A custom-tuned Gemini assistant that *refuses* independent suggestions. It only acts upon official lecturer feedback injected from the database.
- **Feedback Lifecycle**: Track supervision points categorized by severity (`Major`/`Minor`) and status (`Pending`/`Fixed`).
- **SPA Integration**: Integrated React frontend serving directly from the Go binary.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Frontend: React] -->|REST API| B[Backend: Gin Gonic]
    B -->|GORM| C[(MySQL DB)]
    B -->|Save| D[storage/audio]
    B -->|Save| E[storage/paper]
    B -->|Generate| F[storage/transcript]
    B -->|Inject Context| G[Google Gemini AI]
    C -->|Feedback Items| G
    G -->|Guarded Response| B
```

---

## 📂 Folder Structure

```
Tier_Log/
├── controller/        # Business logic handlers
│   ├── ai_controller.go           # Gemini AI Integration & Guardrails
│   ├── consultation_controller.go # File upload & log management
│   └── user_controller.go         # Identity & User CRUD
├── models/            # Database entity definitions
│   └── models.go                  # GORM Structs & JSON mappings
├── storage/           # Physical file storage (Excluded from Git)
│   ├── audio/                     # .mp3 Consultation recordings
│   ├── paper/                     # .docx/.pdf Thesis drafts
│   └── transcript/                # .txt Placeholder transcripts
├── dist/              # Compiled Frontend (SPA)
├── main.go            # Entry point & Route registration
└── struct_go.sql      # Database initialization script
```

---

## 🗄️ Database Schema

| Table | Description |
| :--- | :--- |
| **`users`** | Authentication & RBAC (`student` or `lecturer`). |
| **`lecturers`** | Extended profile for faculty members. |
| **`students`** | Profile including thesis title and supervisor link. |
| **`consultation_logs`** | Core session links for audio, paper, and transcript files. |
| **`feedback_items`** | Atomic feedback points (Major/Minor) linked to a log. |

---

## 📡 API Reference

### Consultation Management

#### **POST** `/api/consultation`
Upload a new consultation session.
- **Body**: `multipart/form-data`
- **Fields**:
  - `user_id`: (Integer) Student ID
  - `audio`: (File) Recording (.mp3)
  - `paper`: (File, Optional) Thesis draft (.docx, etc.)

#### **GET** `/api/consultation`
Retrieve all consultation logs with nested feedback items.

---

### Identity Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/users` | Register a new system user. |
| **POST** | `/lecturers` | Create a lecturer profile. |
| **POST** | `/students` | Create a student profile & link to supervisor. |
| **GET** | `/students` | List all students with lecturer preloading. |

---

### AI Assistance

#### **POST** `/api/ai/assist`
Interact with the Guarded AI Assistant.
- **Body**: `application/json`
- **Parameters**:
  ```json
  {
    "log_id": 1,
    "query": "How do I fix the methodology based on the feedback?"
  }
  ```
- **Constraint**: Returns **403 Forbidden** if no lecturer feedback has been recorded for the log.

---

## 🧪 Testing with Postman (Step-by-Step)

### 1. Register a Lecturer
- **Method**: `POST`
- **URL**: `http://localhost:8080/users`
- **Body (JSON)**:
  ```json
  { "email": "lecturer@uni.ac.id", "password": "password123", "role": "lecturer" }
  ```

### 2. Create Consultation (Upload MP3 & Docx)
- **Method**: `POST`
- **URL**: `http://localhost:8080/api/consultation`
- **Body**: `form-data`
- **Keys**:
  - `user_id`: `2`
  - `audio`: [Select MP3 File]
  - `paper`: [Select DOCX File]
- **Verification**: Check `storage/audio` and `storage/paper` folders.

### 3. Ask AI (Revision Assistance)
- **Method**: `POST`
- **URL**: `http://localhost:8080/api/ai/assist`
- **Body (JSON)**:
  ```json
  { "log_id": 1, "query": "What are my next steps?" }
  ```
- **Expected Outcome**: Detailed response if feedback exists, or `guarded` message if empty.

---

## 🚀 Quick Start

1. **Clone & Install Dependencies**
   ```bash
   git clone <repository_url>
   cd Tier_Log
   go mod tidy
   ```

2. **Configure Database**
   - Import `struct_go.sql` into your MySQL server.
   - Update `koneksi/koneksi.go` credentials if needed.

3. **Set Environment Variables**
   ```bash
   export GEMINI_API_KEY="your_api_key_here"
   ```

4. **Run**
   ```bash
   go run main.go
   ```
   *The system handles folder creation and DB migration automatically.*

---

*TierLog — Bridging the gap between feedback and excellence.*
