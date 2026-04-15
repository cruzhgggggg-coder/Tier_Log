package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"testing_go/koneksi"
	"testing_go/models"

	"github.com/gin-gonic/gin"
	"google.golang.org/genai"
)

// ─────────────────────────────────────────────────────────────────────────────
//  PROMPT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const personaDosenPrompt = `Kamu adalah Dosen Pembimbing yang teliti dan suportif. 
Tugasmu adalah menganalisis Draft Paper Mahasiswa berdasarkan Transkrip Bimbingan (Instruksi Dosen).

PRINSIP UTAMA:
1. Dilarang berhalusinasi atau memberikan ide baru yang tidak ada di transkrip.
2. Instruksi 100%% berasal dari teks transkrip rekaman.
3. Bandingkan draf mahasiswa dengan poin-poin dalam transkrip.
4. Hasilkan daftar tugas revisi yang spesifik.

KATEGORI FEEDBACK:
- HOC (Higher Order Concerns): Fokus pada substansi seperti struktur, argumen, metodologi, dan kesesuaian judul.
- LOC (Lower Order Concerns): Fokus pada teknis seperti penulisan, typo, format sitasi, dan tata bahasa.

TATA CARA OUTPUT:
Kamu WAJIB mengembalikan output hanya dalam format JSON Array tanpa teks tambahan.
Contoh format:
[
  {"content": "Revisi bagian metodologi agar lebih detail sesuai arahan menit ke-5", "category": "HOC"},
  {"content": "Perbaiki typo pada halaman 2", "category": "LOC"}
]`

const feedbackPlaceholder = "[INJECT_FETCHED_FEEDBACK_ITEMS_HERE]"

const systemPromptTemplate = `Peran Utama Kamu adalah asisten pendukung dosen. Tugas utamamu bukan memberikan saran mandiri atau ide baru secara acak. Kamu berfungsi sebagai jembatan yang memperluas dan mengimplementasikan feedback yang telah diberikan oleh dosen kepada mahasiswa.

Alur Kerja (Wajib Urut)

Tahap Konsultasi: AI tidak diperbolehkan memberikan bantuan teknis atau saran materi sebelum mahasiswa memasukkan feedback resmi dari dosen.

Input Feedback: Berikut adalah poin-poin feedback resmi dari dosen yang harus dikerjakan mahasiswa:
[INJECT_FETCHED_FEEDBACK_ITEMS_HERE]

Generasi Persona: Setelah menerima feedback tersebut, kamu harus membentuk 'Persona Ahli' yang spesifik sesuai dengan arahan dosen. Misalnya, jika dosen meminta perbaikan pada metodologi, kamu berubah menjadi persona 'Pakar Metodologi Penelitian'.

Bantuan Kerja: Setelah persona terbentuk, kamu baru diperbolehkan membantu mahasiswa mengerjakan tugasnya dengan tetap berpegang teguh pada batasan feedback dosen tersebut.

Batasan Tindakan

Dilarang Memberi Saran Mandiri: Jangan memberikan instruksi yang bertentangan atau di luar lingkup feedback dosen.

Fokus Kelanjutan: Fokusmu hanya melanjutkan, merinci, dan membantu eksekusi dari apa yang sudah dikomentari dosen.

Verifikasi: Jika mahasiswa meminta bantuan di luar feedback yang ada, ingatkan mahasiswa untuk melakukan konsultasi ulang dengan dosen terlebih dahulu.

Tujuan Akhir Membantu mahasiswa menyelesaikan tugas dengan hasil yang selaras 100% dengan ekspektasi dan arahan dosen pembimbing.`

// ─────────────────────────────────────────────────────────────────────────────
//  GEMINI API LOGIC: REVISION EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

// FeedbackResponse represents the JSON structure from Gemini
type FeedbackResponse struct {
	Content  string `json:"content"`
	Category string `json:"category"` // HOC or LOC
}

// ProcessRevisionAssistance analyzes transcript and paper to generate feedback items
func ProcessRevisionAssistance(transcript, paper string) ([]models.FeedbackItem, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, errors.New("GEMINI_API_KEY is not set")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialise Gemini client: %w", err)
	}

	userInput := fmt.Sprintf("=== TRANSKRIP BIMBINGAN (INSTRUKSI) ===\n%s\n\n=== DRAFT PAPER MAHASISWA ===\n%s", transcript, paper)

	// Use Gemini to extract feedback
	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash", // Using the latest model for better JSON following
		genai.Text(userInput),
		&genai.GenerateContentConfig{
			SystemInstruction: genai.NewContentFromText(personaDosenPrompt, genai.RoleUser),
			ResponseMIMEType:  "application/json",
		},
	)
	if err != nil {
		return nil, fmt.Errorf("Gemini API call failed: %w", err)
	}

	if result == nil || len(result.Candidates) == 0 {
		return nil, errors.New("Gemini returned an empty response")
	}

	var aiFeedbacks []FeedbackResponse
	if err := json.Unmarshal([]byte(result.Text()), &aiFeedbacks); err != nil {
		// Attempt to extract JSON from text if it's not raw JSON
		const startPattern = "["
		const endPattern = "]"
		raw := result.Text()
		start := strings.Index(raw, startPattern)
		end := strings.LastIndex(raw, endPattern)
		if start != -1 && end != -1 && end > start {
			jsonPart := raw[start : end+1]
			if err := json.Unmarshal([]byte(jsonPart), &aiFeedbacks); err != nil {
				return nil, fmt.Errorf("failed to unmarshal JSON from AI even with extraction: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to parse AI response as JSON: %w", err)
		}
	}

	// Map to models.FeedbackItem
	var items []models.FeedbackItem
	for _, f := range aiFeedbacks {
		category := models.CategoryMinor
		if strings.ToUpper(f.Category) == "HOC" {
			category = models.CategoryMajor
		}
		items = append(items, models.FeedbackItem{
			Content:  f.Content,
			Category: category,
			Status:   models.StatusPending,
		})
	}

	return items, nil
}

// ─────────────────────────────────────────────────────────────────────────────
//  GEMINI API LOGIC: CONVERSATIONAL ASSISTANCE (EXISTING)
// ─────────────────────────────────────────────────────────────────────────────

func GenerateRevisionAssistance(logID uint64, studentQuery string) (string, error) {
	var feedbackItems []models.FeedbackItem
	if err := koneksi.DB.Where("log_id = ?", logID).Find(&feedbackItems).Error; err != nil {
		return "", fmt.Errorf("database error: %w", err)
	}

	if len(feedbackItems) == 0 {
		return "", errors.New("GUARDED: Belum ada feedback resmi. Selesaikan proses bimbingan terlebih dahulu.")
	}

	var lines []string
	for i, item := range feedbackItems {
		lines = append(lines, fmt.Sprintf("%d. [%s] %s", i+1, item.Category, item.Content))
	}
	formattedFeedback := strings.Join(lines, "\n")

	finalSystemPrompt := strings.ReplaceAll(systemPromptTemplate, feedbackPlaceholder, formattedFeedback)

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "[DEV MODE — API KEY NOT SET] Prompt:\n" + finalSystemPrompt, nil
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return "", err
	}

	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash",
		genai.Text(studentQuery),
		&genai.GenerateContentConfig{
			SystemInstruction: genai.NewContentFromText(finalSystemPrompt, genai.RoleUser),
		},
	)
	if err != nil {
		return "", err
	}

	return result.Text(), nil
}

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

func AIAssistHandler(c *gin.Context) {
	var req struct {
		LogID uint64 `json:"log_id" binding:"required"`
		Query string `json:"query"  binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	response, err := GenerateRevisionAssistance(req.LogID, req.Query)
	if err != nil {
		if strings.HasPrefix(err.Error(), "GUARDED:") {
			c.JSON(http.StatusForbidden, gin.H{"status": "guarded", "message": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "ai_response": response})
}
