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
