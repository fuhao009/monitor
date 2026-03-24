import { useParams } from '@umijs/max';
import { Space } from 'antd';
import { AlertList, DashboardPageFrame, DiagnosticList, LogList, ServerDetailCard } from '../shared';

export default function HostDetailPage() {
  const params = useParams<{ id?: string }>();

  return (
    <DashboardPageFrame title="主机详情" subtitle="查看单台主机的实时资源、关联告警和最近日志。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        const server = data.servers.find((item) => item.id === params.id) || null;
        const relatedSource = server?.id === 'audio' ? 'upstream' : server?.id || '';

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ServerDetailCard server={server} />
            <AlertList alerts={data.alerts.filter((item) => item.source === relatedSource)} />
            <DiagnosticList
              diagnostics={data.diagnostics.filter((item) => item.relatedSources.includes(relatedSource))}
            />
            <LogList logs={data.logs.filter((item) => item.source === relatedSource || item.source === server?.name)} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
