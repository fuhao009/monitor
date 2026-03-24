# 部署相关

## docker

### 运行mysql

```bash
docker run --name mysql -p 3110:3306 -v /root/data/mysql:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=dz123456 --restart=always -d mysql:5.7 --sql_mode='' --lower_case_table_names=1
```

### 进入mysql

```bash
# 1. 进入容器
docker exec -it defe7b7c4cc8 bash

# 2. 登录 MySQL（如果需要密码，将在提示时输入）
mysql -u root -p

# 3. 查看所有数据库
show databases;

# 4. 选择要查看的数据库
use your_database_name;

# 5. 查看所有表
show tables;

# 6. 查看特定表结构
desc table_name;
# 或者
show create table table_name;

```

## 表结构

```sql
CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `account` varchar(50) NOT NULL COMMENT '账号',
  `password` varchar(255) NOT NULL,
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `group_list` text COMMENT '用户所属组织机构列表',
  `role` tinyint(4) NOT NULL DEFAULT '1' COMMENT '1-普通用户 0-超级管理员',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1-正常 0-删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26012 DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

CREATE TABLE `user_tokens` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint(20) NOT NULL COMMENT '用户ID',
  `token` varchar(255) NOT NULL COMMENT '用户token',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1-有效 0-无效',
  `expire_time` datetime NOT NULL COMMENT 'token过期时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token` (`token`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=36052 DEFAULT CHARSET=utf8mb4 COMMENT='用户token表';


CREATE TABLE `group_info` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `related_group_name` varchar(255) NOT NULL COMMENT '关联组织名称',
  `related_group_id` varchar(255) DEFAULT NULL COMMENT '关联组织ID',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '状态：1-正常 0-删除',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_related_group_id` (`related_group_id`),
  KEY `idx_related_group_name` (`related_group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=36011 DEFAULT CHARSET=utf8mb4 COMMENT='组织信息表';
```

## 运行node服务

node仓库地址：https://github.com/niexq/egg-audio

```bash
npm start
```

## web网站

node仓库地址：https://github.com/niexq/web-audio

打包网站产物

```bash
npm run build
```
