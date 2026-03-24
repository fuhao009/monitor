import { Space } from 'antd';
import { DashboardPageFrame, EventList } from '../shared';

export default function AlertHistoryPage() {
  return (
    <DashboardPageFrame title="告警历史" subtitle="查看最近告警事件与状态变化记录。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <EventList events={data.recentEvents.filter((item) => item.category === 'alert')} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
