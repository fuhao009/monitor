'use strict';

module.exports = () => {
  return async function auth(ctx, next) {
    const authHeader = ctx.get('Authorization');
    const queryToken = ctx?.query?.token;
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;

    if (!token) {
      ctx.status = 125;
      ctx.body = {
        success: false,
        message: '未提供token',
      };
      return;
    }

    const user = await ctx.service.user.verifyToken(token);
    if (!user) {
      ctx.status = 125;
      ctx.body = {
        success: false,
        message: 'token无效或已过期',
      };
      return;
    }

    ctx.user = user;
    await next();
  };
};