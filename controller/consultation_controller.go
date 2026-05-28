package controller

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"strings"
	"testing_go/koneksi"
	"testing_go/models"
	"testing_go/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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

	// AI-GUARDED PERSONA WORKFLOW START
	
	// 1. Read Docx text
	paperText, err := utils.ReadDocxText(paperPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to extract text from docx: " + err.Error()})
		return
	}

	// UC09: Cek Konsistensi Versi - Ambil feedback terakhir untuk dibandingkan
	var prevLog models.ConsultationLog
	var prevFeedbackStr string
	if err := koneksi.DB.Preload("FeedbackItems").Where("student_id = ?", student.ID).Order("created_at desc").First(&prevLog).Error; err == nil {
		var feedbackLines []string
		for _, item := range prevLog.FeedbackItems {
			feedbackLines = append(feedbackLines, fmt.Sprintf("- [%s] %s", item.Category, item.Content))
		}
		prevFeedbackStr = strings.Join(feedbackLines, "\n")
	}

	// 2. Process with AI (Real Audio + Paper Context + Consistency Check)
	feedbackItems, transcriptContent, err := AnalyzeAudioAndPaper(userID, audioPath, paperText, prevFeedbackStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Processing failed: " + err.Error()})
		return
	}

	// 3. Save Transcript to Disk for redundancy
	transcriptFilename := fmt.Sprintf("%d_transcript.txt", timestamp)
	transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)
	_ = os.WriteFile(transcriptPath, []byte(transcriptContent), 0644)

	// 4. Save Log and Feedback Items
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
	userID := c.Query("user_id")
	var logs []models.ConsultationLog
	
	query := koneksi.DB.Preload("FeedbackItems").Preload("Student")
	
	if userID != "" {
		// Filter by user_id via student profile
		query = query.Joins("JOIN students ON students.id = consultation_logs.student_id").
			Where("students.user_id = ?", userID)
	}

	if err := query.Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// GET /api/stats
func GetStats(c *gin.Context) {
	userID := c.Query("user_id")
	
	var totalLogs int64
	var totalFeedback int64
	var majorFeedback int64
	var minorFeedback int64
	var pendingFeedback int64

	logQuery := koneksi.DB.Model(&models.ConsultationLog{})
	feedbackQuery := koneksi.DB.Model(&models.FeedbackItem{})

	if userID != "" {
		logQuery = logQuery.Joins("JOIN students ON students.id = consultation_logs.student_id").
			Where("students.user_id = ?", userID)
		
		feedbackQuery = feedbackQuery.Joins("JOIN consultation_logs ON consultation_logs.id = feedback_items.log_id").
			Joins("JOIN students ON students.id = consultation_logs.student_id").
			Where("students.user_id = ?", userID)
	}

	logQuery.Count(&totalLogs)
	feedbackQuery.Count(&totalFeedback)
	
	// Create copies for filtered counts
	majorQuery := feedbackQuery.Session(&gorm.Session{}).Where("category = ?", "Major")
	minorQuery := feedbackQuery.Session(&gorm.Session{}).Where("category = ?", "Minor")
	pendingQuery := feedbackQuery.Session(&gorm.Session{}).Where("status = ?", "Pending")

	majorQuery.Count(&majorFeedback)
	minorQuery.Count(&minorFeedback)
	pendingQuery.Count(&pendingFeedback)

	var quests []models.FeedbackItem
	feedbackQuery.Session(&gorm.Session{}).Where("status = ?", "Pending").Order("created_at desc").Limit(5).Find(&quests)

	c.JSON(http.StatusOK, gin.H{
		"total_logs":       totalLogs,
		"total_feedback":   totalFeedback,
		"major_feedback":   majorFeedback,
		"minor_feedback":   minorFeedback,
		"pending_feedback": pendingFeedback,
		"upcoming_quests":  quests,
	})
}

// PUT /api/feedback/:id/status
func UpdateFeedbackStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := koneksi.DB.Model(&models.FeedbackItem{}).Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback status updated successfully"})
}

// GET /api/lecturer/:id/consultations
func GetLecturerConsultations(c *gin.Context) {
	lecturerID := c.Param("id")
	var logs []models.ConsultationLog
	
	if err := koneksi.DB.Preload("FeedbackItems").Preload("Student").
		Joins("JOIN students ON students.id = consultation_logs.student_id").
		Where("students.lecturer_id = ?", lecturerID).
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// GET /api/lecturer/:id/students
func GetLecturerStudents(c *gin.Context) {
	lecturerID := c.Param("id")
	var students []models.Student

	if err := koneksi.DB.Preload("User").Where("lecturer_id = ?", lecturerID).Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, students)
}
