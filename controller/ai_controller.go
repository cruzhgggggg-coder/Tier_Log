package controller

import (
	"fmt"
	"net/http"
	"strings"

	"testing_go/koneksi"
	"testing_go/models"

	"github.com/gin-gonic/gin"
)

// GenerateAIResponse handles the AI assistance logic with Guarded Assistance
func GenerateAIResponse(logID uint64, studentQuery string) (string, error) {
	var feedbackItems []models.FeedbackItem
	// Fetch only verified feedback items
	if err := koneksi.DB.Where("log_id = ? AND is_verified = ?", logID, true).Find(&feedbackItems).Error; err != nil {
		return "", err
	}

	var feedbackTexts []string
	for _, item := range feedbackItems {
		feedbackTexts = append(feedbackTexts, fmt.Sprintf("- [%s] %s", item.Category, item.Content))
	}
	verifiedFeedback := strings.Join(feedbackTexts, "\n")

	systemPrompt := fmt.Sprintf(`Peran Utama Anda: Kamu adalah asisten pendukung dosen di sistem TierLog. Tugas utamamu bukan memberikan saran mandiri atau ide baru secara acak. Kamu berfungsi sebagai jembatan yang memperluas dan mengimplementasikan feedback yang telah diberikan oleh dosen kepada mahasiswa.

Berikut adalah poin-poin feedback resmi dari dosen yang harus dikerjakan mahasiswa:
%s

Alur Kerja & Batasan Tindakan (Wajib Dipatuhi):
1. Generasi Persona: Setelah menerima feedback tersebut, kamu harus membentuk 'Persona Ahli' yang spesifik sesuai arahan dosen. Misalnya, jika dosen meminta perbaikan pada metodologi, kamu berubah menjadi persona 'Pakar Metodologi Penelitian'.
2. Bantuan Kerja Terbatas: Setelah persona terbentuk, kamu baru diperbolehkan membantu mahasiswa mengerjakan tugasnya dengan tetap berpegang teguh pada batasan feedback dosen tersebut.
3. Dilarang Memberi Saran Mandiri: Jangan memberikan instruksi yang bertentangan atau di luar lingkup feedback dosen.
4. Fokus Kelanjutan: Fokusmu hanya melanjutkan, merinci, dan membantu eksekusi dari apa yang sudah dikomentari dosen.
5. Verifikasi & Penolakan: Jika mahasiswa meminta bantuan di luar feedback yang ada, wajib tolak dan ingatkan mahasiswa untuk melakukan konsultasi ulang dengan dosen terlebih dahulu.
6. Tujuan Akhir: Membantu mahasiswa menyelesaikan tugas dengan hasil yang selaras 100%% dengan ekspektasi dan arahan dosen pembimbing.`, verifiedFeedback)

	// In a real scenario, this is where you'd call an LLM API with systemPrompt and studentQuery.
	// For this task, we return the constructed prompt as the "response" or a simulation.
	response := fmt.Sprintf("AI System Prompt Constructed:\n\n%s\n\nStudent Query: %s", systemPrompt, studentQuery)
	return response, nil
}

// POST /api/ai/assist
func AIAssistHandler(c *gin.Context) {
	var req struct {
		LogID uint64 `json:"log_id" binding:"required"`
		Query string `json:"query" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	response, err := GenerateAIResponse(req.LogID, req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI Processing error: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"ai_response": response,
	})
}
