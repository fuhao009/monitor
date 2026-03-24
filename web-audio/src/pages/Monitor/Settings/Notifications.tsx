import { useEffect, useState } from 'react';
import { Space } from 'antd';
import { DashboardPageFrame, KeyValueCard } from '../shared';

export default function NotificationSettingsPage() {
  const [permission, setPermission] = useState('unsupported');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(window.Notification.permission);
  }, []);

  return (
    <DashboardPageFrame title="通知配置" subtitle="查看当前通知通道和浏览器授权状态。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title="通知配置"
              testId="monitor-settings-notifications"
              items={[
                { label: '通知启用', value: String(data.settings.notifications.enabled) },
                { label: '通知通道', value: data.settings.notifications.channels.join(', ') },
                { label: '去重策略', value: data.settings.notifications.dedupeStrategy },
                { label: '浏览器权限', value: permission },
              ]}
            />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
