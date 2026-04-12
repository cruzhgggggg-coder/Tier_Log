package main

import (
	"fmt"
	"os"

	"testing_go/controller"
	"testing_go/koneksi"

	"github.com/gin-gonic/gin"
)

func init() {
	// Ensure external storage directories exist as per instructions
	folders := []string{
		"storage/audio",
		"storage/transcript",
	}

	for _, folder := range folders {
		err := os.MkdirAll(folder, os.ModePerm)
		if err != nil {
			fmt.Printf("Failed to create directory %s: %v\n", folder, err)
		}
	}
}

func main() {
	// Initialize Database (GORM with MySQL)
	koneksi.ConnectDatabase()

	r := gin.Default()
	r.SetTrustedProxies(nil)

	// Serving the external storage files
	r.Static("/storage", "./storage")

	// API Endpoints as per strictly defined requirements
	api := r.Group("/api")
	{
		// Consultation API
		api.POST("/consultation", controller.CreateConsultation)
		api.GET("/consultation", controller.GetConsultations)

		// AI Support Assistant API
		api.POST("/ai/assist", controller.AIAssistHandler)
	}

	// Identity Management (Identity tables)
	r.GET("/users", controller.GetUsers)
	r.POST("/users", controller.CreateUser)
	r.GET("/lecturers", controller.GetLecturers)
	r.POST("/lecturers", controller.CreateLecturer)
	r.GET("/students", controller.GetStudents)
	r.POST("/students", controller.CreateStudent)

	fmt.Println("TierLog Refactored Backend is running at http://localhost:8080")
	r.Run(":8080")
}
