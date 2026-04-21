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
2. Instruksi 100% berasal dari teks transkrip rekaman.
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
const transcriptPlaceholder = "[INJECT_ORIGINAL_TRANSCRIPT_HERE]"

const systemPromptTemplate = `Peran Utama Kamu adalah asisten pendukung dosen. Tugas utamamu bukan memberikan saran mandiri atau ide baru secara acak. Kamu berfungsi sebagai jembatan yang memperluas dan mengimplementasikan feedback yang telah diberikan oleh dosen kepada mahasiswa.

ALUR KERJA:
1. Input Feedback: Berikut adalah poin-poin feedback resmi dari dosen:
[INJECT_FETCHED_FEEDBACK_ITEMS_HERE]

2. Konteks Asli: Berikut adalah transkrip asli dari sesi bimbingan tersebut sebagai referensi tambahan:
[INJECT_ORIGINAL_TRANSCRIPT_HERE]

3. Bantuan Kerja: Gunakan feedback di atas sebagai batasan utamamu. Jika mahasiswa bertanya, jawablah dengan persona 'Pakar' yang relevan dengan topik feedback tersebut.

BATASAN:
- Dilarang memberi saran yang bertentangan dengan feedback dosen.
- Jika mahasiswa meminta bantuan di luar cakupan feedback, ingatkan mereka untuk konsultasi lagi dengan dosen.`

// ─────────────────────────────────────────────────────────────────────────────
//  GEMINI API LOGIC: REVISION EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

type FeedbackResponse struct {
	Content  string `json:"content"`
	Category string `json:"category"` // HOC or LOC
}

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

	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash",
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
		raw := result.Text()
		start := strings.Index(raw, "[")
		end := strings.LastIndex(raw, "]")
		if start != -1 && end != -1 && end > start {
			if err := json.Unmarshal([]byte(raw[start:end+1]), &aiFeedbacks); err != nil {
				return nil, fmt.Errorf("failed to parse AI response as JSON: %w", err)
			}
		} else {
			return nil, fmt.Errorf("failed to parse AI response as JSON: %w", err)
		}
	}

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
//  GEMINI API LOGIC: CONVERSATIONAL ASSISTANCE
// ─────────────────────────────────────────────────────────────────────────────

func GenerateRevisionAssistance(logID uint64, studentQuery string) (string, error) {
	var log models.ConsultationLog
	if err := koneksi.DB.Preload("FeedbackItems").First(&log, logID).Error; err != nil {
		return "", fmt.Errorf("database error: %w", err)
	}

	if len(log.FeedbackItems) == 0 {
		return "", errors.New("GUARDED: Belum ada feedback resmi. Selesaikan proses bimbingan terlebih dahulu.")
	}

	// Format feedback summary
	var feedbackLines []string
	for i, item := range log.FeedbackItems {
		feedbackLines = append(feedbackLines, fmt.Sprintf("%d. [%s] %s", i+1, item.Category, item.Content))
	}
	formattedFeedback := strings.Join(feedbackLines, "\n")

	// Prepare final prompt with extracted items AND original transcript text
	finalSystemPrompt := strings.ReplaceAll(systemPromptTemplate, feedbackPlaceholder, formattedFeedback)
	finalSystemPrompt = strings.ReplaceAll(finalSystemPrompt, transcriptPlaceholder, log.TranscriptText)

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
