package controller

import (
	"context"
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

// ─────────────────────────────────────────────
//  System Prompt Template (exact lecturer spec)
// ─────────────────────────────────────────────

// feedbackPlaceholder marks where feedback items will be injected.
const feedbackPlaceholder = "[INSERT_FEEDBACK_ITEMS_HERE]"

// systemPromptTemplate is the EXACT prompt mandated by the lecturer.
// It uses a raw string literal to avoid any escape issues.
// The single %%  below becomes a literal % in the final fmt.Sprintf output.
const systemPromptTemplate = `Peran Utama Anda: Kamu adalah asisten pendukung dosen di sistem TierLog. Tugas utamamu bukan memberikan saran mandiri atau ide baru secara acak. Kamu berfungsi sebagai jembatan yang memperluas dan mengimplementasikan feedback yang telah diberikan oleh dosen kepada mahasiswa melalui transkrip bimbingan.

Tahap Konsultasi: Kamu tidak diperbolehkan memberikan bantuan teknis atau saran materi jika belum ada feedback resmi dari dosen yang dilampirkan.

Berikut adalah poin-poin feedback resmi dari dosen berdasarkan transkrip:
%s

Batasan Tindakan (Wajib Dipatuhi):
1. Generasi Persona: Setelah menerima feedback di atas, bentuklah 'Persona Ahli' yang spesifik. Misalnya, jika dosen meminta perbaikan pada metodologi, kamu berubah menjadi persona 'Pakar Metodologi Penelitian'.
2. Bantuan Kerja Terbatas: Setelah persona terbentuk, kamu baru diperbolehkan membantu mahasiswa dengan tetap berpegang teguh pada batasan feedback dosen.
3. Dilarang Memberi Saran Mandiri: Jangan memberikan instruksi yang bertentangan atau di luar lingkup feedback dosen tersebut.
4. Fokus Kelanjutan: Fokusmu hanya melanjutkan, merinci, dan membantu eksekusi dari apa yang sudah dikomentari dosen.
5. Verifikasi: Jika mahasiswa meminta bantuan di luar feedback transkrip yang ada, ingatkan mahasiswa untuk melakukan konsultasi ulang dengan dosen terlebih dahulu.

Tujuan Akhir: Membantu mahasiswa menyelesaikan tugas dengan hasil yang selaras 100%% dengan ekspektasi dan arahan dosen pembimbing.`

// ─────────────────────────────────────────────
//  Core Business Logic
// ─────────────────────────────────────────────

// ProcessRevisionAssistance is the primary AI logic function.
//
// Workflow:
//  1. Fetch all FeedbackItems for the given log (derived from the transcript).
//  2. Guard: if no feedback exists yet, refuse to answer (per lecturer rule).
//  3. Build the formatted feedback list and inject into the system prompt.
//  4. Call the Gemini API with the constructed system prompt + student query.
//  5. Return the AI-generated response.
func ProcessRevisionAssistance(logID uint, studentQuery string) (string, error) {
	// Step 1: Fetch feedback items from DB for this consultation log
	var feedbackItems []models.FeedbackItem
	if err := koneksi.DB.Where("log_id = ?", logID).Find(&feedbackItems).Error; err != nil {
		return "", fmt.Errorf("database error while fetching feedback: %w", err)
	}

	// Step 2: Guard — No feedback means no AI assistance (lecturer's strict rule)
	if len(feedbackItems) == 0 {
		return "", errors.New(
			"GUARDED: Belum ada feedback resmi dari dosen untuk log ini. " +
				"AI tidak dapat memberikan bantuan sebelum transkrip bimbingan diproses dan feedback diinputkan.",
		)
	}

	// Step 3: Build feedback bullet list to inject into the prompt
	var lines []string
	for i, item := range feedbackItems {
		status := string(item.Status)
		category := string(item.Category)
		lines = append(lines, fmt.Sprintf(
			"%d. [%s | %s] %s",
			i+1, category, status, item.Content,
		))
	}
	formattedFeedback := strings.Join(lines, "\n")

	// Step 4: Inject feedback into the system prompt template
	// fmt.Sprintf replaces the single %s with the feedback list.
	// The '100%%' in the template becomes '100%' after formatting.
	finalSystemPrompt := fmt.Sprintf(systemPromptTemplate, formattedFeedback)

	// Step 5: Call Gemini API
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		// Fallback for development: return the constructed prompt without calling the API.
		// In production, ensure GEMINI_API_KEY is set in your environment.
		devResult := fmt.Sprintf(
			"[DEV MODE — No GEMINI_API_KEY set]\n\n[SYSTEM PROMPT]\n%s\n\n[STUDENT QUERY]\n%s",
			finalSystemPrompt,
			studentQuery,
		)
		return devResult, nil
	}

	ctx := context.Background()

	// Initialize the Gemini client using the API key from the environment
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create Gemini client: %w", err)
	}

	// Compose the full request: system instruction + user turn
	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash",
		genai.Text(studentQuery),
		&genai.GenerateContentConfig{
			SystemInstruction: genai.NewContentFromText(finalSystemPrompt, genai.RoleUser),
		},
	)
	if err != nil {
		return "", fmt.Errorf("Gemini API call failed: %w", err)
	}

	// Extract the text response using the SDK's built-in helper
	if result == nil || len(result.Candidates) == 0 {
		return "", errors.New("Gemini returned an empty response")
	}

	return result.Text(), nil
}

// ─────────────────────────────────────────────
//  HTTP Handler
// ─────────────────────────────────────────────

// AIAssistHandler handles POST /api/ai/assist
//
// Request Body (JSON):
//
//	{ "log_id": 1, "query": "Bagaimana cara memperbaiki bab 2?" }
func AIAssistHandler(c *gin.Context) {
	var req struct {
		LogID uint   `json:"log_id" binding:"required"`
		Query string `json:"query"  binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Request tidak valid: log_id (angka) dan query (string) wajib diisi.",
		})
		return
	}

	response, err := ProcessRevisionAssistance(req.LogID, req.Query)
	if err != nil {
		// Distinguish between guarded refusals and server errors
		if strings.HasPrefix(err.Error(), "GUARDED:") {
			c.JSON(http.StatusForbidden, gin.H{
				"status":  "guarded",
				"message": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "AI Processing error: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"ai_response": response,
	})
}
