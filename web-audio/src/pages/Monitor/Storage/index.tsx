import { Space } from 'antd';
import { AlertList, CapacityReportCard, DashboardPageFrame, ProbeSummaryTable, ServiceCatalogTable } from '../shared';

export default function StoragePage() {
  return (
    <DashboardPageFrame title="存储 / 文件服务监控" subtitle="查看文件服务探针、容量风险与相关告警。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ProbeSummaryTable probes={data.probes.filter((item) => item.id === 'probe-file')} />
            <ServiceCatalogTable services={data.services.filter((item) => item.id === 'file')} />
            <CapacityReportCard
              report={{
                ...data.capacityReport,
                items: data.capacityReport.items.filter((item) => item.id === 'file'),
              }}
            />
            <AlertList alerts={data.alerts.filter((item) => item.source === 'file')} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
