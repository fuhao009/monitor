#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3110,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'dz123456',
    database: process.env.DB_NAME || 'dz_db_mysql',
    multipleStatements: true,
  });

  try {
    console.log('🔌 连接到数据库...');

    const migrationFile = path.join(__dirname, 'migrations', '001_enhance_group_user.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('📝 执行迁移脚本...');
    await connection.query(sql);

    console.log('✅ 迁移成功完成!');

    // 验证字段是否创建成功
    const [ groupFields ] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'group_info'
        AND COLUMN_NAME IN ('parent_id', 'terminal_accounts', 'association_type')
    `);

    const [ userFields ] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'remark'
    `);

    console.log('\n✓ group_info 新字段:');
    groupFields.forEach(field => {
      console.log(`  - ${field.COLUMN_NAME}: ${field.COLUMN_TYPE}`);
    });

    console.log('\n✓ users 新字段:');
    userFields.forEach(field => {
      console.log(`  - ${field.COLUMN_NAME}: ${field.COLUMN_TYPE}`);
    });

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
