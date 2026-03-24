import { Space } from 'antd';
import { AlertList, DashboardPageFrame, KeyValueCard, ProbeSummaryTable } from '../shared';

export default function DatabasesPage() {
  return (
    <DashboardPageFrame title="数据库监控" subtitle="查看数据库连接、延迟、对象规模与最近更新时间。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title="MySQL 摘要"
              testId="monitor-database-summary"
              items={[
                { label: '可达性', value: data.database.reachable ? 'reachable' : 'unreachable' },
                { label: '响应延迟', value: `${data.database.latencyMs} ms` },
                { label: '最近更新时间', value: data.database.latestUpdateAt || '暂无' },
                { label: '用户总数', value: data.database.counts.totalUsers },
                { label: '群组总数', value: data.database.counts.totalGroups },
                { label: '令牌总数', value: data.database.counts.totalTokens },
              ]}
            />
            <ProbeSummaryTable probes={data.probes.filter((item) => item.id === 'probe-database')} />
            <AlertList alerts={data.alerts.filter((item) => item.source === 'mysql')} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
