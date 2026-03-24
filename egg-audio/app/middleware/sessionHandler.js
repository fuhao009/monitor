const request = require('../utils/request');

module.exports = () => {
  return async function sessionMiddleware(ctx, next) {
    if (ctx.path.startsWith('/api/monitor/')) {
      await next();
      return;
    }

    // 检查是否需要重新获取 sessionId
    if (!ctx.app.sessionId || ctx.app.sessionExpired) {
      const { service } = ctx;
      const loginResult = await service.login.login();
      ctx.app.sessionId = loginResult.sessionId;
      ctx.app.sessionExpired = false;
      request.setSessionId(loginResult.sessionId);
    }
    await next();
  };
};
