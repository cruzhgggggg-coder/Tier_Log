package models

import (
	"time"
)

type UserRole string

const (
	RoleStudent  UserRole = "student"
	RoleLecturer UserRole = "lecturer"
)

type FeedbackCategory string

const (
	CategoryMinor FeedbackCategory = "Minor"
	CategoryMajor FeedbackCategory = "Major"
)

type FeedbackStatus string

const (
	StatusFixed   FeedbackStatus = "Fixed"
	StatusPending FeedbackStatus = "Pending"
)

type User struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Email     string    `gorm:"unique;not null;type:varchar(255)" json:"email"`
	Password  string    `gorm:"not null;type:varchar(255)" json:"password"`
	Role      UserRole  `gorm:"type:enum('student','lecturer');not null" json:"role"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

type Lecturer struct {
	ID      uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID  uint64 `gorm:"not null" json:"user_id"`
	NIP     string `gorm:"unique;not null;type:varchar(20)" json:"nip"`
	Name    string `gorm:"not null;type:varchar(100)" json:"name"`
	Faculty string `gorm:"type:varchar(100)" json:"faculty"`
	User    User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

type Student struct {
	ID          uint64   `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64   `gorm:"not null" json:"user_id"`
	LecturerID  uint64   `gorm:"not null" json:"lecturer_id"`
	NIM         string   `gorm:"unique;not null;type:varchar(20)" json:"nim"`
	Name        string   `gorm:"not null;type:varchar(100)" json:"name"`
	Prodi       string   `gorm:"type:varchar(100)" json:"prodi"`
	ThesisTitle string   `gorm:"type:text" json:"thesis_title"`
	User        User     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Lecturer    Lecturer `gorm:"foreignKey:LecturerID;constraint:OnDelete:RESTRICT" json:"lecturer,omitempty"`
}

type ConsultationLog struct {
	ID                 uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID             uint64         `gorm:"not null" json:"user_id"`
	AudioFilename      string         `gorm:"type:varchar(255)" json:"audio_filename"`
	TranscriptFilename string         `gorm:"type:varchar(255)" json:"transcript_filename"`
	CreatedAt          time.Time      `gorm:"autoCreateTime" json:"created_at"`
	User               User           `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	FeedbackItems      []FeedbackItem `gorm:"foreignKey:LogID;constraint:OnDelete:CASCADE" json:"feedback_items"`
}

type FeedbackItem struct {
	ID        uint64           `gorm:"primaryKey;autoIncrement" json:"id"`
	LogID     uint64           `gorm:"not null" json:"log_id"`
	Content   string           `gorm:"type:text;not null" json:"content"`
	Category  FeedbackCategory `gorm:"type:enum('Minor','Major');not null" json:"category"`
	Status    FeedbackStatus   `gorm:"type:enum('Fixed','Pending');not null;default:'Pending'" json:"status"`
	CreatedAt time.Time        `gorm:"autoCreateTime" json:"created_at"`
}
