-- ============================================================================
-- Rollback: Enhance Group and User Management
-- Date: 2025-01-11
-- Description: 回滚数据库迁移,删除新增的字段和索引
-- ============================================================================

USE dz_db_mysql;

-- ============================================================================
-- 警告: 此脚本将删除数据!
-- ============================================================================
-- 执行此脚本前请确保:
-- 1. 已备份数据库
-- 2. 确认需要回滚
-- 3. 应用程序已停止或切换到旧版本代码
-- ============================================================================

-- ============================================================================
-- 1. 回滚 group_info 表
-- ============================================================================

-- 删除索引
ALTER TABLE `group_info` DROP INDEX `idx_parent_id`;

-- 删除字段(注意:这会删除所有相关数据!)
ALTER TABLE `group_info` DROP COLUMN `association_type`;
ALTER TABLE `group_info` DROP COLUMN `terminal_accounts`;
ALTER TABLE `group_info` DROP COLUMN `parent_id`;

-- ============================================================================
-- 2. 回滚 users 表
-- ============================================================================

-- 删除字段(注意:这会删除所有备注数据!)
ALTER TABLE `users` DROP COLUMN `remark`;

-- ============================================================================
-- 验证回滚
-- ============================================================================

-- 验证 group_info 表字段已删除
SELECT COUNT(*) AS '应为0'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dz_db_mysql'
  AND TABLE_NAME = 'group_info'
  AND COLUMN_NAME IN ('parent_id', 'terminal_accounts', 'association_type');

-- 验证 users 表字段已删除
SELECT COUNT(*) AS '应为0'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dz_db_mysql'
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'remark';

-- 验证索引已删除
SELECT COUNT(*) AS '应为0'
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'dz_db_mysql'
  AND TABLE_NAME = 'group_info'
  AND INDEX_NAME = 'idx_parent_id';

-- ============================================================================
-- 回滚完成提示
-- ============================================================================
SELECT '数据库回滚完成!请检查上方验证结果是否都为0。' AS '回滚状态';
