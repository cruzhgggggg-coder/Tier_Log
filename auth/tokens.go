package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"testing_go/models"
)

type AccessClaims struct {
	UserID uint64          `json:"sub"`
	Role   models.UserRole `json:"role"`
	Type   string          `json:"type"`
	Exp    int64           `json:"exp"`
	Iat    int64           `json:"iat"`
}

func jwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "tierlog-dev-secret"
	}
	return []byte(secret)
}

func accessTTL() time.Duration {
	return 2 * time.Hour
}

func refreshTTL() time.Duration {
	return 7 * 24 * time.Hour
}

func CreateAccessToken(user *models.User) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(accessTTL())
	claims := AccessClaims{
		UserID: user.ID,
		Role:   user.Role,
		Type:   "access",
		Exp:    expiresAt.Unix(),
		Iat:    now.Unix(),
	}

	headerBytes, _ := json.Marshal(map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	})
	payloadBytes, _ := json.Marshal(claims)

	header := base64.RawURLEncoding.EncodeToString(headerBytes)
	payload := base64.RawURLEncoding.EncodeToString(payloadBytes)
	signingInput := header + "." + payload

	mac := hmac.New(sha256.New, jwtSecret())
	if _, err := mac.Write([]byte(signingInput)); err != nil {
		return "", time.Time{}, err
	}
	signature := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return signingInput + "." + signature, expiresAt, nil
}

func ParseAccessToken(token string) (*AccessClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid token format")
	}

	signingInput := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, jwtSecret())
	if _, err := mac.Write([]byte(signingInput)); err != nil {
		return nil, err
	}
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return nil, errors.New("invalid token signature")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}

	var claims AccessClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, err
	}
	if claims.Type != "access" {
		return nil, errors.New("invalid token type")
	}
	if time.Now().Unix() >= claims.Exp {
		return nil, errors.New("token expired")
	}

	return &claims, nil
}

func CreateRefreshToken() (string, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}

	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	return token, hex.EncodeToString(hash[:]), nil
}

func HashRefreshToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func TokenBundle(user *models.User) (map[string]any, string, time.Time, error) {
	accessToken, accessExpiresAt, err := CreateAccessToken(user)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	refreshToken, _, err := CreateRefreshToken()
	if err != nil {
		return nil, "", time.Time{}, err
	}

	return map[string]any{
		"access_token": accessToken,
		"token_type":   "Bearer",
		"expires_at":   accessExpiresAt,
	}, refreshToken, time.Now().Add(refreshTTL()), nil
}

func RefreshExpiry() time.Time {
	return time.Now().Add(refreshTTL())
}

func AuthorizationToken(header string) string {
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func RefreshTokenFromHeader(header string) string {
	return strings.TrimSpace(header)
}

func RefreshCookieName() string {
	return "tierlog_refresh_token"
}

func ClientFingerprint(userAgent, ip string) string {
	return fmt.Sprintf("%s|%s", userAgent, ip)
}
