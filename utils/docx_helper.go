package utils

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"regexp"
)

// ReadDocxText extracts raw text from a .docx file by reading word/document.xml
func ReadDocxText(path string) (string, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", err
	}
	defer r.Close()

	var documentXML *zip.File
	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			documentXML = f
			break
		}
	}

	if documentXML == nil {
		return "", fmt.Errorf("word/document.xml not found in docx")
	}

	rc, err := documentXML.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()

	var buf bytes.Buffer
	_, err = io.Copy(&buf, rc)
	if err != nil {
		return "", err
	}

	// Simple XML tag stripper to get text content
	// In a real production app, use a proper XML parser to handle <w:p>, <w:t> etc.
	// But for a cleaner, self-contained implementation as requested:
	re := regexp.MustCompile("<[^>]*>")
	
	// Handle special case: word tags often separate characters.
	// We replace </w:p> (paragraph end) with newline to maintain some structure.
	content := buf.String()
	content = regexp.MustCompile("(?i)</w:p>").ReplaceAllString(content, "\n")
	content = re.ReplaceAllString(content, "")

	return content, nil
}
