package controller

import (
	"fmt"
	"net/http"
	"strings"

	"testing_go/koneksi"
	"testing_go/models"

	"github.com/gin-gonic/gin"
)

// GenerateAIResponse fetches feedback for a given log and injects them into the Guarded Assistance system prompt.
func GenerateAIResponse(logID uint64, studentQuery string) (string, error) {
	var feedbackItems []models.FeedbackItem
	if err := koneksi.DB.Where("log_id = ?", logID).Find(&feedbackItems).Error; err != nil {
		return "", err
	}

	// Build the feedback list to inject into the prompt
	var feedbackLines []string
	for _, item := range feedbackItems {
		feedbackLines = append(feedbackLines, fmt.Sprintf("- [%s] %s", item.Category, item.Content))
	}
	fetchedFeedback := strings.Join(feedbackLines, "\n")

	// System Prompt Template (exactly as defined by lecturer)
	// Note: '100%%' is used to escape the percent sign inside fmt.Sprintf
	systemPromptTemplate := `Peran Utama: Kamu adalah asisten pendukung dosen di TierLog. Tugas utamamu bukan memberikan saran mandiri atau ide baru secara acak. Kamu berfungsi sebagai jembatan yang memperluas dan mengimplementasikan feedback yang telah diberikan oleh dosen kepada mahasiswa.

Berikut adalah poin-poin feedback resmi dari dosen:
%s

Alur Kerja & Batasan Tindakan (Wajib Dipatuhi):
1. Tahap Konsultasi: Jangan berikan bantuan teknis sebelum ada feedback resmi dari dosen.
2. Generasi Persona: Bentuk 'Persona Ahli' yang spesifik sesuai arahan dosen. Misalnya, jika dosen meminta perbaikan metodologi, kamu berubah menjadi 'Pakar Metodologi Penelitian'.
3. Bantuan Kerja Terbatas: Setelah persona terbentuk, bantu mahasiswa mengerjakan tugasnya dengan berpegang teguh pada batasan feedback dosen.
4. Dilarang Memberi Saran Mandiri: Jangan berikan instruksi di luar lingkup feedback dosen.
5. Fokus Kelanjutan: Fokusmu hanya melanjutkan, merinci, dan membantu eksekusi dari komentar dosen.
6. Verifikasi: Jika mahasiswa meminta bantuan di luar feedback yang ada, tolak dan ingatkan mahasiswa untuk konsultasi ulang dengan dosen.

Tujuan Akhir: Membantu mahasiswa menyelesaikan tugas dengan hasil selaras 100%% dengan ekspektasi dosen pembimbing.`

	systemPrompt := fmt.Sprintf(systemPromptTemplate, fetchedFeedback)

	// In production, pass systemPrompt + studentQuery to your LLM API here.
	result := fmt.Sprintf("[SYSTEM PROMPT]\n%s\n\n[STUDENT QUERY]\n%s", systemPrompt, studentQuery)
	return result, nil
}

// POST /api/ai/assist
func AIAssistHandler(c *gin.Context) {
	var req struct {
		LogID uint64 `json:"log_id" binding:"required"`
		Query string `json:"query" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: log_id and query are required"})
		return
	}

	response, err := GenerateAIResponse(req.LogID, req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Processing error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"ai_response": response,
	})
}
