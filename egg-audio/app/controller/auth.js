'use strict';

const Controller = require('egg').Controller;

class AuthController extends Controller {
  // 用户登录
  async login() {
    const { ctx } = this;
    const { account, password, type } = ctx.request.body;

    // 参数验证
    if (!account || !password) {
      ctx.status = 400;
      ctx.body = {
        status: 'error',
        type,
        currentAuthority: 'guest',
        message: '账号和密码不能为空',
      };
      return;
    }

    try {
      // 查找用户
      const user = await ctx.service.user.findByAccount(account, password);
      if (!user) {
        ctx.status = 201;
        ctx.body = {
          status: 'error',
          type,
          currentAuthority: 'guest',
          message: '账号或密码错误',
        };
        return;
      }

      // 检查用户状态
      if (user.status !== 1) {
        ctx.status = 403;
        ctx.body = {
          status: 'error',
          type,
          currentAuthority: 'guest',
          message: '用户已被禁用',
        };
        return;
      }

      // 清理过期Token
      await ctx.service.user.cleanExpiredTokens(user.id);

      // 创建Token
      const tokenInfo = await ctx.service.user.createToken(user.id);

      ctx.body = {
        status: 'ok',
        type,
        currentAuthority: user.role === 0 ? 'admin' : 'user',
        data: {
          token: tokenInfo.token,
          expire_time: tokenInfo.expire_time,
          userInfo: {
            userid: user.id,
            name: user.username,
            email: '',
            avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
            group_list: user.group_list,
            access: user.role === 0 ? 'admin' : 'user',
          },
        },
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        status: 'error',
        type,
        currentAuthority: 'guest',
        message: '登录失败: ' + error.message,
      };
    }
  }

  // 获取当前用户信息
  async getUserInfo() {
    const { ctx } = this;
    const token = ctx.get('Authorization');

    if (!token) {
      ctx.status = 201;
      ctx.body = {
        data: {
          isLogin: false,
        },
        errorCode: '401',
        errorMessage: '请先登录！',
        success: true,
      };
      return;
    }

    try {
      const user = await ctx.service.user.verifyToken(token);
      if (!user) {
        ctx.status = 201;
        ctx.body = {
          data: {
            isLogin: false,
          },
          errorCode: '401',
          errorMessage: 'token无效或已过期',
          success: true,
        };
        return;
      }

      ctx.body = {
        success: true,
        data: {
          isLogin: true,
          name: user.username,
          avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
          userid: user.id,
          email: '',
          signature: '',
          title: '',
          group: user.group_list,
          tags: [],
          notifyCount: 0,
          unreadCount: 0,
          country: 'China',
          access: user.role === 1 ? 'admin' : 'user',
          phone: '',
        },
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        errorMessage: '获取用户信息失败',
      };
    }
  }

  // 用户登出
  async logout() {
    const { ctx } = this;
    const authHeader = ctx.get('Authorization');
    const queryToken = ctx?.query?.token;
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;

    if (!token) {
      ctx.status = 400;
      ctx.body = {
        data: {},
        success: false,
        message: '未提供token',
      };
      return;
    }

    try {
      const result = await ctx.service.user.logout(token);
      ctx.body = {
        data: {},
        success: result.success,
        message: result.message,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        data: {},
        success: false,
        message: '登出失败',
      };
    }
  }
}

module.exports = AuthController;