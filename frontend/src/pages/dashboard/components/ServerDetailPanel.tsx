import { ProCard } from '@ant-design/pro-components';
import { Progress, Space, Typography } from 'antd';
import type { ServerItem } from '../../../types/dashboard';
import { Sparkline } from './Sparkline';

interface Props {
  server: ServerItem;
}

export function ServerDetailPanel({ server }: Props) {
  return (
    <div style={{ padding: 16, flex: 1 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size={12}>
            <Typography.Title level={4} style={{ margin: 0 }}>{server.name}</Typography.Title>
            <Typography.Text code>{server.ip}</Typography.Text>
          </Space>
          <Typography.Text>{server.status}</Typography.Text>
        </Space>
        <ProCard ghost gutter={16} wrap>
          <ProCard colSpan="25%" title="CPU 使用率" style={{ border: '1px solid #e2e8f0' }}>
            <Typography.Title level={3}>{server.cpuPercent}%</Typography.Title>
            <Sparkline values={server.detail.cpuHistory} />
          </ProCard>
          <ProCard colSpan="25%" title="内存使用" style={{ border: '1px solid #e2e8f0' }}>
            <Typography.Title level={3}>{server.detail.memoryUsedGb.toFixed(1)}GB</Typography.Title>
            <Progress percent={server.memoryPercent} />
            <Typography.Text type="secondary">总容量 {server.detail.memoryTotalGb}GB</Typography.Text>
          </ProCard>
          <ProCard colSpan="25%" title="磁盘 I/O" style={{ border: '1px solid #e2e8f0' }}>
            <Typography.Title level={3}>{server.detail.diskIoMbps}MB/s</Typography.Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {server.detail.disks.map((disk) => (
                <div key={disk.name}>
                  <Typography.Text>{disk.name}</Typography.Text>
                  <Progress percent={disk.usagePercent} />
                </div>
              ))}
            </Space>
          </ProCard>
          <ProCard colSpan="25%" title="网络连接" style={{ border: '1px solid #e2e8f0' }}>
            <Space direction="vertical" size={8}>
              <Typography.Text>延迟 {server.detail.network.latencyMs}ms</Typography.Text>
              <Typography.Text>入站 {server.detail.network.ingressMbps}MB/s</Typography.Text>
              <Typography.Text>出站 {server.detail.network.egressMbps}MB/s</Typography.Text>
              <Typography.Text>连接数 {server.detail.network.connectionCount}</Typography.Text>
              <Typography.Text>TCP 重传 {server.detail.network.tcpRetransmitPercent}%</Typography.Text>
            </Space>
          </ProCard>
        </ProCard>
      </Space>
    </div>
  );
}
