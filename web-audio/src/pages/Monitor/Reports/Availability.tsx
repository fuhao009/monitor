import { Space } from 'antd';
import { AvailabilityReportCard, DashboardPageFrame } from '../shared';

export default function AvailabilityReportPage() {
  return (
    <DashboardPageFrame title="可用率报表" subtitle="查看各服务当前可用率评估与降级情况。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <AvailabilityReportCard report={data.availabilityReport} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
