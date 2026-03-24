import { Space } from 'antd';
import { CapacityReportCard, DashboardPageFrame } from '../shared';

export default function CapacityReportPage() {
  return (
    <DashboardPageFrame title="容量分析" subtitle="查看容量使用率、风险项和扩容优先级。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <CapacityReportCard report={data.capacityReport} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
