import { Space } from 'antd';
import { DashboardPageFrame, LogList } from '../shared';

export default function LiveLogsPage() {
  return (
    <DashboardPageFrame title="实时日志" subtitle="查看当前监控快照生成的最近日志流。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <LogList logs={data.logs} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
