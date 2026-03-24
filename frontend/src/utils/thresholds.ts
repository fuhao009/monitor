export function getStatusColor(status: 'online' | 'warning' | 'offline') {
  if (status === 'online') return '#10b981';
  if (status === 'warning') return '#f59e0b';
  return '#ef4444';
}

export function getLatencyState(latency: number) {
  if (latency > 100) return 'danger';
  if (latency > 50) return 'warning';
  return 'good';
}
