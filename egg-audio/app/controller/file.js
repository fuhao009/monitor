'use strict';

const Controller = require('egg').Controller;
const fileRequest = require('../utils/fileRequest');

class AudioController extends Controller {
  async list() {
    const { ctx } = this;
    const { current = 1, pageSize = 20 } = ctx.query;

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

    try {
      // 尝试从缓存获取 token
      const token = fileRequest.getToken();

      // 如果没有缓存的 token，则先登录获取 token
      if (!token) {
        await this.getAndSetToken(ctx);
      }

      try {
        // 尝试获取文件列表
        const response = await this.fetchFileList(ctx);
        // 格式化返回结果以适配前端
        const formattedData = (response?.data || []).map(item => ({
          ...item,
          file_url: `${process.env.FILE_BASE_URL}${item.file_url}`,
          thumbnail_url: `${process.env.FILE_BASE_URL}${item.thumbnail_url}`,
        }));
        ctx.body = {
          success: true,
          data: formattedData,
          department: response?.department || [],
          device: response?.device || [],
          total: response?.total || 0,
          current: parseInt(current),
          pageSize: parseInt(pageSize),
        };
      } catch (error) {
        // 如果是 401 错误，则重新获取 token 并重试
        if (error.status === 401) {
          await this.getAndSetToken(ctx);
          const response = await this.fetchFileList(ctx);
          console.error('~~~~response999', response)
          // 格式化返回结果以适配前端
          const formattedData = (response?.data || []).map(item => ({
            ...item,
            file_url: `${process.env.FILE_BASE_URL}${item.file_url}`,
            thumbnail_url: `${process.env.FILE_BASE_URL}${item.thumbnail_url}`,
          }));
          ctx.body = {
            success: true,
            data: formattedData,
            department: response?.department || [],
            device: response?.device || [],
            total: response?.total || 0,
            current: parseInt(current),
            pageSize: parseInt(pageSize),
            wwhat: 123,
          };
        } else {
          throw error;
        }
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message || '获取文件列表失败',
      };
    }
  }
  
  // 获取并设置 token 的辅助方法
  async getAndSetToken(ctx) {
    const loginResult = await ctx.service.login.fileLogin(ctx);
    if (loginResult && loginResult.access_token) {
      // 缓存 token 并设置到请求头
      fileRequest.setToken(loginResult.access_token);
      return loginResult.access_token;
    }
    throw new Error('关联账号或关联账号的密码为空');
  }
  
  // 获取文件列表的辅助方法
  async fetchFileList(ctx) {
    const { current = 1, pageSize = 20 } = ctx.query;

    return await fileRequest.get('v1/file-info', {
      params: {
        method: 'get',
        ...ctx.query,
        limit: pageSize,
        page: current,
      },
    });
  }
}

module.exports = AudioController;