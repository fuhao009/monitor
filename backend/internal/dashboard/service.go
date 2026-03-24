package dashboard

import (
	"fmt"
	"strings"
	"time"
)

type Service struct{}

const (
	refreshIntervalSeconds   = 3
	refreshStaleAfterSeconds = 9
)

func NewService() *Service {
	return &Service{}
}

func (s *Service) Snapshot(now time.Time) Snapshot {
	base := seededSnapshot()
	step := now.Second()%7 + 1

	for i := range base.Servers {
		if base.Servers[i].Status == "offline" {
			continue
		}
		delta := (step + i) % 5
		if i%2 == 0 {
			base.Servers[i].CPUPercent = clamp(base.Servers[i].CPUPercent+delta-2, 5, 95)
			base.Servers[i].MemoryPercent = clamp(base.Servers[i].MemoryPercent+delta-1, 10, 95)
		} else {
			base.Servers[i].CPUPercent = clamp(base.Servers[i].CPUPercent-delta+2, 5, 95)
			base.Servers[i].MemoryPercent = clamp(base.Servers[i].MemoryPercent-delta+1, 10, 95)
		}
		base.Servers[i].Detail.MemoryUsedGB = float64(base.Servers[i].MemoryPercent) * float64(base.Servers[i].Detail.MemoryTotalGB) / 100
		base.Servers[i].Detail.Network.LatencyMs = maxInt(1, base.Servers[i].Detail.Network.LatencyMs+(i%3)-1)
		base.Servers[i].Detail.CPUHistory = rollHistory(base.Servers[i].Detail.CPUHistory, base.Servers[i].CPUPercent)
	}

	latencySum := 0
	activeCount := 0
	for i := range base.Connections {
		if base.Connections[i].Status == "offline" {
			continue
		}
		base.Connections[i].LatencyMs = maxInt(1, base.Connections[i].LatencyMs+((step+i)%5)-2)
		latencySum += base.Connections[i].LatencyMs
		activeCount++
	}

	if activeCount > 0 {
		base.ConnectionSummary.AverageLatencyMs = latencySum / activeCount
	}
	base.ConnectionSummary.PacketLossRatePercent = 0.01 + float64(step%3)/100
	base.ConnectionSummary.BandwidthUsageGbps = 1.2 + float64(step%4)/10
	base.ClusterSummary = summarize(base.Servers)
	base.GeneratedAt = now.Format(time.RFC3339)
	base.Refresh = RefreshMetadata{
		IntervalSeconds:   refreshIntervalSeconds,
		StaleAfterSeconds: refreshStaleAfterSeconds,
		LastSuccessAt:     base.GeneratedAt,
	}
	base.Logs = append([]Log{{
		ID:      fmt.Sprintf("log-live-%d", now.Unix()),
		Time:    now.Format(time.RFC3339),
		Level:   []string{"info", "warning", "info", "error"}[step%4],
		Source:  []string{"系统", "网络", "连接", "数据库"}[step%4],
		Message: []string{"CPU 使用率波动", "网络延迟增加", "新连接建立", "数据库查询队列堆积 > 100"}[step%4],
	}}, base.Logs...)
	if len(base.Logs) > 20 {
		base.Logs = base.Logs[:20]
	}
	base.AlertsSummary = summarizeAlerts(base.Servers, base.Connections, base.Logs)
	base.Capabilities = Capabilities{
		Alerts:      true,
		Trends:      false,
		Diagnostics: false,
	}

	return base
}

func summarize(servers []Server) ClusterSummary {
	result := ClusterSummary{Total: len(servers)}
	for _, server := range servers {
		switch server.Status {
		case "online":
			result.Online++
		case "warning":
			result.Warning++
		case "offline":
			result.Offline++
		}
	}
	return result
}

func summarizeAlerts(servers []Server, connections []Connection, logs []Log) AlertsSummary {
	result := AlertsSummary{}

	for _, server := range servers {
		switch server.Status {
		case "offline":
			result.Critical++
		case "warning":
			result.Warning++
		}
	}

	for _, connection := range connections {
		if connection.Status == "offline" {
			result.Warning++
		}
	}

	for _, entry := range logs {
		if strings.Contains(entry.Message, "恢复") || strings.Contains(entry.Message, "已确认") {
			result.Acknowledged++
		}
	}

	return result
}

func rollHistory(values []int, next int) []int {
	if len(values) == 0 {
		return []int{next}
	}
	result := append(values[1:], next)
	return result
}

func clamp(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
