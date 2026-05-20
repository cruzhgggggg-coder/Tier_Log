# TierLog Frontend Blueprint

## Overview
This document serves as the blueprint for the React Native Expo frontend of the TierLog Integrated System. It covers all implemented screens, mapped to the system's core Use Cases (UC01 - UC10), and details the endpoints integrated into the backend.

## Use Case Mapping

### 1. UC01: Registration and Login
- **Screens:** `LoginScreen.js`, `RegisterScreen.js`
- **Functionality:** 
  - Users can register as `student` or `lecturer` by providing NIM/NIP and Prodi/Faculty.
  - Users can login using email and password.
- **API Endpoints:**
  - `POST /register`: Combines `users` table and `students`/`lecturers` table creation.
  - `POST /login`: Authenticates users and retrieves profile.

### 2. UC02, UC03, UC08: Consultation Upload (Dokumen, Audio, Revisi)
- **Screen:** `UploadScreen.js`
- **Functionality:**
  - Students upload `.docx` (thesis bab) and `.mp3` (audio recording of consultation).
  - Handles the UI for uploading initial drafts or revised versions (Revisi - UC08).
- **API Endpoints:**
  - `POST /api/consultation`: Accepts multipart/form-data for document and audio files, generates transcript, calls AI API, and creates `feedback_items`.

### 3. UC04 & UC07: AI Feedback Processing & Viewer
- **Screens:** `StudentDashboard.js`, `FeedbackScreen.js`
- **Functionality:**
  - Students view their consultation history.
  - Clicking on a log opens `FeedbackScreen.js` to view AI-generated feedback categorized as Minor or Major.

### 4. UC06 & UC10: Validasi Feedback & Approve Revisi (Lecturer)
- **Screens:** `LecturerDashboard.js`, `ValidationScreen.js`
- **Functionality:**
  - Lecturers view consultation logs submitted by their students.
  - Lecturers read the AI transcript, validate AI feedback (marking them as valid/fixed) (UC06).
  - Lecturers can approve student revisions (UC10).
- **API Endpoints:**
  - `PUT /api/feedback/:id/validate`: Updates the status of an AI feedback item to "Fixed/Validated".
  - `POST /api/consultation/:id/approve`: Approves the revision on a consultation log.

## Future Development & Known Issues
1. **Network Connectivity (localhost):** If running on an Android Emulator, `http://localhost:8080/api` in `api.js` needs to be updated to `http://10.0.2.2:8080/api` or your machine's LAN IP address. 
2. **Icons on Web:** Ensure `react-native-vector-icons` is properly configured if you want the `react-native-paper` icons to display correctly when running `npm run web`.
3. **Database Constraints:** Currently, the `Register` endpoint assigns a default `LecturerID = 4` for student registrations to bypass foreign key constraints. In a production setting, this should be selected via a dropdown.

## How to Run
```bash
cd tierlog-mobile
npm install
npm run web
# Atau untuk Android
npm run android
```
