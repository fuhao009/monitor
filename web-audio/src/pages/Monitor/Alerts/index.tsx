import { Space } from 'antd';
import { AlertList, DashboardPageFrame, KeyValueCard } from '../shared';

export default function AlertsPage() {
  return (
    <DashboardPageFrame title="告警中心" subtitle="集中查看当前活动告警和严重等级分布。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title="告警摘要"
              testId="monitor-alert-summary-page"
              items={[
                { label: '严重', value: data.alertsSummary.critical },
                { label: '警告', value: data.alertsSummary.warning },
                { label: '已确认', value: data.alertsSummary.acknowledged },
                { label: '活动总数', value: data.alerts.length },
              ]}
            />
            <AlertList alerts={data.alerts} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
