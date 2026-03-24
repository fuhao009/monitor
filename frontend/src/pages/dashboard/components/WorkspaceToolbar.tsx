import { Select, Segmented, Space } from 'antd';
import type { DashboardViewMode } from '../../../types/dashboard';

interface Props {
  mode: DashboardViewMode;
  filter: 'all' | 'issues' | 'database';
  trendsEnabled: boolean;
  onModeChange: (value: DashboardViewMode) => void;
  onFilterChange: (value: 'all' | 'issues' | 'database') => void;
}

export function WorkspaceToolbar({ mode, filter, trendsEnabled, onModeChange, onFilterChange }: Props) {
  return (
    <Space style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>
      <Segmented<DashboardViewMode>
        value={mode}
        options={[
          { label: '网络拓扑', value: 'topology' },
          { label: '列表视图', value: 'list' },
          { label: trendsEnabled ? '趋势视图' : '趋势占位', value: 'trends' },
        ]}
        onChange={onModeChange}
      />
      <Select
        value={filter}
        style={{ width: 140 }}
        options={[
          { label: '全部显示', value: 'all' },
          { label: '仅显示异常', value: 'issues' },
          { label: '仅显示数据库', value: 'database' },
        ]}
        onChange={(value) => onFilterChange(value)}
      />
    </Space>
  );
}
