package httpapi

import "monitor-console/backend/internal/dashboard"

type dashboardResponse struct {
	GeneratedAt       string                    `json:"generatedAt"`
	Refresh           refreshMetadataResponse   `json:"refresh"`
	Page              pageInfoResponse          `json:"page"`
	ClusterSummary    clusterSummaryResponse    `json:"clusterSummary"`
	ConnectionSummary connectionSummaryResponse `json:"connectionSummary"`
	AlertsSummary     alertsSummaryResponse     `json:"alertsSummary"`
	Capabilities      capabilitiesResponse      `json:"capabilities"`
	Servers           []serverResponse          `json:"servers"`
	Connections       []connectionResponse      `json:"connections"`
	Logs              []logResponse             `json:"logs"`
}

type refreshMetadataResponse struct {
	IntervalSeconds   int    `json:"intervalSeconds"`
	StaleAfterSeconds int    `json:"staleAfterSeconds"`
	LastSuccessAt     string `json:"lastSuccessAt"`
}

type pageInfoResponse struct {
	Title         string `json:"title"`
	Subtitle      string `json:"subtitle"`
	RealtimeLabel string `json:"realtimeLabel"`
}

type clusterSummaryResponse struct {
	Total   int `json:"total"`
	Online  int `json:"online"`
	Warning int `json:"warning"`
	Offline int `json:"offline"`
}

type connectionSummaryResponse struct {
	AverageLatencyMs      int     `json:"averageLatencyMs"`
	PacketLossRatePercent float64 `json:"packetLossRatePercent"`
	BandwidthUsageGbps    float64 `json:"bandwidthUsageGbps"`
}

type alertsSummaryResponse struct {
	Critical     int `json:"critical"`
	Warning      int `json:"warning"`
	Acknowledged int `json:"acknowledged"`
}

type capabilitiesResponse struct {
	Alerts      bool `json:"alerts"`
	Trends      bool `json:"trends"`
	Diagnostics bool `json:"diagnostics"`
}

type serverResponse struct {
	ID            string               `json:"id"`
	Name          string               `json:"name"`
	IP            string               `json:"ip"`
	Type          string               `json:"type"`
	Status        string               `json:"status"`
	UptimeDays    int                  `json:"uptimeDays"`
	CPUPercent    int                  `json:"cpuPercent"`
	MemoryPercent int                  `json:"memoryPercent"`
	Position      positionResponse     `json:"position"`
	Detail        serverDetailResponse `json:"detail"`
}

type positionResponse struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type serverDetailResponse struct {
	CPUHistory    []int                 `json:"cpuHistory"`
	MemoryUsedGB  float64               `json:"memoryUsedGb"`
	MemoryTotalGB int                   `json:"memoryTotalGb"`
	DiskIOMBps    int                   `json:"diskIoMbps"`
	Disks         []diskMetricResponse  `json:"disks"`
	Network       networkMetricResponse `json:"network"`
}

type diskMetricResponse struct {
	Name         string `json:"name"`
	UsagePercent int    `json:"usagePercent"`
}

type networkMetricResponse struct {
	LatencyMs            int     `json:"latencyMs"`
	IngressMbps          int     `json:"ingressMbps"`
	EgressMbps           int     `json:"egressMbps"`
	ConnectionCount      int     `json:"connectionCount"`
	TCPRetransmitPercent float64 `json:"tcpRetransmitPercent"`
}

type connectionResponse struct {
	ID            string `json:"id"`
	From          string `json:"from"`
	To            string `json:"to"`
	Status        string `json:"status"`
	LatencyMs     int    `json:"latencyMs"`
	BandwidthMbps int    `json:"bandwidthMbps"`
}

type logResponse struct {
	ID      string `json:"id"`
	Time    string `json:"time"`
	Level   string `json:"level"`
	Source  string `json:"source"`
	Message string `json:"message"`
}

func mapDashboardSnapshot(snapshot dashboard.Snapshot) dashboardResponse {
	return dashboardResponse{
		GeneratedAt:       snapshot.GeneratedAt,
		Refresh:           mapRefreshMetadata(snapshot.Refresh),
		Page:              mapPageInfo(snapshot.Page),
		ClusterSummary:    mapClusterSummary(snapshot.ClusterSummary),
		ConnectionSummary: mapConnectionSummary(snapshot.ConnectionSummary),
		AlertsSummary:     mapAlertsSummary(snapshot.AlertsSummary),
		Capabilities:      mapCapabilities(snapshot.Capabilities),
		Servers:           mapServers(snapshot.Servers),
		Connections:       mapConnections(snapshot.Connections),
		Logs:              mapLogs(snapshot.Logs),
	}
}

func mapRefreshMetadata(metadata dashboard.RefreshMetadata) refreshMetadataResponse {
	return refreshMetadataResponse{
		IntervalSeconds:   metadata.IntervalSeconds,
		StaleAfterSeconds: metadata.StaleAfterSeconds,
		LastSuccessAt:     metadata.LastSuccessAt,
	}
}

func mapPageInfo(page dashboard.PageInfo) pageInfoResponse {
	return pageInfoResponse{
		Title:         page.Title,
		Subtitle:      page.Subtitle,
		RealtimeLabel: page.RealtimeLabel,
	}
}

func mapClusterSummary(summary dashboard.ClusterSummary) clusterSummaryResponse {
	return clusterSummaryResponse{
		Total:   summary.Total,
		Online:  summary.Online,
		Warning: summary.Warning,
		Offline: summary.Offline,
	}
}

func mapConnectionSummary(summary dashboard.ConnectionSummary) connectionSummaryResponse {
	return connectionSummaryResponse{
		AverageLatencyMs:      summary.AverageLatencyMs,
		PacketLossRatePercent: summary.PacketLossRatePercent,
		BandwidthUsageGbps:    summary.BandwidthUsageGbps,
	}
}

func mapAlertsSummary(summary dashboard.AlertsSummary) alertsSummaryResponse {
	return alertsSummaryResponse{
		Critical:     summary.Critical,
		Warning:      summary.Warning,
		Acknowledged: summary.Acknowledged,
	}
}

func mapCapabilities(capabilities dashboard.Capabilities) capabilitiesResponse {
	return capabilitiesResponse{
		Alerts:      capabilities.Alerts,
		Trends:      capabilities.Trends,
		Diagnostics: capabilities.Diagnostics,
	}
}

func mapServers(servers []dashboard.Server) []serverResponse {
	result := make([]serverResponse, 0, len(servers))
	for _, server := range servers {
		result = append(result, serverResponse{
			ID:            server.ID,
			Name:          server.Name,
			IP:            server.IP,
			Type:          server.Type,
			Status:        server.Status,
			UptimeDays:    server.UptimeDays,
			CPUPercent:    server.CPUPercent,
			MemoryPercent: server.MemoryPercent,
			Position:      mapPosition(server.Position),
			Detail:        mapServerDetail(server.Detail),
		})
	}
	return result
}

func mapPosition(position dashboard.Position) positionResponse {
	return positionResponse{X: position.X, Y: position.Y}
}

func mapServerDetail(detail dashboard.ServerDetail) serverDetailResponse {
	return serverDetailResponse{
		CPUHistory:    append([]int(nil), detail.CPUHistory...),
		MemoryUsedGB:  detail.MemoryUsedGB,
		MemoryTotalGB: detail.MemoryTotalGB,
		DiskIOMBps:    detail.DiskIOMBps,
		Disks:         mapDiskMetrics(detail.Disks),
		Network:       mapNetworkMetric(detail.Network),
	}
}

func mapDiskMetrics(disks []dashboard.DiskMetric) []diskMetricResponse {
	result := make([]diskMetricResponse, 0, len(disks))
	for _, disk := range disks {
		result = append(result, diskMetricResponse{
			Name:         disk.Name,
			UsagePercent: disk.UsagePercent,
		})
	}
	return result
}

func mapNetworkMetric(network dashboard.NetworkMetric) networkMetricResponse {
	return networkMetricResponse{
		LatencyMs:            network.LatencyMs,
		IngressMbps:          network.IngressMbps,
		EgressMbps:           network.EgressMbps,
		ConnectionCount:      network.ConnectionCount,
		TCPRetransmitPercent: network.TCPRetransmitPercent,
	}
}

func mapConnections(connections []dashboard.Connection) []connectionResponse {
	result := make([]connectionResponse, 0, len(connections))
	for _, connection := range connections {
		result = append(result, connectionResponse{
			ID:            connection.ID,
			From:          connection.From,
			To:            connection.To,
			Status:        connection.Status,
			LatencyMs:     connection.LatencyMs,
			BandwidthMbps: connection.BandwidthMbps,
		})
	}
	return result
}

func mapLogs(logs []dashboard.Log) []logResponse {
	result := make([]logResponse, 0, len(logs))
	for _, entry := range logs {
		result = append(result, logResponse{
			ID:      entry.ID,
			Time:    entry.Time,
			Level:   entry.Level,
			Source:  entry.Source,
			Message: entry.Message,
		})
	}
	return result
}
