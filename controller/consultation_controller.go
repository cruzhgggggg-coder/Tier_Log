package controller

import (
	"fmt"
	"net/http"
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

	versionStr := c.DefaultPostForm("version_number", "1")
	version, _ := strconv.Atoi(versionStr)

	audioFile, _ := c.FormFile("audio")
	transcriptFile, _ := c.FormFile("transcript")
	paperFile, _ := c.FormFile("paper")

	timestamp := time.Now().UnixNano()
	var audioFilename, transcriptFilename, draftFilename string

	// Handle Audio
	if audioFile != nil {
		audioFilename = fmt.Sprintf("%d_%s", timestamp, audioFile.Filename)
		audioPath := filepath.Join("storage", "audio", audioFilename)
		if err := c.SaveUploadedFile(audioFile, audioPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save audio"})
			return
		}
	}

	// Handle Transcript
	if transcriptFile != nil {
		transcriptFilename = fmt.Sprintf("%d_%s", timestamp, transcriptFile.Filename)
		transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)
		if err := c.SaveUploadedFile(transcriptFile, transcriptPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transcript"})
			return
		}
	}

	// Handle Paper (Drafts)
	if paperFile != nil {
		draftFilename = fmt.Sprintf("%d_%s", timestamp, paperFile.Filename)
		paperPath := filepath.Join("storage", "paper", draftFilename)
		if err := c.SaveUploadedFile(paperFile, paperPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save paper"})
			return
		}
	}

	log := models.ConsultationLog{
		UserID:             userID,
		AudioFilename:      audioFilename,
		TranscriptFilename: transcriptFilename,
		DraftFilename:      draftFilename,
		VersionNumber:      version,
	}

	if err := koneksi.DB.Create(&log).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Consultation log created successfully", "data": log})
}

// GET /api/consultation
func GetConsultations(c *gin.Context) {
	var logs []models.ConsultationLog
	if err := koneksi.DB.Preload("FeedbackItems").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

// PATCH /api/feedback/:id/verify
func VerifyFeedback(c *gin.Context) {
	id := c.Param("id")
	if err := koneksi.DB.Model(&models.FeedbackItem{}).Where("id = ?", id).Update("is_verified", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify feedback"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Feedback verified successfully"})
}
