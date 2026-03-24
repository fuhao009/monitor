# Formal Pages for monitor-console

说明：

- `/user/login` 是前置登录页。
- 下面的 21 项是登录后正式运维页面。

当前正式运维页面 URL：

- `/monitor`
- `/hosts`
- `/hosts/:id`
- `/services`
- `/services/:id`
- `/databases`
- `/storage`
- `/topology`
- `/alerts`
- `/alerts/history`
- `/events`
- `/logs/live`
- `/logs/search`
- `/diagnostics`
- `/metrics`
- `/reports/availability`
- `/reports/capacity`
- `/settings/monitor`
- `/settings/notifications`
- `/settings/datasources`
- `/settings/users`

逐页 skill 验证时，当前项目已实际使用以下代表性 detail route：

- `/hosts/egg-api`
- `/services/audio`

旧路径非正式页面，应验证为 404：

- `/welcome`
- `/group`
- `/list`
- `/audio`
- `/file`
