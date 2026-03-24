'use strict';

const Service = require('egg').Service;
const dayjs = require('dayjs');

class GroupService extends Service {
  get groupTable() {
    return this.app.knex('group_info');
  }

  // 根据ID查找用户
  async findById(id) {
    return await this.groupTable.where({ id }).first();
  }

  // 获取群组列表
  async list({ page = 1, pageSize = 10, related_group_name, status, id, related_group_id, tree, user }) {
    try {
      const query = this.groupTable
        .whereNot('status', 0) // 排除已删除的群组
        .orderBy('create_time', 'desc');

      // 添加查询条件
      if (related_group_name) {
        query.where('related_group_name', 'like', `%${related_group_name}%`);
      }
      if (id) {
        query.where('id', id);
      }
      if (related_group_id) {
        query.where('related_group_id', related_group_id);
      }
      if (status !== undefined) {
        query.where({ status });
      }

      // 获取所有群组数据(用于构建树或权限过滤)
      let list = await query.select([
        'id',
        'related_group_name',
        'related_group_id',
        'parent_id',
        'terminal_accounts',
        'association_type',
        'status',
        'create_time',
        'update_time',
      ]);

      // 权限过滤
      if (user) {
        const visibleIds = await this.getVisibleGroupIds(user);
        list = list.filter(g => visibleIds.includes(g.id));
      }

      const total = list.length;

      // 如果需要树形结构
      if (tree) {
        const treeData = this.buildTree(list);
        return {
          success: true,
          data: treeData,
          total,
        };
      }

      // 分页
      const pagedList = list.slice((page - 1) * pageSize, page * pageSize);

      return {
        success: true,
        data: pagedList.map(item => ({
          ...item,
          key: item.id,
        })),
        total,
        current: parseInt(page),
        pageSize: parseInt(pageSize),
      };
    } catch (error) {
      return {
        success: false,
        message: `查询群组列表失败: ${error.message}`,
      };
    }
  }

  // 创建群组
  async create(payload) {
    // 检查群组名称是否已存在
    const existGroup = await this.groupTable.where({
      related_group_name: payload.related_group_name,
      status: 1,
    });
    if (existGroup?.length) {
      throw new Error('群组名称已存在');
    }

    // 验证父群组ID
    if (payload.parent_id) {
      const parentGroup = await this.findById(payload.parent_id);
      if (!parentGroup) {
        throw new Error('上级群组不存在');
      }
    }

    // 验证关联方式
    const association_type = payload.association_type || 1;
    if (association_type === 1) {
      // 使用关联群组ID
      if (!payload.related_group_id) {
        throw new Error('关联方式为群组ID时,必须提供related_group_id');
      }
      payload.terminal_accounts = null;
    } else if (association_type === 2) {
      // 使用终端账号
      if (!payload.terminal_accounts || payload.terminal_accounts.length === 0) {
        throw new Error('关联方式为终端账号时,必须提供至少一个终端账号');
      }
      // 将数组转为JSON字符串
      payload.terminal_accounts = JSON.stringify(payload.terminal_accounts);
      payload.related_group_id = null;
    } else {
      throw new Error('关联类型必须为1(群组ID)或2(终端账号)');
    }

    const [ id ] = await this.groupTable.insert({
      ...payload,
      association_type,
      status: 1,
      create_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    const group = await this.findById(id);

    // 绑定账号(association_type=2)时，查询并返回上级群组名称
    let parent_group_name = null;
    if (association_type === 2 && group.parent_id) {
      const parentGroup = await this.findById(group.parent_id);
      parent_group_name = parentGroup?.related_group_name || null;
    }

    return {
      success: true,
      data: {
        ...group,
        ...(parent_group_name ? { parent_group_name } : {}),
      },
    };
  }

  // 删除群组（软删除）
  async destroy(id) {

    // 检查群组是否存在
    const group = await this.groupTable.where({ id });
    if (!group?.length) {
      throw new Error('群组不存在');
    }

    // 软删除：更新状态为 0
    const result = await this.groupTable.where({ id }).update({
      status: 0,
      update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    return result;
  }

  /**
   * 递归查询所有子群组ID
   * @param {Number} parentId 上级群组ID
   * @param {Number} depth 当前递归深度
   * @param {Number} maxDepth 最大递归深度
   * @return {Array<Number>} 子群组ID数组
   */
  async getDescendantIds(parentId, depth = 0, maxDepth = 5) {
    // 防止无限递归
    if (depth >= maxDepth) {
      this.logger.warn(`递归深度达到限制 ${maxDepth},停止查询`);
      return [];
    }

    const children = await this.groupTable
      .where({ parent_id: parentId, status: 1 })
      .select('id');

    const ids = children.map(g => g.id);

    // 递归查询子群组的子群组
    for (const child of children) {
      const subIds = await this.getDescendantIds(child.id, depth + 1, maxDepth);
      ids.push(...subIds);
    }

    return ids;
  }

  /**
   * 构建群组树结构
   * @param {Array} groups 扁平群组列表
   * @param {Number|null} parentId 父节点ID
   * @return {Array} 树形结构
   */
  buildTree(groups, parentId = null) {
    return groups
      .filter(g => g.parent_id === parentId)
      .map(g => ({
        ...g,
        children: this.buildTree(groups, g.id),
      }));
  }

  /**
   * 获取用户可见的群组ID列表
   * @param {Object} user 用户对象
   * @return {Array<Number>} 群组ID数组
   */
  async getVisibleGroupIds(user) {
    if (user.role === 0) {
      // 超级管理员返回所有群组
      const allGroups = await this.groupTable.where({ status: 1 }).select('id');
      return allGroups.map(g => g.id);
    }

    // 普通用户返回所属群组及其子群组
    const groupIds = (user.group_list || '')
      .split(',')
      .filter(Boolean)
      .map(Number);

    const allIds = [...groupIds];

    // 递归获取所有子群组
    for (const gid of groupIds) {
      const descendants = await this.getDescendantIds(gid);
      allIds.push(...descendants);
    }

    return [...new Set(allIds)]; // 去重
  }

  /**
   * 验证父群组ID,防止循环引用
   * @param {Number} groupId 当前群组ID
   * @param {Number} parentId 父群组ID
   * @return {Boolean} 是否有效
   */
  async validateParentId(groupId, parentId) {
    if (!parentId) {
      return true; // 顶级群组
    }

    // 不能将父群组设置为自己
    if (groupId === parentId) {
      throw new Error('不能将父群组设置为自己');
    }

    // 检查是否会形成循环引用
    const ancestors = await this.getAncestorIds(parentId);
    if (ancestors.includes(groupId)) {
      throw new Error('设置会导致循环引用');
    }

    return true;
  }

  /**
   * 获取所有祖先群组ID
   * @param {Number} groupId 群组ID
   * @param {Number} depth 当前递归深度
   * @param {Number} maxDepth 最大递归深度
   * @return {Array<Number>} 祖先群组ID数组
   */
  async getAncestorIds(groupId, depth = 0, maxDepth = 5) {
    if (depth >= maxDepth) {
      return [];
    }

    const group = await this.findById(groupId);
    if (!group || !group.parent_id) {
      return [];
    }

    const ancestors = [group.parent_id];
    const parentAncestors = await this.getAncestorIds(group.parent_id, depth + 1, maxDepth);
    ancestors.push(...parentAncestors);

    return ancestors;
  }

  /**
   * 更新群组
   * @param {Number} id 群组ID
   * @param {Object} payload 更新数据
   * @return {Object} 更新结果
   */
  async update(id, payload) {
    // 检查群组是否存在
    const group = await this.findById(id);
    if (!group) {
      throw new Error('群组不存在');
    }

    // 验证父群组ID
    if (payload.parent_id !== undefined) {
      await this.validateParentId(id, payload.parent_id);
    }

    // 验证关联方式
    if (payload.association_type !== undefined) {
      if (payload.association_type === 1) {
        // 使用关联群组ID,清空终端账号
        payload.terminal_accounts = null;
      } else if (payload.association_type === 2) {
        // 使用终端账号,清空关联群组ID
        payload.related_group_id = null;
      }
    }

    // 更新群组
    await this.groupTable.where({ id }).update({
      ...payload,
      update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    });

    const updatedGroup = await this.findById(id);
    return {
      success: true,
      data: updatedGroup,
    };
  }

  /**
   * 生成Excel导入模板
   * @return {Buffer} Excel文件buffer
   */
  async generateTemplate() {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('群组导入模板');

    // 设置列
    worksheet.columns = [
      { header: '群组名称', key: 'related_group_name', width: 25 },
      { header: '上级群组ID', key: 'parent_id', width: 15 },
      { header: '关联方式(1或2)', key: 'association_type', width: 20 },
      { header: '关联群组ID', key: 'related_group_id', width: 20 },
      { header: '终端账号(逗号分隔)', key: 'terminal_accounts', width: 30 },
    ];

    // 添加示例数据 - 关联方式1(使用群组ID)
    worksheet.addRow({
      related_group_name: '示例群组1',
      parent_id: '',
      association_type: 1,
      related_group_id: '920',
      terminal_accounts: '',
    });

    // 添加示例数据 - 关联方式2(使用终端账号)
    worksheet.addRow({
      related_group_name: '示例群组2',
      parent_id: '',
      association_type: 2,
      related_group_id: '',
      terminal_accounts: '测试001,测试002,测试003',
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
   * 导出群组(Excel)
   * @param {Object} query 查询条件
   * @return {Buffer} Excel文件buffer
   */
  async exportGroups(query) {
    const ExcelJS = require('exceljs');

    // 获取群组列表(不分页)
    const result = await this.list({
      ...query,
      page: 1,
      pageSize: 999999,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('群组列表');

    // 设置列
    worksheet.columns = [
      { header: '群组ID', key: 'id', width: 12 },
      { header: '群组名称', key: 'related_group_name', width: 25 },
      { header: '上级群组ID', key: 'parent_id', width: 15 },
      { header: '关联方式', key: 'association_type', width: 15 },
      { header: '关联群组ID', key: 'related_group_id', width: 20 },
      { header: '终端账号', key: 'terminal_accounts', width: 30 },
      { header: '创建时间', key: 'create_time', width: 20 },
    ];

    // 添加数据
    result.data.forEach(group => {
      // 处理terminal_accounts: JSON数组转逗号分隔字符串
      let terminalAccountsStr = '';
      if (group.terminal_accounts) {
        try {
          const accounts = typeof group.terminal_accounts === 'string'
            ? JSON.parse(group.terminal_accounts)
            : group.terminal_accounts;
          terminalAccountsStr = Array.isArray(accounts) ? accounts.join(',') : '';
        } catch (e) {
          terminalAccountsStr = group.terminal_accounts;
        }
      }

      worksheet.addRow({
        id: group.id,
        related_group_name: group.related_group_name,
        parent_id: group.parent_id || '',
        association_type: group.association_type,
        related_group_id: group.related_group_id || '',
        terminal_accounts: terminalAccountsStr,
        create_time: group.create_time,
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

  /**
   * 导入群组(Excel)
   * @param {Buffer} fileBuffer Excel文件内容
   * @return {Object} 导入结果
   */
  async importGroups(fileBuffer) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    const results = { success: 0, failed: 0, errors: [] };

    // 验证文件不能超过1000行
    if (worksheet.rowCount > 1001) { // 包括表头
      throw new Error('单次导入最多1000条');
    }

    // 收集所有待创建的群组数据,用于检测循环引用
    const groupsToCreate = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      // 跳过空行
      if (!row.getCell(1).value) continue;

      try {
        const groupData = {
          related_group_name: row.getCell(1).value?.toString().trim(),
          parent_id: row.getCell(2).value ? Number(row.getCell(2).value) : null,
          association_type: Number(row.getCell(3).value),
          related_group_id: row.getCell(4).value?.toString().trim() || null,
          terminal_accounts: row.getCell(5).value?.toString().trim() || null,
        };

        // 验证必填字段
        if (!groupData.related_group_name) {
          throw new Error('群组名称不能为空');
        }

        // 验证关联方式
        if (![1, 2].includes(groupData.association_type)) {
          throw new Error('关联方式必须是1或2');
        }

        // 验证类型1必须有related_group_id
        if (groupData.association_type === 1 && !groupData.related_group_id) {
          throw new Error('关联方式为1时,必须提供关联群组ID');
        }

        // 验证类型2必须有terminal_accounts
        if (groupData.association_type === 2 && !groupData.terminal_accounts) {
          throw new Error('关联方式为2时,必须提供终端账号');
        }

        // 处理终端账号:逗号分隔字符串转JSON数组
        if (groupData.association_type === 2) {
          const accounts = groupData.terminal_accounts
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          groupData.terminal_accounts = accounts;
        } else {
          groupData.terminal_accounts = null;
        }

        // 检查群组名称唯一性
        const existGroup = await this.groupTable.where({
          related_group_name: groupData.related_group_name,
          status: 1,
        }).first();

        if (existGroup) {
          throw new Error('群组名称已存在');
        }

        // 验证parent_id存在性
        if (groupData.parent_id) {
          const parentGroup = await this.findById(groupData.parent_id);
          if (!parentGroup) {
            throw new Error(`上级群组ID ${groupData.parent_id} 不存在`);
          }
        }

        // 创建群组
        const result = await this.create(groupData);
        if (!result.success) {
          throw new Error(result.message || '创建失败');
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
}

module.exports = GroupService;
