# API 功能清单（基于 test-real-data.py）

## 1. 群组管理 API

- ✅ GET `/api/group/list` - 获取群组列表
- ✅ GET `/api/group/tree` - 获取树形结构
- ✅ POST `/api/group/create` - 创建群组
- ✅ PUT `/api/group/{id}` - 更新群组信息
- ✅ DELETE `/api/group/{id}` - 删除群组
- ✅ GET `/api/group/{id}/descendants` - 获取子群组列表
- ✅ GET `/api/group/search` - 搜索群组
- ✅ GET `/api/group/visible` - 获取可见群组
- ❓ GET `/api/group/template` - 下载群组导出模板（待实现）
- ❓ GET `/api/group/export` - 导出群组列表（待实现）
- ❓ POST `/api/group/import` - 导入群组（待实现）

## 2. 用户管理 API

- ✅ GET `/api/user/list` - 查询用户列表
- ✅ POST `/api/user/create` - 创建用户
- ✅ PUT `/api/user/{id}` - 更新用户信息
- ✅ DELETE `/api/user/{id}` - 删除用户
- ✅ GET `/api/user/template` - 下载 Excel 导入模板
- ✅ GET `/api/user/export` - 导出用户列表
- ❓ POST `/api/user/import` - 导入用户（待实现）
- ✅ GET `/api/user/info` - 获取用户信息
- ✅ GET `/api/user/token` - 获取用户 Token 列表

## 3. 录音管理 API

- ✅ GET `/api/audio/list` - 获取录音列表（支持时间、群组、账号过滤）

## 4. 文件管理 API

- ✅ GET `/api/v1/file-info` - 获取文件信息列表

## 5. 认证 API

- ✅ POST `/api/auth/login` - 登录
- ✅ POST `/api/auth/logout` - 登出
- ✅ GET `/api/auth/user-info` - 获取用户信息
- ✅ POST `/api/ppt/login` - 企业登录

## 前端页面功能需求

### 群组管理页面需要：

1. ✅ 列表显示
2. ✅ 创建群组
3. ❌ **编辑/修改群组** - 缺失！
4. ✅ 删除群组
5. ❌ **搜索功能** - 缺失！
6. ❌ 模板下载
7. ❌ 导出功能
8. ❌ 导入功能

### 用户管理页面需要：

1. ✅ 列表显示
2. ✅ 创建用户
3. ❌ **编辑/修改用户** - 需要检查！
4. ✅ 删除用户
5. ❌ **搜索功能** - 需要检查！
6. ❌ 模板下载
7. ❌ 导出功能
8. ❌ 导入功能

### 录音管理页面需要：

1. ✅ 列表显示
2. ✅ 时间筛选
3. ✅ 群组筛选
4. ❌ **对讲机账号筛选** - 需要检查！
5. ✅ 播放功能
6. ✅ 下载功能
