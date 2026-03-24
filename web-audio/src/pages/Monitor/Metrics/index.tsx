import { Space } from 'antd';
import { CapacityReportCard, DashboardPageFrame, TrendSummaryGrid } from '../shared';

export default function MetricsPage() {
  return (
    <DashboardPageFrame title="指标趋势" subtitle="查看关键指标的趋势摘要和容量风险变化。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <TrendSummaryGrid metrics={data.trendSummary.metrics} />
            <CapacityReportCard report={data.capacityReport} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
