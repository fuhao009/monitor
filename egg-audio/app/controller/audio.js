'use strict';

const Controller = require('egg').Controller;

class AudioController extends Controller {
  async getList() {
    const { ctx } = this;
    const { current = 1, pageSize = 20, group_id, start_time, end_time, user_account, sort_order = 'desc' } = ctx.query;

    ctx.logger.info('[AudioController.getList] 请求参数:', JSON.stringify({
      current, pageSize, group_id, start_time, end_time, user_account, sort_order,
    }));
    // TODO
    // if (!group_id) {
    //   ctx.status = 201;
    //   ctx.body = {
    //     success: false,
    //     message: 'group_id 是必需的',
    //   };
    //   return;
    // }

    if (!pageSize) {
      ctx.status = 201;
      ctx.body = {
        success: false,
        message: 'limit 是必需的',
      };
      return;
    }

    if (!current) {
      ctx.status = 201;
      ctx.body = {
        success: false,
        message: 'page 是必需的',
      };
      return;
    }

    if (!end_time) {
      ctx.status = 201;
      ctx.body = {
        success: false,
        message: 'end_time 是必需的',
      };
      return;
    }
    // 如果没有 group_id，使用默认值或从用户信息中获取
    const requestGroupId = group_id || '920'; // 这里可以根据实际需求修改默认值

    try {
      const getAudioListFunc = () => {
        return ctx.service.audio.getAudioList({
          startTime: start_time,
          endTime: end_time,
          userAccount: user_account,
          groupId: requestGroupId,
          limit: parseInt(pageSize),
          page: parseInt(current),
          sortOrder: sort_order,
        });
      };

      let result = await getAudioListFunc();

      if (result?.code === 1001) {
        await ctx.service.login.login(ctx);
        result = await getAudioListFunc();
      }
      // 格式化返回结果以适配前端
      // 优先使用 totalCount（精确总数），否则用 pageSize * pageSize 估算
      const total = result.data?.totalCount ?? (result.data?.pageSize * pageSize) ?? 0;
      ctx.logger.info('[AudioController.getList] 返回结果: total=', total, ', 数据条数=', result?.data?.audios?.length || 0);
      ctx.body = {
        success: true,
        data: result?.data?.audios || [],
        total,
        current: parseInt(current),
        pageSize: parseInt(pageSize),
      };
    } catch (error) {
      ctx.logger.error('[AudioController.getList] 错误:', error.message);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || '获取音频列表失败',
      };
    }
  }
}

module.exports = AudioController;