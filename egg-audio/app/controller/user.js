'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  async create() {
    const { ctx } = this;
    const { account, password, username, group_list, role, linked_account, linked_password, remark } = ctx.request.body;

    // 参数验证
    if (!account || !password || !username) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '账号、密码、用户名不能为空',
      };
      return;
    }

    // 账号格式验证
    if (account.length < 3 || account.length > 50) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '账号长度必须在3-50个字符之间',
      };
      return;
    }

    // 密码格式验证
    if (password.length < 6 || password.length > 20) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '密码长度必须在6-20个字符之间',
      };
      return;
    }

    // 用户名格式验证
    if (username.length < 2 || username.length > 50) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户名长度必须在2-50个字符之间',
      };
      return;
    }

    // 群组列表验证
    if (group_list && !Array.isArray(group_list)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'group_list必须是数组格式',
      };
      return;
    }

    try {
      const result = await ctx.service.user.createUser({
        role,
        account,
        password,
        username,
        group_list,
        linked_account,
        linked_password,
        remark,
      });

      if (!result.success) {
        ctx.status = 400;
        ctx.body = result;
        return;
      }

      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '创建用户失败',
      };
    }
  }

  // 获取用户列表
  async list() {
    const { ctx } = this;
    const { current = 1, pageSize = 10, account, username, status, role } = ctx.query;
    try {
      const result = await ctx.service.user.getUserList({
        page: parseInt(current),
        pageSize: parseInt(pageSize),
        account,
        username,
        status: status !== undefined ? parseInt(status) : undefined,
        role: role !== undefined ? parseInt(role) : undefined,
      });

      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取用户列表失败',
      };
    }
  }

  // 更新用户
  async update() {
    const { ctx } = this;
    const id = ctx.params.id;
    const { username, group_list, status, role, remark } = ctx.request.body;

    if (!id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户ID不能为空',
      };
      return;
    }

    // 用户名格式验证
    if (username && (username.length < 2 || username.length > 50)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户名长度必须在2-50个字符之间',
      };
      return;
    }

    // 群组列表验证
    if (group_list && !Array.isArray(group_list)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'group_list必须是数组格式',
      };
      return;
    }

    try {
      const result = await ctx.service.user.updateUser(id, {
        username,
        group_list,
        status,
        role,
        remark,
      });

      if (!result.success) {
        ctx.status = 400;
      }
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '更新用户失败',
      };
    }
  }

  // 删除用户
  async delete() {
    const { ctx } = this;
    const { id } = ctx.params;

    if (!id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户ID不能为空',
      };
      return;
    }

    try {
      const result = await ctx.service.user.deleteUser(id);
      if (!result.success) {
        ctx.status = 400;
      }
      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '删除用户失败',
      };
    }
  }

  // 获取token列表
  async tokenList() {
    const { ctx } = this;
    const { page = 1, pageSize = 10 } = ctx.query;

    try {
      const result = await ctx.service.user.getTokenList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      });

      ctx.body = result;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取Token列表失败',
      };
    }
  }

  // 通过token获取用户信息
  async getInfo() {
    const { ctx } = this;
    // const token = ctx.get('Authorization') || ctx.query.token;
    const authHeader = ctx.get('Authorization');
    const queryToken = ctx?.query?.token;
    const token = authHeader ? authHeader.replace('Bearer ', '') : queryToken;

    if (!token) {
      ctx.status = 201;
      ctx.body = {
        success: false,
        message: '未提供token',
      };
      return;
    }

    try {
      const result = await ctx.service.user.verifyToken(token);
      if (!result.success) {
        ctx.status = 201;
      }
      ctx.body = {
        success: true,
        data: {
          ...result,
          name: result.username,
          avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
          access: Number(result.role) === 0 ? 'admin' : 'user',
        },
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '获取用户信息失败',
      };
    }
  }

  // 下载导入模板
  async downloadTemplate() {
    const { ctx } = this;

    try {
      const buffer = await ctx.service.user.generateTemplate();

      ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      ctx.set('Content-Disposition', 'attachment; filename=user_import_template.xlsx');
      ctx.body = buffer;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '生成模板失败',
      };
    }
  }

  // 导入用户
  async import() {
    const { ctx } = this;
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
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!allowedTypes.includes(file.mime)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '只支持Excel文件(.xlsx, .xls)',
      };
      return;
    }

    try {
      const fs = require('fs');
      const fileBuffer = fs.readFileSync(file.filepath);

      const results = await ctx.service.user.importUsers(fileBuffer);

      ctx.body = {
        success: true,
        data: results,
        message: `导入完成: 成功${results.success}条, 失败${results.failed}条`,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message,
      };
    }
  }

  // 导出用户
  async export() {
    const { ctx } = this;
    const query = ctx.query;

    try {
      const buffer = await ctx.service.user.exportUsers(query);

      ctx.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      ctx.set('Content-Disposition', 'attachment; filename=users_export.xlsx');
      ctx.body = buffer;
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '导出失败',
      };
    }
  }
}

module.exports = UserController;
