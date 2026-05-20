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
	c.JSON(http.StatusCreated, gin.H{"message": "User baru berhasil dibuat", "data": user})
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
	c.JSON(http.StatusCreated, gin.H{"message": "Data Dosen berhasil ditambahkan", "data": lecturer})
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
	c.JSON(http.StatusCreated, gin.H{"message": "Data Mahasiswa berhasil ditambahkan", "data": student})
}

// Login handles user authentication
func Login(c *gin.Context) {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&credentials); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var user models.User
	if err := koneksi.DB.Preload("Student").Preload("Lecturer").Where("email = ? AND password = ?", credentials.Email, credentials.Password).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"data":    user,
	})
}

// Register handles combined user and profile creation
func Register(c *gin.Context) {
	var payload struct {
		Name       string `json:"name"`
		Email      string `json:"email"`
		Password   string `json:"password"`
		Role       string `json:"role"`
		Identifier string `json:"identifier"` // NIM or NIP
		Department string `json:"department"` // Prodi or Faculty
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 1. Create User
	user := models.User{
		Email:    payload.Email,
		Password: payload.Password,
		Role:     payload.Role,
	}

	tx := koneksi.DB.Begin()

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// 2. Create Student or Lecturer
	if payload.Role == "student" {
		student := models.Student{
			UserID: user.ID,
			NIM:    payload.Identifier,
			Name:   payload.Name,
			Prodi:  payload.Department,
			// LecturerID is required by DB schema (fk_students_lecturer). Assigning a dummy or default if needed.
			// For this implementation, we will assume LecturerID = 4 (from dump) if not provided.
			LecturerID: 4, 
		}
		if err := tx.Create(&student).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create student profile: " + err.Error()})
			return
		}
	} else if payload.Role == "lecturer" {
		lecturer := models.Lecturer{
			UserID:  user.ID,
			NIP:     payload.Identifier,
			Name:    payload.Name,
			Faculty: payload.Department,
		}
		if err := tx.Create(&lecturer).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create lecturer profile: " + err.Error()})
			return
		}
	} else {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registrasi berhasil",
	})
}
