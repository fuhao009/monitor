import { Space } from 'antd';
import { DashboardPageFrame, DiagnosticList, KeyValueCard } from '../shared';

export default function DiagnosticsPage() {
  return (
    <DashboardPageFrame title="诊断建议" subtitle="查看当前风险来源、建议动作和关联资源。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title="诊断摘要"
              testId="monitor-diagnostics-summary"
              items={[
                { label: '建议总数', value: data.diagnostics.length },
                { label: '当前严重告警', value: data.alertsSummary.critical },
                { label: '当前警告告警', value: data.alertsSummary.warning },
                { label: '最近更新时间', value: data.generatedAt },
              ]}
            />
            <DiagnosticList diagnostics={data.diagnostics} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
