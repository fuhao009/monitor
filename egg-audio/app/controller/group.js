'use strict';

const Controller = require('egg').Controller;

class GroupController extends Controller {
  // 获取群组列表
  async list() {
    const { ctx } = this;
    const query = ctx.query;
    const result = await ctx.service.group.list(query);

    ctx.body = result;
  }

  // 创建群组
  async create() {
    const { ctx } = this;
    const payload = ctx.request.body;

    try {
      // 参数校验
      ctx.validate({
        related_group_name: { type: 'string', required: true },
        association_type: { type: 'number', required: false },
      });

      // 根据关联类型验证
      const association_type = payload.association_type || 1;
      if (association_type === 1) {
        // 使用群组ID
        ctx.validate({
          related_group_id: { type: 'string', required: true },
        });
      } else if (association_type === 2) {
        // 使用终端账号
        ctx.validate({
          terminal_accounts: { type: 'array', required: true },
        });
      }

      const result = await ctx.service.group.create(payload);
      ctx.body = {
        success: true,
        data: result.data,
        message: '创建成功',
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 删除群组
  async destroy() {
    const { ctx } = this;
    const id = ctx.params.id;

    try {
      await ctx.service.group.destroy(id);
      ctx.body = {
        success: true,
        message: '删除成功',
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 更新群组
  async update() {
    const { ctx } = this;
    const id = ctx.params.id;
    const payload = ctx.request.body;

    try {
      const result = await ctx.service.group.update(id, payload);
      ctx.body = {
        success: true,
        data: result.data,
        message: '更新成功',
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 获取树形群组列表
  async tree() {
    const { ctx } = this;
    const query = { ...ctx.query, tree: true };

    // 如果需要权限过滤,传入当前用户
    if (ctx.query.withPermission) {
      query.user = ctx.user;
    }

    try {
      const result = await ctx.service.group.list(query);
      ctx.body = result;
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 获取子群组ID列表
  async descendants() {
    const { ctx } = this;
    const parentId = ctx.params.id;

    try {
      const descendants = await ctx.service.group.getDescendantIds(parseInt(parentId));
      ctx.body = {
        success: true,
        data: descendants,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 搜索群组
  async search() {
    const { ctx } = this;
    const { keyword } = ctx.query;

    if (!keyword) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供搜索关键词',
      };
      return;
    }

    try {
      const result = await ctx.service.group.list({
        related_group_name: keyword,
        user: ctx.user, // 权限过滤
      });
      ctx.body = result;
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 获取当前用户可见的群组列表
  async visible() {
    const { ctx } = this;

    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未登录',
      };
      return;
    }

    try {
      const visibleIds = await ctx.service.group.getVisibleGroupIds(ctx.user);
      const result = await ctx.service.group.list({});

      // 过滤出可见的群组
      const visibleGroups = result.data.filter(g => visibleIds.includes(g.id));

      ctx.body = {
        success: true,
        data: visibleGroups,
        total: visibleGroups.length,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 下载Excel导入模板
  async downloadTemplate() {
    const { ctx } = this;
    try {
      const buffer = await ctx.service.group.generateTemplate();
      ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      ctx.set('Content-Disposition', 'attachment; filename=group_import_template.xlsx');
      ctx.body = buffer;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `生成模板失败: ${error.message}`,
      };
    }
  }

  // 导出群组列表
  async export() {
    const { ctx } = this;
    try {
      const query = ctx.query;
      const buffer = await ctx.service.group.exportGroups(query);

      const filename = `group_list_${new Date().getTime()}.xlsx`;
      ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      ctx.set('Content-Disposition', `attachment; filename=${filename}`);
      ctx.body = buffer;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `导出失败: ${error.message}`,
      };
    }
  }

  // 导入群组
  async import() {
    const { ctx } = this;
    try {
      // 检查文件上传
      const file = ctx.request.files?.[0];
      if (!file) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '请上传Excel文件',
        };
        return;
      }

      // 验证文件类型
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      if (!allowedMimeTypes.includes(file.mime)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '只支持Excel文件(.xlsx, .xls)',
        };
        return;
      }

      // 读取文件内容
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.filepath);

      // 导入群组
      const result = await ctx.service.group.importGroups(fileBuffer);

      ctx.body = {
        success: true,
        data: result,
        message: `导入完成,成功 ${result.success} 条,失败 ${result.failed} 条`,
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: `导入失败: ${error.message}`,
      };
    }
  }
}

module.exports = GroupController; 