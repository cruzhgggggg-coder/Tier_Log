package utils

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"regexp"
	"strings"
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
	re := regexp.MustCompile("<[^>]*>")
	
	// Handle special case: word tags often separate characters.
	// We replace </w:p> (paragraph end) with newline to maintain some structure.
	content := buf.String()
	content = regexp.MustCompile("(?i)</w:p>").ReplaceAllString(content, "\n")
	content = re.ReplaceAllString(content, "")

	return content, nil
}

// ExtractDocxTrackChanges parses a .docx file for tracked changes (w:ins) and comments.
// Returns a structured text summary of all additions and comments by the reviewer (dosen).
func ExtractDocxTrackChanges(path string) (string, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", err
	}
	defer r.Close()

	// 1. Extract tracked insertions from word/document.xml (w:ins tags)
	var insertions []string
	for _, f := range r.File {
		if f.Name != "word/document.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			break
		}
		var buf bytes.Buffer
		io.Copy(&buf, rc)
		rc.Close()

		content := buf.String()
		// Find all <w:ins ...>...</w:ins> blocks
		insRe := regexp.MustCompile(`(?s)<w:ins[^>]*>(.*?)</w:ins>`)
		matches := insRe.FindAllStringSubmatch(content, -1)
		tagRe := regexp.MustCompile(`<[^>]*>`)
		for _, m := range matches {
			text := strings.TrimSpace(tagRe.ReplaceAllString(m[1], ""))
			if text != "" {
				insertions = append(insertions, "+ "+text)
			}
		}
		break
	}

	// 2. Extract comments from word/comments.xml
	var comments []string
	for _, f := range r.File {
		if f.Name != "word/comments.xml" {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			break
		}
		var buf bytes.Buffer
		io.Copy(&buf, rc)
		rc.Close()

		content := buf.String()
		// Each <w:comment ...> block is one comment
		commentRe := regexp.MustCompile(`(?s)<w:comment\s[^>]*w:author="([^"]+)"[^>]*>(.*?)</w:comment>`)
		matches := commentRe.FindAllStringSubmatch(content, -1)
		tagRe := regexp.MustCompile(`<[^>]*>`)
		for i, m := range matches {
			author := m[1]
			text := strings.TrimSpace(tagRe.ReplaceAllString(m[2], ""))
			if text != "" {
				comments = append(comments, fmt.Sprintf("Comment #%d (%s): %s", i+1, author, text))
			}
		}
		break
	}

	// 3. Build summary
	var parts []string
	if len(insertions) > 0 {
		parts = append(parts, "=== INSERTED TEXT (Track Changes) ===")
		parts = append(parts, strings.Join(insertions, "\n"))
	}
	if len(comments) > 0 {
		parts = append(parts, "=== LECTURER COMMENTS ===")
		parts = append(parts, strings.Join(comments, "\n"))
	}
	if len(parts) == 0 {
		return "(No track changes or comments found in this document)", nil
	}
	return strings.Join(parts, "\n\n"), nil
}
