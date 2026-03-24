import { Space } from 'antd';
import { DashboardPageFrame, ProbeSummaryTable } from '../shared';

export default function DatasourceSettingsPage() {
  return (
    <DashboardPageFrame title="数据源配置" subtitle="查看当前探针目标、数据源状态和链路延迟。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ProbeSummaryTable probes={data.settings.datasources} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
