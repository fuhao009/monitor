import { Space } from 'antd';
import {
  DashboardPageFrame,
  EventList,
  ProbeSummaryTable,
  ServiceCatalogTable,
} from '../shared';

export default function ServicesPage() {
  return (
    <DashboardPageFrame title="服务监控" subtitle="查看服务健康、响应延迟、告警数量与依赖入口。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ServiceCatalogTable services={data.services} />
            <ProbeSummaryTable probes={data.probes} />
            <EventList events={data.recentEvents.filter((item) => ['alert', 'log'].includes(item.category)).slice(0, 6)} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
