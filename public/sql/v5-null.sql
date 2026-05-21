/*
 Navicat Premium Data Transfer

 Source Server         : test
 Source Server Type    : MySQL
 Source Server Version : 80200
 Source Host           : localhost:3306
 Source Schema         : v5

 Target Server Type    : MySQL
 Target Server Version : 80200
 File Encoding         : 65001

 Date: 21/05/2026 13:50:01
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for bandwidth_usage_record
-- ----------------------------
DROP TABLE IF EXISTS `bandwidth_usage_record`;
CREATE TABLE `bandwidth_usage_record`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `productInstanceId` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '商品实例id',
  `subOrderCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '所属子订单',
  `partyA` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '甲方',
  `uplinkRegion` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '上行区域',
  `downlinkRegion` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '下行区域',
  `frequencyBlockId` int(0) NULL DEFAULT NULL COMMENT '频率块id',
  `frequencyBlockCode2` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '频率块代码-2，冗余字段',
  `startTime` bigint(0) NULL DEFAULT NULL COMMENT '开始时间',
  `endTime` bigint(0) NULL DEFAULT NULL COMMENT '结束时间',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_bandwidth_product_instance_id`(`productInstanceId`) USING BTREE,
  INDEX `idx_bandwidth_frequency_block_id`(`frequencyBlockId`) USING BTREE,
  INDEX `idx_bandwidth_frequency_block_code2`(`frequencyBlockCode2`) USING BTREE,
  CONSTRAINT `fk_bandwidth_frequency_block` FOREIGN KEY (`frequencyBlockId`) REFERENCES `frequency_block_realtime_status` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '带宽频率块使用记录表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for channel_group_info
-- ----------------------------
DROP TABLE IF EXISTS `channel_group_info`;
CREATE TABLE `channel_group_info`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `channelGroupCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '通道组代码',
  `channelGroupSeq` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '通道组序号',
  `satelliteId` int(0) NULL DEFAULT NULL COMMENT '卫星id',
  `satelliteCode` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '卫星代号，冗余字段',
  `antennaCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '天线',
  `beamCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '波束代号',
  `txRxType` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '收发类型：R/T',
  `referenceSeq` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '参考序号',
  `polarization` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '极化',
  `band` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '频段',
  `channelCount` int(0) NULL DEFAULT NULL COMMENT '通道数',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_channel_group_code`(`channelGroupCode`) USING BTREE,
  INDEX `idx_channel_group_satellite_id`(`satelliteId`) USING BTREE,
  CONSTRAINT `fk_channel_group_satellite` FOREIGN KEY (`satelliteId`) REFERENCES `satellite_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '通道组表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for channel_info
-- ----------------------------
DROP TABLE IF EXISTS `channel_info`;
CREATE TABLE `channel_info`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `channelCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '通道代号',
  `channelFullName` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '通道全称',
  `channelShortName` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '通道简称',
  `channelGroupId` int(0) NULL DEFAULT NULL COMMENT '通道组id',
  `channelGroupCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '通道组代号，冗余字段',
  `referenceSeq` int(0) NULL DEFAULT NULL COMMENT '参考序号',
  `channelBandwidth` decimal(12, 2) NULL DEFAULT NULL COMMENT '通道带宽，保留小数点后两位',
  `channelStartFreq` decimal(12, 2) NULL DEFAULT NULL COMMENT '通道起频率，保留小数点后两位',
  `channelEndFreq` decimal(12, 2) NULL DEFAULT NULL COMMENT '通道止频率，保留小数点后两位',
  `commonName` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '常用名',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_channel_code`(`channelCode`) USING BTREE,
  INDEX `idx_channel_short_name`(`channelShortName`) USING BTREE,
  INDEX `idx_channel_group_id`(`channelGroupId`) USING BTREE,
  CONSTRAINT `fk_channel_group` FOREIGN KEY (`channelGroupId`) REFERENCES `channel_group_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '通道表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for frequency_block_realtime_status
-- ----------------------------
DROP TABLE IF EXISTS `frequency_block_realtime_status`;
CREATE TABLE `frequency_block_realtime_status`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `frequencyBlockCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '频率块代码',
  `frequencyBlockCode2` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '频率块代码-2',
  `switchId` int(0) NULL DEFAULT NULL COMMENT '开关id',
  `switchCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '开关代码，冗余字段',
  `frequencyOffset` decimal(12, 2) NULL DEFAULT NULL COMMENT '偏移量，保留小数点后两位',
  `occupiedBandwidth` decimal(12, 2) NULL DEFAULT NULL COMMENT '占用宽度，保留小数点后两位',
  `partitionStatus` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '状态：P划分，R回收',
  `statusUpdateTime` bigint(0) NULL DEFAULT NULL COMMENT '状态修改时间',
  `usageType` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '用途分类：出租/合作/自用/禁用',
  `uplinkStartFreq` decimal(12, 2) NULL DEFAULT NULL COMMENT '上行起频率，保留小数点后两位',
  `uplinkEndFreq` decimal(12, 2) NULL DEFAULT NULL COMMENT '上行止频率，保留小数点后两位',
  `downlinkStartFreq` decimal(12, 2) NULL DEFAULT NULL COMMENT '下行起频率，保留小数点后两位',
  `downlinkEndFreq` decimal(12, 2) NULL DEFAULT NULL COMMENT '下行止频率，保留小数点后两位',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_frequency_block_code`(`frequencyBlockCode`) USING BTREE,
  INDEX `idx_frequency_block_code2`(`frequencyBlockCode2`) USING BTREE,
  INDEX `idx_frequency_block_switch_id`(`switchId`) USING BTREE,
  CONSTRAINT `fk_frequency_block_switch` FOREIGN KEY (`switchId`) REFERENCES `matrix_switch_status` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '频率块划分实时状态表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for matrix_port_info
-- ----------------------------
DROP TABLE IF EXISTS `matrix_port_info`;
CREATE TABLE `matrix_port_info`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `portCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '端口代码',
  `matrixId` int(0) NULL DEFAULT NULL COMMENT '所属矩阵id',
  `matrixCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '所属矩阵，冗余字段',
  `ioType` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '输入I/输出O：I/O',
  `portSeq` int(0) NULL DEFAULT NULL COMMENT '序号',
  `channelId` int(0) NULL DEFAULT NULL COMMENT '关联通道id',
  `channelShortName` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '关联通道代码（短），冗余字段',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_port_code`(`portCode`) USING BTREE,
  INDEX `idx_matrix_port_matrix_id`(`matrixId`) USING BTREE,
  INDEX `idx_matrix_port_channel_id`(`channelId`) USING BTREE,
  CONSTRAINT `fk_matrix_port_channel` FOREIGN KEY (`channelId`) REFERENCES `channel_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_matrix_port_matrix` FOREIGN KEY (`matrixId`) REFERENCES `switch_matrix_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '端口表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for matrix_switch_status
-- ----------------------------
DROP TABLE IF EXISTS `matrix_switch_status`;
CREATE TABLE `matrix_switch_status`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `switchCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '开关代码',
  `matrixId` int(0) NULL DEFAULT NULL COMMENT '所属矩阵id',
  `matrixCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '所属矩阵，冗余字段',
  `inputPortId` int(0) NULL DEFAULT NULL COMMENT '入端口id',
  `inputPortSeq` int(0) NULL DEFAULT NULL COMMENT '入端口序号，冗余字段',
  `outputPortId` int(0) NULL DEFAULT NULL COMMENT '出端口id',
  `outputPortSeq` int(0) NULL DEFAULT NULL COMMENT '出端口序号，冗余字段',
  `switchStatus` tinyint(0) NULL DEFAULT NULL COMMENT '开关状态：1通，0断',
  `switchType` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '开关类型：常通/可切',
  `usedTwtCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '使用TWT',
  `p0` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'P0',
  `p1` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'P1',
  `p2` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'P2',
  `twtValidStatus` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'TWT有效状态：P0/P1/P2',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_switch_code`(`switchCode`) USING BTREE,
  INDEX `idx_switch_matrix_id`(`matrixId`) USING BTREE,
  INDEX `idx_switch_input_port_id`(`inputPortId`) USING BTREE,
  INDEX `idx_switch_output_port_id`(`outputPortId`) USING BTREE,
  CONSTRAINT `fk_switch_input_port` FOREIGN KEY (`inputPortId`) REFERENCES `matrix_port_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_switch_matrix` FOREIGN KEY (`matrixId`) REFERENCES `switch_matrix_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_switch_output_port` FOREIGN KEY (`outputPortId`) REFERENCES `matrix_port_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '开关状态表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for satellite_info
-- ----------------------------
DROP TABLE IF EXISTS `satellite_info`;
CREATE TABLE `satellite_info`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `satelliteCode` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '卫星代号/编号，比如CS010',
  `satelliteName` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '卫星名称，比如中星10号',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_satellite_code`(`satelliteCode`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '卫星表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for switch_matrix_info
-- ----------------------------
DROP TABLE IF EXISTS `switch_matrix_info`;
CREATE TABLE `switch_matrix_info`  (
  `id` int(0) NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `matrixCode` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '矩阵代码',
  `satelliteId` int(0) NULL DEFAULT NULL COMMENT '卫星id',
  `satelliteCode` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '卫星，冗余字段',
  `areaNo` int(0) NULL DEFAULT NULL COMMENT '区号',
  `groupNo` int(0) NULL DEFAULT NULL COMMENT '组号',
  `inputPortCount` int(0) NULL DEFAULT NULL COMMENT '输入端口数',
  `outputPortCount` int(0) NULL DEFAULT NULL COMMENT '输出端口数',
  `effectiveStatus` int(0) NULL DEFAULT NULL COMMENT '生效状态：1有效，0无效',
  `remark` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_matrix_code`(`matrixCode`) USING BTREE,
  INDEX `idx_matrix_satellite_id`(`satelliteId`) USING BTREE,
  CONSTRAINT `fk_matrix_satellite` FOREIGN KEY (`satelliteId`) REFERENCES `satellite_info` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '矩阵表' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
