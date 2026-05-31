package koneksi

import (
	"fmt"
	"os"
	"time"

	"testing_go/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func ConnectDatabase() {
	user := envOrDefault("DB_USERNAME", "root")
	password := envOrDefault("DB_PASSWORD", "")
	host := envOrDefault("DB_HOST", "127.0.0.1")
	port := envOrDefault("DB_PORT", "3306")
	dbname := envOrDefault("DB_DATABASE", "struct_go")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", user, password, host, port, dbname)
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("An error occurred while connecting to the database: " + err.Error())
	}

	if err := database.AutoMigrate(
		&models.User{},
		&models.Lecturer{},
		&models.Student{},
		&models.ConsultationLog{},
		&models.FeedbackItem{},
		&models.RevisionAnnotation{},
		&models.RedeemCode{},
		&models.RefreshToken{},
		&models.DirectMessage{},
		&models.AIChatMessage{},
	); err != nil {
		panic("An error occurred during database migration: " + err.Error())
	}

	// Clean up accidental consultation_log_id column and its foreign key constraints created by GORM prior to the mapping fix
	migrator := database.Migrator()
	if migrator.HasConstraint(&models.FeedbackItem{}, "feedback_items_consultation_log_id_foreign") {
		_ = migrator.DropConstraint(&models.FeedbackItem{}, "feedback_items_consultation_log_id_foreign")
	}
	if migrator.HasConstraint(&models.FeedbackItem{}, "fk_consultation_logs_feedback_items") {
		_ = migrator.DropConstraint(&models.FeedbackItem{}, "fk_consultation_logs_feedback_items")
	}
	if migrator.HasColumn(&models.FeedbackItem{}, "consultation_log_id") {
		_ = migrator.DropColumn(&models.FeedbackItem{}, "consultation_log_id")
	}

	// Ensure the status enum in feedback_items includes 'Validated'
	_ = database.Exec("ALTER TABLE feedback_items MODIFY COLUMN status ENUM('Fixed', 'Pending', 'Validated') NOT NULL DEFAULT 'Pending'").Error

	// Production-grade connection pooling optimization
	sqlDB, err := database.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(15)
		sqlDB.SetMaxOpenConns(150)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)
		sqlDB.SetConnMaxIdleTime(10 * time.Minute)
	}

	DB = database
	fmt.Println("Database connection successful!")
}
