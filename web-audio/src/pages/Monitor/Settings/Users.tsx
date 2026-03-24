import { Space } from 'antd';
import { DashboardPageFrame, KeyValueCard } from '../shared';

export default function UsersSettingsPage() {
  return (
    <DashboardPageFrame title="用户与权限" subtitle="查看当前操作者权限范围与平台用户规模。">
      {({ data }) => {
        if (!data) {
          return null;
        }

        return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <KeyValueCard
              title="当前操作者"
              testId="monitor-settings-users"
              items={[
                { label: '用户名', value: data.operator.username },
                { label: '角色', value: data.operator.role },
                { label: '管理员', value: String(data.operator.isAdmin) },
                { label: '可见群组数', value: data.operator.visibleGroupCount },
                { label: '活跃令牌数', value: data.operator.activeTokenCount },
                { label: '关联账号用户数', value: data.operator.linkedAccountUsers },
                { label: '平台用户总数', value: data.database.counts.totalUsers },
                { label: '平台群组总数', value: data.database.counts.totalGroups },
              ]}
            />
          </Space>
        );
      }}
    </DashboardPageFrame>
  );
}
