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

	// Create a .txt file in storage/transcript/ as a placeholder
	transcriptFilename := fmt.Sprintf("%d_transcript.txt", timestamp)
	transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)
	placeholderContent := []byte(fmt.Sprintf("Transcript placeholder for audio: %s\nGenerated at: %s", audioFilename, time.Now().Format(time.RFC3339)))
	if err := os.WriteFile(transcriptPath, placeholderContent, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transcript placeholder"})
		return
	}

	// Save metadata to consultation_logs
	log := models.ConsultationLog{
		UserID:             userID,
		AudioFilename:      audioFilename,
		TranscriptFilename: transcriptFilename,
	}

	if err := koneksi.DB.Create(&log).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Consultation log created successfully",
		"data":    log,
	})
}

// GET /api/consultation
func GetConsultations(c *gin.Context) {
	var logs []models.ConsultationLog
	// Fetch logs using GORM's .Preload("FeedbackItems")
	if err := koneksi.DB.Preload("FeedbackItems").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}
