package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"testing_go/controller"
	"testing_go/koneksi"

	"github.com/gin-gonic/gin"
)

func init() {
	// Ensure external storage directories exist as per instructions
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
	// Initialize Database (GORM with MySQL)
	koneksi.ConnectDatabase()

	r := gin.Default()
	r.SetTrustedProxies(nil)

	// --- Middleware: CORS ---
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Serving the external storage files
	r.Static("/storage", "./storage")

	// API Endpoints
	api := r.Group("/api")
	{
		api.POST("/consultation", controller.CreateConsultation)
		api.GET("/consultation", controller.GetConsultations)
		api.POST("/ai/assist", controller.AIAssistHandler)
	}

	// Identity Management
	r.GET("/users", controller.GetUsers)
	r.POST("/users", controller.CreateUser)
	r.GET("/lecturers", controller.GetLecturers)
	r.POST("/lecturers", controller.CreateLecturer)
	r.GET("/students", controller.GetStudents)
	r.POST("/students", controller.CreateStudent)

	// --- SERVE FRONTEND ---
	distPath := "./dist"
	
	// Serve assets
	r.Static("/assets", distPath+"/assets")
	
	// Serve root static files (favicon, etc)
	r.StaticFile("/", distPath+"/index.html")
	r.StaticFile("/favicon.svg", distPath+"/favicon.svg")
	r.StaticFile("/icons.svg", distPath+"/icons.svg")

	// SPA Routing: all other routes serve index.html
	r.NoRoute(func(c *gin.Context) {
		// Check if the request is for a file (e.g., .js, .css)
		path := c.Request.URL.Path
		if filepath.Ext(path) != "" {
			c.Status(http.StatusNotFound)
			return
		}
		c.File(distPath + "/index.html")
	})

	fmt.Println("TierLog Integrated System is running at http://localhost:8080")
	r.Run(":8080")
}
