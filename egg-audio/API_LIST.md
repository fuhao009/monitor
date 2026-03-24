# API 完整列表

**生成时间:** 2025-11-11
**项目:** RecordGuard 录音系统

---

## 后端 API 路由 (egg-audio/app/router.js)

### 1. 基础路由
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| GET | `/` | home.index | - | 首页 |

### 2. 认证相关 (Authentication)
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| POST | `/api/auth/login` | auth.login | - | 用户登录 |
| POST | `/api/auth/logout` | auth.logout | - | 用户登出 |
| GET | `/api/auth/user-info` | auth.getUserInfo | auth | 获取用户信息 |
| POST | `/api/ppt/login` | login.login | - | 企业登录 |

### 3. 用户管理 (User Management)
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| POST | `/api/user/create` | user.create | auth | 创建用户 |
| GET | `/api/user/list` | user.list | - | 获取用户列表 |
| PUT | `/api/user/:id` | user.update | auth | 更新用户信息 |
| DELETE | `/api/user/:id` | user.delete | auth | 删除用户 |
| GET | `/api/user/token` | user.tokenList | - | 获取用户Token列表 |
| GET | `/api/user/info` | user.getInfo | - | 获取用户详情 |

### 4. 用户 Excel 导入导出
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| GET | `/api/user/template` | user.downloadTemplate | - | 下载Excel导入模板 |
| POST | `/api/user/import` | user.import | auth | 批量导入用户 |
| GET | `/api/user/export` | user.export | - | 导出用户列表 |

### 5. 群组管理 (Group Management)
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| GET | `/api/group/list` | group.list | auth | 获取群组列表 |
| POST | `/api/group/create` | group.create | auth | 创建群组 |
| PUT | `/api/group/:id` | group.update | auth | 更新群组信息 |
| DELETE | `/api/group/:id` | group.destroy | auth | 删除群组 |
| GET | `/api/group/tree` | group.tree | auth | 获取树形群组列表 |
| GET | `/api/group/:id/descendants` | group.descendants | auth | 获取子群组列表 |
| GET | `/api/group/search` | group.search | auth | 搜索群组 |
| GET | `/api/group/visible` | group.visible | auth | 获取可见群组 |

### 6. 音频管理 (Audio Management)
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| GET | `/api/audio/list` | audio.getList | - | 获取音频列表 |

### 7. 文件管理 (File Management)
| 方法 | 路径 | 控制器 | 中间件 | 说明 |
|------|------|--------|--------|------|
| GET | `/api/v1/file-info` | file.list | auth | 获取文件信息列表 |

---

## 前端 API 调用 (web-audio/src/services)

### 1. 认证相关
- `currentUser()` - GET `/api/user/info` - 获取当前用户信息
- `login()` - POST `/api/auth/login` - 用户登录
- `outLogin()` - POST `/api/auth/logout` - 退出登录

### 2. 用户管理
- `rule()` - GET `/api/user/list` - 获取用户列表
- `addRule()` - POST `/api/user/create` - 创建用户
- `removeUser(id)` - DELETE `/api/user/:id` - 删除用户

### 3. 群组管理
- `getGroupList()` - GET `/api/group/list` - 获取群组列表(简单)
- `getGroupListAPI()` - GET `/api/group/list` - 获取群组列表(分页)
- `addGroup()` - POST `/api/group/create` - 创建群组
- `removeGroup(id)` - DELETE `/api/group/:id` - 删除群组

### 4. 音频管理
- `getAudioListAPI()` - GET `/api/audio/list` - 获取音频列表

### 5. 文件管理
- `getFileInfoListAPI()` - GET `/api/v1/file-info` - 获取文件信息列表

### 6. 通知
- `getNotices()` - GET `/api/notices` - 获取通知列表 (前端调用,后端未实现)

---

## API 统计

### 后端实现
- **总计:** 27 个 API 端点
- **认证相关:** 4 个
- **用户管理:** 9 个 (含 Excel 导入导出)
- **群组管理:** 8 个
- **音频管理:** 1 个
- **文件管理:** 1 个
- **其他:** 4 个

### 前端调用
- **总计:** 14 个 API 函数
- **认证:** 3 个
- **用户:** 3 个
- **群组:** 4 个
- **音频:** 1 个
- **文件:** 1 个
- **通知:** 1 个 (后端未实现)
- **其他:** 1 个 (rule 相关,后端未实现)

---

## 需要注意的问题

### ❌ 前端调用但后端未实现
1. `GET /api/notices` - 通知接口
2. `GET /api/rule` - 规则接口(已用user替代)
3. `POST /api/rule` - 规则更新(已用user替代)
4. `DELETE /api/rule` - 规则删除(已用user替代)

### ⚠️ 后端实现但前端未调用
1. `PUT /api/user/:id` - 更新用户
2. `GET /api/user/token` - Token列表
3. `POST /api/user/import` - Excel导入
4. `GET /api/user/export` - Excel导出
5. `GET /api/user/template` - Excel模板
6. `PUT /api/group/:id` - 更新群组
7. `GET /api/group/tree` - 树形群组
8. `GET /api/group/:id/descendants` - 子群组
9. `GET /api/group/search` - 搜索群组
10. `GET /api/group/visible` - 可见群组

### ✅ 已正确对应
- 认证: login, logout, user info
- 用户: create, list, delete
- 群组: list, create, delete
- 音频: list
- 文件: list
