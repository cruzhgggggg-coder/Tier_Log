package controller

import (
	"net/http"

	"testing_go/koneksi"
	"testing_go/models"

	"github.com/gin-gonic/gin"
)

// GetUsers fetches all users
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := koneksi.DB.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

// CreateUser handles user creation
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
	c.JSON(http.StatusCreated, gin.H{"message": "New user created successfully", "data": user})
}

// GetLecturers fetches all lecturers
func GetLecturers(c *gin.Context) {
	var lecturers []models.Lecturer
	if err := koneksi.DB.Preload("User").Find(&lecturers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": lecturers})
}

// CreateLecturer handles lecturer creation
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
	c.JSON(http.StatusCreated, gin.H{"message": "Lecturer data added successfully", "data": lecturer})
}

// GetStudents fetches all students
func GetStudents(c *gin.Context) {
	var students []models.Student
	if err := koneksi.DB.Preload("User").Preload("Lecturer").Find(&students).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": students})
}

// CreateStudent handles student creation
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
	c.JSON(http.StatusCreated, gin.H{"message": "Student data added successfully", "data": student})
}
// UpdateAIGatewaySettings updates the user's AI keys and preferred model
func UpdateAIGatewaySettings(c *gin.Context) {
	var req struct {
		UserID         uint64 `json:"user_id" binding:"required"`
		OpenAIKey      string `json:"openai_key"`
		GeminiKey      string `json:"gemini_key"`
		AnthropicKey   string `json:"anthropic_key"`
		NvidiaKey      string `json:"nvidia_key"`
		PreferredModel string `json:"preferred_model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	var user models.User
	if err := koneksi.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Only update if gateway is active
	/* 
	if !user.IsGatewayActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "AI Gateway belum aktif. Gunakan kode redeem untuk mengaktifkan."})
		return
	}
	*/

	user.OpenAIKey = req.OpenAIKey
	user.GeminiKey = req.GeminiKey
	user.AnthropicKey = req.AnthropicKey
	user.NvidiaKey = req.NvidiaKey
	user.PreferredModel = req.PreferredModel

	if err := koneksi.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "AI Gateway settings updated successfully"})
}

// RedeemGatewayCode activates AI Gateway for a user
func RedeemGatewayCode(c *gin.Context) {
	var req struct {
		UserID uint64 `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	var redeemCode models.RedeemCode
	if err := koneksi.DB.Where("code = ? AND is_used = ?", req.Code, false).First(&redeemCode).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Redeem code is invalid or has already been used"})
		return
	}

	var user models.User
	if err := koneksi.DB.First(&user, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Mark code as used
	redeemCode.IsUsed = true
	redeemCode.UsedBy = &user.ID
	koneksi.DB.Save(&redeemCode)

	// Activate Gateway
	user.IsGatewayActive = true
	koneksi.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{"message": "AI Gateway Activated Successfully! Enjoy your plug-and-play freedom."})
}

// GenerateRedeemCode creates a new redeem code (Admin/Dev tool)
func GenerateRedeemCode(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code is required"})
		return
	}

	newCode := models.RedeemCode{Code: req.Code}
	if err := koneksi.DB.Create(&newCode).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Redeem code created successfully", "code": req.Code})
}
