import { useParams } from '@umijs/max';
import { Space } from 'antd';
import {
  AlertList,
  DashboardPageFrame,
  DiagnosticList,
  EventList,
  KeyValueCard,
  ServerDetailCard,
} from '../shared';

export default function ServiceDetailPage() {
  const params = useParams<{ id?: string }>();

  return (
    <DashboardPageFrame title="服务详情" subtitle="查看单个服务的状态、关联资源、事件与诊断信息。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        const service = data.services.find((item) => item.id === params.id) || null;
        const primaryServer = service
          ? data.servers.find((server) => service.relatedServerIds.includes(server.id)) || null
          : null;
        const sourceKey = service?.id === 'audio' ? 'upstream' : service?.id || '';

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title={service?.name || '未找到服务'}
              testId="monitor-service-detail"
              items={[
                { label: '分类', value: service?.category || 'unknown' },
                { label: '目标', value: service?.target || 'unknown' },
                { label: '状态', value: service?.status || 'offline' },
                { label: '延迟', value: service ? `${service.latencyMs} ms` : 'N/A' },
                { label: '告警数', value: service?.alertsCount || 0 },
                { label: '诊断数', value: service?.diagnosticsCount || 0 },
                { label: '摘要', value: service?.summary || '暂无摘要' },
              ]}
            />
            <ServerDetailCard server={primaryServer} />
            <AlertList alerts={data.alerts.filter((item) => item.source === sourceKey)} />
            <DiagnosticList
              diagnostics={data.diagnostics.filter((item) => item.relatedSources.includes(sourceKey))}
            />
            <EventList events={data.recentEvents.filter((item) => item.source === sourceKey)} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
