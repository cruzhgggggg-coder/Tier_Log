package middleware

import (
	"net/http"

	"testing_go/auth"
	"testing_go/koneksi"
	"testing_go/models"

	"github.com/gin-gonic/gin"
)

const userContextKey = "currentUser"

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := auth.AuthorizationToken(c.GetHeader("Authorization"))
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization token is required"})
			return
		}

		claims, err := auth.ParseAccessToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		if err := koneksi.DB.Preload("Student").Preload("Lecturer").First(&user, claims.UserID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		c.Set(userContextKey, &user)
		c.Next()
	}
}

func CurrentUser(c *gin.Context) *models.User {
	value, ok := c.Get(userContextKey)
	if !ok {
		return nil
	}

	user, _ := value.(*models.User)
	return user
}
