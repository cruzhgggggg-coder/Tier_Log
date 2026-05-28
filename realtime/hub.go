package realtime

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"testing_go/auth"
	"testing_go/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Envelope struct {
	Event string `json:"event"`
	Room  string `json:"room,omitempty"`
	Data  any    `json:"data"`
}

type clientMessage struct {
	Action string `json:"action"`
	Room   string `json:"room"`
}

type Client struct {
	conn   *websocket.Conn
	user   *models.User
	mu     sync.Mutex
	rooms  map[string]bool
	closed bool
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]map[*Client]bool),
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (h *Hub) HandleWebSocket(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		token = auth.AuthorizationToken(c.GetHeader("Authorization"))
	}
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token diperlukan"})
		return
	}

	claims, err := auth.ParseAccessToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &Client{
		conn: conn,
		user: &models.User{ID: claims.UserID, Role: claims.Role},
		rooms: make(map[string]bool),
	}

	go h.readLoop(client)
	go h.pingLoop(client)
}

func (h *Hub) readLoop(client *Client) {
	defer h.disconnect(client)

	for {
		var msg clientMessage
		if err := client.conn.ReadJSON(&msg); err != nil {
			return
		}

		switch msg.Action {
		case "subscribe":
			if msg.Room != "" {
				h.subscribe(client, msg.Room)
			}
		case "unsubscribe":
			if msg.Room != "" {
				h.unsubscribe(client, msg.Room)
			}
		}
	}
}

func (h *Hub) pingLoop(client *Client) {
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		client.mu.Lock()
		if client.closed {
			client.mu.Unlock()
			return
		}
		err := client.conn.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(10*time.Second))
		client.mu.Unlock()
		if err != nil {
			h.disconnect(client)
			return
		}
	}
}

func (h *Hub) disconnect(client *Client) {
	client.mu.Lock()
	if client.closed {
		client.mu.Unlock()
		return
	}
	client.closed = true
	client.mu.Unlock()

	h.mu.Lock()
	for room := range client.rooms {
		if clients, ok := h.rooms[room]; ok {
			delete(clients, client)
			if len(clients) == 0 {
				delete(h.rooms, room)
			}
		}
	}
	h.mu.Unlock()

	_ = client.conn.Close()
}

func (h *Hub) subscribe(client *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.rooms[room]; !ok {
		h.rooms[room] = make(map[*Client]bool)
	}
	h.rooms[room][client] = true
	client.rooms[room] = true
}

func (h *Hub) unsubscribe(client *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.rooms[room]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.rooms, room)
		}
	}
	delete(client.rooms, room)
}

func (h *Hub) Broadcast(room, event string, data any) {
	payload, err := json.Marshal(Envelope{
		Event: event,
		Room:  room,
		Data:  data,
	})
	if err != nil {
		return
	}

	h.mu.RLock()
	clients := h.rooms[room]
	h.mu.RUnlock()

	for client := range clients {
		client.mu.Lock()
		if client.closed {
			client.mu.Unlock()
			continue
		}
		err := client.conn.WriteMessage(websocket.TextMessage, payload)
		client.mu.Unlock()
		if err != nil {
			h.disconnect(client)
		}
	}
}
