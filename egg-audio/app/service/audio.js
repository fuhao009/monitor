'use strict';
const request = require('../utils/request');

const Service = require('egg').Service;

class AudioService extends Service {
  /**
   * 按时间排序
   * @param {Array} audios - 音频数组
   * @param {string} order - 排序方式: 'asc' 升序, 'desc' 降序
   */
  _sortAudios(audios, order = 'desc') {
    return audios.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  /**
   * 从 PTT API 获取单页数据
   */
  async _fetchPage({ groupId, startTime, endTime, limit, page }) {
    const params = {
      method: 'get',
      group_id: groupId,
      start_time: startTime,
      end_time: endTime,
      limit,
      page,
    };
    this.ctx.logger.info('[AudioService._fetchPage] 请求参数:', JSON.stringify(params));

    const response = await request.get('/ptt/audio', { params });

    this.ctx.logger.info('[AudioService._fetchPage] 响应 code:', response?.code, '数据条数:', response?.data?.audios?.length || 0);
    return response;
  }

  /**
   * 获取音频列表（支持 user_account 本地过滤和准确分页）
   */
  async getAudioList({ groupId, startTime, endTime, userAccount, limit, page, sortOrder = 'desc' }) {
    this.ctx.logger.info('[AudioService.getAudioList] 开始请求, 参数:', JSON.stringify({
      groupId, startTime, endTime, userAccount, limit, page, sortOrder,
    }));

    try {
      // 如果没有 userAccount 过滤条件，直接请求 PTT API
      if (!userAccount) {
        this.ctx.logger.info('[AudioService.getAudioList] 无 userAccount 过滤，直接请求 PTT API');
        const response = await this._fetchPage({
          groupId,
          startTime,
          endTime,
          limit,
          page: page > 0 ? page - 1 : 0,
        });

        // 对返回数据排序
        if (response?.data?.audios) {
          response.data.audios = this._sortAudios(response.data.audios, sortOrder);
        }

        this.ctx.logger.info('[AudioService.getAudioList] 返回数据条数:', response?.data?.audios?.length || 0);
        return response;
      }

      // 有 userAccount 过滤条件，需要获取所有数据后过滤
      const filterAccounts = userAccount.split(',').map(s => s.trim().toLowerCase());
      this.ctx.logger.info('[AudioService.getAudioList] 需要过滤的账号:', filterAccounts);

      // 1. 先获取第一页，拿到总页数
      const firstPageResponse = await this._fetchPage({
        groupId,
        startTime,
        endTime,
        limit: 100,
        page: 0,
      });

      if (firstPageResponse?.code !== 0) {
        this.ctx.logger.warn('[AudioService.getAudioList] 第一页请求失败, code:', firstPageResponse?.code);
        return firstPageResponse;
      }

      const totalPages = firstPageResponse.data?.pageSize || 1;
      let allAudios = firstPageResponse.data?.audios || [];
      this.ctx.logger.info('[AudioService.getAudioList] 总页数:', totalPages, '第一页数据条数:', allAudios.length);

      // 2. 并发获取剩余页数据
      if (totalPages > 1) {
        this.ctx.logger.info('[AudioService.getAudioList] 开始并发获取剩余', totalPages - 1, '页数据');
        const promises = [];
        for (let p = 1; p < totalPages; p++) {
          promises.push(
            this._fetchPage({
              groupId,
              startTime,
              endTime,
              limit: 100,
              page: p,
            })
          );
        }
        const results = await Promise.all(promises);
        for (const res of results) {
          if (res?.data?.audios) {
            allAudios = allAudios.concat(res.data.audios);
          }
        }
        this.ctx.logger.info('[AudioService.getAudioList] 合并后总数据条数:', allAudios.length);
      }

      // 3. 按 user_account 过滤
      const filteredAudios = allAudios.filter(audio => {
        const userName = (audio.user_name || '').toLowerCase();
        return filterAccounts.some(account => userName.includes(account) || account.includes(userName));
      });
      this.ctx.logger.info('[AudioService.getAudioList] 过滤后数据条数:', filteredAudios.length);

      // 4. 排序
      const sortedAudios = this._sortAudios(filteredAudios, sortOrder);

      // 5. 手动分页
      const total = sortedAudios.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const pagedAudios = sortedAudios.slice(startIndex, endIndex);
      this.ctx.logger.info('[AudioService.getAudioList] 分页后返回条数:', pagedAudios.length, '(页码:', page, ', 每页:', limit, ')');

      // 6. 返回格式与原 PTT API 一致
      return {
        code: 0,
        data: {
          audios: pagedAudios,
          pageSize: Math.ceil(total / limit),
          totalCount: total,
        },
      };
    } catch (error) {
      this.ctx.logger.error('[AudioService.getAudioList] 错误:', error.message);
      throw new Error(`获取录音列表失败: ${error.message}`);
    }
  }
}

module.exports = AudioService;
