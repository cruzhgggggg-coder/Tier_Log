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

	audioFile, audioErr := c.FormFile("audio")
	docFile, docErr := c.FormFile("document")

	if audioErr != nil && docErr != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least an audio file or a document is required"})
		return
	}

	timestamp := time.Now().UnixNano()
	var audioFilename string
	var transcriptFilename string

	if audioErr == nil {
		ext := filepath.Ext(audioFile.Filename)
		if ext != ".mp3" && ext != ".wav" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Only .mp3 and .wav files are allowed for audio"})
			return
		}
		audioFilename = fmt.Sprintf("%d_%s", timestamp, audioFile.Filename)
		audioPath := filepath.Join("storage", "audio", audioFilename)

		os.MkdirAll(filepath.Join("storage", "audio"), os.ModePerm)
		if err := c.SaveUploadedFile(audioFile, audioPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save audio file"})
			return
		}
	}

	if docErr == nil {
		ext := filepath.Ext(docFile.Filename)
		allowedExts := map[string]bool{".docx": true, ".doc": true, ".pdf": true, ".txt": true}
		if !allowedExts[ext] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Only .docx, .doc, .pdf, or .txt files are allowed for documents"})
			return
		}
		transcriptFilename = fmt.Sprintf("%d_%s", timestamp, docFile.Filename)
		docPath := filepath.Join("storage", "transcript", transcriptFilename)

		os.MkdirAll(filepath.Join("storage", "transcript"), os.ModePerm)
		if err := c.SaveUploadedFile(docFile, docPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document file"})
			return
		}
	} else if audioErr == nil {

		transcriptFilename = fmt.Sprintf("%d_transcript.txt", timestamp)
		transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)

		os.MkdirAll(filepath.Join("storage", "transcript"), os.ModePerm)
		dummyContent := []byte("This is a dummy transcript placeholder for the uploaded audio.")
		if err := os.WriteFile(transcriptPath, dummyContent, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate dummy transcript"})
			return
		}
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

func CreateLecturer(c *gin.Context) {
	var lecturer models.Lecturer
	if err := c.ShouldBindJSON(&lecturer); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := koneksi.DB.Create(&lecturer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Data Dosen berhasil ditambahkan", "data": lecturer})
}

func CreateStudent(c *gin.Context) {
	var student models.Student
	if err := c.ShouldBindJSON(&student); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := koneksi.DB.Create(&student).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Data Mahasiswa berhasil ditambahkan", "data": student})
}
