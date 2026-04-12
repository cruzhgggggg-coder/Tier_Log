package main

import (
	"fmt"
	"net/http"
	"os"

	"testing_go/controller"
	"testing_go/koneksi"

	"github.com/gin-gonic/gin"
)

func init() {
	// Ensure storage directories exist
	folders := []string{
		"storage/audio",
		"storage/transcript",
		"storage/paper",
	}

	for _, folder := range folders {
		err := os.MkdirAll(folder, os.ModePerm)
		if err != nil {
			fmt.Printf("Failed to create directory %s: %v\n", folder, err)
		}
	}
}

func main() {
	// Initialize Database
	koneksi.ConnectDatabase()

	r := gin.Default()
	r.SetTrustedProxies(nil)

	// Static file serving for external storage
	r.Static("/storage", "./storage")

	// Base Route
	r.GET("/", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"message": "TierLog API (Refactored)",
			"version": "1.1",
			"status":  "running",
		})
	})

	// User Management (from tier_controller)
	r.GET("/users", controller.GetUsers)
	r.POST("/users", controller.CreateUser)
	r.GET("/lecturers", controller.GetLecturers)
	r.POST("/lecturers", controller.CreateLecturer)
	r.GET("/students", controller.GetStudents)
	r.POST("/students", controller.CreateStudent)

	// API Group
	api := r.Group("/api")
	{
		// Consultation Endpoints
		api.POST("/consultation", controller.CreateConsultation)
		api.GET("/consultation", controller.GetConsultations)

		// Feedback Endpoints
		api.PATCH("/feedback/:id/verify", controller.VerifyFeedback)

		// AI Endpoints
		api.POST("/ai/assist", controller.AIAssistHandler)
	}

	fmt.Println("TierLog Backend is running at http://localhost:8080")
	r.Run(":8080")
}
