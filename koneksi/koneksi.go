package koneksi

import (
	"fmt"
	"testing_go/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {

	user := "root"
	password := ""
	host := "127.0.0.1"
	port := "3306"
	dbname := "struct_go"

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", user, password, host, port, dbname)
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

	if err != nil {
		panic("Terjadi kesalahan saat menghubungkan ke database: " + err.Error())
	}

	database.AutoMigrate(
		&models.User{},
		&models.Lecturer{},
		&models.Student{},
		&models.ConsultationLog{},
		&models.FeedbackItem{},
	)

	DB = database
	fmt.Println("Koneksi database berhasil!")
}
