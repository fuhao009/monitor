'use strict';

const Controller = require('egg').Controller;

class MonitorController extends Controller {
  async healthz() {
    const { ctx } = this;

    try {
      const data = await ctx.service.monitor.getHealthPayload();
      ctx.body = {
        success: true,
        data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取监控健康状态失败: ${error.message}`,
      };
    }
  }

  async dashboard() {
    const { ctx } = this;

    try {
      const data = await ctx.service.monitor.getDashboardPayload(ctx.user);
      ctx.body = {
        success: true,
        data,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `获取监控面板失败: ${error.message}`,
      };
    }
  }
}

module.exports = MonitorController;
