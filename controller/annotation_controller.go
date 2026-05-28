package controller

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"google.golang.org/genai"
)

// ─────────────────────────────────────────────────────────────────────────────
//  ANNOTATION OCR — GEMINI VISION
// ─────────────────────────────────────────────────────────────────────────────

var annotationOCRPrompt = `Kamu adalah asisten pembaca dokumen akademik.
Di hadapanmu adalah foto halaman skripsi/tesis yang sudah dicoret-coret atau diberi anotasi oleh dosen pembimbing.
Tugasmu adalah membaca SEMUA catatan, coretan, tulisan tangan, garis bawah, dan anotasi yang ada di halaman ini.
Kembalikan daftar terstruktur dari setiap poin koreksi yang kamu temukan, dalam Bahasa Indonesia.
Format output:
- [Lokasi/halaman jika terlihat]: Deskripsi singkat isi koreksi

Jika tidak ada anotasi yang terbaca, tulis: "(Tidak ada anotasi yang terbaca di gambar ini)"`

// processAnnotationImage sends a saved image file to Gemini Vision and returns OCR text.
// Falls back gracefully if no API key is available.
func processAnnotationImage(imagePath string, userGeminiKey string) (string, error) {
	apiKey := userGeminiKey
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}
	if apiKey == "" {
		return "(OCR tidak tersedia: GEMINI_API_KEY tidak disetel)", nil
	}

	// Read image bytes
	imgData, err := os.ReadFile(imagePath)
	if err != nil {
		return "", fmt.Errorf("failed to read annotation image: %v", err)
	}

	// Determine MIME type from extension
	ext := strings.ToLower(filepath.Ext(imagePath))
	mimeType := "image/jpeg"
	switch ext {
	case ".png":
		mimeType = "image/png"
	case ".webp":
		mimeType = "image/webp"
	case ".gif":
		mimeType = "image/gif"
	}

	fmt.Printf("\033[35m[ANNOTATION OCR] Sending %s (%.2f KB) to Gemini Vision...\033[0m\n",
		filepath.Base(imagePath), float64(len(imgData))/1024)

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: apiKey})
	if err != nil {
		return fmt.Sprintf("(OCR gagal: %v)", err), nil
	}

	content := &genai.Content{
		Parts: []*genai.Part{
			{Text: annotationOCRPrompt},
			{
				InlineData: &genai.Blob{
					MIMEType: mimeType,
					Data:     imgData,
				},
			},
		},
	}

	resp, err := client.Models.GenerateContent(ctx, "gemini-2.0-flash", []*genai.Content{content}, nil)
	if err != nil {
		fmt.Printf("\033[31m[ANNOTATION OCR] Gemini Vision failed: %v\033[0m\n", err)
		return fmt.Sprintf("(OCR gagal: %v)", err), nil
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "(OCR: Tidak ada respons dari Gemini)", nil
	}

	result := resp.Candidates[0].Content.Parts[0].Text
	fmt.Printf("\033[32m[ANNOTATION OCR] Done — %d chars extracted\033[0m\n", len(result))
	return result, nil
}
