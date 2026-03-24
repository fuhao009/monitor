'use strict';

module.exports = () => {
  return async function groupAuth(ctx, next) {
    const authHeader = ctx.get('Authorization');
    const queryToken = ctx?.query?.token;
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;
    const requestGroupId = ctx.query.group_id || ctx.query.groupId;

    if (!requestGroupId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '未提供群组ID',
      };
      return;
    }

    try {
      // 获取用户信息
      const user = await ctx.service.user.verifyToken(token);
      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: 'token无效或已过期',
        };
        return;
      }

      // 超级管理员可以访问所有群组
      if (Number(user.role) === 0) {
        ctx.user = user;
        ctx.visibleGroupIds = [];
        await next();
        return;
      }

      // 普通用户:获取可见群组ID(包括所属群组及所有子群组)
      const visibleGroupIds = await ctx.service.group.getVisibleGroupIds(user);

      // 检查请求的群组ID是否在可见列表中
      if (!visibleGroupIds.includes(parseInt(requestGroupId))) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有该群组的访问权限',
          data: {
            authorized_groups: visibleGroupIds,
            request_group: requestGroupId,
          },
        };
        return;
      }

      // 将用户信息和可见群组添加到上下文中
      ctx.user = user;
      ctx.visibleGroupIds = visibleGroupIds;

      await next();
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '验证群组权限失败',
      };
    }
  };
};
