import { Space } from 'antd';
import { DashboardPageFrame, KeyValueCard } from '../shared';

export default function MonitorSettingsPage() {
  return (
    <DashboardPageFrame title="监控策略配置" subtitle="查看当前轮询、阈值、探针与能力开关配置。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        const monitorSettings = data.settings.monitor;

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title="监控配置"
              testId="monitor-settings-monitor"
              items={[
                { label: '配置来源', value: monitorSettings.source },
                { label: '轮询周期', value: `${monitorSettings.refresh.intervalSeconds}s` },
                { label: '陈旧阈值', value: `${monitorSettings.refresh.staleAfterSeconds}s` },
                { label: '内存阈值', value: `${monitorSettings.thresholds.memoryWarningPercent}%` },
                { label: '数据库阈值', value: `${monitorSettings.thresholds.databaseLatencyWarningMs}ms` },
                { label: '服务告警阈值', value: `${monitorSettings.thresholds.serviceLatencyWarningMs}ms` },
                { label: '服务离线阈值', value: `${monitorSettings.thresholds.serviceLatencyOfflineMs}ms` },
                { label: 'Upstream Path', value: monitorSettings.probes.upstreamPath },
                { label: 'File Path', value: monitorSettings.probes.filePath },
              ]}
            />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
