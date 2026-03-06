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
	folders := []string{
		"storage/audio",
		"storage/transcript",
		"storage/feedback",
	}

	for _, folder := range folders {
		err := os.MkdirAll(folder, os.ModePerm)
		if err != nil {
			fmt.Printf("Failed to create directory %s: %v\n", folder, err)
		}
	}
}

func main() {
	koneksi.ConnectDatabase()
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.SetTrustedProxies(nil)

	r.Static("/storage", "./storage")

	r.GET("/", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"message": "TierLog API v1.0",
			"status":  "ready",
		})
	})

	r.GET("/users", controller.GetUsers)
	r.POST("/users", controller.CreateUser)
	r.GET("/lecturers", controller.GetLecturers)
	r.GET("/students", controller.GetStudents)

	api := r.Group("/api")
	{
		api.GET("/consultation", controller.GetConsultationLogs)
		api.POST("/consultation", controller.CreateConsultationLog)
	}

	r.GET("/feedbacks", controller.GetFeedbackItems)

	fmt.Println("Server is running at http://localhost:8080")
	r.Run(":8080")
}
