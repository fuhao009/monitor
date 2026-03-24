package httpapi

import (
	"net/http"

	"monitor-console/backend/internal/dashboard"
)

func NewRouter() http.Handler {
	h := NewHandler(dashboard.NewService())
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/healthz", h.Health)
	mux.HandleFunc("GET /api/dashboard", h.Dashboard)
	return mux
}
