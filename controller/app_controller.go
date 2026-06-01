package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"testing_go/auth"
	"testing_go/koneksi"
	"testing_go/middleware"
	"testing_go/models"
	"testing_go/realtime"
	"testing_go/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var WebSocketHub *realtime.Hub

func SetRealtimeHub(hub *realtime.Hub) {
	WebSocketHub = hub
}

func sanitizeUser(user *models.User) gin.H {
	response := gin.H{
		"id":                user.ID,
		"name":              user.Name,
		"email":             user.Email,
		"role":              user.Role,
		"openai_key":        user.OpenAIKey,
		"gemini_key":        user.GeminiKey,
		"anthropic_key":     user.AnthropicKey,
		"nvidia_key":        user.NvidiaKey,
		"preferred_model":   user.PreferredModel,
		"is_gateway_active": user.IsGatewayActive,
		"created_at":        user.CreatedAt,
		"updated_at":        user.UpdatedAt,
	}

	if user.Student != nil {
		response["student"] = user.Student
	}
	if user.Lecturer != nil {
		response["lecturer"] = user.Lecturer
	}

	return response
}

func persistRefreshToken(c *gin.Context, userID uint64, refreshToken string, expiresAt time.Time) error {
	record := models.RefreshToken{
		UserID:    userID,
		TokenHash: auth.HashRefreshToken(refreshToken),
		ExpiresAt: expiresAt,
		UserAgent: c.GetHeader("User-Agent"),
		IPAddress: c.ClientIP(),
	}
	return koneksi.DB.Create(&record).Error
}

func authResponse(c *gin.Context, user *models.User) {
	bundle, refreshToken, refreshExpiry, err := auth.TokenBundle(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := persistRefreshToken(c, user.ID, refreshToken, refreshExpiry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":          sanitizeUser(user),
		"access_token":  bundle["access_token"],
		"token_type":    bundle["token_type"],
		"expires_at":    bundle["expires_at"],
		"refresh_token": refreshToken,
	})
}

func Register(c *gin.Context) {
	var req struct {
		Name         string          `json:"name" binding:"required"`
		Email        string          `json:"email" binding:"required,email"`
		Password     string          `json:"password" binding:"required,min=8"`
		Role         models.UserRole `json:"role" binding:"required"`
		NIM          string          `json:"nim"`
		Prodi        string          `json:"prodi"`
		ThesisTitle  string          `json:"thesis_title"`
		LecturerID   uint64          `json:"lecturer_id"`
		NIP          string          `json:"nip"`
		Faculty      string          `json:"faculty"`
		Keahlian     string          `json:"keahlian"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Role != models.RoleStudent && req.Role != models.RoleLecturer {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role harus student atau lecturer"})
		return
	}
	if req.Role == models.RoleStudent && (req.NIM == "" || req.LecturerID == 0) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mahasiswa membutuhkan nim dan lecturer_id"})
		return
	}
	if req.Role == models.RoleLecturer && req.NIP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dosen membutuhkan nip"})
		return
	}

	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user := models.User{
		Name:     req.Name,
		Email:    strings.ToLower(strings.TrimSpace(req.Email)),
		Password: hashedPassword,
		Role:     req.Role,
	}

	if err := koneksi.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		switch req.Role {
		case models.RoleStudent:
			student := models.Student{
				UserID:      user.ID,
				LecturerID:  req.LecturerID,
				NIM:         req.NIM,
				Name:        req.Name,
				Prodi:       req.Prodi,
				ThesisTitle: req.ThesisTitle,
			}
			if err := tx.Create(&student).Error; err != nil {
				return err
			}
			user.Student = &student
		case models.RoleLecturer:
			lecturer := models.Lecturer{
				UserID:   user.ID,
				NIP:      req.NIP,
				Name:     req.Name,
				Faculty:  req.Faculty,
				Keahlian: req.Keahlian,
			}
			if err := tx.Create(&lecturer).Error; err != nil {
				return err
			}
			user.Lecturer = &lecturer
		}

		return nil
	}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	authResponse(c, &user)
}

func Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := koneksi.DB.Preload("Student").Preload("Lecturer").Where("email = ?", strings.ToLower(strings.TrimSpace(req.Email))).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect email or password"})
		return
	}

	if !auth.ComparePassword(user.Password, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect email or password"})
		return
	}

	authResponse(c, &user)
}

func Refresh(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)
	var session models.RefreshToken
	if err := koneksi.DB.Where("token_hash = ?", tokenHash).First(&session).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		return
	}

	if session.RevokedAt != nil || time.Now().After(session.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token has expired or has been revoked"})
		return
	}

	now := time.Now()
	session.RevokedAt = &now
	_ = koneksi.DB.Save(&session).Error

	var user models.User
	if err := koneksi.DB.Preload("Student").Preload("Lecturer").First(&user, session.UserID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	authResponse(c, &user)
}

func Logout(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)
	now := time.Now()
	koneksi.DB.Model(&models.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", &now)

	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

func Me(c *gin.Context) {
	user := middleware.CurrentUser(c)
	c.JSON(http.StatusOK, gin.H{"user": sanitizeUser(user)})
}

func UpdateProfile(c *gin.Context) {
	user := middleware.CurrentUser(c)

	var req struct {
		Name        string `json:"name" binding:"required"`
		Email       string `json:"email" binding:"required,email"`
		NIM         string `json:"nim"`
		Prodi       string `json:"prodi"`
		ThesisTitle string `json:"thesis_title"`
		LecturerID  uint64 `json:"lecturer_id"`
		NIP         string `json:"nip"`
		Faculty     string `json:"faculty"`
		Keahlian    string `json:"keahlian"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.Name = req.Name
	user.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if err := koneksi.DB.Save(user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if user.Role == models.RoleStudent {
		var student models.Student
		if err := koneksi.DB.Where("user_id = ?", user.ID).First(&student).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Student profile not found"})
			return
		}
		student.Name = req.Name
		if req.NIM != "" {
			student.NIM = req.NIM
		}
		if req.LecturerID != 0 {
			student.LecturerID = req.LecturerID
		}
		student.Prodi = req.Prodi
		student.ThesisTitle = req.ThesisTitle
		if err := koneksi.DB.Save(&student).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		user.Student = &student
	} else if user.Role == models.RoleLecturer {
		var lecturer models.Lecturer
		if err := koneksi.DB.Where("user_id = ?", user.ID).First(&lecturer).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Lecturer profile not found"})
			return
		}
		lecturer.Name = req.Name
		if req.NIP != "" {
			lecturer.NIP = req.NIP
		}
		lecturer.Faculty = req.Faculty
		lecturer.Keahlian = req.Keahlian
		if err := koneksi.DB.Save(&lecturer).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		user.Lecturer = &lecturer
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully", "user": sanitizeUser(user)})
}

func UpdatePassword(c *gin.Context) {
	user := middleware.CurrentUser(c)

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		Password        string `json:"password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !auth.ComparePassword(user.Password, req.CurrentPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password does not match"})
		return
	}

	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	user.Password = hashedPassword
	if err := koneksi.DB.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func UpdateAIGatewaySettingsV2(c *gin.Context) {
	user := middleware.CurrentUser(c)

	var req struct {
		OpenAIKey      string `json:"openai_key"`
		GeminiKey      string `json:"gemini_key"`
		AnthropicKey   string `json:"anthropic_key"`
		NvidiaKey      string `json:"nvidia_key"`
		PreferredModel string `json:"preferred_model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.OpenAIKey = req.OpenAIKey
	user.GeminiKey = req.GeminiKey
	user.AnthropicKey = req.AnthropicKey
	user.NvidiaKey = req.NvidiaKey
	if req.PreferredModel != "" {
		user.PreferredModel = req.PreferredModel
	}

	if err := koneksi.DB.Save(user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "AI Gateway settings updated successfully", "user": sanitizeUser(user)})
}

func RedeemGatewayCodeV2(c *gin.Context) {
	user := middleware.CurrentUser(c)

	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var redeemCode models.RedeemCode
	if err := koneksi.DB.Where("code = ? AND is_used = ?", req.Code, false).First(&redeemCode).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Redeem code is invalid or has already been used"})
		return
	}

	redeemCode.IsUsed = true
	redeemCode.UsedBy = &user.ID
	user.IsGatewayActive = true

	if err := koneksi.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&redeemCode).Error; err != nil {
			return err
		}
		return tx.Save(user).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "AI Gateway activated successfully", "user": sanitizeUser(user)})
}

func queryScopeForUser(query *gorm.DB, user *models.User) *gorm.DB {
	switch user.Role {
	case models.RoleStudent:
		return query.Joins("JOIN students ON students.id = consultation_logs.student_id").Where("students.user_id = ?", user.ID)
	case models.RoleLecturer:
		return query.Joins("JOIN students ON students.id = consultation_logs.student_id").Where("students.lecturer_id = ?", user.Lecturer.ID)
	default:
		return query
	}
}

func DashboardStatsV2(c *gin.Context) {
	user := middleware.CurrentUser(c)

	var totalLogs int64
	var totalFeedback int64
	var majorFeedback int64
	var pendingFeedback int64
	var quests []models.FeedbackItem

	logQuery := queryScopeForUser(koneksi.DB.Model(&models.ConsultationLog{}), user)
	feedbackQuery := queryScopeForUser(koneksi.DB.Model(&models.FeedbackItem{}).Joins("JOIN consultation_logs ON consultation_logs.id = feedback_items.log_id"), user)

	logQuery.Count(&totalLogs)
	feedbackQuery.Count(&totalFeedback)
	feedbackQuery.Session(&gorm.Session{}).Where("feedback_items.category = ?", models.CategoryMajor).Count(&majorFeedback)
	feedbackQuery.Session(&gorm.Session{}).Where("feedback_items.status = ?", models.StatusPending).Count(&pendingFeedback)
	feedbackQuery.Session(&gorm.Session{}).Where("feedback_items.status != ?", models.StatusValidated).Order("feedback_items.created_at desc").Limit(5).Find(&quests)

	completionRate := 0
	if totalFeedback > 0 {
		completionRate = int(((totalFeedback - pendingFeedback) * 100) / totalFeedback)
	}

	response := gin.H{
		"total_consultations": totalLogs,
		"total_feedback":      totalFeedback,
		"pending_feedback":    pendingFeedback,
		"major_feedback":      majorFeedback,
		"completion_rate":     completionRate,
		"draft_count":         totalLogs,
		"upcoming_quests":     quests,
	}

	if user.Role == models.RoleStudent && user.Student != nil {
		var lecturer models.Lecturer
		if err := koneksi.DB.First(&lecturer, user.Student.LecturerID).Error; err == nil {
			response["lecturer_name"] = lecturer.Name
		}
	}
	if user.Role == models.RoleLecturer && user.Lecturer != nil {
		var studentCount int64
		koneksi.DB.Model(&models.Student{}).Where("lecturer_id = ?", user.Lecturer.ID).Count(&studentCount)
		response["student_count"] = studentCount
		response["validation_queue"] = pendingFeedback
	}

	c.JSON(http.StatusOK, response)
}

func accessibleLog(user *models.User, logID uint64) (*models.ConsultationLog, error) {
	var log models.ConsultationLog
	query := koneksi.DB.Preload("FeedbackItems").Preload("Student").Preload("Student.User").Preload("Student.Lecturer")

	switch user.Role {
	case models.RoleStudent:
		query = query.Joins("JOIN students ON students.id = consultation_logs.student_id").Where("consultation_logs.id = ? AND students.user_id = ?", logID, user.ID)
	case models.RoleLecturer:
		query = query.Joins("JOIN students ON students.id = consultation_logs.student_id").Where("consultation_logs.id = ? AND students.lecturer_id = ?", logID, user.Lecturer.ID)
	default:
		return nil, errors.New("role tidak didukung")
	}

	if err := query.First(&log).Error; err != nil {
		return nil, err
	}
	return &log, nil
}

func ConsultationListV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var logs []models.ConsultationLog

	query := queryScopeForUser(
		koneksi.DB.
			Preload("FeedbackItems").
			Preload("RevisionAnnotations").
			Preload("Student").
			Preload("Student.User").
			Preload("Student.Lecturer"),
		user,
	)
	if err := query.Order("consultation_logs.created_at desc").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func ArchiveListV2(c *gin.Context) {
	ConsultationListV2(c)
}

func CreateConsultationV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role != models.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only students can create consultations"})
		return
	}

	var student models.Student
	if err := koneksi.DB.Where("user_id = ?", user.ID).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student profile not found"})
		return
	}

	audioFile, err := c.FormFile("audio")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Audio file is required"})
		return
	}

	paperFile, err := c.FormFile("paper")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paper file (.docx) is required"})
		return
	}

	timestamp := time.Now().UnixNano()
	audioFilename := fmt.Sprintf("%d_%s", timestamp, audioFile.Filename)
	audioPath := filepath.Join("storage", "audio", audioFilename)
	if err := c.SaveUploadedFile(audioFile, audioPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save audio file"})
		return
	}

	paperFilename := fmt.Sprintf("%d_%s", timestamp, paperFile.Filename)
	paperPath := filepath.Join("storage", "paper", paperFilename)
	if err := c.SaveUploadedFile(paperFile, paperPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save paper file"})
		return
	}

	paperText, err := utils.ReadDocxText(paperPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to extract text from docx: " + err.Error()})
		return
	}

	var prevLog models.ConsultationLog
	var prevFeedbackStr string
	if err := koneksi.DB.Preload("FeedbackItems").Where("student_id = ?", student.ID).Order("created_at desc").First(&prevLog).Error; err == nil {
		var feedbackLines []string
		for _, item := range prevLog.FeedbackItems {
			feedbackLines = append(feedbackLines, fmt.Sprintf("- [%s] %s", item.Category, item.Content))
		}
		prevFeedbackStr = strings.Join(feedbackLines, "\n")
	}

	// ── Process annotation files (optional) ───────────────────────────────────
	var annotationSummary string
	if form, formErr := c.MultipartForm(); formErr == nil && len(form.File["annotations"]) > 0 {
		annotationFiles := form.File["annotations"]
		fmt.Printf("\033[36m[ANNOTATION] Found %d annotation file(s) — saving & extracting...\033[0m\n", len(annotationFiles))
		imageExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
		var summaryParts []string
		for i, fh := range annotationFiles {
			ext := strings.ToLower(filepath.Ext(fh.Filename))
			filename := fmt.Sprintf("%d_annotation_%d%s", timestamp, i+1, ext)
			savePath := filepath.Join("storage", "annotations", filename)
			if err := c.SaveUploadedFile(fh, savePath); err != nil {
				continue
			}
			var extractedText string
			if imageExts[ext] {
				extractedText, _ = processAnnotationImage(savePath, user.GeminiKey)
			} else if ext == ".docx" {
				extractedText, _ = utils.ExtractDocxTrackChanges(savePath)
			} else {
				continue
			}
			label := fmt.Sprintf("[Anotasi %d — %s]", i+1, fh.Filename)
			summaryParts = append(summaryParts, label+"\n"+extractedText)
		}
		if len(summaryParts) > 0 {
			annotationSummary = strings.Join(summaryParts, "\n\n---\n\n")
			prevFeedbackStr = prevFeedbackStr + "\n\nANOTASI REVISI DOSEN:\n" + annotationSummary
		}
	}

	feedbackItems, transcriptContent, err := AnalyzeAudioAndPaper(user.ID, audioPath, paperText, prevFeedbackStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Processing failed: " + err.Error()})
		return
	}

	transcriptFilename := fmt.Sprintf("%d_transcript.txt", timestamp)
	transcriptPath := filepath.Join("storage", "transcript", transcriptFilename)
	_ = os.WriteFile(transcriptPath, []byte(transcriptContent), 0644)

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

	// ── Save annotation records linked to the new log ─────────────────────────
	if annotationSummary != "" {
		if form, formErr := c.MultipartForm(); formErr == nil {
			annotationFiles := form.File["annotations"]
			imageExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
			for i, fh := range annotationFiles {
				ext := strings.ToLower(filepath.Ext(fh.Filename))
				filename := fmt.Sprintf("%d_annotation_%d%s", timestamp, i+1, ext)
				savedPath := filepath.Join("storage", "annotations", filename)
				var fileType models.AnnotationFileType
				if imageExts[ext] {
					fileType = models.AnnotationImage
				} else if ext == ".docx" {
					fileType = models.AnnotationDocx
				} else {
					continue
				}
				var extractedText string
				if fileType == models.AnnotationImage {
					extractedText, _ = processAnnotationImage(savedPath, user.GeminiKey)
				} else {
					extractedText, _ = utils.ExtractDocxTrackChanges(savedPath)
				}
				ann := models.RevisionAnnotation{
					ConsultationLogID: log.ID,
					Filename:          filename,
					FileType:          fileType,
					ExtractedText:     extractedText,
				}
				koneksi.DB.Create(&ann)
			}
		}
	}

	log.Student = &student
	c.JSON(http.StatusCreated, gin.H{"message": "Consultation created successfully", "data": log})
}

func ConsultationChatV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		LogID uint64 `json:"log_id" binding:"required"`
		Query string `json:"query" binding:"required"`
		Model string `json:"model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	log, err := accessibleLog(user, req.LogID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied or consultation log not found"})
		return
	}

	// 1. Save user query to database
	userMsg := models.AIChatMessage{
		LogID:   log.ID,
		Role:    "user",
		Content: req.Query,
	}
	koneksi.DB.Create(&userMsg)

	if WebSocketHub != nil {
		WebSocketHub.Broadcast("consultation."+strconv.FormatUint(req.LogID, 10), "chat.message", gin.H{
			"id":         userMsg.ID,
			"log_id":     req.LogID,
			"role":       "user",
			"content":    req.Query,
			"created_at": userMsg.CreatedAt,
		})
	}

	_ = log
	response, err := GenerateRevisionAssistance(req.LogID, req.Query, req.Model)
	if err != nil {
		if strings.HasPrefix(err.Error(), "GUARDED:") {
			c.JSON(http.StatusForbidden, gin.H{"status": "guarded", "message": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 2. Save AI response to database
	aiMsg := models.AIChatMessage{
		LogID:   log.ID,
		Role:    "ai",
		Content: response,
	}
	koneksi.DB.Create(&aiMsg)

	if WebSocketHub != nil {
		WebSocketHub.Broadcast("consultation."+strconv.FormatUint(req.LogID, 10), "chat.message", gin.H{
			"id":         aiMsg.ID,
			"log_id":     req.LogID,
			"role":       "ai",
			"content":    response,
			"created_at": aiMsg.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "ai_response": response})
}

// GetAIChats fetches all persistent AI chats for a given log ID.
func GetAIChats(c *gin.Context) {
	user := middleware.CurrentUser(c)
	logIDStr := c.Param("id")
	logID, err := strconv.ParseUint(logIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	log, err := accessibleLog(user, logID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var messages []models.AIChatMessage
	if err := koneksi.DB.Where("log_id = ?", log.ID).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": messages})
}

func UpdateFeedbackStatusV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
		LogID  uint64 `json:"log_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if user.Role == models.RoleStudent {
		if req.Status != string(models.StatusFixed) && req.Status != string(models.StatusPending) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Students can only change status to Pending or Fixed"})
			return
		}
	} else if user.Role == models.RoleLecturer {
		if req.Status != string(models.StatusValidated) && req.Status != string(models.StatusPending) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Lecturers can only validate (Validated) or return status to Pending"})
			return
		}
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unknown role"})
		return
	}

	var feedback models.FeedbackItem
	if err := koneksi.DB.First(&feedback, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback item not found"})
		return
	}

	log, err := accessibleLog(user, feedback.ConsultationLogID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	feedback.Status = models.FeedbackStatus(req.Status)
	if err := koneksi.DB.Save(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	payload := gin.H{
		"feedback_id":      feedback.ID,
		"log_id":           feedback.ConsultationLogID,
		"consultation_log_id": feedback.ConsultationLogID,
		"status":           feedback.Status,
		"updated_by_role":  user.Role,
	}

	if WebSocketHub != nil {
		WebSocketHub.Broadcast("consultation."+strconv.FormatUint(log.ID, 10), "feedback.status-updated", payload)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback status updated successfully", "data": payload})
}

func LecturerConsultationsV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role != models.RoleLecturer || user.Lecturer == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only lecturers can access this data"})
		return
	}

	var logs []models.ConsultationLog
	if err := koneksi.DB.Preload("FeedbackItems").Preload("Student").Preload("Student.User").
		Joins("JOIN students ON students.id = consultation_logs.student_id").
		Where("students.lecturer_id = ?", user.Lecturer.ID).
		Order("consultation_logs.created_at desc").
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func LecturerStudentsV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role != models.RoleLecturer || user.Lecturer == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only lecturers can access this data"})
		return
	}

	var students []models.Student
	if err := koneksi.DB.Preload("User").Where("lecturer_id = ?", user.Lecturer.ID).Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": students})
}

// LecturerAddFeedbackV2 allows a lecturer to manually add a feedback item
// to a specific consultation log that belongs to one of their supervised students.
func LecturerAddFeedbackV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role != models.RoleLecturer || user.Lecturer == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only lecturers can dispatch feedback"})
		return
	}

	logIDStr := c.Param("id")
	logID, err := strconv.ParseUint(logIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	var req struct {
		Content  string `json:"content" binding:"required"`
		Category string `json:"category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure the log belongs to a student supervised by this lecturer
	log, err := accessibleLog(user, logID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied or consultation log not found"})
		return
	}

	// Default manually added feedback to "Major" (HOC) initially.
	// The student will run their AI Oracle to classify it properly.
	category := string(models.CategoryMajor)

	feedback := models.FeedbackItem{
		ConsultationLogID: log.ID,
		Content:           req.Content,
		Category:          models.FeedbackCategory(category),
		Status:            models.StatusPending,
	}
	if err := koneksi.DB.Create(&feedback).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Broadcast to real-time subscribers
	if WebSocketHub != nil {
		WebSocketHub.Broadcast("consultation."+strconv.FormatUint(log.ID, 10), "feedback.status-updated", gin.H{
			"feedback_id":          feedback.ID,
			"log_id":               feedback.ConsultationLogID,
			"consultation_log_id":  feedback.ConsultationLogID,
			"status":               feedback.Status,
			"category":             feedback.Category,
			"updated_by_role":      user.Role,
		})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Feedback dispatched successfully", "data": feedback})
}

// GetDirectMessages fetches all direct messages for a given consultation log ID.
func GetDirectMessages(c *gin.Context) {
	user := middleware.CurrentUser(c)
	logIDStr := c.Param("id")
	logID, err := strconv.ParseUint(logIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	// Verify accessibility (log belongs to student or supervisor)
	log, err := accessibleLog(user, logID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var messages []models.DirectMessage
	if err := koneksi.DB.Where("log_id = ?", log.ID).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": messages})
}

// SendDirectMessage saves a new direct message to the database and broadcasts it via WebSocket.
func SendDirectMessage(c *gin.Context) {
	user := middleware.CurrentUser(c)
	logIDStr := c.Param("id")
	logID, err := strconv.ParseUint(logIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	// Verify accessibility
	log, err := accessibleLog(user, logID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg := models.DirectMessage{
		LogID:      log.ID,
		SenderID:   user.ID,
		SenderRole: string(user.Role),
		Content:    req.Content,
	}

	if err := koneksi.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Broadcast via WebSocket
	if WebSocketHub != nil {
		WebSocketHub.Broadcast("consultation."+strconv.FormatUint(log.ID, 10), "chat.direct-message", gin.H{
			"id":          msg.ID,
			"log_id":      msg.LogID,
			"sender_id":   msg.SenderID,
			"sender_role": msg.SenderRole,
			"content":     msg.Content,
			"created_at":  msg.CreatedAt,
		})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Message sent successfully", "data": msg})
}

// ClassifyFeedbackV2 uses the student's own API key to classify all raw feedback items
// for a consultation log into HOC (Major) and LOC (Minor).
func ClassifyFeedbackV2(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role != models.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only students can initiate AI classification"})
		return
	}

	logIDStr := c.Param("id")
	logID, err := strconv.ParseUint(logIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	// Verify accessibility
	log, err := accessibleLog(user, logID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if len(log.FeedbackItems) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No feedback items to classify", "data": log.FeedbackItems})
		return
	}

	// Build the prompts
	var itemsJson []gin.H
	for _, item := range log.FeedbackItems {
		itemsJson = append(itemsJson, gin.H{
			"id":      item.ID,
			"content": item.Content,
		})
	}
	itemsData, _ := json.Marshal(itemsJson)

	systemPrompt := `You are an expert academic advisor assistant.
Your task is to classify a list of thesis/manuscript revision feedback items into one of two categories:
- "Major" (Higher Order Concerns / HOC): Focuses on core substance such as research structure, arguments, methodology, analysis, research model, or thesis title.
- "Minor" (Lower Order Concerns / LOC): Focuses on technicalities, formatting, typos, citation styles, bibliography, spacing, spelling, or grammar.

You must respond ONLY with a JSON array where each object has:
{
  "id": <number>,
  "category": "Major" or "Minor"
}`

	aiResponse, err := callAI(user, systemPrompt, string(itemsData), true)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "AI classification failed: " + err.Error()})
		return
	}

	// Clean markdown block wrappers if present in AI response
	cleanedResponse := strings.TrimSpace(aiResponse)
	if strings.HasPrefix(cleanedResponse, "```json") {
		cleanedResponse = strings.TrimPrefix(cleanedResponse, "```json")
		cleanedResponse = strings.TrimSuffix(cleanedResponse, "```")
	} else if strings.HasPrefix(cleanedResponse, "```") {
		cleanedResponse = strings.TrimPrefix(cleanedResponse, "```")
		cleanedResponse = strings.TrimSuffix(cleanedResponse, "```")
	}
	cleanedResponse = strings.TrimSpace(cleanedResponse)

	type ClassificationItem struct {
		ID       uint64 `json:"id"`
		Category string `json:"category"`
	}

	var finalClassifications []ClassificationItem

	// 1. Try parsing as a direct array: [{"id": 1, "category": "Major"}]
	if err := json.Unmarshal([]byte(cleanedResponse), &finalClassifications); err == nil && len(finalClassifications) > 0 {
		goto SAVE_TO_DB
	}

	// 2. Try parsing as an object wrapping the array in common keys: {"classifications": [...]}
	{
		var objectWrapper struct {
			Classifications []ClassificationItem `json:"classifications"`
			Feedbacks       []ClassificationItem `json:"feedbacks"`
			Data            []ClassificationItem `json:"data"`
		}
		if err := json.Unmarshal([]byte(cleanedResponse), &objectWrapper); err == nil {
			if len(objectWrapper.Classifications) > 0 {
				finalClassifications = objectWrapper.Classifications
				goto SAVE_TO_DB
			}
			if len(objectWrapper.Feedbacks) > 0 {
				finalClassifications = objectWrapper.Feedbacks
				goto SAVE_TO_DB
			}
			if len(objectWrapper.Data) > 0 {
				finalClassifications = objectWrapper.Data
				goto SAVE_TO_DB
			}
		}
	}

	// 3. Try parsing as a direct key-value map: {"1": "Major", "2": "Minor"}
	{
		var mapWrapper map[string]string
		if err := json.Unmarshal([]byte(cleanedResponse), &mapWrapper); err == nil && len(mapWrapper) > 0 {
			for k, v := range mapWrapper {
				id, parseErr := strconv.ParseUint(k, 10, 64)
				if parseErr == nil {
					finalClassifications = append(finalClassifications, ClassificationItem{
						ID:       id,
						Category: v,
					})
				}
			}
			if len(finalClassifications) > 0 {
				goto SAVE_TO_DB
			}
		}
	}

	// 4. If all fail, return a beautiful user-friendly error in plain English/Indonesian
	c.JSON(http.StatusInternalServerError, gin.H{
		"error": "Failed to parse AI classification results. The response format returned by the AI was not recognized. Please try sorting again.",
	})
	return

SAVE_TO_DB:
	// Save to DB and prepare broadcast payloads
	tx := koneksi.DB.Begin()
	for _, cl := range finalClassifications {
		if cl.Category == "Major" || cl.Category == "Minor" {
			tx.Model(&models.FeedbackItem{}).Where("id = ? AND log_id = ?", cl.ID, log.ID).Update("category", cl.Category)
		}
	}
	tx.Commit()

	// Reload all feedback items and broadcast
	var updatedItems []models.FeedbackItem
	koneksi.DB.Where("log_id = ?", log.ID).Find(&updatedItems)

	if WebSocketHub != nil {
		for _, item := range updatedItems {
			WebSocketHub.Broadcast("consultation."+strconv.FormatUint(log.ID, 10), "feedback.status-updated", gin.H{
				"feedback_id":          item.ID,
				"log_id":               item.ConsultationLogID,
				"consultation_log_id":  item.ConsultationLogID,
				"status":               item.Status,
				"category":             item.Category,
				"updated_by_role":      user.Role,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback items classified successfully", "data": updatedItems})
}
