'use strict';

const Service = require('egg').Service;
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

class UserService extends Service {
  get userTable() {
    return this.app.knex('users');
  }

  get tokenTable() {
    return this.app.knex('user_tokens');
  }

  // 根据账号查找用户
  async findByAccount(account, password) {
    try {
      const query = this.userTable
        .where({
          account,
          status: 1,
        });

      // 添加查询条件
      if (password) {
        query.where('password', password);
      }

      const user = await query.first();
      return user;
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  // 根据ID查找用户
  async findById(id) {
    return await this.userTable.where({ id }).first();
  }

  // 创建用户Token
  async createToken(userId) {
    const token = uuidv4();
    const expireTime = dayjs().add(90, 'day').format('YYYY-MM-DD HH:mm:ss'); // Token 7天有效期

    await this.tokenTable.insert({
      user_id: userId,
      token,
      expire_time: expireTime,
    });

    return {
      token,
      expire_time: expireTime,
    };
  }

  // 验证Token
  async verifyToken(token) {
    // const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const tokenRecord = await this.tokenTable
      .where({ token, status: 1 })
      // .where('expire_time', '>', now)// TODO 暂时不验证过期时间
      .first();
    if (!tokenRecord) {
      return null;
    }

    return await this.findById(tokenRecord.user_id);
  }

  // 删除过期的Token
  async cleanExpiredTokens(userId) {
    await this.tokenTable
      .where({
        user_id: userId,
      })
      .update({
        update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: 0, // 将状态更新为失效
      });
  }

  // 创建用户
  async createUser({ account, password, username, group_list, role, linked_account, linked_password, remark }) {
    try {
      // 检查账号是否已存在
      const existUser = await this.findByAccount(account);
      if (existUser) {
        return {
          success: false,
          message: '账号已存在',
        };
      }

      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

      // 插入新用户
      const [ id ] = await this.userTable.insert({
        account,
        password,
        username,
        group_list: group_list ? group_list.join?.(',') : '',
        linked_account,
        linked_password,
        role,
        remark,
        status: 1, // 默认启用状态
        create_time: now,
        update_time: now,
      });

      const user = await this.findById(id);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: `创建用户失败: ${error.message}`,
      };
    }
  }

  // 分页查询用户列表
  async getUserList({ page = 1, pageSize = 10, account, username, status, role }) {
    try {
      const query = this.userTable
        .whereNot('status', -1) // 排除已删除的用户
        .orderBy('create_time', 'desc');

      // 添加查询条件
      if (account) {
        query.where('account', 'like', `%${account}%`);
      }
      if (username) {
        query.where('username', 'like', `%${username}%`);
      }
      if (status !== undefined) {
        query.where({ status });
      }
      if (role !== undefined) {
        query.where({ role });
      }

      // 获取总数
      const total = await query.clone().count('id as total').first();

      // 获取分页数据
      const list = await query
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .select([
          'id',
          'account',
          'password',
          'username',
          'group_list',
          'linked_account',
          'linked_password',
          'role',
          'remark',
          'status',
          'create_time',
          'update_time',
        ]);

      // 获取所有用户的群组ID列表
      const allGroupIds = list
        .map(item => (item.group_list ? item.group_list.split(',') : []))
        .flat()
        .filter(id => id); // 过滤空值

      // 如果有群组ID,则查询群组信息
      let groupInfoMap = {};
      if (allGroupIds.length > 0) {
        const groupInfos = await this.app.knex('group_info')
          .whereIn('id', allGroupIds)
          .select([ 'id', 'related_group_name' ]);

        groupInfoMap = groupInfos.reduce((map, group) => {
          map[group.id] = group.related_group_name;
          return map;
        }, {});
      }

      return {
        success: true,
        data: list.map(item => {
          const groupIds = item.group_list ? item.group_list.split(',') : [];
          return {
            ...item,
            key: item.id,
            group_list: groupIds,
            group_names: groupIds.map(id => groupInfoMap[id] || '').filter(name => !!name),
          };
        }),
        total: total.total,
        current: parseInt(page),
        pageSize: parseInt(pageSize),
      };
    } catch (error) {
      console.error('Get user list error:', error);
      return {
        success: false,
        message: `查询用户列表失败: ${error.message}`,
      };
    }
  }

  // 更新用户信息
  async updateUser(id, { username, group_list, status, role, remark }) {
    try {
      const user = await this.findById(id);
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
        };
      }

      const updateData = {
        update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };

      if (username !== undefined) updateData.username = username;
      if (group_list !== undefined) updateData.group_list = Array.isArray(group_list) ? group_list.join(',') : group_list;
      if (status !== undefined) updateData.status = status;
      if (role !== undefined) updateData.role = role;
      if (remark !== undefined) updateData.remark = remark;

      await this.userTable.where({ id }).update(updateData);

      const updatedUser = await this.findById(id);
      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        message: `更新用户失败: ${error.message}`,
      };
    }
  }

  // 软删除用户
  async deleteUser(id) {
    try {
      const user = await this.findById(id);
      if (!user) {
        return {
          success: false,
          message: '用户不存在',
        };
      }

      if (user.status === 0) {
        return {
          success: false,
          message: '用户已被删除',
        };
      }

      // await this.updateUser(id, { status: 0 });

      // 使用事务确保用户状态和token状态的更新是原子操作
      await this.app.knex.transaction(async trx => {
        // 更新用户状态
        await this.userTable.where({ id }).update({
          status: 0,
          update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        }).transacting(trx);

        // 使该用户所有有效token失效
        await this.tokenTable
          .where({
            user_id: id,
            status: 1,
          })
          .update({
            status: 0,
            update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          })
          .transacting(trx);
      });

      return {
        success: true,
        message: '删除成功',
      };
    } catch (error) {
      return {
        success: false,
        message: `删除用户失败: ${error.message}`,
      };
    }
  }

  // 获取token列表
  async getTokenList({ page = 1, pageSize = 10 }) {
    try {
      const query = this.tokenTable
        .select([
          'user_tokens.*',
          'users.account',
          'users.username',
        ])
        .leftJoin('users', 'user_tokens.user_id', 'users.id')
        .whereNot('users.status', -1) // 排除已删除用户的token
        .orderBy('user_tokens.create_time', 'desc');

      // 获取总数
      const total = await query.clone().count('user_tokens.id as total').first();

      // 获取分页数据
      const list = await query
        .offset((page - 1) * pageSize)
        .limit(pageSize);

      return {
        success: true,
        data: {
          list,
          pagination: {
            total: total.total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `查询Token列表失败: ${error.message}`,
      };
    }
  }

  // 登出
  async logout(token) {
    try {
      const tokenRecord = await this.tokenTable
        .where({ token })
        .first();

      if (!tokenRecord) {
        return {
          success: false,
          message: 'token不存在',
        };
      }

      // 将token状态更新为已失效
      await this.tokenTable
        .where({ token })
        .update({
          status: 0,
          update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        });

      return {
        success: true,
        message: '登出成功',
      };
    } catch (error) {
      return {
        success: false,
        message: `登出失败: ${error.message}`,
      };
    }
  }

  /**
   * 生成Excel导入模板
   * @return {Buffer} Excel文件buffer
   */
  async generateTemplate() {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户导入模板');

    // 设置列
    worksheet.columns = [
      { header: '账号', key: 'account', width: 15 },
      { header: '密码', key: 'password', width: 15 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '角色', key: 'role', width: 15 },
      { header: '群组ID(逗号分隔)', key: 'group_list', width: 30 },
      { header: '关联账号', key: 'linked_account', width: 20 },
      { header: '关联密码', key: 'linked_password', width: 20 },
      { header: '备注', key: 'remark', width: 30 },
    ];

    // 添加示例数据
    worksheet.addRow({
      account: 'test001',
      password: '123456',
      username: '测试用户',
      role: '普通用户',
      group_list: '36006,36007',
      linked_account: '',
      linked_password: '',
      remark: '示例用户',
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * 导入用户(Excel)
   * @param {Buffer} fileBuffer Excel文件内容
   * @return {Object} 导入结果
   */
  async importUsers(fileBuffer) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    const results = { success: 0, failed: 0, errors: [] };

    // 验证文件不能超过1000行
    if (worksheet.rowCount > 1001) { // 包括表头
      throw new Error('单次导入最多1000条');
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // 跳过空行
      if (!row.getCell(1).value) continue;

      try {
        const userData = {
          account: row.getCell(1).value?.toString().trim(),
          password: row.getCell(2).value?.toString().trim(),
          username: row.getCell(3).value?.toString().trim(),
          role: row.getCell(4).value?.toString() === '超级管理员' ? 0 : 1,
          group_list: row.getCell(5).value?.toString().trim().split(',').filter(Boolean),
          linked_account: row.getCell(6).value?.toString().trim() || null,
          linked_password: row.getCell(7).value?.toString().trim() || null,
          remark: row.getCell(8).value?.toString().trim() || null,
        };

        // 验证必填字段
        if (!userData.account || !userData.password || !userData.username) {
          throw new Error('账号、密码、用户名不能为空');
        }

        // 验证群组ID是否存在
        if (userData.group_list && userData.group_list.length > 0) {
          const groupIds = userData.group_list.map(Number);
          const groups = await this.app.knex('group_info')
            .whereIn('id', groupIds)
            .where({ status: 1 });

          if (groups.length !== groupIds.length) {
            const existIds = groups.map(g => g.id);
            const missingIds = groupIds.filter(id => !existIds.includes(id));
            throw new Error(`群组ID ${missingIds.join(', ')} 不存在`);
          }
        }

        // 创建用户
        const result = await this.createUser(userData);
        if (!result.success) {
          throw new Error(result.message);
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * 导出用户(Excel)
   * @param {Object} query 查询条件
   * @return {Buffer} Excel文件buffer
   */
  async exportUsers(query) {
    const ExcelJS = require('exceljs');

    // 获取用户列表(不分页)
    const result = await this.getUserList({
      ...query,
      page: 1,
      pageSize: 999999,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('用户列表');

    // 设置列
    worksheet.columns = [
      { header: '账号', key: 'account', width: 15 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '角色', key: 'role', width: 15 },
      { header: '群组ID', key: 'group_list', width: 30 },
      { header: '关联账号', key: 'linked_account', width: 20 },
      { header: '备注', key: 'remark', width: 30 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建时间', key: 'create_time', width: 20 },
    ];

    // 添加数据
    result.data.forEach(user => {
      worksheet.addRow({
        account: user.account,
        username: user.username,
        role: user.role === 0 ? '超级管理员' : '普通用户',
        group_list: user.group_list || '',
        linked_account: user.linked_account || '',
        remark: user.remark || '',
        status: user.status === 1 ? '正常' : '禁用',
        create_time: user.create_time,
      });
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = UserService;
