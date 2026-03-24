import { useState } from 'react';
import { Input, Space } from 'antd';
import { DashboardPageFrame, LogList } from '../shared';

export default function SearchLogsPage() {
  const [keyword, setKeyword] = useState('');

  return (
    <DashboardPageFrame title="日志检索" subtitle="按关键字过滤当前监控日志，定位异常来源。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        const normalized = keyword.trim().toLowerCase();
        const filteredLogs = !normalized
          ? data.logs
          : data.logs.filter((item) =>
              `${item.source} ${item.message} ${item.level}`.toLowerCase().includes(normalized),
            );

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Input
              data-testid="monitor-log-search-input"
              placeholder="输入关键字过滤当前日志"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <LogList logs={filteredLogs} />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
