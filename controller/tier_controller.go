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

func GetUsers(c *gin.Context) {
	var users []models.User
	if err := koneksi.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func GetLecturers(c *gin.Context) {
	var lecturers []models.Lecturer
	if err := koneksi.DB.Preload("User").Find(&lecturers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": lecturers})
}

func GetStudents(c *gin.Context) {
	var students []models.Student
	if err := koneksi.DB.Preload("User").Preload("Lecturer").Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": students})
}

func GetConsultationLogs(c *gin.Context) {
	var logs []models.ConsultationLog
	if err := koneksi.DB.Preload("FeedbackItems").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func CreateConsultationLog(c *gin.Context) {
	userIDStr := c.PostForm("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
		return
	}

	file, err := c.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Audio file is required"})
		return
	}

	if filepath.Ext(file.Filename) != ".mp3" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only .mp3 files are allowed"})
		return
	}

	timestamp := time.Now().UnixNano()
	audioFilename := fmt.Sprintf("%d_%s", timestamp, file.Filename)
	audioPath := filepath.Join("storage", "audio", audioFilename)

	if err := c.SaveUploadedFile(file, audioPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save audio file"})
		return
	}

	transcriptFilename := fmt.Sprintf("%d_transcript.txt", timestamp)
	transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)

	dummyContent := []byte("This is a dummy transcript placeholder for the uploaded audio.")
	if err := os.WriteFile(transcriptPath, dummyContent, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate dummy transcript"})
		return
	}

	log := models.ConsultationLog{
		UserID:             userID,
		AudioFilename:      audioFilename,
		TranscriptFilename: transcriptFilename,
	}

	if err := koneksi.DB.Create(&log).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save log to database"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Consultation log created successfully",
		"data":    log,
	})
}

func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := koneksi.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "User baru berhasil dibuat", "data": user})
}

func GetFeedbackItems(c *gin.Context) {
	var items []models.FeedbackItem
	if err := koneksi.DB.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}
