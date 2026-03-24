package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"monitor-console/backend/internal/dashboard"
)

func TestHealthEndpoint(t *testing.T) {
	h := NewHandler(dashboard.NewService())
	req := httptest.NewRequest(http.MethodGet, "/api/healthz", nil)
	w := httptest.NewRecorder()

	h.Health(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestDashboardEndpoint(t *testing.T) {
	h := NewHandler(dashboard.NewService())
	req := httptest.NewRequest(http.MethodGet, "/api/dashboard", nil)
	w := httptest.NewRecorder()

	h.Dashboard(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if got := w.Body.String(); got == "" {
		t.Fatal("expected response body")
	}

	var response dashboardResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected valid JSON response, got error %v", err)
	}
	if response.GeneratedAt == "" {
		t.Fatal("expected generatedAt in dashboard response")
	}
	if response.Refresh.IntervalSeconds != 3 {
		t.Fatalf("expected refresh interval 3, got %d", response.Refresh.IntervalSeconds)
	}
	if response.Refresh.StaleAfterSeconds != 9 {
		t.Fatalf("expected staleAfterSeconds 9, got %d", response.Refresh.StaleAfterSeconds)
	}
	if response.Refresh.LastSuccessAt != response.GeneratedAt {
		t.Fatalf("expected lastSuccessAt %q, got %q", response.GeneratedAt, response.Refresh.LastSuccessAt)
	}
	if response.AlertsSummary.Critical != 1 {
		t.Fatalf("expected 1 critical alert, got %d", response.AlertsSummary.Critical)
	}
	if response.AlertsSummary.Warning != 3 {
		t.Fatalf("expected 3 warning alerts, got %d", response.AlertsSummary.Warning)
	}
	if response.AlertsSummary.Acknowledged != 1 {
		t.Fatalf("expected 1 acknowledged alert, got %d", response.AlertsSummary.Acknowledged)
	}
	if !response.Capabilities.Alerts {
		t.Fatal("expected alerts capability enabled")
	}
	if response.Capabilities.Trends {
		t.Fatal("expected trends capability disabled")
	}
	if response.Capabilities.Diagnostics {
		t.Fatal("expected diagnostics capability disabled")
	}
}
