package models

import (
	"time"
)

type UserRole string

const (
	RoleStudent  UserRole = "student"
	RoleLecturer UserRole = "lecturer"
)

type AnnotationFileType string

const (
	AnnotationImage AnnotationFileType = "image"
	AnnotationDocx  AnnotationFileType = "docx"
)

type FeedbackCategory string

const (
	CategoryMinor FeedbackCategory = "Minor"
	CategoryMajor FeedbackCategory = "Major"
)

type FeedbackStatus string

const (
	StatusFixed     FeedbackStatus = "Fixed"
	StatusPending   FeedbackStatus = "Pending"
	StatusValidated FeedbackStatus = "Validated"
)

type User struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"not null;type:varchar(255)" json:"name"`
	Email     string    `gorm:"unique;not null;type:varchar(255)" json:"email"`
	Password  string    `gorm:"not null;type:varchar(255)" json:"-"`
	Role      UserRole  `gorm:"type:enum('student','lecturer');not null" json:"role"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Student  *Student  `gorm:"foreignKey:UserID" json:"student,omitempty"`
	Lecturer *Lecturer `gorm:"foreignKey:UserID" json:"lecturer,omitempty"`

	OpenAIKey       string `gorm:"type:varchar(255)" json:"openai_key"`
	GeminiKey       string `gorm:"type:varchar(255)" json:"gemini_key"`
	AnthropicKey    string `gorm:"type:varchar(255)" json:"anthropic_key"`
	NvidiaKey       string `gorm:"type:varchar(255)" json:"nvidia_key"`
	PreferredModel  string `gorm:"type:varchar(100);default:'default'" json:"preferred_model"`
	IsGatewayActive bool   `gorm:"default:false" json:"is_gateway_active"`
}

type RefreshToken struct {
	ID        uint64     `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64     `gorm:"not null;index" json:"user_id"`
	TokenHash string     `gorm:"type:char(64);uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time  `gorm:"not null;index" json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	UserAgent string     `gorm:"type:varchar(255)" json:"user_agent"`
	IPAddress string     `gorm:"type:varchar(64)" json:"ip_address"`
	CreatedAt time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	User *User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

type RedeemCode struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Code      string    `gorm:"unique;not null;type:varchar(50)" json:"code"`
	IsUsed    bool      `gorm:"default:false" json:"is_used"`
	UsedBy    *uint64   `json:"used_by"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

type Lecturer struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null" json:"user_id"`
	NIP       string    `gorm:"column:nip;unique;not null;type:varchar(20)" json:"nip"`
	Name      string    `gorm:"not null;type:varchar(100)" json:"name"`
	Keahlian  string    `gorm:"type:varchar(100)" json:"keahlian"`
	Faculty   string    `gorm:"type:varchar(100)" json:"faculty"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
}

type Student struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64    `gorm:"not null" json:"user_id"`
	LecturerID  uint64    `gorm:"not null" json:"lecturer_id"`
	NIM         string    `gorm:"unique;not null;type:varchar(20)" json:"nim"`
	Name        string    `gorm:"not null;type:varchar(100)" json:"name"`
	Prodi       string    `gorm:"type:varchar(100)" json:"prodi"`
	ThesisTitle string    `gorm:"type:text" json:"thesis_title"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	User     *User     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Lecturer *Lecturer `gorm:"foreignKey:LecturerID;constraint:OnDelete:RESTRICT" json:"lecturer,omitempty"`
}

type ConsultationLog struct {
	ID                 uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	StudentID          uint64         `gorm:"not null" json:"student_id"`
	AudioFilename      string         `gorm:"type:varchar(255)" json:"audio_filename"`
	TranscriptFilename string         `gorm:"type:varchar(255)" json:"transcript_filename"`
	TranscriptText     string         `gorm:"type:longtext" json:"transcript_text"`
	PaperFilename      string         `gorm:"type:varchar(255)" json:"paper_filename"`
	CreatedAt          time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt          time.Time      `gorm:"autoUpdateTime" json:"updated_at"`

	Student       *Student          `gorm:"foreignKey:StudentID;constraint:OnDelete:CASCADE" json:"student,omitempty"`
	FeedbackItems []FeedbackItem    `gorm:"foreignKey:ConsultationLogID;constraint:OnDelete:CASCADE" json:"feedback_items"`
	RevisionAnnotations []RevisionAnnotation `gorm:"foreignKey:ConsultationLogID;constraint:OnDelete:CASCADE" json:"revision_annotations,omitempty"`
}

type FeedbackItem struct {
	ID                uint64           `gorm:"primaryKey;autoIncrement" json:"id"`
	ConsultationLogID uint64           `gorm:"column:log_id;not null" json:"consultation_log_id"`
	Content           string           `gorm:"type:text;not null" json:"content"`
	Category          FeedbackCategory `gorm:"type:enum('Minor','Major');not null" json:"category"`
	Status            FeedbackStatus   `gorm:"type:enum('Fixed','Pending','Validated');not null;default:'Pending'" json:"status"`
	CreatedAt         time.Time        `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time        `gorm:"autoUpdateTime" json:"updated_at"`
}

// RevisionAnnotation stores annotated revision files uploaded by students (images of marked pages or docx with track changes)
type RevisionAnnotation struct {
	ID                uint64             `gorm:"primaryKey;autoIncrement" json:"id"`
	ConsultationLogID uint64             `gorm:"column:log_id;not null;index" json:"consultation_log_id"`
	Filename          string             `gorm:"type:varchar(255);not null" json:"filename"`
	FileType          AnnotationFileType `gorm:"type:enum('image','docx');not null" json:"file_type"`
	ExtractedText     string             `gorm:"type:longtext" json:"extracted_text"`
	CreatedAt         time.Time          `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time          `gorm:"autoUpdateTime" json:"updated_at"`
}

type DirectMessage struct {
	ID         uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	LogID      uint64    `gorm:"column:log_id;not null;index" json:"log_id"`
	SenderID   uint64    `gorm:"not null" json:"sender_id"`
	SenderRole string    `gorm:"type:varchar(20);not null" json:"sender_role"` // "student" or "lecturer"
	Content    string    `gorm:"type:text;not null" json:"content"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
}

type AIChatMessage struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	LogID     uint64    `gorm:"column:log_id;not null;index" json:"log_id"`
	Role      string    `gorm:"type:varchar(20);not null" json:"role"` // "user" or "ai"
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
