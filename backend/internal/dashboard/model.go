package dashboard

type PageInfo struct {
	Title         string `json:"title"`
	Subtitle      string `json:"subtitle"`
	RealtimeLabel string `json:"realtimeLabel"`
}

type ClusterSummary struct {
	Total   int `json:"total"`
	Online  int `json:"online"`
	Warning int `json:"warning"`
	Offline int `json:"offline"`
}

type ConnectionSummary struct {
	AverageLatencyMs      int     `json:"averageLatencyMs"`
	PacketLossRatePercent float64 `json:"packetLossRatePercent"`
	BandwidthUsageGbps    float64 `json:"bandwidthUsageGbps"`
}

type RefreshMetadata struct {
	IntervalSeconds   int    `json:"intervalSeconds"`
	StaleAfterSeconds int    `json:"staleAfterSeconds"`
	LastSuccessAt     string `json:"lastSuccessAt"`
}

type AlertsSummary struct {
	Critical     int `json:"critical"`
	Warning      int `json:"warning"`
	Acknowledged int `json:"acknowledged"`
}

type Capabilities struct {
	Alerts      bool `json:"alerts"`
	Trends      bool `json:"trends"`
	Diagnostics bool `json:"diagnostics"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type DiskMetric struct {
	Name         string `json:"name"`
	UsagePercent int    `json:"usagePercent"`
}

type NetworkMetric struct {
	LatencyMs            int     `json:"latencyMs"`
	IngressMbps          int     `json:"ingressMbps"`
	EgressMbps           int     `json:"egressMbps"`
	ConnectionCount      int     `json:"connectionCount"`
	TCPRetransmitPercent float64 `json:"tcpRetransmitPercent"`
}

type ServerDetail struct {
	CPUHistory    []int         `json:"cpuHistory"`
	MemoryUsedGB  float64       `json:"memoryUsedGb"`
	MemoryTotalGB int           `json:"memoryTotalGb"`
	DiskIOMBps    int           `json:"diskIoMbps"`
	Disks         []DiskMetric  `json:"disks"`
	Network       NetworkMetric `json:"network"`
}

type Server struct {
	ID            string       `json:"id"`
	Name          string       `json:"name"`
	IP            string       `json:"ip"`
	Type          string       `json:"type"`
	Status        string       `json:"status"`
	UptimeDays    int          `json:"uptimeDays"`
	CPUPercent    int          `json:"cpuPercent"`
	MemoryPercent int          `json:"memoryPercent"`
	Position      Position     `json:"position"`
	Detail        ServerDetail `json:"detail"`
}

type Connection struct {
	ID            string `json:"id"`
	From          string `json:"from"`
	To            string `json:"to"`
	Status        string `json:"status"`
	LatencyMs     int    `json:"latencyMs"`
	BandwidthMbps int    `json:"bandwidthMbps"`
}

type Log struct {
	ID      string `json:"id"`
	Time    string `json:"time"`
	Level   string `json:"level"`
	Source  string `json:"source"`
	Message string `json:"message"`
}

type Snapshot struct {
	GeneratedAt       string            `json:"generatedAt"`
	Refresh           RefreshMetadata   `json:"refresh"`
	Page              PageInfo          `json:"page"`
	ClusterSummary    ClusterSummary    `json:"clusterSummary"`
	ConnectionSummary ConnectionSummary `json:"connectionSummary"`
	AlertsSummary     AlertsSummary     `json:"alertsSummary"`
	Capabilities      Capabilities      `json:"capabilities"`
	Servers           []Server          `json:"servers"`
	Connections       []Connection      `json:"connections"`
	Logs              []Log             `json:"logs"`
}
