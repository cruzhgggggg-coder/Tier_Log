package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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
Kamu WAJIB mengembalikan output dalam format JSON dengan struktur:
{
  "feedbacks": [
    {"content": "...", "category": "HOC"},
    {"content": "...", "category": "LOC"}
  ]
}`

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

const feedbackPlaceholder = "[INJECT_FETCHED_FEEDBACK_ITEMS_HERE]"
const transcriptPlaceholder = "[INJECT_ORIGINAL_TRANSCRIPT_HERE]"

// ─────────────────────────────────────────────────────────────────────────────
//  GROQ API LOGIC (AUDIO TO TEXT) — with chunking for long recordings
// ─────────────────────────────────────────────────────────────────────────────

const (
	// maxChunkBytes: Groq hard-limit is 25 MB; we use 20 MB to stay safely below it
	maxChunkBytes int64 = 20 * 1024 * 1024 // 20 MB
	// groqTimeout: 5 minutes per chunk request to handle slow networks or long audio
	groqTimeout = 300 * time.Second
)

// transcribeChunk sends a single raw audio byte slice to Groq Whisper and returns the transcript text.
func transcribeChunk(apiKey string, audioData []byte, filename string) (string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(part, bytes.NewReader(audioData)); err != nil {
		return "", err
	}

	writer.WriteField("model", "whisper-large-v3")
	writer.WriteField("response_format", "text")
	writer.WriteField("language", "id")
	writer.Close()

	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/audio/transcriptions", body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: groqTimeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Groq API error (%d): %s", resp.StatusCode, string(respBody))
	}
	return string(respBody), nil
}

// transcribeAudio reads the audio file, optionally splits it into ≤20 MB byte chunks,
// transcribes each chunk via Groq Whisper, and returns the stitched full transcript.
func transcribeAudio(audioPath string) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		fmt.Println("\033[31m[GROQ STT] Warning: GROQ_API_KEY is not set in .env. Audio transcription is disabled.\033[0m")
		return "Transkripsi dinonaktifkan: GROQ_API_KEY belum dikonfigurasi oleh administrator server.", nil
	}

	audioData, err := os.ReadFile(audioPath)
	if err != nil {
		return "", fmt.Errorf("failed to read audio file: %v", err)
	}

	ext := filepath.Ext(audioPath)
	totalSize := int64(len(audioData))

	fmt.Printf("\033[36m[GROQ STT] File: %s | Size: %.2f MB\033[0m\n",
		filepath.Base(audioPath), float64(totalSize)/(1024*1024))

	// ── Fast path: file fits in a single request ─────────────────────────────
	if totalSize <= maxChunkBytes {
		fmt.Printf("\033[36m[GROQ STT] Single-chunk mode — sending directly to Whisper...\033[0m\n")
		return transcribeChunk(apiKey, audioData, filepath.Base(audioPath))
	}

	// ── Chunked path: split file into ≤20 MB byte slices ────────────────────
	totalChunks := int((totalSize + maxChunkBytes - 1) / maxChunkBytes) // ceiling division
	fmt.Printf("\033[33m[GROQ STT] File exceeds 20 MB — splitting into %d chunks...\033[0m\n", totalChunks)

	var transcripts []string
	var offset int64
	chunkNum := 0

	for offset < totalSize {
		end := offset + maxChunkBytes
		if end > totalSize {
			end = totalSize
		}

		chunk := audioData[offset:end]
		chunkNum++
		chunkSizeMB := float64(len(chunk)) / (1024 * 1024)
		chunkFilename := fmt.Sprintf("chunk_%d_of_%d%s", chunkNum, totalChunks, ext)

		fmt.Printf("\033[36m[GROQ STT] Chunk %d/%d (%.2f MB) — transcribing...\033[0m\n",
			chunkNum, totalChunks, chunkSizeMB)

		text, err := transcribeChunk(apiKey, chunk, chunkFilename)
		if err != nil {
			return "", fmt.Errorf("[GROQ STT] chunk %d/%d failed: %v", chunkNum, totalChunks, err)
		}

		trimmed := strings.TrimSpace(text)
		if trimmed != "" {
			transcripts = append(transcripts, trimmed)
		}
		fmt.Printf("\033[32m[GROQ STT] Chunk %d/%d done — %d chars transcribed\033[0m\n",
			chunkNum, totalChunks, len(trimmed))

		offset = end
	}

	fullTranscript := strings.Join(transcripts, " ")
	fmt.Printf("\033[32m[GROQ STT] All %d chunks done — total transcript: %d chars\033[0m\n",
		totalChunks, len(fullTranscript))

	return fullTranscript, nil
}

// ─────────────────────────────────────────────────────────────────────────────
//  NVIDIA NIM API LOGIC
// ─────────────────────────────────────────────────────────────────────────────

type NVIDIARequest struct {
	Model          string          `json:"model"`
	Messages       []NVIDIAMessage `json:"messages"`
	ResponseFormat *struct {
		Type string `json:"type"`
	} `json:"response_format,omitempty"`
}

type NVIDIAMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type NVIDIAResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func callNVIDIA(apiKey, model, systemPrompt, userPrompt string, isJSON bool) (string, error) {
	if apiKey == "" {
		apiKey = os.Getenv("NVIDIA_API_KEY")
	}
	if apiKey == "" {
		return "", errors.New("NVIDIA_API_KEY is not set")
	}

	if model == "" {
		model = "meta/llama-3.1-70b-instruct"
	}

	fmt.Printf("\033[34m[NVIDIA NIM] Initiating request (Model: %s)...\033[0m\n", model)

	url := "https://integrate.api.nvidia.com/v1/chat/completions"
	
	reqBody := NVIDIARequest{
		Model: model,
		Messages: []NVIDIAMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	}
	
	if isJSON {
		reqBody.ResponseFormat = &struct {
			Type string `json:"type"`
		}{Type: "json_object"}
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("\033[31m[NVIDIA NIM] Request Failed: %v\033[0m\n", err)
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("\033[32m[NVIDIA NIM] Response Received! Status: %d, Size: %d bytes\033[0m\n", resp.StatusCode, len(body))

	if resp.StatusCode != http.StatusOK {
		// Auto-fallback: if model is deprecated/missing (404/400) and we're not already on the fallback model
		if (resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusBadRequest) && model != "meta/llama-3.1-70b-instruct" {
			fmt.Printf("\033[33m[NVIDIA NIM] Model '%s' failed with status %d. Retrying with fallback model 'meta/llama-3.1-70b-instruct'...\033[0m\n", model, resp.StatusCode)
			return callNVIDIA(apiKey, "meta/llama-3.1-70b-instruct", systemPrompt, userPrompt, isJSON)
		}

		// Fallback for models that do not support json_object format (e.g. Bytedance Seed OSS)
		if isJSON && reqBody.ResponseFormat != nil {
			fmt.Printf("\033[33m[NVIDIA NIM] Retrying without JSON response_format...\033[0m\n")
			reqBody.ResponseFormat = nil
			retryJsonData, _ := json.Marshal(reqBody)
			retryReq, _ := http.NewRequest("POST", url, bytes.NewBuffer(retryJsonData))
			retryReq.Header.Set("Content-Type", "application/json")
			retryReq.Header.Set("Authorization", "Bearer "+apiKey)
			
			retryResp, err := client.Do(retryReq)
			if err == nil {
				defer retryResp.Body.Close()
				retryBody, _ := io.ReadAll(retryResp.Body)
				if retryResp.StatusCode == http.StatusOK {
					var retryNvidiaResp NVIDIAResponse
					if err := json.Unmarshal(retryBody, &retryNvidiaResp); err == nil && len(retryNvidiaResp.Choices) > 0 {
						return retryNvidiaResp.Choices[0].Message.Content, nil
					}
				}
				// If retry fails, continue to original error
				body = retryBody
				resp.StatusCode = retryResp.StatusCode
			}
		}
		return "", fmt.Errorf("NVIDIA API error (%d): %s", resp.StatusCode, string(body))
	}

	var nvidiaResp NVIDIAResponse
	if err := json.Unmarshal(body, &nvidiaResp); err != nil {
		return "", err
	}

	if len(nvidiaResp.Choices) == 0 {
		return "", errors.New("NVIDIA returned no choices")
	}

	return nvidiaResp.Choices[0].Message.Content, nil
}

func callAnthropic(apiKey, model, systemPrompt, userPrompt string) (string, error) {
	if apiKey == "" {
		apiKey = os.Getenv("ANTHROPIC_API_KEY")
	}
	if apiKey == "" {
		return "", errors.New("ANTHROPIC_API_KEY is not set")
	}

	if model == "" {
		model = "claude-3-5-sonnet-20240620"
	}

	fmt.Printf("\033[36m[ANTHROPIC AI] Initiating request (Model: %s)...\033[0m\n", model)

	url := "https://api.anthropic.com/v1/messages"
	
	reqBody := struct {
		Model     string `json:"model"`
		MaxTokens int    `json:"max_tokens"`
		System    string `json:"system"`
		Messages  []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"messages"`
	}{
		Model:     model,
		MaxTokens: 4096,
		System:    systemPrompt,
		Messages: []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		}{
			{Role: "user", Content: userPrompt},
		},
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Anthropic API error (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if len(result.Content) == 0 {
		return "", errors.New("Anthropic returned no content")
	}

	return result.Content[0].Text, nil
}

func callAI(user *models.User, systemPrompt, userPrompt string, isJSON bool) (string, error) {
	provider := strings.ToLower(os.Getenv("AI_PROVIDER"))
	model := ""
	apiKey := ""

	// AI Gateway Logic: Override if user has keys (Bypassed IsGatewayActive check for testing)
	if user != nil {
		if user.PreferredModel != "" && user.PreferredModel != "default" {
			parts := strings.Split(user.PreferredModel, ":")
			if len(parts) == 2 {
				provider = strings.ToLower(parts[0])
				model = parts[1]
			}
		}

		// Pick the right key
		switch provider {
		case "openai":
			apiKey = user.OpenAIKey
		case "nvidia":
			apiKey = user.NvidiaKey
		case "gemini":
			apiKey = user.GeminiKey
		case "anthropic":
			apiKey = user.AnthropicKey
		}
	}

	switch provider {
	case "gemini":
		return callGemini(apiKey, model, systemPrompt, userPrompt, isJSON)
	case "anthropic":
		return callAnthropic(apiKey, model, systemPrompt, userPrompt)
	case "openai":
		// We can reuse NVIDIA logic for OpenAI as it's compatible
		return callOpenAI(apiKey, model, systemPrompt, userPrompt, isJSON)
	case "nvidia":
		return callNVIDIA(apiKey, model, systemPrompt, userPrompt, isJSON)
	default:
		// Default to system NVIDIA
		return callNVIDIA("", "", systemPrompt, userPrompt, isJSON)
	}
}

// Helper to use NVIDIA-style call for generic OpenAI compatible APIs
func callOpenAI(apiKey, model, systemPrompt, userPrompt string, isJSON bool) (string, error) {
	if apiKey == "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	}
	if model == "" {
		model = "gpt-4o"
	}

	url := "https://api.openai.com/v1/chat/completions"
	
	reqBody := NVIDIARequest{
		Model: model,
		Messages: []NVIDIAMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	}
	
	if isJSON {
		reqBody.ResponseFormat = &struct {
			Type string `json:"type"`
		}{Type: "json_object"}
	}

	jsonData, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI API error (%d): %s", resp.StatusCode, string(body))
	}

	var nvidiaResp NVIDIAResponse
	json.Unmarshal(body, &nvidiaResp)

	if len(nvidiaResp.Choices) == 0 {
		return "", errors.New("OpenAI returned no choices")
	}

	return nvidiaResp.Choices[0].Message.Content, nil
}

func callGemini(apiKey, model, systemPrompt, userPrompt string, isJSON bool) (string, error) {
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}
	if apiKey == "" {
		return "", errors.New("GEMINI_API_KEY is not set")
	}

	if model == "" {
		model = "gemini-2.0-flash"
	}

	fmt.Printf("\033[35m[GEMINI AI] Initiating request (Model: %s)...\033[0m\n", model)

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		fmt.Printf("\033[31m[GEMINI AI] Failed to create client: %v\033[0m\n", err)
		return "", fmt.Errorf("failed to create Gemini client: %v", err)
	}

	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: systemPrompt}},
		},
	}

	if isJSON {
		config.ResponseMIMEType = "application/json"
	}

	content := &genai.Content{
		Parts: []*genai.Part{{Text: userPrompt}},
	}

	resp, err := client.Models.GenerateContent(ctx, model, []*genai.Content{content}, config)
	if err != nil {
		if isJSON {
			config.ResponseMIMEType = ""
			resp, err = client.Models.GenerateContent(ctx, model, []*genai.Content{content}, config)
		}
		if err != nil {
			fmt.Printf("\033[31m[GEMINI AI] Request Failed: %v\033[0m\n", err)
			return "", fmt.Errorf("Gemini API error: %v", err)
		}
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("Gemini returned no content")
	}

	return resp.Candidates[0].Content.Parts[0].Text, nil
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANALYSIS LOGIC (GROQ + NVIDIA)
// ─────────────────────────────────────────────────────────────────────────────

type FeedbackResponse struct {
	Content  string `json:"content"`
	Category string `json:"category"`
}

func AnalyzeAudioAndPaper(userID uint64, audioPath, paperText, prevFeedback string) ([]models.FeedbackItem, string, error) {
	// Fetch user for AI Gateway settings
	var user models.User
	koneksi.DB.First(&user, userID)

	// 1. Convert Audio to Text using Groq Whisper
	transcript, err := transcribeAudio(audioPath)
	if err != nil {
		fmt.Printf("Warning: Transcription failed: %v\n", err)
		transcript = "Transkripsi Audio Gagal: " + err.Error()
	}

	// 2. Analyze the Transcript and Paper with AI
	systemPrompt := personaDosenPrompt
	
	consistencyContext := ""
	if prevFeedback != "" {
		consistencyContext = fmt.Sprintf("\n\nKONTEKS REVISI (Feedback Sesi Sebelumnya):\n%s\n\nTugas tambahanmu: Cek apakah mahasiswa sudah memperbaiki poin-poin di atas dalam draf baru ini. Jika belum, sertakan kembali dalam daftar feedback.", prevFeedback)
	}

	userPrompt := fmt.Sprintf("Berikut adalah transkrip audio bimbingan dosen:\n\"%s\"\n\nDan ini adalah paper mahasiswa:\n\n%s%s\n\nBerikan analisis revisi (HOC/LOC) berdasarkan transkrip tersebut.", transcript, paperText, consistencyContext)

	rawResponse, err := callAI(&user, systemPrompt, userPrompt, true)
	if err != nil {
		return nil, transcript, err
	}

	// Clean up markdown code blocks if present
	cleanJSON := strings.TrimSpace(rawResponse)
	if strings.HasPrefix(cleanJSON, "```json") {
		cleanJSON = strings.TrimPrefix(cleanJSON, "```json")
		cleanJSON = strings.TrimSuffix(cleanJSON, "```")
	} else if strings.HasPrefix(cleanJSON, "```") {
		cleanJSON = strings.TrimPrefix(cleanJSON, "```")
		cleanJSON = strings.TrimSuffix(cleanJSON, "```")
	}
	cleanJSON = strings.TrimSpace(cleanJSON)

	var aiResponse struct {
		Feedbacks []FeedbackResponse `json:"feedbacks"`
	}

	if err := json.Unmarshal([]byte(cleanJSON), &aiResponse); err != nil {
		start := strings.Index(cleanJSON, "{")
		end := strings.LastIndex(cleanJSON, "}")
		if start != -1 && end != -1 && end > start {
			if err2 := json.Unmarshal([]byte(cleanJSON[start:end+1]), &aiResponse); err2 == nil {
				goto PROCESS
			}
		}
		return nil, transcript, fmt.Errorf("failed to parse AI response: %w. Raw: %s", err, rawResponse)
	}

PROCESS:
	var items []models.FeedbackItem
	for _, f := range aiResponse.Feedbacks {
		category := models.CategoryMinor
		catUpper := strings.ToUpper(f.Category)
		if catUpper == "HOC" || catUpper == "MAJOR" {
			category = models.CategoryMajor
		}
		items = append(items, models.FeedbackItem{
			Content:  f.Content,
			Category: category,
			Status:   models.StatusPending,
		})
	}

	return items, transcript, nil
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONVERSATIONAL ASSISTANCE
// ─────────────────────────────────────────────────────────────────────────────

func GenerateRevisionAssistance(logID uint64, studentQuery string, modelOverride string) (string, error) {
	var log models.ConsultationLog
	if err := koneksi.DB.Preload("FeedbackItems").Preload("Student.User").First(&log, logID).Error; err != nil {
		return "", fmt.Errorf("database error: %w", err)
	}

	if len(log.FeedbackItems) == 0 {
		return "", errors.New("GUARDED: Belum ada feedback resmi.")
	}

	var feedbackLines []string
	for i, item := range log.FeedbackItems {
		feedbackLines = append(feedbackLines, fmt.Sprintf("%d. [%s] %s", i+1, item.Category, item.Content))
	}
	formattedFeedback := strings.Join(feedbackLines, "\n")

	finalSystemPrompt := strings.ReplaceAll(systemPromptTemplate, feedbackPlaceholder, formattedFeedback)
	finalSystemPrompt = strings.ReplaceAll(finalSystemPrompt, transcriptPlaceholder, log.TranscriptText)

	// Apply model override if provided
	user := log.Student.User
	if modelOverride != "" && modelOverride != "default" {
		user.PreferredModel = modelOverride
		user.IsGatewayActive = true // Force active if a specific model is chosen
	}

	return callAI(user, finalSystemPrompt, studentQuery, false)
}

// ─────────────────────────────────────────────────────────────────────────────
//  HTTP HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

func AIAssistHandler(c *gin.Context) {
	var req struct {
		LogID uint64 `json:"log_id" binding:"required"`
		Query string `json:"query"  binding:"required"`
		Model string `json:"model"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	response, err := GenerateRevisionAssistance(req.LogID, req.Query, req.Model)
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

func GetAIModels(c *gin.Context) {
	provider := c.Query("provider")
	apiKey := c.Query("api_key")

	if provider != "nvidia" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only nvidia provider supports dynamic models currently"})
		return
	}

	if apiKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "api_key is required"})
		return
	}

	req, _ := http.NewRequest("GET", "https://integrate.api.nvidia.com/v1/models", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}

	var response struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode models response"})
		return
	}

	var models []string
	for _, m := range response.Data {
		models = append(models, m.ID)
	}

	c.JSON(http.StatusOK, gin.H{"models": models})
}
