import { Space } from 'antd';
import { DashboardPageFrame, EventList } from '../shared';

export default function EventsPage() {
  return (
    <DashboardPageFrame title="事件中心" subtitle="查看最近系统事件、探针变化和告警记录。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <EventList events={data.recentEvents} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
