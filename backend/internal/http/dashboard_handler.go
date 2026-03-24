package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"monitor-console/backend/internal/dashboard"
)

type Handler struct {
	service *dashboard.Service
}

func NewHandler(service *dashboard.Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) Dashboard(w http.ResponseWriter, _ *http.Request) {
	snapshot := h.service.Snapshot(time.Now())
	writeJSON(w, http.StatusOK, mapDashboardSnapshot(snapshot))
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
