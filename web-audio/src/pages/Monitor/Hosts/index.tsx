import { Space, Statistic } from 'antd';
import {
  DashboardPageFrame,
  OverviewCardGrid,
  ProbeSummaryTable,
  ServerInventoryTable,
} from '../shared';

export default function HostsPage() {
  return (
    <DashboardPageFrame title="主机监控" subtitle="查看所有节点的健康状态、资源使用与探针摘要。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <OverviewCardGrid items={data.overview} />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <Statistic title="节点总数" value={data.clusterSummary.total} />
              <Statistic title="在线节点" value={data.clusterSummary.online} />
              <Statistic title="告警节点" value={data.clusterSummary.warning} />
              <Statistic title="离线节点" value={data.clusterSummary.offline} />
            </div>
            <ServerInventoryTable servers={data.servers} />
            <ProbeSummaryTable probes={data.probes} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
