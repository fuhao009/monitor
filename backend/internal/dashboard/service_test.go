package dashboard

import (
	"testing"
	"time"
)

func TestSnapshotContainsExpectedSections(t *testing.T) {
	service := NewService()
	snapshot := service.Snapshot(time.Date(2026, 3, 16, 13, 2, 0, 0, time.FixedZone("CST", 8*3600)))

	if snapshot.Page.Title == "" {
		t.Fatal("expected page title")
	}
	if snapshot.GeneratedAt != "2026-03-16T13:02:00+08:00" {
		t.Fatalf("expected generatedAt to match request time, got %q", snapshot.GeneratedAt)
	}
	if snapshot.Refresh.IntervalSeconds != 3 {
		t.Fatalf("expected refresh interval 3, got %d", snapshot.Refresh.IntervalSeconds)
	}
	if snapshot.Refresh.StaleAfterSeconds != 9 {
		t.Fatalf("expected staleAfterSeconds 9, got %d", snapshot.Refresh.StaleAfterSeconds)
	}
	if snapshot.Refresh.LastSuccessAt != snapshot.GeneratedAt {
		t.Fatalf("expected lastSuccessAt %q, got %q", snapshot.GeneratedAt, snapshot.Refresh.LastSuccessAt)
	}
	if snapshot.AlertsSummary.Critical != 1 {
		t.Fatalf("expected 1 critical alert, got %d", snapshot.AlertsSummary.Critical)
	}
	if snapshot.AlertsSummary.Warning != 3 {
		t.Fatalf("expected 3 warning alerts, got %d", snapshot.AlertsSummary.Warning)
	}
	if snapshot.AlertsSummary.Acknowledged != 1 {
		t.Fatalf("expected 1 acknowledged alert, got %d", snapshot.AlertsSummary.Acknowledged)
	}
	if !snapshot.Capabilities.Alerts {
		t.Fatal("expected alerts capability enabled")
	}
	if snapshot.Capabilities.Trends {
		t.Fatal("expected trends capability disabled")
	}
	if snapshot.Capabilities.Diagnostics {
		t.Fatal("expected diagnostics capability disabled")
	}
	if len(snapshot.Servers) != 8 {
		t.Fatalf("expected 8 servers, got %d", len(snapshot.Servers))
	}
	if len(snapshot.Connections) != 11 {
		t.Fatalf("expected 11 connections, got %d", len(snapshot.Connections))
	}
	if len(snapshot.Logs) == 0 {
		t.Fatal("expected logs")
	}
}
