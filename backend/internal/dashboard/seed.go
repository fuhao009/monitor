package dashboard

func seededSnapshot() Snapshot {
	return Snapshot{
		Page: PageInfo{
			Title:         "智网",
			Subtitle:      "分布式服务器监控中心",
			RealtimeLabel: "实时监控中",
		},
		Servers: []Server{
			{ID: "srv-001", Name: "生产服务器-01", IP: "192.168.1.101", Type: "app", Status: "online", UptimeDays: 45, CPUPercent: 45, MemoryPercent: 62, Position: Position{X: 200, Y: 150}, Detail: ServerDetail{CPUHistory: []int{40, 43, 46, 42, 45, 48, 45}, MemoryUsedGB: 12.4, MemoryTotalGB: 32, DiskIOMBps: 245, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 75}, {Name: "数据盘", UsagePercent: 45}}, Network: NetworkMetric{LatencyMs: 12, IngressMbps: 450, EgressMbps: 280, ConnectionCount: 1245, TCPRetransmitPercent: 0.01}}},
			{ID: "srv-002", Name: "生产服务器-02", IP: "192.168.1.102", Type: "app", Status: "online", UptimeDays: 45, CPUPercent: 38, MemoryPercent: 55, Position: Position{X: 400, Y: 150}, Detail: ServerDetail{CPUHistory: []int{35, 36, 39, 37, 40, 38, 41}, MemoryUsedGB: 11.1, MemoryTotalGB: 32, DiskIOMBps: 211, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 68}, {Name: "数据盘", UsagePercent: 41}}, Network: NetworkMetric{LatencyMs: 15, IngressMbps: 430, EgressMbps: 260, ConnectionCount: 1172, TCPRetransmitPercent: 0.02}}},
			{ID: "srv-003", Name: "数据库主库", IP: "192.168.1.201", Type: "db", Status: "warning", UptimeDays: 45, CPUPercent: 82, MemoryPercent: 78, Position: Position{X: 300, Y: 300}, Detail: ServerDetail{CPUHistory: []int{72, 74, 81, 79, 84, 82, 85}, MemoryUsedGB: 24.9, MemoryTotalGB: 32, DiskIOMBps: 320, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 72}, {Name: "数据盘", UsagePercent: 63}}, Network: NetworkMetric{LatencyMs: 52, IngressMbps: 610, EgressMbps: 300, ConnectionCount: 1499, TCPRetransmitPercent: 0.08}}},
			{ID: "srv-004", Name: "数据库从库", IP: "192.168.1.202", Type: "db", Status: "online", UptimeDays: 45, CPUPercent: 35, MemoryPercent: 60, Position: Position{X: 500, Y: 300}, Detail: ServerDetail{CPUHistory: []int{31, 35, 34, 36, 33, 35, 37}, MemoryUsedGB: 19.2, MemoryTotalGB: 32, DiskIOMBps: 198, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 65}, {Name: "数据盘", UsagePercent: 40}}, Network: NetworkMetric{LatencyMs: 10, IngressMbps: 380, EgressMbps: 250, ConnectionCount: 1080, TCPRetransmitPercent: 0.01}}},
			{ID: "srv-005", Name: "缓存服务器", IP: "192.168.1.150", Type: "cache", Status: "offline", UptimeDays: 45, CPUPercent: 0, MemoryPercent: 0, Position: Position{X: 100, Y: 300}, Detail: ServerDetail{CPUHistory: []int{0, 0, 0, 0, 0, 0, 0}, MemoryUsedGB: 0, MemoryTotalGB: 32, DiskIOMBps: 0, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 0}, {Name: "数据盘", UsagePercent: 0}}, Network: NetworkMetric{LatencyMs: 0, IngressMbps: 0, EgressMbps: 0, ConnectionCount: 0, TCPRetransmitPercent: 0}}},
			{ID: "srv-006", Name: "负载均衡-01", IP: "192.168.1.10", Type: "lb", Status: "online", UptimeDays: 45, CPUPercent: 25, MemoryPercent: 40, Position: Position{X: 300, Y: 50}, Detail: ServerDetail{CPUHistory: []int{20, 24, 26, 23, 25, 27, 24}, MemoryUsedGB: 6.4, MemoryTotalGB: 16, DiskIOMBps: 120, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 44}, {Name: "数据盘", UsagePercent: 22}}, Network: NetworkMetric{LatencyMs: 12, IngressMbps: 700, EgressMbps: 700, ConnectionCount: 2200, TCPRetransmitPercent: 0.01}}},
			{ID: "srv-007", Name: "负载均衡-02", IP: "192.168.1.11", Type: "lb", Status: "online", UptimeDays: 45, CPUPercent: 28, MemoryPercent: 42, Position: Position{X: 450, Y: 50}, Detail: ServerDetail{CPUHistory: []int{24, 26, 27, 29, 28, 30, 28}, MemoryUsedGB: 6.8, MemoryTotalGB: 16, DiskIOMBps: 132, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 46}, {Name: "数据盘", UsagePercent: 24}}, Network: NetworkMetric{LatencyMs: 14, IngressMbps: 730, EgressMbps: 690, ConnectionCount: 2140, TCPRetransmitPercent: 0.01}}},
			{ID: "srv-008", Name: "文件存储", IP: "192.168.1.250", Type: "storage", Status: "online", UptimeDays: 45, CPUPercent: 15, MemoryPercent: 30, Position: Position{X: 600, Y: 200}, Detail: ServerDetail{CPUHistory: []int{13, 12, 15, 14, 16, 15, 14}, MemoryUsedGB: 9.6, MemoryTotalGB: 32, DiskIOMBps: 175, Disks: []DiskMetric{{Name: "系统盘", UsagePercent: 38}, {Name: "数据盘", UsagePercent: 51}}, Network: NetworkMetric{LatencyMs: 22, IngressMbps: 250, EgressMbps: 390, ConnectionCount: 605, TCPRetransmitPercent: 0.02}}},
		},
		Connections: []Connection{
			{ID: "conn-001", From: "srv-006", To: "srv-001", Status: "online", LatencyMs: 12, BandwidthMbps: 1000},
			{ID: "conn-002", From: "srv-006", To: "srv-002", Status: "online", LatencyMs: 15, BandwidthMbps: 1000},
			{ID: "conn-003", From: "srv-007", To: "srv-001", Status: "online", LatencyMs: 14, BandwidthMbps: 1000},
			{ID: "conn-004", From: "srv-007", To: "srv-002", Status: "online", LatencyMs: 13, BandwidthMbps: 1000},
			{ID: "conn-005", From: "srv-001", To: "srv-003", Status: "online", LatencyMs: 8, BandwidthMbps: 10000},
			{ID: "conn-006", From: "srv-002", To: "srv-003", Status: "online", LatencyMs: 9, BandwidthMbps: 10000},
			{ID: "conn-007", From: "srv-003", To: "srv-004", Status: "online", LatencyMs: 5, BandwidthMbps: 10000},
			{ID: "conn-008", From: "srv-001", To: "srv-005", Status: "offline", LatencyMs: 0, BandwidthMbps: 0},
			{ID: "conn-009", From: "srv-002", To: "srv-005", Status: "offline", LatencyMs: 0, BandwidthMbps: 0},
			{ID: "conn-010", From: "srv-001", To: "srv-008", Status: "online", LatencyMs: 25, BandwidthMbps: 1000},
			{ID: "conn-011", From: "srv-002", To: "srv-008", Status: "online", LatencyMs: 22, BandwidthMbps: 1000},
		},
		Logs: []Log{
			{ID: "log-001", Time: "2026-03-16T13:02:15+08:00", Level: "info", Source: "系统", Message: "CPU 使用率恢复正常 (45%)"},
			{ID: "log-002", Time: "2026-03-16T13:01:42+08:00", Level: "warning", Source: "网络", Message: "检测到延迟波动: 85ms → 120ms"},
			{ID: "log-003", Time: "2026-03-16T13:01:30+08:00", Level: "info", Source: "连接", Message: "新客户端连接: 192.168.1.45"},
			{ID: "log-004", Time: "2026-03-16T13:00:18+08:00", Level: "error", Source: "数据库", Message: "查询超时 > 5000ms (srv-db-01)"},
		},
	}
}
