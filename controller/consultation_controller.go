package controller

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"testing_go/koneksi"
	"testing_go/models"
	"testing_go/utils"

	"github.com/gin-gonic/gin"
)

// POST /api/consultation
func CreateConsultation(c *gin.Context) {
	userIDStr := c.PostForm("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	// Find the student profile for this user
	var student models.Student
	if err := koneksi.DB.Where("user_id = ?", userID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profil Mahasiswa tidak ditemukan untuk User ini"})
		return
	}

	audioFile, err := c.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Audio file is required"})
		return
	}

	timestamp := time.Now().UnixNano()
	
	// Save .mp3 directly to storage/audio/
	audioFilename := fmt.Sprintf("%d_%s", timestamp, audioFile.Filename)
	audioPath := filepath.Join("storage", "audio", audioFilename)
	if err := c.SaveUploadedFile(audioFile, audioPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save audio file"})
		return
	}

	// Handle paper upload (.docx)
	paperFile, err := c.FormFile("paper")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paper file (.docx) is required"})
		return
	}
	paperFilename := fmt.Sprintf("%d_%s", timestamp, paperFile.Filename)
	paperPath := filepath.Join("storage", "paper", paperFilename)
	if err := c.SaveUploadedFile(paperFile, paperPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save paper file"})
		return
	}

	// Create a .txt file in storage/transcript/ (Simulating Transcription)
	transcriptFilename := fmt.Sprintf("%d_transcript.txt", timestamp)
	transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)
	// Example transcript content - in a real app, this would come from a STT service
	transcriptContent := "Dosen: Judulnya sudah oke, tapi metodologinya kurang jelas. Tolong jelaskan lebih detail di Bab 3. Juga ada beberapa typo di daftar pustaka."
	if err := os.WriteFile(transcriptPath, []byte(transcriptContent), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transcript file"})
		return
	}

	// AI-GUARDED PERSONA WORKFLOW START
	
	// 1. Read Docx text
	paperText, err := utils.ReadDocxText(paperPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to extract text from docx: " + err.Error()})
		return
	}

	// 2. Process with Gemini
	feedbackItems, err := ProcessRevisionAssistance(transcriptContent, paperText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Processing failed: " + err.Error()})
		return
	}

	// 3. Save Log and Feedback Items
	log := models.ConsultationLog{
		StudentID:          student.ID,
		AudioFilename:      audioFilename,
		TranscriptFilename: transcriptFilename,
		TranscriptText:     transcriptContent,
		PaperFilename:      paperFilename,
		FeedbackItems:      feedbackItems,
	}

	if err := koneksi.DB.Create(&log).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Consultation log and AI feedback created successfully",
		"data":    log,
	})
}

// GET /api/consultation
func GetConsultations(c *gin.Context) {
	var logs []models.ConsultationLog
	// Preload both FeedbackItems and Student profile
	if err := koneksi.DB.Preload("FeedbackItems").Preload("Student").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// PUT /api/feedback/:id/validate
func ValidateFeedback(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feedback ID"})
		return
	}

	var feedback models.FeedbackItem
	if err := koneksi.DB.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	feedback.Status = "Fixed"
	if err := koneksi.DB.Save(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update feedback"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback validated successfully"})
}

// POST /api/consultation/:id/approve
func ApproveConsultation(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid consultation ID"})
		return
	}

	var log models.ConsultationLog
	if err := koneksi.DB.First(&log, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Consultation log not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Revision approved successfully"})
}
