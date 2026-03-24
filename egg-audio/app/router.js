/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, middleware } = app;
  const auth = middleware.auth();

  // 基础路由
  router.get('/', controller.home.index);

  // 企业登录
  router.post('/api/ppt/login', controller.login.login);

  // 认证相关路由
  router.post('/api/auth/login', controller.auth.login);
  router.post('/api/auth/logout', controller.auth.logout);

  // 需要验证 token 的路由
  router.get('/api/auth/user-info', auth, controller.auth.getUserInfo);

  router.get('/api/monitor/healthz', controller.monitor.healthz);
  router.get('/api/monitor/dashboard', auth, controller.monitor.dashboard);

  // 音频查询路由
  // router.get('/api/audio/list', auth, groupAuth, controller.audio.getList);
  router.get('/api/audio/list', controller.audio.getList);

  // 用户管理路由
  router.post('/api/user/create', auth, controller.user.create);
  router.get('/api/user/list', controller.user.list);
  // router.get('/api/user/list', auth, controller.user.list);
  router.put('/api/user/:id', auth, controller.user.update);
  router.delete('/api/user/:id', auth, controller.user.delete);
  router.get('/api/user/token', controller.user.tokenList);
  router.get('/api/user/info', controller.user.getInfo);

  // 用户 Excel 导入导出
  router.get('/api/user/template', controller.user.downloadTemplate); // 下载导入模板
  router.post('/api/user/import', auth, controller.user.import); // 导入用户
  router.get('/api/user/export', controller.user.export); // 导出用户

  // 群组管理路由
  router.get('/api/group/list', auth, controller.group.list); // 获取群组列表
  router.post('/api/group/create', auth, controller.group.create); // 创建群组
  router.put('/api/group/:id', auth, controller.group.update); // 更新群组
  router.delete('/api/group/:id', auth, controller.group.destroy); // 删除群组
  router.get('/api/group/tree', auth, controller.group.tree); // 获取树形群组列表
  router.get('/api/group/:id/descendants', auth, controller.group.descendants); // 获取子群组
  router.get('/api/group/search', auth, controller.group.search); // 搜索群组
  router.get('/api/group/visible', auth, controller.group.visible); // 获取可见群组

  // 群组 Excel 导入导出
  router.get('/api/group/template', controller.group.downloadTemplate); // 下载导入模板
  router.post('/api/group/import', auth, controller.group.import); // 导入群组
  router.get('/api/group/export', controller.group.export); // 导出群组

  // 文件管理
  router.get('/api/v1/file-info', auth, controller.file.list);
};
