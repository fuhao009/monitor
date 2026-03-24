-- ============================================================================
-- Migration: Enhance Group and User Management
-- Date: 2025-01-11
-- Description: 添加层级群组、群组关联方式、用户备注等功能
-- ============================================================================

USE dz_db_mysql;

-- ============================================================================
-- 1. 修改 group_info 表
-- ============================================================================

-- 添加 parent_id 字段(上级群组ID)
ALTER TABLE `group_info`
  ADD COLUMN `parent_id` BIGINT(20) DEFAULT NULL COMMENT '上级群组ID,NULL表示顶级群组' AFTER `related_group_id`;

-- 添加 terminal_accounts 字段(终端账号列表,JSON格式)
ALTER TABLE `group_info`
  ADD COLUMN `terminal_accounts` TEXT DEFAULT NULL COMMENT '终端账号列表(JSON数组),如["测试16","测试17"]' AFTER `parent_id`;

-- 添加 association_type 字段(关联类型)
ALTER TABLE `group_info`
  ADD COLUMN `association_type` TINYINT(4) NOT NULL DEFAULT 1 COMMENT '关联类型:1-使用related_group_id,2-使用terminal_accounts' AFTER `terminal_accounts`;

-- 添加索引优化查询性能
ALTER TABLE `group_info`
  ADD INDEX `idx_parent_id` (`parent_id`);

-- 为现有数据设置默认值
-- 如果 related_group_id 不为空,则设置 association_type=1
UPDATE `group_info`
  SET `association_type` = 1
  WHERE `related_group_id` IS NOT NULL AND `related_group_id` != '';

-- ============================================================================
-- 2. 修改 users 表
-- ============================================================================

-- 添加 remark 字段(备注)
ALTER TABLE `users`
  ADD COLUMN `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注信息' AFTER `linked_password`;

-- ============================================================================
-- 验证迁移
-- ============================================================================

-- 验证 group_info 表结构
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dz_db_mysql'
  AND TABLE_NAME = 'group_info'
  AND COLUMN_NAME IN ('parent_id', 'terminal_accounts', 'association_type')
ORDER BY ORDINAL_POSITION;

-- 验证 users 表结构
SELECT
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dz_db_mysql'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'remark';

-- 验证索引创建
SHOW INDEX FROM `group_info` WHERE Key_name = 'idx_parent_id';

-- ============================================================================
-- 迁移完成提示
-- ============================================================================
SELECT '数据库迁移完成!请检查上方验证结果是否正确。' AS '迁移状态';
