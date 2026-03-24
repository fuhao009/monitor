import { Table, Tag } from 'antd';
import type { ConnectionItem } from '../../../types/dashboard';

interface Props {
  connections: ConnectionItem[];
}

export function ConnectionListView({ connections }: Props) {
  return (
    <Table
      pagination={false}
      rowKey="id"
      dataSource={connections}
      columns={[
        { title: '源', dataIndex: 'from' },
        { title: '目标', dataIndex: 'to' },
        { title: '延迟', dataIndex: 'latencyMs', render: (value: number) => `${value}ms` },
        { title: '带宽', dataIndex: 'bandwidthMbps', render: (value: number) => `${value}Mbps` },
        { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={value === 'online' ? 'green' : value === 'warning' ? 'gold' : 'red'}>{value}</Tag> },
      ]}
    />
  );
}
