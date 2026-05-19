/*
 射频矩阵管理系统 - 完整数据库文件
 数据来源：射频矩阵表_20260514v4.xlsx
 生成时间：2026-05-18
 
 数据逻辑说明：
   - 通道（channel_info）定义频率空间容器，commonName即转发器显示名
   - 开关（matrix_switch_status）通过channelCodeShort索引收发通道，是转发器的完整物理表达
   - 占用（occupation_realtime_status）存储偏移量+占用宽度，前端计算实际频率
   - 输入起始频率 = 通道起频率 + 偏移量
   - 输入终止频率 = 通道起频率 + 偏移量 + 占用宽度
   - 输出侧共用相同偏移量（矩阵保持频率平移关系）
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. satellite_basic_info 卫星基本信息
-- ============================================================
DROP TABLE IF EXISTS `satellite_basic_info`;
CREATE TABLE `satellite_basic_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '卫星id',
  `satelliteCode` varchar(64) NOT NULL COMMENT '卫星代号',
  `satelliteName` varchar(128) DEFAULT NULL COMMENT '卫星名称',
  `launchTimeMs` bigint DEFAULT NULL COMMENT '发射时间ms',
  `deorbitTimeMs` bigint DEFAULT NULL COMMENT '离轨时间ms',
  `deliveryTimeMs` bigint DEFAULT NULL COMMENT '交付时间ms',
  `designLife` varchar(64) DEFAULT NULL COMMENT '设计寿命',
  `satellitePlatform` varchar(128) DEFAULT NULL COMMENT '卫星平台',
  `orbitType` tinyint DEFAULT NULL COMMENT '轨道类型：0 GEO，1 MEO，2 LEO，3 HEO',
  `ownershipType` tinyint DEFAULT NULL COMMENT '所属类型：0自有，1代理，2共管，3代维',
  `applicationType` tinyint DEFAULT NULL COMMENT '应用类型：0遥感，1通信，2导航',
  `manufacturer` varchar(128) DEFAULT NULL COMMENT '制造商',
  `satelliteStatus` tinyint DEFAULT NULL COMMENT '状态：0正常，1超寿命，2失效',
  `isBroadcastSatellite` tinyint DEFAULT NULL COMMENT '是否安播：0否，1是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_satellite_code` (`satelliteCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='卫星基本信息';

INSERT INTO `satellite_basic_info` VALUES
(1, 'CS10R', '中星10R', NULL, NULL, NULL, '15年', NULL, 0, 0, 1, NULL, 0, 0),
(2, 'CS6D',  '中星6D',  NULL, NULL, NULL, '15年', NULL, 0, 0, 1, NULL, 0, 1);


-- ============================================================
-- 2. feed_antenna_basic_info 馈源-天线基础信息
-- ============================================================
DROP TABLE IF EXISTS `feed_antenna_basic_info`;
CREATE TABLE `feed_antenna_basic_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `feedCodeLong` varchar(128) DEFAULT NULL COMMENT '馈源代码（长）',
  `satelliteId` int DEFAULT NULL COMMENT '所属卫星id',
  `satelliteCode` varchar(64) DEFAULT NULL COMMENT '所属卫星（冗余）',
  `feedCodeShort` varchar(64) DEFAULT NULL COMMENT '馈源代码（短）',
  `feedPortCount` int DEFAULT NULL COMMENT '馈源端口数量',
  `antennaCode` varchar(64) DEFAULT NULL COMMENT '所属天线',
  `movableType` varchar(32) DEFAULT NULL COMMENT '固定/可动',
  `diameter` varchar(64) DEFAULT NULL COMMENT '口径',
  `antennaForm` varchar(64) DEFAULT NULL COMMENT '形态',
  `installPosition` varchar(128) DEFAULT NULL,
  `pointingDirection` varchar(128) DEFAULT NULL COMMENT '指向',
  `remark` varchar(500) DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_feed_code_long` (`feedCodeLong`),
  KEY `idx_feed_antenna_satellite_id` (`satelliteId`),
  CONSTRAINT `fk_feed_antenna_satellite` FOREIGN KEY (`satelliteId`) REFERENCES `satellite_basic_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='馈源-天线基础信息';

INSERT INTO `feed_antenna_basic_info` VALUES
(1,  'CS10R-Tx100', 1, 'CS10R', 'Tx100', 2, '西部波束天线', '固定', NULL, '发射面', NULL, NULL, '收发'),
(2,  'CS10R-Tx200', 1, 'CS10R', 'Tx200', 4, '印尼波束天线', '固定', NULL, '发射面', NULL, NULL, '双极化，收发'),
(3,  'CS10R-Tx300', 1, 'CS10R', 'Tx300', 4, '全国波束天线', '固定', NULL, '发射面', NULL, '国土', '双极化，收发'),
(4,  'CS10R-Tx400', 1, 'CS10R', 'Tx400', 2, '东部波束天线', '固定', NULL, '发射面', NULL, NULL, '收发'),
(5,  'CS10R-Tx500', 1, 'CS10R', 'Tx500', 2, '南海波束天线', '固定', NULL, '发射面', NULL, NULL, '收发');


-- ============================================================
-- 3. feed_port_info 馈源端口信息
-- ============================================================
DROP TABLE IF EXISTS `feed_port_info`;
CREATE TABLE `feed_port_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `feedPortCode` varchar(128) DEFAULT NULL COMMENT '馈源端口代码',
  `feedAntennaId` int DEFAULT NULL COMMENT '所属馈源id',
  `feedAntennaCode` varchar(128) DEFAULT NULL COMMENT '所属馈源代码（冗余）',
  `feedPortName` varchar(128) DEFAULT NULL COMMENT '馈源端口名称',
  `txRxType` varchar(32) DEFAULT NULL COMMENT '接收R/发射T',
  `polarization` varchar(64) DEFAULT NULL COMMENT '极化',
  `bandCount` int DEFAULT NULL COMMENT '频段数',
  PRIMARY KEY (`id`),
  KEY `idx_feed_port_code` (`feedPortCode`),
  KEY `idx_feed_port_antenna_id` (`feedAntennaId`),
  CONSTRAINT `fk_feed_port_antenna` FOREIGN KEY (`feedAntennaId`) REFERENCES `feed_antenna_basic_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='馈源端口信息';

INSERT INTO `feed_port_info` VALUES
-- CS10R-Tx100（西部波束天线）
(1,  'CS10R-Tx100-X01G', 1, 'CS10R-Tx100', 'X01G', 'T', 'H', 2),
(2,  'CS10R-Tx100-X02G', 1, 'CS10R-Tx100', 'X02G', 'R', 'V', 2),
-- CS10R-Tx200（印尼波束天线）
(3,  'CS10R-Tx200-X01G', 2, 'CS10R-Tx200', 'X01G', 'T', 'H', 1),
(4,  'CS10R-Tx200-X02G', 2, 'CS10R-Tx200', 'X02G', 'T', 'V', 2),
(5,  'CS10R-Tx200-X03G', 2, 'CS10R-Tx200', 'X03G', 'R', 'H', 2),
(6,  'CS10R-Tx200-X04G', 2, 'CS10R-Tx200', 'X04G', 'R', 'V', 1),
-- CS10R-Tx300（全国波束天线）
(7,  'CS10R-Tx300-X01G', 3, 'CS10R-Tx300', 'X01G', 'T', 'H', 2),
(8,  'CS10R-Tx300-X02G', 3, 'CS10R-Tx300', 'X02G', 'T', 'V', 2),
(9,  'CS10R-Tx300-X03G', 3, 'CS10R-Tx300', 'X03G', 'R', 'H', 2),
(10, 'CS10R-Tx300-X04G', 3, 'CS10R-Tx300', 'X04G', 'R', 'V', 2),
-- CS10R-Tx400（东部波束天线）
(11, 'CS10R-Tx400-X01G', 4, 'CS10R-Tx400', 'X01G', 'T', 'H', 1),
(12, 'CS10R-Tx400-X02G', 4, 'CS10R-Tx400', 'X02G', 'R', 'V', 1),
-- CS10R-Tx500（南海波束天线）
(13, 'CS10R-Tx500-X01G', 5, 'CS10R-Tx500', 'X01G', 'T', 'H', 1),
(14, 'CS10R-Tx500-X02G', 5, 'CS10R-Tx500', 'X02G', 'R', 'V', 1);


-- ============================================================
-- 4. feed_channel_group_info 通道组信息（通道基础信息表2.0）
-- ============================================================
DROP TABLE IF EXISTS `feed_channel_group_info`;
CREATE TABLE `feed_channel_group_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `channelGroupCode` varchar(128) DEFAULT NULL COMMENT '通道组代码',
  `channelGroupSeq` varchar(64) DEFAULT NULL COMMENT '通道组序号',
  `satelliteId` int DEFAULT NULL COMMENT '所属卫星id',
  `satelliteCode` varchar(64) DEFAULT NULL COMMENT '所属卫星（冗余）',
  `feedPortCode` varchar(128) DEFAULT NULL COMMENT '所属馈源端口代码',
  `antennaName` varchar(128) DEFAULT NULL COMMENT '天线名称',
  `txRxType` varchar(32) DEFAULT NULL COMMENT '接收R/发射T',
  `polarization` varchar(64) DEFAULT NULL COMMENT '极化',
  `band` varchar(128) DEFAULT NULL COMMENT '频段',
  `channelCount` int DEFAULT NULL COMMENT '通道数',
  PRIMARY KEY (`id`),
  KEY `idx_channel_group_code` (`channelGroupCode`),
  KEY `idx_feed_channel_group_satellite_id` (`satelliteId`),
  CONSTRAINT `fk_feed_channel_group_satellite` FOREIGN KEY (`satelliteId`) REFERENCES `satellite_basic_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='馈源通道组信息';

INSERT INTO `feed_channel_group_info` VALUES
-- CS10R 接收侧（R）
(1,  'CS10R-R001-9',  'R001', 1, 'CS10R', 'CS10R-Tx300-X03G', '全国波束天线', 'R', 'H', 'Ku',  9),
(2,  'CS10R-R002-8',  'R002', 1, 'CS10R', 'CS10R-Tx300-X04G', '全国波束天线', 'R', 'V', 'Ku',  8),
(3,  'CS10R-R003-4',  'R003', 1, 'CS10R', 'CS10R-Tx500-X02G', '南海波束天线', 'R', 'V', 'Ku',  4),
(4,  'CS10R-R004-4',  'R004', 1, 'CS10R', 'CS10R-Tx200-X03G', '印尼波束天线', 'R', 'H', 'Ku',  4),
(5,  'CS10R-R005-3',  'R005', 1, 'CS10R', 'CS10R-Tx100-X02G', '西部波束天线', 'R', 'V', 'Ku',  3),
(6,  'CS10R-R006-4',  'R006', 1, 'CS10R', 'CS10R-Tx300-X03G', '全国波束天线', 'R', 'H', 'EKu', 4),
(7,  'CS10R-R007-4',  'R007', 1, 'CS10R', 'CS10R-Tx300-X04G', '全国波束天线', 'R', 'V', 'EKu', 4),
(8,  'CS10R-R008-4',  'R008', 1, 'CS10R', 'CS10R-Tx100-X02G', '西部波束天线', 'R', 'V', 'EKu', 4),
(9,  'CS10R-R009-4',  'R009', 1, 'CS10R', 'CS10R-Tx200-X03G', '印尼波束天线', 'R', 'H', 'EKu', 4),
(10, 'CS10R-R010-4',  'R010', 1, 'CS10R', 'CS10R-Tx200-X04G', '印尼波束天线', 'R', 'V', 'EKu', 4),
(11, 'CS10R-R011-3',  'R011', 1, 'CS10R', 'CS10R-Tx400-X02G', '东部波束天线', 'R', 'V', 'EKu', 3),
-- CS10R 发射侧（T）
(12, 'CS10R-T001-9',  'T001', 1, 'CS10R', 'CS10R-Tx300-X02G', '全国波束天线', 'T', 'V', 'Ku',  9),
(13, 'CS10R-T002-8',  'T002', 1, 'CS10R', 'CS10R-Tx300-X01G', '全国波束天线', 'T', 'H', 'Ku',  8),
(14, 'CS10R-T003-4',  'T003', 1, 'CS10R', 'CS10R-Tx500-X01G', '南海波束天线', 'T', 'H', 'Ku',  4),
(15, 'CS10R-T004-4',  'T004', 1, 'CS10R', 'CS10R-Tx200-X02G', '印尼波束天线', 'T', 'V', 'Ku',  4),
(16, 'CS10R-T005-3',  'T005', 1, 'CS10R', 'CS10R-Tx100-X01G', '西部波束天线', 'T', 'H', 'Ku',  3),
(17, 'CS10R-T006-4',  'T006', 1, 'CS10R', 'CS10R-Tx300-X02G', '全国波束天线', 'T', 'V', 'EKu', 4),
(18, 'CS10R-T007-4',  'T007', 1, 'CS10R', 'CS10R-Tx300-X01G', '全国波束天线', 'T', 'H', 'EKu', 4),
(19, 'CS10R-T008-4',  'T008', 1, 'CS10R', 'CS10R-Tx100-X01G', '西部波束天线', 'T', 'H', 'EKu', 4),
(20, 'CS10R-T009-4',  'T009', 1, 'CS10R', 'CS10R-Tx200-X02G', '印尼波束天线', 'T', 'V', 'EKu', 4),
(21, 'CS10R-T010-4',  'T010', 1, 'CS10R', 'CS10R-Tx200-X01G', '印尼波束天线', 'T', 'H', 'EKu', 4),
(22, 'CS10R-T011-3',  'T011', 1, 'CS10R', 'CS10R-Tx400-X01G', '东部波束天线', 'T', 'H', 'EKu', 3),
-- CS6D 接收侧（R）
(23, 'CS6D-R001-12', 'R001', 2, 'CS6D', NULL, NULL, 'R', NULL, 'C',   12),
(24, 'CS6D-R002-13', 'R002', 2, 'CS6D', NULL, NULL, 'R', NULL, 'C',   13),
(25, 'CS6D-R003-12', 'R003', 2, 'CS6D', NULL, NULL, 'R', NULL, 'C',   12),
(26, 'CS6D-R004-13', 'R004', 2, 'CS6D', NULL, NULL, 'R', NULL, 'C',   13),
(27, 'CS6D-R005-7',  'R005', 2, 'CS6D', NULL, NULL, 'R', NULL, 'EKu', 7),
(28, 'CS6D-R006-6',  'R006', 2, 'CS6D', NULL, NULL, 'R', NULL, 'EKu', 6),
(29, 'CS6D-R007-12', 'R007', 2, 'CS6D', NULL, NULL, 'R', NULL, 'Ku',  12),
(30, 'CS6D-R008-13', 'R008', 2, 'CS6D', NULL, NULL, 'R', NULL, 'Ku',  13),
(31, 'CS6D-R009-6',  'R009', 2, 'CS6D', NULL, NULL, 'R', NULL, 'Ku',  6),
-- CS6D 发射侧（T）
(32, 'CS6D-T001-12', 'T001', 2, 'CS6D', NULL, NULL, 'T', NULL, 'C',   12),
(33, 'CS6D-T002-13', 'T002', 2, 'CS6D', NULL, NULL, 'T', NULL, 'C',   13),
(34, 'CS6D-T003-12', 'T003', 2, 'CS6D', NULL, NULL, 'T', NULL, 'Ku',  12),
(35, 'CS6D-T004-13', 'T004', 2, 'CS6D', NULL, NULL, 'T', NULL, 'Ku',  13),
(36, 'CS6D-T005-6',  'T005', 2, 'CS6D', NULL, NULL, 'T', NULL, 'Ku',  6);


-- ============================================================
-- 5. channel_info 通道表（通道清单表2.0）
--    channelCodeShort 格式：R/T + commonName，是开关索引入/出端口通道的关键
--    commonName 是前端显示的"转发器名称"
-- ============================================================
DROP TABLE IF EXISTS `channel_info`;
CREATE TABLE `channel_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `channelCodeLong` varchar(128) DEFAULT NULL COMMENT '通道代码（长）',
  `channelCodeShort` varchar(64) DEFAULT NULL COMMENT '通道代码（短），格式R/T+commonName',
  `channelGroupId` int DEFAULT NULL COMMENT '通道组id',
  `channelGroupCode` varchar(128) DEFAULT NULL COMMENT '通道组代码（冗余）',
  `channelSeq` int DEFAULT NULL COMMENT '通道在组内的序号',
  `channelBandwidth` double DEFAULT NULL COMMENT '通道带宽(MHz)',
  `channelStartFreq` double DEFAULT NULL COMMENT '通道起频率(MHz)',
  `channelEndFreq` double DEFAULT NULL COMMENT '通道止频率(MHz)',
  `commonName` varchar(128) DEFAULT NULL COMMENT '常用名（转发器显示名称）',
  PRIMARY KEY (`id`),
  KEY `idx_channel_code_short` (`channelCodeShort`),
  KEY `idx_channel_group_id` (`channelGroupId`),
  CONSTRAINT `fk_channel_group` FOREIGN KEY (`channelGroupId`) REFERENCES `feed_channel_group_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通道表（转发器频率空间定义）';

INSERT INTO `channel_info` VALUES
-- ============ CS10R 接收侧通道 ============
-- R001组：全国波束 Ku H（C1A~C9A，9个）
(1,  'CS10R-R001-9-1',  'RC1A',  1,  'CS10R-R001-9',  1, 30, 14008, 14038, 'C1A'),
(2,  'CS10R-R001-9-2',  'RC2A',  1,  'CS10R-R001-9',  2, 54, 14043, 14097, 'C2A'),
(3,  'CS10R-R001-9-3',  'RC3A',  1,  'CS10R-R001-9',  3, 54, 14103, 14157, 'C3A'),
(4,  'CS10R-R001-9-4',  'RC4A',  1,  'CS10R-R001-9',  4, 54, 14163, 14217, 'C4A'),
(5,  'CS10R-R001-9-5',  'RC5A',  1,  'CS10R-R001-9',  5, 54, 14223, 14277, 'C5A'),
(6,  'CS10R-R001-9-6',  'RC6A',  1,  'CS10R-R001-9',  6, 54, 14283, 14337, 'C6A'),
(7,  'CS10R-R001-9-7',  'RC7A',  1,  'CS10R-R001-9',  7, 54, 14343, 14397, 'C7A'),
(8,  'CS10R-R001-9-8',  'RC8A',  1,  'CS10R-R001-9',  8, 54, 14403, 14457, 'C8A'),
(9,  'CS10R-R001-9-9',  'RC9A',  1,  'CS10R-R001-9',  9, 54, 14451, 14505, 'C9A'),
-- R002组：全国波束 Ku V（C1B~C8B，8个）
(10, 'CS10R-R002-8-1',  'RC1B',  2,  'CS10R-R002-8',  1, 54, 14023, 14077, 'C1B'),
(11, 'CS10R-R002-8-2',  'RC2B',  2,  'CS10R-R002-8',  2, 54, 14073, 14127, 'C2B'),
(12, 'CS10R-R002-8-3',  'RC3B',  2,  'CS10R-R002-8',  3, 54, 14133, 14187, 'C3B'),
(13, 'CS10R-R002-8-4',  'RC4B',  2,  'CS10R-R002-8',  4, 54, 14193, 14247, 'C4B'),
(14, 'CS10R-R002-8-5',  'RC5B',  2,  'CS10R-R002-8',  5, 54, 14253, 14307, 'C5B'),
(15, 'CS10R-R002-8-6',  'RC6B',  2,  'CS10R-R002-8',  6, 54, 14313, 14367, 'C6B'),
(16, 'CS10R-R002-8-7',  'RC7B',  2,  'CS10R-R002-8',  7, 54, 14343, 14397, 'C7B'),
(17, 'CS10R-R002-8-8',  'RC8B',  2,  'CS10R-R002-8',  8, 54, 14433, 14487, 'C8B'),
-- R003组：南海波束 Ku V（S1B~S4B，4个）
(18, 'CS10R-R003-4-1',  'RS1B',  3,  'CS10R-R003-4',  1, 54, 14023, 14077, 'S1B'),
(19, 'CS10R-R003-4-2',  'RS2B',  3,  'CS10R-R003-4',  2, 54, 14073, 14127, 'S2B'),
(20, 'CS10R-R003-4-3',  'RS3B',  3,  'CS10R-R003-4',  3, 54, 14133, 14187, 'S3B'),
(21, 'CS10R-R003-4-4',  'RS4B',  3,  'CS10R-R003-4',  4, 54, 14193, 14247, 'S4B'),
-- R004组：印尼波束 Ku H（I5A~I8A，4个）
(22, 'CS10R-R004-4-1',  'RI5A',  4,  'CS10R-R004-4',  1, 54, 14223, 14277, 'I5A'),
(23, 'CS10R-R004-4-2',  'RI6A',  4,  'CS10R-R004-4',  2, 54, 14283, 14337, 'I6A'),
(24, 'CS10R-R004-4-3',  'RI7A',  4,  'CS10R-R004-4',  3, 54, 14343, 14397, 'I7A'),
(25, 'CS10R-R004-4-4',  'RI8A',  4,  'CS10R-R004-4',  4, 54, 14403, 14457, 'I8A'),
-- R005组：西部波束 Ku V（W1B~W3B，3个）
(26, 'CS10R-R005-3-1',  'RW1B',  5,  'CS10R-R005-3',  1, 54, 14013, 14067, 'W1B'),
(27, 'CS10R-R005-3-2',  'RW2B',  5,  'CS10R-R005-3',  2, 54, 14073, 14127, 'W2B'),
(28, 'CS10R-R005-3-3',  'RW3B',  5,  'CS10R-R005-3',  3, 54, 14133, 14187, 'W3B'),
-- R006组：全国波束 EKu H（C11A~C14A，4个）
(29, 'CS10R-R006-4-1',  'RC11A', 6,  'CS10R-R006-4',  1, 34, 13762, 13796, 'C11A'),
(30, 'CS10R-R006-4-2',  'RC12A', 6,  'CS10R-R006-4',  2, 65, 13806, 13871, 'C12A'),
(31, 'CS10R-R006-4-3',  'RC13A', 6,  'CS10R-R006-4',  3, 52, 13878, 13930, 'C13A'),
(32, 'CS10R-R006-4-4',  'RC14A', 6,  'CS10R-R006-4',  4, 52, 13936, 13988, 'C14A'),
-- R007组：全国波束 EKu V（C11B~C14B，4个）
(33, 'CS10R-R007-4-1',  'RC11B', 7,  'CS10R-R007-4',  1, 34, 13762, 13796, 'C11B'),
(34, 'CS10R-R007-4-2',  'RC12B', 7,  'CS10R-R007-4',  2, 65, 13806, 13871, 'C12B'),
(35, 'CS10R-R007-4-3',  'RC13B', 7,  'CS10R-R007-4',  3, 52, 13878, 13930, 'C13B'),
(36, 'CS10R-R007-4-4',  'RC14B', 7,  'CS10R-R007-4',  4, 52, 13936, 13988, 'C14B'),
-- R008组：西部波束 EKu V（W11B~W14B，4个）
(37, 'CS10R-R008-4-1',  'RW11B', 8,  'CS10R-R008-4',  1, 34, 13762, 13796, 'W11B'),
(38, 'CS10R-R008-4-2',  'RW12B', 8,  'CS10R-R008-4',  2, 65, 13806, 13871, 'W12B'),
(39, 'CS10R-R008-4-3',  'RW13B', 8,  'CS10R-R008-4',  3, 52, 13878, 13930, 'W13B'),
(40, 'CS10R-R008-4-4',  'RW14B', 8,  'CS10R-R008-4',  4, 52, 13936, 13988, 'W14B'),
-- R009组：印尼波束 EKu H（I11A~I14A，4个）
(41, 'CS10R-R009-4-1',  'RI11A', 9,  'CS10R-R009-4',  1, 34, 13762, 13796, 'I11A'),
(42, 'CS10R-R009-4-2',  'RI12A', 9,  'CS10R-R009-4',  2, 65, 13806, 13871, 'I12A'),
(43, 'CS10R-R009-4-3',  'RI13A', 9,  'CS10R-R009-4',  3, 52, 13878, 13930, 'I13A'),
(44, 'CS10R-R009-4-4',  'RI14A', 9,  'CS10R-R009-4',  4, 52, 13936, 13988, 'I14A'),
-- R010组：印尼波束 EKu V（I11B~I14B，4个）
(45, 'CS10R-R010-4-1',  'RI11B', 10, 'CS10R-R010-4',  1, 34, 13762, 13796, 'I11B'),
(46, 'CS10R-R010-4-2',  'RI12B', 10, 'CS10R-R010-4',  2, 65, 13806, 13871, 'I12B'),
(47, 'CS10R-R010-4-3',  'RI13B', 10, 'CS10R-R010-4',  3, 52, 13878, 13930, 'I13B'),
(48, 'CS10R-R010-4-4',  'RI14B', 10, 'CS10R-R010-4',  4, 52, 13936, 13988, 'I14B'),
-- R011组：东部波束 EKu V（E11B~E13B，3个）
(49, 'CS10R-R011-3-1',  'RE11B', 11, 'CS10R-R011-3',  1, 32, 13763, 13795, 'E11B'),
(50, 'CS10R-R011-3-2',  'RE12B', 11, 'CS10R-R011-3',  2, 65, 13806, 13871, 'E12B'),
(51, 'CS10R-R011-3-3',  'RE13B', 11, 'CS10R-R011-3',  3, 52, 13878, 13930, 'E13B'),
-- ============ CS10R 发射侧通道 ============
-- T001组：全国波束 Ku V（C1A~C9A，9个）
(52, 'CS10R-T001-9-1',  'TC1A',  12, 'CS10R-T001-9',  1, 30, 12258, 12288, 'C1A'),
(53, 'CS10R-T001-9-2',  'TC2A',  12, 'CS10R-T001-9',  2, 54, 12293, 12347, 'C2A'),
(54, 'CS10R-T001-9-3',  'TC3A',  12, 'CS10R-T001-9',  3, 54, 12353, 12407, 'C3A'),
(55, 'CS10R-T001-9-4',  'TC4A',  12, 'CS10R-T001-9',  4, 54, 12413, 12467, 'C4A'),
(56, 'CS10R-T001-9-5',  'TC5A',  12, 'CS10R-T001-9',  5, 54, 12473, 12527, 'C5A'),
(57, 'CS10R-T001-9-6',  'TC6A',  12, 'CS10R-T001-9',  6, 54, 12533, 12587, 'C6A'),
(58, 'CS10R-T001-9-7',  'TC7A',  12, 'CS10R-T001-9',  7, 54, 12593, 12647, 'C7A'),
(59, 'CS10R-T001-9-8',  'TC8A',  12, 'CS10R-T001-9',  8, 54, 12653, 12707, 'C8A'),
(60, 'CS10R-T001-9-9',  'TC9A',  12, 'CS10R-T001-9',  9, 54, 12701, 12755, 'C9A'),
-- T002组：全国波束 Ku H（C1B~C8B，8个）
(61, 'CS10R-T002-8-1',  'TC1B',  13, 'CS10R-T002-8',  1, 54, 12273, 12327, 'C1B'),
(62, 'CS10R-T002-8-2',  'TC2B',  13, 'CS10R-T002-8',  2, 54, 12323, 12377, 'C2B'),
(63, 'CS10R-T002-8-3',  'TC3B',  13, 'CS10R-T002-8',  3, 54, 12383, 12437, 'C3B'),
(64, 'CS10R-T002-8-4',  'TC4B',  13, 'CS10R-T002-8',  4, 54, 12443, 12497, 'C4B'),
(65, 'CS10R-T002-8-5',  'TC5B',  13, 'CS10R-T002-8',  5, 54, 12503, 12557, 'C5B'),
(66, 'CS10R-T002-8-6',  'TC6B',  13, 'CS10R-T002-8',  6, 54, 12563, 12617, 'C6B'),
(67, 'CS10R-T002-8-7',  'TC7B',  13, 'CS10R-T002-8',  7, 54, 12593, 12647, 'C7B'),
(68, 'CS10R-T002-8-8',  'TC8B',  13, 'CS10R-T002-8',  8, 54, 12683, 12737, 'C8B'),
-- T003组：南海波束 Ku H（S1B~S4B，4个）
(69, 'CS10R-T003-4-1',  'TS1B',  14, 'CS10R-T003-4',  1, 54, 12273, 12327, 'S1B'),
(70, 'CS10R-T003-4-2',  'TS2B',  14, 'CS10R-T003-4',  2, 54, 12323, 12377, 'S2B'),
(71, 'CS10R-T003-4-3',  'TS3B',  14, 'CS10R-T003-4',  3, 54, 12383, 12437, 'S3B'),
(72, 'CS10R-T003-4-4',  'TS4B',  14, 'CS10R-T003-4',  4, 54, 12443, 12497, 'S4B'),
-- T004组：印尼波束 Ku V（I5A~I8A，4个）
(73, 'CS10R-T004-4-1',  'TI5A',  15, 'CS10R-T004-4',  1, 54, 12473, 12527, 'I5A'),
(74, 'CS10R-T004-4-2',  'TI6A',  15, 'CS10R-T004-4',  2, 54, 12533, 12587, 'I6A'),
(75, 'CS10R-T004-4-3',  'TI7A',  15, 'CS10R-T004-4',  3, 54, 12593, 12647, 'I7A'),
(76, 'CS10R-T004-4-4',  'TI8A',  15, 'CS10R-T004-4',  4, 54, 12653, 12707, 'I8A'),
-- T005组：西部波束 Ku H（W1B~W3B，3个）
(77, 'CS10R-T005-3-1',  'TW1B',  16, 'CS10R-T005-3',  1, 54, 12263, 12317, 'W1B'),
(78, 'CS10R-T005-3-2',  'TW2B',  16, 'CS10R-T005-3',  2, 54, 12323, 12377, 'W2B'),
(79, 'CS10R-T005-3-3',  'TW3B',  16, 'CS10R-T005-3',  3, 54, 12383, 12437, 'W3B'),
-- T006组：全国波束 EKu V（C11A~C14A，4个）
(80, 'CS10R-T006-4-1',  'TC11A', 17, 'CS10R-T006-4',  1, 34, 11462, 11496, 'C11A'),
(81, 'CS10R-T006-4-2',  'TC12A', 17, 'CS10R-T006-4',  2, 65, 11506, 11571, 'C12A'),
(82, 'CS10R-T006-4-3',  'TC13A', 17, 'CS10R-T006-4',  3, 52, 11578, 11630, 'C13A'),
(83, 'CS10R-T006-4-4',  'TC14A', 17, 'CS10R-T006-4',  4, 52, 11636, 11688, 'C14A'),
-- T007组：全国波束 EKu H（C11B~C14B，4个）
(84, 'CS10R-T007-4-1',  'TC11B', 18, 'CS10R-T007-4',  1, 34, 11462, 11496, 'C11B'),
(85, 'CS10R-T007-4-2',  'TC12B', 18, 'CS10R-T007-4',  2, 65, 11506, 11571, 'C12B'),
(86, 'CS10R-T007-4-3',  'TC13B', 18, 'CS10R-T007-4',  3, 52, 11578, 11630, 'C13B'),
(87, 'CS10R-T007-4-4',  'TC14B', 18, 'CS10R-T007-4',  4, 52, 11636, 11688, 'C14B'),
-- T008组：西部波束 EKu H（W11B~W14B，4个）
(88, 'CS10R-T008-4-1',  'TW11B', 19, 'CS10R-T008-4',  1, 34, 11462, 11496, 'W11B'),
(89, 'CS10R-T008-4-2',  'TW12B', 19, 'CS10R-T008-4',  2, 65, 11506, 11571, 'W12B'),
(90, 'CS10R-T008-4-3',  'TW13B', 19, 'CS10R-T008-4',  3, 52, 11578, 11630, 'W13B'),
(91, 'CS10R-T008-4-4',  'TW14B', 19, 'CS10R-T008-4',  4, 52, 11636, 11688, 'W14B'),
-- T009组：印尼波束 EKu V（I11A~I14A，4个）
(92, 'CS10R-T009-4-1',  'TI11A', 20, 'CS10R-T009-4',  1, 34, 11462, 11496, 'I11A'),
(93, 'CS10R-T009-4-2',  'TI12A', 20, 'CS10R-T009-4',  2, 65, 11506, 11571, 'I12A'),
(94, 'CS10R-T009-4-3',  'TI13A', 20, 'CS10R-T009-4',  3, 52, 11578, 11630, 'I13A'),
(95, 'CS10R-T009-4-4',  'TI14A', 20, 'CS10R-T009-4',  4, 52, 11636, 11688, 'I14A'),
-- T010组：印尼波束 EKu H（I11B~I14B，4个）
(96, 'CS10R-T010-4-1',  'TI11B', 21, 'CS10R-T010-4',  1, 34, 11462, 11496, 'I11B'),
(97, 'CS10R-T010-4-2',  'TI12B', 21, 'CS10R-T010-4',  2, 65, 11506, 11571, 'I12B'),
(98, 'CS10R-T010-4-3',  'TI13B', 21, 'CS10R-T010-4',  3, 52, 11578, 11630, 'I13B'),
(99, 'CS10R-T010-4-4',  'TI14B', 21, 'CS10R-T010-4',  4, 52, 11636, 11688, 'I14B'),
-- T011组：东部波束 EKu H（E11B~E13B，3个）
(100,'CS10R-T011-3-1',  'TE11B', 22, 'CS10R-T011-3',  1, 32, 11463, 11495, 'E11B'),
(101,'CS10R-T011-3-2',  'TE12B', 22, 'CS10R-T011-3',  2, 65, 11506, 11571, 'E12B'),
(102,'CS10R-T011-3-3',  'TE13B', 22, 'CS10R-T011-3',  3, 52, 11578, 11630, 'E13B'),
-- ============ CS6D 接收侧通道（频率未填，以NULL占位） ============
-- R001组 C C1A~C12A
(103,'CS6D-R001-12-1',  'RC1A',  23, 'CS6D-R001-12',  1, NULL,NULL,NULL,'C1A'),
(104,'CS6D-R001-12-2',  'RC2A',  23, 'CS6D-R001-12',  2, NULL,NULL,NULL,'C2A'),
(105,'CS6D-R001-12-3',  'RC3A',  23, 'CS6D-R001-12',  3, NULL,NULL,NULL,'C3A'),
(106,'CS6D-R001-12-4',  'RC4A',  23, 'CS6D-R001-12',  4, NULL,NULL,NULL,'C4A'),
(107,'CS6D-R001-12-5',  'RC5A',  23, 'CS6D-R001-12',  5, NULL,NULL,NULL,'C5A'),
(108,'CS6D-R001-12-6',  'RC6A',  23, 'CS6D-R001-12',  6, NULL,NULL,NULL,'C6A'),
(109,'CS6D-R001-12-7',  'RC7A',  23, 'CS6D-R001-12',  7, NULL,NULL,NULL,'C7A'),
(110,'CS6D-R001-12-8',  'RC8A',  23, 'CS6D-R001-12',  8, NULL,NULL,NULL,'C8A'),
(111,'CS6D-R001-12-9',  'RC9A',  23, 'CS6D-R001-12',  9, NULL,NULL,NULL,'C9A'),
(112,'CS6D-R001-12-10', 'RC10A', 23, 'CS6D-R001-12', 10, NULL,NULL,NULL,'C10A'),
(113,'CS6D-R001-12-11', 'RC11A', 23, 'CS6D-R001-12', 11, NULL,NULL,NULL,'C11A'),
(114,'CS6D-R001-12-12', 'RC12A', 23, 'CS6D-R001-12', 12, NULL,NULL,NULL,'C12A'),
-- R002组 C C1B~C13B
(115,'CS6D-R002-13-1',  'RC1B',  24, 'CS6D-R002-13',  1, NULL,NULL,NULL,'C1B'),
(116,'CS6D-R002-13-2',  'RC2B',  24, 'CS6D-R002-13',  2, NULL,NULL,NULL,'C2B'),
(117,'CS6D-R002-13-3',  'RC3B',  24, 'CS6D-R002-13',  3, NULL,NULL,NULL,'C3B'),
(118,'CS6D-R002-13-4',  'RC4B',  24, 'CS6D-R002-13',  4, NULL,NULL,NULL,'C4B'),
(119,'CS6D-R002-13-5',  'RC5B',  24, 'CS6D-R002-13',  5, NULL,NULL,NULL,'C5B'),
(120,'CS6D-R002-13-6',  'RC6B',  24, 'CS6D-R002-13',  6, NULL,NULL,NULL,'C6B'),
(121,'CS6D-R002-13-7',  'RC7B',  24, 'CS6D-R002-13',  7, NULL,NULL,NULL,'C7B'),
(122,'CS6D-R002-13-8',  'RC8B',  24, 'CS6D-R002-13',  8, NULL,NULL,NULL,'C8B'),
(123,'CS6D-R002-13-9',  'RC9B',  24, 'CS6D-R002-13',  9, NULL,NULL,NULL,'C9B'),
(124,'CS6D-R002-13-10', 'RC10B', 24, 'CS6D-R002-13', 10, NULL,NULL,NULL,'C10B'),
(125,'CS6D-R002-13-11', 'RC11B', 24, 'CS6D-R002-13', 11, NULL,NULL,NULL,'C11B'),
(126,'CS6D-R002-13-12', 'RC12B', 24, 'CS6D-R002-13', 12, NULL,NULL,NULL,'C12B'),
(127,'CS6D-R002-13-13', 'RC13B', 24, 'CS6D-R002-13', 13, NULL,NULL,NULL,'C13B'),
-- R003组 C A1A~A12A
(128,'CS6D-R003-12-1',  'RA1A',  25, 'CS6D-R003-12',  1, NULL,NULL,NULL,'A1A'),
(129,'CS6D-R003-12-2',  'RA2A',  25, 'CS6D-R003-12',  2, NULL,NULL,NULL,'A2A'),
(130,'CS6D-R003-12-3',  'RA3A',  25, 'CS6D-R003-12',  3, NULL,NULL,NULL,'A3A'),
(131,'CS6D-R003-12-4',  'RA4A',  25, 'CS6D-R003-12',  4, NULL,NULL,NULL,'A4A'),
(132,'CS6D-R003-12-5',  'RA5A',  25, 'CS6D-R003-12',  5, NULL,NULL,NULL,'A5A'),
(133,'CS6D-R003-12-6',  'RA6A',  25, 'CS6D-R003-12',  6, NULL,NULL,NULL,'A6A'),
(134,'CS6D-R003-12-7',  'RA7A',  25, 'CS6D-R003-12',  7, NULL,NULL,NULL,'A7A'),
(135,'CS6D-R003-12-8',  'RA8A',  25, 'CS6D-R003-12',  8, NULL,NULL,NULL,'A8A'),
(136,'CS6D-R003-12-9',  'RA9A',  25, 'CS6D-R003-12',  9, NULL,NULL,NULL,'A9A'),
(137,'CS6D-R003-12-10', 'RA10A', 25, 'CS6D-R003-12', 10, NULL,NULL,NULL,'A10A'),
(138,'CS6D-R003-12-11', 'RA11A', 25, 'CS6D-R003-12', 11, NULL,NULL,NULL,'A11A'),
(139,'CS6D-R003-12-12', 'RA12A', 25, 'CS6D-R003-12', 12, NULL,NULL,NULL,'A12A'),
-- R004组 C A1B~A13B
(140,'CS6D-R004-13-1',  'RA1B',  26, 'CS6D-R004-13',  1, NULL,NULL,NULL,'A1B'),
(141,'CS6D-R004-13-2',  'RA2B',  26, 'CS6D-R004-13',  2, NULL,NULL,NULL,'A2B'),
(142,'CS6D-R004-13-3',  'RA3B',  26, 'CS6D-R004-13',  3, NULL,NULL,NULL,'A3B'),
(143,'CS6D-R004-13-4',  'RA4B',  26, 'CS6D-R004-13',  4, NULL,NULL,NULL,'A4B'),
(144,'CS6D-R004-13-5',  'RA5B',  26, 'CS6D-R004-13',  5, NULL,NULL,NULL,'A5B'),
(145,'CS6D-R004-13-6',  'RA6B',  26, 'CS6D-R004-13',  6, NULL,NULL,NULL,'A6B'),
(146,'CS6D-R004-13-7',  'RA7B',  26, 'CS6D-R004-13',  7, NULL,NULL,NULL,'A7B'),
(147,'CS6D-R004-13-8',  'RA8B',  26, 'CS6D-R004-13',  8, NULL,NULL,NULL,'A8B'),
(148,'CS6D-R004-13-9',  'RA9B',  26, 'CS6D-R004-13',  9, NULL,NULL,NULL,'A9B'),
(149,'CS6D-R004-13-10', 'RA10B', 26, 'CS6D-R004-13', 10, NULL,NULL,NULL,'A10B'),
(150,'CS6D-R004-13-11', 'RA11B', 26, 'CS6D-R004-13', 11, NULL,NULL,NULL,'A11B'),
(151,'CS6D-R004-13-12', 'RA12B', 26, 'CS6D-R004-13', 12, NULL,NULL,NULL,'A12B'),
(152,'CS6D-R004-13-13', 'RA13B', 26, 'CS6D-R004-13', 13, NULL,NULL,NULL,'A13B'),
-- R005组 EKu E5A~E11A
(153,'CS6D-R005-7-1',   'RE5A',  27, 'CS6D-R005-7',   1, NULL,NULL,NULL,'E5A'),
(154,'CS6D-R005-7-2',   'RE6A',  27, 'CS6D-R005-7',   2, NULL,NULL,NULL,'E6A'),
(155,'CS6D-R005-7-3',   'RE7A',  27, 'CS6D-R005-7',   3, NULL,NULL,NULL,'E7A'),
(156,'CS6D-R005-7-4',   'RE8A',  27, 'CS6D-R005-7',   4, NULL,NULL,NULL,'E8A'),
(157,'CS6D-R005-7-5',   'RE9A',  27, 'CS6D-R005-7',   5, NULL,NULL,NULL,'E9A'),
(158,'CS6D-R005-7-6',   'RE10A', 27, 'CS6D-R005-7',   6, NULL,NULL,NULL,'E10A'),
(159,'CS6D-R005-7-7',   'RE11A', 27, 'CS6D-R005-7',   7, NULL,NULL,NULL,'E11A'),
-- R006组 EKu E6B~E11B
(160,'CS6D-R006-6-1',   'RE6B',  28, 'CS6D-R006-6',   1, NULL,NULL,NULL,'E6B'),
(161,'CS6D-R006-6-2',   'RE7B',  28, 'CS6D-R006-6',   2, NULL,NULL,NULL,'E7B'),
(162,'CS6D-R006-6-3',   'RE8B',  28, 'CS6D-R006-6',   3, NULL,NULL,NULL,'E8B'),
(163,'CS6D-R006-6-4',   'RE9B',  28, 'CS6D-R006-6',   4, NULL,NULL,NULL,'E9B'),
(164,'CS6D-R006-6-5',   'RE10B', 28, 'CS6D-R006-6',   5, NULL,NULL,NULL,'E10B'),
(165,'CS6D-R006-6-6',   'RE11B', 28, 'CS6D-R006-6',   6, NULL,NULL,NULL,'E11B'),
-- R007组 Ku K1A~K12A
(166,'CS6D-R007-12-1',  'RK1A',  29, 'CS6D-R007-12',  1, NULL,NULL,NULL,'K1A'),
(167,'CS6D-R007-12-2',  'RK2A',  29, 'CS6D-R007-12',  2, NULL,NULL,NULL,'K2A'),
(168,'CS6D-R007-12-3',  'RK3A',  29, 'CS6D-R007-12',  3, NULL,NULL,NULL,'K3A'),
(169,'CS6D-R007-12-4',  'RK4A',  29, 'CS6D-R007-12',  4, NULL,NULL,NULL,'K4A'),
(170,'CS6D-R007-12-5',  'RK5A',  29, 'CS6D-R007-12',  5, NULL,NULL,NULL,'K5A'),
(171,'CS6D-R007-12-6',  'RK6A',  29, 'CS6D-R007-12',  6, NULL,NULL,NULL,'K6A'),
(172,'CS6D-R007-12-7',  'RK7A',  29, 'CS6D-R007-12',  7, NULL,NULL,NULL,'K7A'),
(173,'CS6D-R007-12-8',  'RK8A',  29, 'CS6D-R007-12',  8, NULL,NULL,NULL,'K8A'),
(174,'CS6D-R007-12-9',  'RK9A',  29, 'CS6D-R007-12',  9, NULL,NULL,NULL,'K9A'),
(175,'CS6D-R007-12-10', 'RK10A', 29, 'CS6D-R007-12', 10, NULL,NULL,NULL,'K10A'),
(176,'CS6D-R007-12-11', 'RK11A', 29, 'CS6D-R007-12', 11, NULL,NULL,NULL,'K11A'),
(177,'CS6D-R007-12-12', 'RK12A', 29, 'CS6D-R007-12', 12, NULL,NULL,NULL,'K12A'),
-- R008组 Ku K1B~K13B
(178,'CS6D-R008-13-1',  'RK1B',  30, 'CS6D-R008-13',  1, NULL,NULL,NULL,'K1B'),
(179,'CS6D-R008-13-2',  'RK2B',  30, 'CS6D-R008-13',  2, NULL,NULL,NULL,'K2B'),
(180,'CS6D-R008-13-3',  'RK3B',  30, 'CS6D-R008-13',  3, NULL,NULL,NULL,'K3B'),
(181,'CS6D-R008-13-4',  'RK4B',  30, 'CS6D-R008-13',  4, NULL,NULL,NULL,'K4B'),
(182,'CS6D-R008-13-5',  'RK5B',  30, 'CS6D-R008-13',  5, NULL,NULL,NULL,'K5B'),
(183,'CS6D-R008-13-6',  'RK6B',  30, 'CS6D-R008-13',  6, NULL,NULL,NULL,'K6B'),
(184,'CS6D-R008-13-7',  'RK7B',  30, 'CS6D-R008-13',  7, NULL,NULL,NULL,'K7B'),
(185,'CS6D-R008-13-8',  'RK8B',  30, 'CS6D-R008-13',  8, NULL,NULL,NULL,'K8B'),
(186,'CS6D-R008-13-9',  'RK9B',  30, 'CS6D-R008-13',  9, NULL,NULL,NULL,'K9B'),
(187,'CS6D-R008-13-10', 'RK10B', 30, 'CS6D-R008-13', 10, NULL,NULL,NULL,'K10B'),
(188,'CS6D-R008-13-11', 'RK11B', 30, 'CS6D-R008-13', 11, NULL,NULL,NULL,'K11B'),
(189,'CS6D-R008-13-12', 'RK12B', 30, 'CS6D-R008-13', 12, NULL,NULL,NULL,'K12B'),
(190,'CS6D-R008-13-13', 'RK13B', 30, 'CS6D-R008-13', 13, NULL,NULL,NULL,'K13B'),
-- R009组 Ku S7B~S12B
(191,'CS6D-R009-6-1',   'RS7B',  31, 'CS6D-R009-6',   1, NULL,NULL,NULL,'S7B'),
(192,'CS6D-R009-6-2',   'RS8B',  31, 'CS6D-R009-6',   2, NULL,NULL,NULL,'S8B'),
(193,'CS6D-R009-6-3',   'RS9B',  31, 'CS6D-R009-6',   3, NULL,NULL,NULL,'S9B'),
(194,'CS6D-R009-6-4',   'RS10B', 31, 'CS6D-R009-6',   4, NULL,NULL,NULL,'S10B'),
(195,'CS6D-R009-6-5',   'RS11B', 31, 'CS6D-R009-6',   5, NULL,NULL,NULL,'S11B'),
(196,'CS6D-R009-6-6',   'RS12B', 31, 'CS6D-R009-6',   6, NULL,NULL,NULL,'S12B'),
-- ============ CS6D 发射侧通道 ============
-- T001组 C AP1A~AP12A
(197,'CS6D-T001-12-1',  'TAP1A', 32, 'CS6D-T001-12',  1, NULL,NULL,NULL,'AP1A'),
(198,'CS6D-T001-12-2',  'TAP2A', 32, 'CS6D-T001-12',  2, NULL,NULL,NULL,'AP2A'),
(199,'CS6D-T001-12-3',  'TAP3A', 32, 'CS6D-T001-12',  3, NULL,NULL,NULL,'AP3A'),
(200,'CS6D-T001-12-4',  'TAP4A', 32, 'CS6D-T001-12',  4, NULL,NULL,NULL,'AP4A'),
(201,'CS6D-T001-12-5',  'TAP5A', 32, 'CS6D-T001-12',  5, NULL,NULL,NULL,'AP5A'),
(202,'CS6D-T001-12-6',  'TAP6A', 32, 'CS6D-T001-12',  6, NULL,NULL,NULL,'AP6A'),
(203,'CS6D-T001-12-7',  'TAP7A', 32, 'CS6D-T001-12',  7, NULL,NULL,NULL,'AP7A'),
(204,'CS6D-T001-12-8',  'TAP8A', 32, 'CS6D-T001-12',  8, NULL,NULL,NULL,'AP8A'),
(205,'CS6D-T001-12-9',  'TAP9A', 32, 'CS6D-T001-12',  9, NULL,NULL,NULL,'AP9A'),
(206,'CS6D-T001-12-10', 'TAP10A',32, 'CS6D-T001-12', 10, NULL,NULL,NULL,'AP10A'),
(207,'CS6D-T001-12-11', 'TAP11A',32, 'CS6D-T001-12', 11, NULL,NULL,NULL,'AP11A'),
(208,'CS6D-T001-12-12', 'TAP12A',32, 'CS6D-T001-12', 12, NULL,NULL,NULL,'AP12A'),
-- T002组 C AP1B~AP13B
(209,'CS6D-T002-13-1',  'TAP1B', 33, 'CS6D-T002-13',  1, NULL,NULL,NULL,'AP1B'),
(210,'CS6D-T002-13-2',  'TAP2B', 33, 'CS6D-T002-13',  2, NULL,NULL,NULL,'AP2B'),
(211,'CS6D-T002-13-3',  'TAP3B', 33, 'CS6D-T002-13',  3, NULL,NULL,NULL,'AP3B'),
(212,'CS6D-T002-13-4',  'TAP4B', 33, 'CS6D-T002-13',  4, NULL,NULL,NULL,'AP4B'),
(213,'CS6D-T002-13-5',  'TAP5B', 33, 'CS6D-T002-13',  5, NULL,NULL,NULL,'AP5B'),
(214,'CS6D-T002-13-6',  'TAP6B', 33, 'CS6D-T002-13',  6, NULL,NULL,NULL,'AP6B'),
(215,'CS6D-T002-13-7',  'TAP7B', 33, 'CS6D-T002-13',  7, NULL,NULL,NULL,'AP7B'),
(216,'CS6D-T002-13-8',  'TAP8B', 33, 'CS6D-T002-13',  8, NULL,NULL,NULL,'AP8B'),
(217,'CS6D-T002-13-9',  'TAP9B', 33, 'CS6D-T002-13',  9, NULL,NULL,NULL,'AP9B'),
(218,'CS6D-T002-13-10', 'TAP10B',33, 'CS6D-T002-13', 10, NULL,NULL,NULL,'AP10B'),
(219,'CS6D-T002-13-11', 'TAP11B',33, 'CS6D-T002-13', 11, NULL,NULL,NULL,'AP11B'),
(220,'CS6D-T002-13-12', 'TAP12B',33, 'CS6D-T002-13', 12, NULL,NULL,NULL,'AP12B'),
(221,'CS6D-T002-13-13', 'TAP13B',33, 'CS6D-T002-13', 13, NULL,NULL,NULL,'AP13B'),
-- T003组 Ku K1A~K12A
(222,'CS6D-T003-12-1',  'TK1A',  34, 'CS6D-T003-12',  1, NULL,NULL,NULL,'K1A'),
(223,'CS6D-T003-12-2',  'TK2A',  34, 'CS6D-T003-12',  2, NULL,NULL,NULL,'K2A'),
(224,'CS6D-T003-12-3',  'TK3A',  34, 'CS6D-T003-12',  3, NULL,NULL,NULL,'K3A'),
(225,'CS6D-T003-12-4',  'TK4A',  34, 'CS6D-T003-12',  4, NULL,NULL,NULL,'K4A'),
(226,'CS6D-T003-12-5',  'TK5A',  34, 'CS6D-T003-12',  5, NULL,NULL,NULL,'K5A'),
(227,'CS6D-T003-12-6',  'TK6A',  34, 'CS6D-T003-12',  6, NULL,NULL,NULL,'K6A'),
(228,'CS6D-T003-12-7',  'TK7A',  34, 'CS6D-T003-12',  7, NULL,NULL,NULL,'K7A'),
(229,'CS6D-T003-12-8',  'TK8A',  34, 'CS6D-T003-12',  8, NULL,NULL,NULL,'K8A'),
(230,'CS6D-T003-12-9',  'TK9A',  34, 'CS6D-T003-12',  9, NULL,NULL,NULL,'K9A'),
(231,'CS6D-T003-12-10', 'TK10A', 34, 'CS6D-T003-12', 10, NULL,NULL,NULL,'K10A'),
(232,'CS6D-T003-12-11', 'TK11A', 34, 'CS6D-T003-12', 11, NULL,NULL,NULL,'K11A'),
(233,'CS6D-T003-12-12', 'TK12A', 34, 'CS6D-T003-12', 12, NULL,NULL,NULL,'K12A'),
-- T004组 Ku K1B~K13B
(234,'CS6D-T004-13-1',  'TK1B',  35, 'CS6D-T004-13',  1, NULL,NULL,NULL,'K1B'),
(235,'CS6D-T004-13-2',  'TK2B',  35, 'CS6D-T004-13',  2, NULL,NULL,NULL,'K2B'),
(236,'CS6D-T004-13-3',  'TK3B',  35, 'CS6D-T004-13',  3, NULL,NULL,NULL,'K3B'),
(237,'CS6D-T004-13-4',  'TK4B',  35, 'CS6D-T004-13',  4, NULL,NULL,NULL,'K4B'),
(238,'CS6D-T004-13-5',  'TK5B',  35, 'CS6D-T004-13',  5, NULL,NULL,NULL,'K5B'),
(239,'CS6D-T004-13-6',  'TK6B',  35, 'CS6D-T004-13',  6, NULL,NULL,NULL,'K6B'),
(240,'CS6D-T004-13-7',  'TK7B',  35, 'CS6D-T004-13',  7, NULL,NULL,NULL,'K7B'),
(241,'CS6D-T004-13-8',  'TK8B',  35, 'CS6D-T004-13',  8, NULL,NULL,NULL,'K8B'),
(242,'CS6D-T004-13-9',  'TK9B',  35, 'CS6D-T004-13',  9, NULL,NULL,NULL,'K9B'),
(243,'CS6D-T004-13-10', 'TK10B', 35, 'CS6D-T004-13', 10, NULL,NULL,NULL,'K10B'),
(244,'CS6D-T004-13-11', 'TK11B', 35, 'CS6D-T004-13', 11, NULL,NULL,NULL,'K11B'),
(245,'CS6D-T004-13-12', 'TK12B', 35, 'CS6D-T004-13', 12, NULL,NULL,NULL,'K12B'),
(246,'CS6D-T004-13-13', 'TK13B', 35, 'CS6D-T004-13', 13, NULL,NULL,NULL,'K13B'),
-- T005组 Ku S7B~S12B
(247,'CS6D-T005-6-1',   'TS7B',  36, 'CS6D-T005-6',   1, NULL,NULL,NULL,'S7B'),
(248,'CS6D-T005-6-2',   'TS8B',  36, 'CS6D-T005-6',   2, NULL,NULL,NULL,'S8B'),
(249,'CS6D-T005-6-3',   'TS9B',  36, 'CS6D-T005-6',   3, NULL,NULL,NULL,'S9B'),
(250,'CS6D-T005-6-4',   'TS10B', 36, 'CS6D-T005-6',   4, NULL,NULL,NULL,'S10B'),
(251,'CS6D-T005-6-5',   'TS11B', 36, 'CS6D-T005-6',   5, NULL,NULL,NULL,'S11B'),
(252,'CS6D-T005-6-6',   'TS12B', 36, 'CS6D-T005-6',   6, NULL,NULL,NULL,'S12B');
-- 注：CS6D还有CS6D-T005直通输出端口 S7B~S12B，对应channel_info中没有T前缀的代码
-- 这些直通输出已在开关表中记录为 S7B/S8B等，前端查询时回退到发射侧通道组处理


-- ============================================================
-- 6. switch_matrix_info 矩阵信息
-- ============================================================
DROP TABLE IF EXISTS `switch_matrix_info`;
CREATE TABLE `switch_matrix_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `matrixCode` varchar(128) DEFAULT NULL COMMENT '矩阵代码',
  `satelliteId` int DEFAULT NULL COMMENT '卫星id',
  `satelliteCode` varchar(64) DEFAULT NULL COMMENT '卫星（冗余）',
  `areaNo` int DEFAULT NULL COMMENT '区号',
  `groupNo` int DEFAULT NULL COMMENT '组号',
  `inputPortCount` int DEFAULT NULL COMMENT '输入端口数',
  `outputPortCount` int DEFAULT NULL COMMENT '输出端口数',
  `effectiveStatus` int DEFAULT NULL COMMENT '生效状态：1有效，0无效',
  PRIMARY KEY (`id`),
  KEY `idx_matrix_code` (`matrixCode`),
  CONSTRAINT `fk_switch_matrix_satellite` FOREIGN KEY (`satelliteId`) REFERENCES `satellite_basic_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='矩阵表';

INSERT INTO `switch_matrix_info` VALUES
(1, 'CS10R-1-1', 1, 'CS10R', 1, 1, 13, 13, 1),
(2, 'CS10R-1-2', 1, 'CS10R', 1, 2,  4,  4, 1),
(3, 'CS10R-1-3', 1, 'CS10R', 1, 3,  2,  2, 1),
(4, 'CS10R-2-1', 1, 'CS10R', 2, 1,  8,  8, 1),
(5, 'CS10R-2-2', 1, 'CS10R', 2, 2,  8,  8, 1),
(6, 'CS10R-2-3', 1, 'CS10R', 2, 3,  8,  8, 1),
(7, 'CS10R-2-4', 1, 'CS10R', 2, 4,  8,  8, 1),
(8, 'CS6D-1-1',  2, 'CS6D',  1, 1, 63, 25, 1),
(9, 'CS6D-1-2',  2, 'CS6D',  1, 2, 37, 31, 1);


-- ============================================================
-- 7. matrix_port_info 端口信息
-- ============================================================
DROP TABLE IF EXISTS `matrix_port_info`;
CREATE TABLE `matrix_port_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `portCode` varchar(128) DEFAULT NULL COMMENT '端口代码',
  `matrixId` int DEFAULT NULL COMMENT '所属矩阵id',
  `matrixCode` varchar(128) DEFAULT NULL COMMENT '所属矩阵（冗余）',
  `ioType` varchar(16) DEFAULT NULL COMMENT '输入I/输出O',
  `portSeq` int DEFAULT NULL COMMENT '序号',
  `channelCodeShort` varchar(64) DEFAULT NULL COMMENT '关联通道代码（短）',
  PRIMARY KEY (`id`),
  KEY `idx_port_code` (`portCode`),
  KEY `idx_matrix_port_matrix_id` (`matrixId`),
  CONSTRAINT `fk_matrix_port_matrix` FOREIGN KEY (`matrixId`) REFERENCES `switch_matrix_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='端口表';

INSERT INTO `matrix_port_info` VALUES
-- CS10R-1-1 输入端口（13个）
(1,  'CS10R-1-1-I1',  1, 'CS10R-1-1', 'I',  1, 'RC1A'),
(2,  'CS10R-1-1-I2',  1, 'CS10R-1-1', 'I',  2, 'RC2A'),
(3,  'CS10R-1-1-I3',  1, 'CS10R-1-1', 'I',  3, 'RC3A'),
(4,  'CS10R-1-1-I4',  1, 'CS10R-1-1', 'I',  4, 'RC4A'),
(5,  'CS10R-1-1-I5',  1, 'CS10R-1-1', 'I',  5, 'RC5A'),
(6,  'CS10R-1-1-I6',  1, 'CS10R-1-1', 'I',  6, 'RC6A'),
(7,  'CS10R-1-1-I7',  1, 'CS10R-1-1', 'I',  7, 'RC7A'),
(8,  'CS10R-1-1-I8',  1, 'CS10R-1-1', 'I',  8, 'RC8A'),
(9,  'CS10R-1-1-I9',  1, 'CS10R-1-1', 'I',  9, 'RC9A'),
(10, 'CS10R-1-1-I10', 1, 'CS10R-1-1', 'I', 10, 'RC11A'),
(11, 'CS10R-1-1-I11', 1, 'CS10R-1-1', 'I', 11, 'RC12A'),
(12, 'CS10R-1-1-I12', 1, 'CS10R-1-1', 'I', 12, 'RC13A'),
(13, 'CS10R-1-1-I13', 1, 'CS10R-1-1', 'I', 13, 'RC14A'),
-- CS10R-1-1 输出端口（13个）
(14, 'CS10R-1-1-O1',  1, 'CS10R-1-1', 'O',  1, 'TC1A'),
(15, 'CS10R-1-1-O2',  1, 'CS10R-1-1', 'O',  2, 'TC2A'),
(16, 'CS10R-1-1-O3',  1, 'CS10R-1-1', 'O',  3, 'TC3A'),
(17, 'CS10R-1-1-O4',  1, 'CS10R-1-1', 'O',  4, 'TC4A'),
(18, 'CS10R-1-1-O5',  1, 'CS10R-1-1', 'O',  5, 'TC5A'),
(19, 'CS10R-1-1-O6',  1, 'CS10R-1-1', 'O',  6, 'TC6A'),
(20, 'CS10R-1-1-O7',  1, 'CS10R-1-1', 'O',  7, 'TC7A'),
(21, 'CS10R-1-1-O8',  1, 'CS10R-1-1', 'O',  8, 'TC8A'),
(22, 'CS10R-1-1-O9',  1, 'CS10R-1-1', 'O',  9, 'TC9A'),
(23, 'CS10R-1-1-O10', 1, 'CS10R-1-1', 'O', 10, 'TC11A'),
(24, 'CS10R-1-1-O11', 1, 'CS10R-1-1', 'O', 11, 'TC12A'),
(25, 'CS10R-1-1-O12', 1, 'CS10R-1-1', 'O', 12, 'TC13A'),
(26, 'CS10R-1-1-O13', 1, 'CS10R-1-1', 'O', 13, 'TC14A'),
-- CS10R-1-2（4+4）
(27, 'CS10R-1-2-I1',  2, 'CS10R-1-2', 'I',  1, 'RC5B'),
(28, 'CS10R-1-2-I2',  2, 'CS10R-1-2', 'I',  2, 'RC6B'),
(29, 'CS10R-1-2-I3',  2, 'CS10R-1-2', 'I',  3, 'RC7B'),
(30, 'CS10R-1-2-I4',  2, 'CS10R-1-2', 'I',  4, 'RC8B'),
(31, 'CS10R-1-2-O1',  2, 'CS10R-1-2', 'O',  1, 'TC5B'),
(32, 'CS10R-1-2-O2',  2, 'CS10R-1-2', 'O',  2, 'TC6B'),
(33, 'CS10R-1-2-O3',  2, 'CS10R-1-2', 'O',  3, 'TC7B'),
(34, 'CS10R-1-2-O4',  2, 'CS10R-1-2', 'O',  4, 'TC8B'),
-- CS10R-1-3（2+2）
(35, 'CS10R-1-3-I1',  3, 'CS10R-1-3', 'I',  1, 'RW1B'),
(36, 'CS10R-1-3-I2',  3, 'CS10R-1-3', 'I',  2, 'RW2B'),
(37, 'CS10R-1-3-O1',  3, 'CS10R-1-3', 'O',  1, 'TW1B'),
(38, 'CS10R-1-3-O2',  3, 'CS10R-1-3', 'O',  2, 'TW2B'),
-- CS10R-2-1（8+8）
(39, 'CS10R-2-1-I1',  4, 'CS10R-2-1', 'I',  1, 'RC1B'),
(40, 'CS10R-2-1-I2',  4, 'CS10R-2-1', 'I',  2, 'RC2B'),
(41, 'CS10R-2-1-I3',  4, 'CS10R-2-1', 'I',  3, 'RC3B'),
(42, 'CS10R-2-1-I4',  4, 'CS10R-2-1', 'I',  4, 'RC4B'),
(43, 'CS10R-2-1-I5',  4, 'CS10R-2-1', 'I',  5, 'RS1B'),
(44, 'CS10R-2-1-I6',  4, 'CS10R-2-1', 'I',  6, 'RS2B'),
(45, 'CS10R-2-1-I7',  4, 'CS10R-2-1', 'I',  7, 'RS3B'),
(46, 'CS10R-2-1-I8',  4, 'CS10R-2-1', 'I',  8, 'RS4B'),
(47, 'CS10R-2-1-O1',  4, 'CS10R-2-1', 'O',  1, 'TC1B'),
(48, 'CS10R-2-1-O2',  4, 'CS10R-2-1', 'O',  2, 'TC2B'),
(49, 'CS10R-2-1-O3',  4, 'CS10R-2-1', 'O',  3, 'TC3B'),
(50, 'CS10R-2-1-O4',  4, 'CS10R-2-1', 'O',  4, 'TC4B'),
(51, 'CS10R-2-1-O5',  4, 'CS10R-2-1', 'O',  5, 'TS1B'),
(52, 'CS10R-2-1-O6',  4, 'CS10R-2-1', 'O',  6, 'TS2B'),
(53, 'CS10R-2-1-O7',  4, 'CS10R-2-1', 'O',  7, 'TS3B'),
(54, 'CS10R-2-1-O8',  4, 'CS10R-2-1', 'O',  8, 'TS4B'),
-- CS10R-2-2（8+8）
(55, 'CS10R-2-2-I1',  5, 'CS10R-2-2', 'I',  1, 'RI5A'),
(56, 'CS10R-2-2-I2',  5, 'CS10R-2-2', 'I',  2, 'RI6A'),
(57, 'CS10R-2-2-I3',  5, 'CS10R-2-2', 'I',  3, 'RI7A'),
(58, 'CS10R-2-2-I4',  5, 'CS10R-2-2', 'I',  4, 'RI8A'),
(59, 'CS10R-2-2-I5',  5, 'CS10R-2-2', 'I',  5, 'RI11B'),
(60, 'CS10R-2-2-I6',  5, 'CS10R-2-2', 'I',  6, 'RI12B'),
(61, 'CS10R-2-2-I7',  5, 'CS10R-2-2', 'I',  7, 'RI13B'),
(62, 'CS10R-2-2-I8',  5, 'CS10R-2-2', 'I',  8, 'RI14B'),
(63, 'CS10R-2-2-O1',  5, 'CS10R-2-2', 'O',  1, 'TI5A'),
(64, 'CS10R-2-2-O2',  5, 'CS10R-2-2', 'O',  2, 'TI6A'),
(65, 'CS10R-2-2-O3',  5, 'CS10R-2-2', 'O',  3, 'TI7A'),
(66, 'CS10R-2-2-O4',  5, 'CS10R-2-2', 'O',  4, 'TI8A'),
(67, 'CS10R-2-2-O5',  5, 'CS10R-2-2', 'O',  5, 'TI11B'),
(68, 'CS10R-2-2-O6',  5, 'CS10R-2-2', 'O',  6, 'TI12B'),
(69, 'CS10R-2-2-O7',  5, 'CS10R-2-2', 'O',  7, 'TI13B'),
(70, 'CS10R-2-2-O8',  5, 'CS10R-2-2', 'O',  8, 'TI14B'),
-- CS10R-2-3（8+8）
(71, 'CS10R-2-3-I1',  6, 'CS10R-2-3', 'I',  1, 'RI11A'),
(72, 'CS10R-2-3-I2',  6, 'CS10R-2-3', 'I',  2, 'RI12A'),
(73, 'CS10R-2-3-I3',  6, 'CS10R-2-3', 'I',  3, 'RI13A'),
(74, 'CS10R-2-3-I4',  6, 'CS10R-2-3', 'I',  4, 'RI14A'),
(75, 'CS10R-2-3-I5',  6, 'CS10R-2-3', 'I',  5, 'RE11B'),
(76, 'CS10R-2-3-I6',  6, 'CS10R-2-3', 'I',  6, 'RE12B'),
(77, 'CS10R-2-3-I7',  6, 'CS10R-2-3', 'I',  7, 'RE13B'),
(78, 'CS10R-2-3-I8',  6, 'CS10R-2-3', 'I',  8, 'RW3B'),
(79, 'CS10R-2-3-O1',  6, 'CS10R-2-3', 'O',  1, 'TI11A'),
(80, 'CS10R-2-3-O2',  6, 'CS10R-2-3', 'O',  2, 'TI12A'),
(81, 'CS10R-2-3-O3',  6, 'CS10R-2-3', 'O',  3, 'TI13A'),
(82, 'CS10R-2-3-O4',  6, 'CS10R-2-3', 'O',  4, 'TI14A'),
(83, 'CS10R-2-3-O5',  6, 'CS10R-2-3', 'O',  5, 'TE11B'),
(84, 'CS10R-2-3-O6',  6, 'CS10R-2-3', 'O',  6, 'TE12B'),
(85, 'CS10R-2-3-O7',  6, 'CS10R-2-3', 'O',  7, 'TE13B'),
(86, 'CS10R-2-3-O8',  6, 'CS10R-2-3', 'O',  8, 'TW3B'),
-- CS10R-2-4（8+8）
(87, 'CS10R-2-4-I1',  7, 'CS10R-2-4', 'I',  1, 'RC11B'),
(88, 'CS10R-2-4-I2',  7, 'CS10R-2-4', 'I',  2, 'RC12B'),
(89, 'CS10R-2-4-I3',  7, 'CS10R-2-4', 'I',  3, 'RC13B'),
(90, 'CS10R-2-4-I4',  7, 'CS10R-2-4', 'I',  4, 'RC14B'),
(91, 'CS10R-2-4-I5',  7, 'CS10R-2-4', 'I',  5, 'RW11B'),
(92, 'CS10R-2-4-I6',  7, 'CS10R-2-4', 'I',  6, 'RW12B'),
(93, 'CS10R-2-4-I7',  7, 'CS10R-2-4', 'I',  7, 'RW13B'),
(94, 'CS10R-2-4-I8',  7, 'CS10R-2-4', 'I',  8, 'RW14B'),
(95, 'CS10R-2-4-O1',  7, 'CS10R-2-4', 'O',  1, 'TC11B'),
(96, 'CS10R-2-4-O2',  7, 'CS10R-2-4', 'O',  2, 'TC12B'),
(97, 'CS10R-2-4-O3',  7, 'CS10R-2-4', 'O',  3, 'TC13B'),
(98, 'CS10R-2-4-O4',  7, 'CS10R-2-4', 'O',  4, 'TC14B'),
(99, 'CS10R-2-4-O5',  7, 'CS10R-2-4', 'O',  5, 'TW11B'),
(100,'CS10R-2-4-O6',  7, 'CS10R-2-4', 'O',  6, 'TW12B'),
(101,'CS10R-2-4-O7',  7, 'CS10R-2-4', 'O',  7, 'TW13B'),
(102,'CS10R-2-4-O8',  7, 'CS10R-2-4', 'O',  8, 'TW14B');
-- 注：CS6D端口数量庞大（63+37输入，25+31输出），以下仅插入与已有开关记录对应的端口
-- 如需完整CS6D端口数据可扩充，前端Demo以CS10R为主演示


-- ============================================================
-- 8. twt_realtime_status TWT实时状态
-- ============================================================
DROP TABLE IF EXISTS `twt_realtime_status`;
CREATE TABLE `twt_realtime_status` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `twtCodeLong` varchar(128) DEFAULT NULL COMMENT 'TWT代码（长）',
  `twtCodeShort` varchar(64) DEFAULT NULL COMMENT 'TWT代码（短）',
  `satelliteId` int DEFAULT NULL COMMENT '所属卫星id',
  `satelliteCode` varchar(64) DEFAULT NULL COMMENT '所属卫星（冗余）',
  `unitCode` varchar(64) DEFAULT NULL COMMENT '单机代号',
  `powerStatus` varchar(32) DEFAULT NULL COMMENT 'ON/OFF',
  `mutingStatus` varchar(32) DEFAULT NULL COMMENT 'Muting Status：ON/OFF',
  `fgmAlcMode` varchar(32) DEFAULT NULL COMMENT 'FGM/ALC',
  `gearPosition` int DEFAULT NULL COMMENT '档位',
  PRIMARY KEY (`id`),
  KEY `idx_twt_code_short` (`twtCodeShort`),
  CONSTRAINT `fk_twt_satellite` FOREIGN KEY (`satelliteId`) REFERENCES `satellite_basic_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='TWT实时状态表';

INSERT INTO `twt_realtime_status` VALUES
-- CS10R TWT-A系列（1~28）
(1,  'CS10R-TWT-A1',  'TWT-A1',  1,'CS10R','X11401','ON','OFF','FGM',NULL),
(2,  'CS10R-TWT-A2',  'TWT-A2',  1,'CS10R','X11402','ON','OFF','FGM',NULL),
(3,  'CS10R-TWT-A3',  'TWT-A3',  1,'CS10R','X11403','ON','OFF','FGM',NULL),
(4,  'CS10R-TWT-A4',  'TWT-A4',  1,'CS10R','X11404','ON','OFF','FGM',NULL),
(5,  'CS10R-TWT-A5',  'TWT-A5',  1,'CS10R','X11405','ON','OFF','FGM',NULL),
(6,  'CS10R-TWT-A6',  'TWT-A6',  1,'CS10R','X11406','ON','OFF','FGM',NULL),
(7,  'CS10R-TWT-A7',  'TWT-A7',  1,'CS10R','X11407','ON','OFF','FGM',NULL),
(8,  'CS10R-TWT-A8',  'TWT-A8',  1,'CS10R','X11408','ON','OFF','FGM',NULL),
(9,  'CS10R-TWT-A9',  'TWT-A9',  1,'CS10R','X11409','ON','OFF','FGM',NULL),
(10, 'CS10R-TWT-A10', 'TWT-A10', 1,'CS10R','X11410','ON','OFF','FGM',NULL),
(11, 'CS10R-TWT-A11', 'TWT-A11', 1,'CS10R','X11411','ON','OFF','FGM',NULL),
(12, 'CS10R-TWT-A12', 'TWT-A12', 1,'CS10R','X11412','ON','OFF','FGM',NULL),
(13, 'CS10R-TWT-A13', 'TWT-A13', 1,'CS10R','X11413','ON','OFF','FGM',NULL),
(14, 'CS10R-TWT-A14', 'TWT-A14', 1,'CS10R','X11414','ON','OFF','FGM',NULL),
(15, 'CS10R-TWT-A15', 'TWT-A15', 1,'CS10R','X11415','ON','OFF','FGM',NULL),
(16, 'CS10R-TWT-A16', 'TWT-A16', 1,'CS10R','X11416','ON','OFF','FGM',NULL),
(17, 'CS10R-TWT-A17', 'TWT-A17', 1,'CS10R','X11417','ON','OFF','FGM',NULL),
(18, 'CS10R-TWT-A18', 'TWT-A18', 1,'CS10R','X11418','ON','OFF','FGM',NULL),
(19, 'CS10R-TWT-A19', 'TWT-A19', 1,'CS10R','X11419','ON','OFF','FGM',NULL),
(20, 'CS10R-TWT-A20', 'TWT-A20', 1,'CS10R','X11420','ON','OFF','FGM',NULL),
(21, 'CS10R-TWT-A21', 'TWT-A21', 1,'CS10R','X11421','ON','OFF','FGM',NULL),
(22, 'CS10R-TWT-A22', 'TWT-A22', 1,'CS10R','X11422','ON','OFF','FGM',NULL),
(23, 'CS10R-TWT-A23', 'TWT-A23', 1,'CS10R','X11423','ON','OFF','FGM',NULL),
(24, 'CS10R-TWT-A24', 'TWT-A24', 1,'CS10R','X11424','ON','OFF','FGM',NULL),
(25, 'CS10R-TWT-A25', 'TWT-A25', 1,'CS10R','X11425','ON','OFF','FGM',NULL),
(26, 'CS10R-TWT-A26', 'TWT-A26', 1,'CS10R','X11426','ON','OFF','FGM',NULL),
(27, 'CS10R-TWT-A27', 'TWT-A27', 1,'CS10R','X11427','ON','OFF','FGM',NULL),
(28, 'CS10R-TWT-A28', 'TWT-A28', 1,'CS10R','X11428','ON','OFF','FGM',NULL),
-- CS10R TWT-B系列（1~16）
(29, 'CS10R-TWT-B1',  'TWT-B1',  1,'CS10R','X11601','ON','OFF','FGM',NULL),
(30, 'CS10R-TWT-B2',  'TWT-B2',  1,'CS10R','X11602','ON','OFF','FGM',NULL),
(31, 'CS10R-TWT-B3',  'TWT-B3',  1,'CS10R','X11603','ON','OFF','FGM',NULL),
(32, 'CS10R-TWT-B4',  'TWT-B4',  1,'CS10R','X11604','ON','OFF','FGM',NULL),
(33, 'CS10R-TWT-B5',  'TWT-B5',  1,'CS10R','X11605','ON','OFF','FGM',NULL),
(34, 'CS10R-TWT-B6',  'TWT-B6',  1,'CS10R','X11606','ON','OFF','FGM',NULL),
(35, 'CS10R-TWT-B7',  'TWT-B7',  1,'CS10R','X11607','ON','OFF','FGM',NULL),
(36, 'CS10R-TWT-B8',  'TWT-B8',  1,'CS10R','X11608','ON','OFF','FGM',NULL),
(37, 'CS10R-TWT-B9',  'TWT-B9',  1,'CS10R','X11609','ON','OFF','FGM',NULL),
(38, 'CS10R-TWT-B10', 'TWT-B10', 1,'CS10R','X11610','ON','OFF','FGM',NULL),
(39, 'CS10R-TWT-B11', 'TWT-B11', 1,'CS10R','X11611','ON','OFF','FGM',NULL),
(40, 'CS10R-TWT-B12', 'TWT-B12', 1,'CS10R','X11612','ON','OFF','FGM',NULL),
(41, 'CS10R-TWT-B13', 'TWT-B13', 1,'CS10R','X11613','ON','OFF','FGM',NULL),
(42, 'CS10R-TWT-B14', 'TWT-B14', 1,'CS10R','X11614','ON','OFF','FGM',NULL),
(43, 'CS10R-TWT-B15', 'TWT-B15', 1,'CS10R','X11615','ON','OFF','FGM',NULL),
(44, 'CS10R-TWT-B16', 'TWT-B16', 1,'CS10R','X11616','ON','OFF','FGM',NULL);


-- ============================================================
-- 9. matrix_switch_status 开关状态表
--    p0TwtId/p1TwtId/p2TwtId 引用 twt_realtime_status.id
--    inputPortId/outputPortId 引用 matrix_port_info.id
-- ============================================================
DROP TABLE IF EXISTS `matrix_switch_status`;
CREATE TABLE `matrix_switch_status` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `switchCode` varchar(128) DEFAULT NULL COMMENT '开关代码',
  `matrixId` int DEFAULT NULL COMMENT '所属矩阵id',
  `matrixCode` varchar(128) DEFAULT NULL COMMENT '所属矩阵（冗余）',
  `inputPortId` int DEFAULT NULL COMMENT '入端口id',
  `inputPortSeq` int DEFAULT NULL COMMENT '入端口序号（冗余）',
  `outputPortId` int DEFAULT NULL COMMENT '出端口id',
  `outputPortSeq` int DEFAULT NULL COMMENT '出端口序号（冗余）',
  `inputChannelCodeShort` varchar(64) DEFAULT NULL COMMENT '入端口通道索引（冗余，RC*/RS*等）',
  `outputChannelCodeShort` varchar(64) DEFAULT NULL COMMENT '出端口通道索引（冗余，TC*/TS*等）',
  `switchStatus` tinyint DEFAULT NULL COMMENT '开关状态：1通，0断',
  `switchType` varchar(32) DEFAULT NULL COMMENT '开关类型：常通/可切',
  `p0TwtId` int DEFAULT NULL COMMENT 'P0 TWT id',
  `p0TwtCode` varchar(64) DEFAULT NULL COMMENT 'P0 TWT代码（冗余）',
  `p1TwtId` int DEFAULT NULL COMMENT 'P1 TWT id',
  `p1TwtCode` varchar(64) DEFAULT NULL COMMENT 'P1 TWT代码（冗余）',
  `p2TwtId` int DEFAULT NULL COMMENT 'P2 TWT id',
  `p2TwtCode` varchar(64) DEFAULT NULL COMMENT 'P2 TWT代码（冗余）',
  `twtValidStatusId` int DEFAULT NULL COMMENT '当前有效TWT id',
  `twtValidStatusCode` varchar(64) DEFAULT NULL COMMENT '当前有效TWT代码（冗余）',
  PRIMARY KEY (`id`),
  KEY `idx_switch_code` (`switchCode`),
  KEY `idx_switch_matrix_id` (`matrixId`),
  CONSTRAINT `fk_switch_matrix` FOREIGN KEY (`matrixId`) REFERENCES `switch_matrix_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开关状态表';

INSERT INTO `matrix_switch_status` VALUES
-- ===== CS10R-1-1（矩阵id=1，输入端口1-13对应id 1-13，输出端口1-13对应id 14-26）=====
(1,  'CS10R-1-1-[1][1]',   1,'CS10R-1-1',  1, 1, 14, 1, 'RC1A', 'TC1A',  1,'常通', 1,'TWT-A1',  4,'TWT-A4',  2,'TWT-A2',  1,'TWT-A1'),
(2,  'CS10R-1-1-[2][2]',   1,'CS10R-1-1',  2, 2, 15, 2, 'RC2A', 'TC2A',  1,'常通', 2,'TWT-A2',  4,'TWT-A4',  3,'TWT-A3',  2,'TWT-A2'),
(3,  'CS10R-1-1-[3][3]',   1,'CS10R-1-1',  3, 3, 16, 3, 'RC3A', 'TC3A',  1,'常通', 3,'TWT-A3',  4,'TWT-A4',  5,'TWT-A5',  3,'TWT-A3'),
(4,  'CS10R-1-1-[4][4]',   1,'CS10R-1-1',  4, 4, 17, 4, 'RC4A', 'TC4A',  1,'常通', 5,'TWT-A5',  4,'TWT-A4',  3,'TWT-A3',  5,'TWT-A5'),
(5,  'CS10R-1-1-[5][5]',   1,'CS10R-1-1',  5, 5, 18, 5, 'RC5A', 'TC5A',  1,'常通', 6,'TWT-A6',  4,'TWT-A4',  3,'TWT-A3',  6,'TWT-A6'),
(6,  'CS10R-1-1-[6][6]',   1,'CS10R-1-1',  6, 6, 19, 6, 'RC6A', 'TC6A',  1,'常通', 7,'TWT-A7',  8,'TWT-A8',  9,'TWT-A9',  7,'TWT-A7'),
(7,  'CS10R-1-1-[7][7]',   1,'CS10R-1-1',  7, 7, 20, 7, 'RC7A', 'TC7A',  1,'常通', 9,'TWT-A9',  8,'TWT-A8',  7,'TWT-A7',  9,'TWT-A9'),
(8,  'CS10R-1-1-[8][8]',   1,'CS10R-1-1',  8, 8, 21, 8, 'RC8A', 'TC8A',  1,'常通',10,'TWT-A10', 8,'TWT-A8', 11,'TWT-A11',10,'TWT-A10'),
(9,  'CS10R-1-1-[9][9]',   1,'CS10R-1-1',  9, 9, 22, 9, 'RC9A', 'TC9A',  1,'常通',11,'TWT-A11',12,'TWT-A12',10,'TWT-A10',11,'TWT-A11'),
(10, 'CS10R-1-1-[10][10]', 1,'CS10R-1-1', 10,10, 23,10,'RC11A','TC11A',  1,'常通',29,'TWT-B1', 31,'TWT-B3', 32,'TWT-B4', 29,'TWT-B1'),
(11, 'CS10R-1-1-[11][11]', 1,'CS10R-1-1', 11,11, 24,11,'RC12A','TC12A',  1,'常通',30,'TWT-B2', 31,'TWT-B3', 29,'TWT-B1', 30,'TWT-B2'),
(12, 'CS10R-1-1-[12][12]', 1,'CS10R-1-1', 12,12, 25,12,'RC13A','TC13A',  1,'常通',32,'TWT-B4', 31,'TWT-B3', 33,'TWT-B5', 32,'TWT-B4'),
(13, 'CS10R-1-1-[13][13]', 1,'CS10R-1-1', 13,13, 26,13,'RC14A','TC14A',  1,'常通',33,'TWT-B5', 31,'TWT-B3', 32,'TWT-B4', 33,'TWT-B5'),
-- ===== CS10R-1-2（矩阵id=2，输入端口对应id 27-30，输出端口对应id 31-34）=====
(14, 'CS10R-1-2-[1][1]',   2,'CS10R-1-2', 27, 1, 31, 1, 'RC5B', 'TC5B',  1,'常通',19,'TWT-A19',23,'TWT-A23',16,'TWT-A16',19,'TWT-A19'),
(15, 'CS10R-1-2-[2][2]',   2,'CS10R-1-2', 28, 2, 32, 2, 'RC6B', 'TC6B',  1,'常通',20,'TWT-A20',23,'TWT-A23',19,'TWT-A19',20,'TWT-A20'),
(16, 'CS10R-1-2-[3][3]',   2,'CS10R-1-2', 29, 3, 33, 3, 'RC7B', 'TC7B',  1,'常通',21,'TWT-A21',23,'TWT-A23',22,'TWT-A22',21,'TWT-A21'),
(17, 'CS10R-1-2-[4][4]',   2,'CS10R-1-2', 30, 4, 34, 4, 'RC8B', 'TC8B',  1,'常通',22,'TWT-A22',23,'TWT-A23',20,'TWT-A20',22,'TWT-A22'),
-- ===== CS10R-1-3（矩阵id=3，输入端口id 35-36，输出端口id 37-38）=====
(18, 'CS10R-1-3-[1][1]',   3,'CS10R-1-3', 35, 1, 37, 1, 'RW1B', 'TW1B',  1,'常通',24,'TWT-A24',23,'TWT-A23',25,'TWT-A25',24,'TWT-A24'),
(19, 'CS10R-1-3-[2][2]',   3,'CS10R-1-3', 36, 2, 38, 2, 'RW2B', 'TW2B',  1,'常通',25,'TWT-A25',23,'TWT-A23',24,'TWT-A24',25,'TWT-A25'),
-- ===== CS10R-2-1（矩阵id=4，输入端口id 39-46，输出端口id 47-54）=====
(20, 'CS10R-2-1-[1][1]',   4,'CS10R-2-1', 39, 1, 47, 1, 'RC1B', 'TC1B',  0,'可切',15,'TWT-A15',28,'TWT-A28',17,'TWT-A17',15,'TWT-A15'),
(21, 'CS10R-2-1-[2][2]',   4,'CS10R-2-1', 40, 2, 48, 2, 'RC2B', 'TC2B',  0,'可切',16,'TWT-A16',28,'TWT-A28',15,'TWT-A15',16,'TWT-A16'),
(22, 'CS10R-2-1-[3][3]',   4,'CS10R-2-1', 41, 3, 49, 3, 'RC3B', 'TC3B',  0,'可切',17,'TWT-A17',28,'TWT-A28',18,'TWT-A18',17,'TWT-A17'),
(23, 'CS10R-2-1-[4][4]',   4,'CS10R-2-1', 42, 4, 50, 4, 'RC4B', 'TC4B',  0,'可切',18,'TWT-A18',28,'TWT-A28',21,'TWT-A21',18,'TWT-A18'),
(24, 'CS10R-2-1-[5][5]',   4,'CS10R-2-1', 43, 5, 51, 5, 'RS1B', 'TS1B',  1,'可切',15,'TWT-A15',28,'TWT-A28',17,'TWT-A17',15,'TWT-A15'),
(25, 'CS10R-2-1-[6][6]',   4,'CS10R-2-1', 44, 6, 52, 6, 'RS2B', 'TS2B',  1,'可切',16,'TWT-A16',28,'TWT-A28',15,'TWT-A15',16,'TWT-A16'),
(26, 'CS10R-2-1-[7][7]',   4,'CS10R-2-1', 45, 7, 53, 7, 'RS3B', 'TS3B',  1,'可切',17,'TWT-A17',28,'TWT-A28',18,'TWT-A18',17,'TWT-A17'),
(27, 'CS10R-2-1-[8][8]',   4,'CS10R-2-1', 46, 8, 54, 8, 'RS4B', 'TS4B',  1,'可切',18,'TWT-A18',28,'TWT-A28',21,'TWT-A21',18,'TWT-A18'),
-- ===== CS10R-2-2（矩阵id=5，输入端口id 55-62，输出端口id 63-70）=====
(28, 'CS10R-2-2-[1][1]',   5,'CS10R-2-2', 55, 1, 63, 1, 'RI5A',  'TI5A',  1,'可切',26,'TWT-A26',12,'TWT-A12',27,'TWT-A27',26,'TWT-A26'),
(29, 'CS10R-2-2-[2][2]',   5,'CS10R-2-2', 56, 2, 64, 2, 'RI6A',  'TI6A',  1,'可切',27,'TWT-A27',12,'TWT-A12',26,'TWT-A26',27,'TWT-A27'),
(30, 'CS10R-2-2-[3][3]',   5,'CS10R-2-2', 57, 3, 65, 3, 'RI7A',  'TI7A',  1,'可切',13,'TWT-A13',12,'TWT-A12',14,'TWT-A14',13,'TWT-A13'),
(31, 'CS10R-2-2-[4][4]',   5,'CS10R-2-2', 58, 4, 66, 4, 'RI8A',  'TI8A',  1,'可切',14,'TWT-A14',12,'TWT-A12',13,'TWT-A13',14,'TWT-A14'),
(32, 'CS10R-2-2-[5][5]',   5,'CS10R-2-2', 59, 5, 67, 5, 'RI11B','TI11B',  0,'可切',26,'TWT-A26',12,'TWT-A12',27,'TWT-A27',26,'TWT-A26'),
(33, 'CS10R-2-2-[6][6]',   5,'CS10R-2-2', 60, 6, 68, 6, 'RI12B','TI12B',  0,'可切',27,'TWT-A27',12,'TWT-A12',26,'TWT-A26',27,'TWT-A27'),
(34, 'CS10R-2-2-[7][7]',   5,'CS10R-2-2', 61, 7, 69, 7, 'RI13B','TI13B',  0,'可切',13,'TWT-A13',12,'TWT-A12',14,'TWT-A14',13,'TWT-A13'),
(35, 'CS10R-2-2-[8][8]',   5,'CS10R-2-2', 62, 8, 70, 8, 'RI14B','TI14B',  0,'可切',14,'TWT-A14',12,'TWT-A12',13,'TWT-A13',14,'TWT-A14'),
-- ===== CS10R-2-3（矩阵id=6，输入端口id 71-78，输出端口id 79-86）=====
(36, 'CS10R-2-3-[1][1]',   6,'CS10R-2-3', 71, 1, 79, 1,'RI11A','TI11A',  0,'可切',42,'TWT-B14',34,'TWT-B6', 43,'TWT-B15',42,'TWT-B14'),
(37, 'CS10R-2-3-[2][2]',   6,'CS10R-2-3', 72, 2, 80, 2,'RI12A','TI12A',  0,'可切',43,'TWT-B15',34,'TWT-B6', 42,'TWT-B14',43,'TWT-B15'),
(38, 'CS10R-2-3-[3][3]',   6,'CS10R-2-3', 73, 3, 81, 3,'RI13A','TI13A',  0,'可切',35,'TWT-B7', 34,'TWT-B6', 36,'TWT-B8', 35,'TWT-B7'),
(39, 'CS10R-2-3-[4][4]',   6,'CS10R-2-3', 74, 4, 82, 4,'RI14A','TI14A',  0,'可切',36,'TWT-B8', 34,'TWT-B6', 35,'TWT-B7', 36,'TWT-B8'),
(40, 'CS10R-2-3-[5][5]',   6,'CS10R-2-3', 75, 5, 83, 5,'RE11B','TE11B',  1,'可切',42,'TWT-B14',34,'TWT-B6', 43,'TWT-B15',42,'TWT-B14'),
(41, 'CS10R-2-3-[6][6]',   6,'CS10R-2-3', 76, 6, 84, 6,'RE12B','TE12B',  1,'可切',43,'TWT-B15',34,'TWT-B6', 42,'TWT-B14',43,'TWT-B15'),
(42, 'CS10R-2-3-[7][7]',   6,'CS10R-2-3', 77, 7, 85, 7,'RE13B','TE13B',  1,'可切',35,'TWT-B7', 34,'TWT-B6', 36,'TWT-B8', 35,'TWT-B7'),
(43, 'CS10R-2-3-[8][8]',   6,'CS10R-2-3', 78, 8, 86, 8,'RW3B', 'TW3B',   1,'可切',36,'TWT-B8', 34,'TWT-B6', 35,'TWT-B7', 36,'TWT-B8'),
-- ===== CS10R-2-4（矩阵id=7，输入端口id 87-94，输出端口id 95-102）=====
(44, 'CS10R-2-4-[1][1]',   7,'CS10R-2-4', 87, 1, 95, 1,'RC11B','TC11B',  1,'可切',37,'TWT-B9', 39,'TWT-B11',38,'TWT-B10',37,'TWT-B9'),
(45, 'CS10R-2-4-[2][2]',   7,'CS10R-2-4', 88, 2, 96, 2,'RC12B','TC12B',  1,'可切',38,'TWT-B10',39,'TWT-B11',40,'TWT-B12',38,'TWT-B10'),
(46, 'CS10R-2-4-[3][3]',   7,'CS10R-2-4', 89, 3, 97, 3,'RC13B','TC13B',  1,'可切',40,'TWT-B12',39,'TWT-B11',41,'TWT-B13',40,'TWT-B12'),
(47, 'CS10R-2-4-[4][4]',   7,'CS10R-2-4', 90, 4, 98, 4,'RC14B','TC14B',  1,'可切',41,'TWT-B13',39,'TWT-B11',37,'TWT-B9', 41,'TWT-B13'),
(48, 'CS10R-2-4-[5][5]',   7,'CS10R-2-4', 91, 5, 99, 5,'RW11B','TW11B',  0,'可切',37,'TWT-B9', 39,'TWT-B11',38,'TWT-B10',37,'TWT-B9'),
(49, 'CS10R-2-4-[6][6]',   7,'CS10R-2-4', 92, 6,100, 6,'RW12B','TW12B',  0,'可切',38,'TWT-B10',39,'TWT-B11',40,'TWT-B12',38,'TWT-B10'),
(50, 'CS10R-2-4-[7][7]',   7,'CS10R-2-4', 93, 7,101, 7,'RW13B','TW13B',  0,'可切',40,'TWT-B12',39,'TWT-B11',41,'TWT-B13',40,'TWT-B12'),
(51, 'CS10R-2-4-[8][8]',   7,'CS10R-2-4', 94, 8,102, 8,'RW14B','TW14B',  0,'可切',41,'TWT-B13',39,'TWT-B11',37,'TWT-B9', 41,'TWT-B13');


-- ============================================================
-- 10. product_instance 商品实例
-- ============================================================
DROP TABLE IF EXISTS `product_instance`;
CREATE TABLE `product_instance` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `productInstanceCode` varchar(128) DEFAULT NULL COMMENT '商品实例代码',
  PRIMARY KEY (`id`),
  KEY `idx_product_instance_code` (`productInstanceCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品实例表';

INSERT INTO `product_instance` VALUES
(1, 'PI-2026-001'),
(2, 'PI-2026-002'),
(3, 'PI-2026-003');


-- ============================================================
-- 11. occupation_realtime_status 占用实时状态
--     核心计算公式：
--       输入起始频率 = 对应通道(channel_info).channelStartFreq + frequencyOffset
--       输入终止频率 = channelStartFreq + frequencyOffset + occupiedBandwidth
--       输出端同偏移量（矩阵保持频率平移）
-- ============================================================
DROP TABLE IF EXISTS `occupation_realtime_status`;
CREATE TABLE `occupation_realtime_status` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '主键id',
  `frequencyBlockCode` varchar(128) DEFAULT NULL COMMENT '频率块代码',
  `productInstanceId` int DEFAULT NULL COMMENT '关联商品实例id',
  `productInstanceCode` varchar(128) DEFAULT NULL COMMENT '关联商品实例（冗余）',
  `switchId` int DEFAULT NULL COMMENT '开关id',
  `switchCode` varchar(128) DEFAULT NULL COMMENT '开关代码（冗余）',
  `occupiedBandwidth` double DEFAULT NULL COMMENT '占用宽度(MHz)',
  `frequencyOffset` double DEFAULT NULL COMMENT '偏移量(MHz)，相对于入端口通道起始频率',
  `occupationStatus` varchar(32) DEFAULT NULL COMMENT '占用/空闲',
  `occupationStartTimeMs` bigint DEFAULT NULL COMMENT '占用起时间',
  `occupationEndTimeMs` bigint DEFAULT NULL COMMENT '占用止时间(NULL=长期)',
  PRIMARY KEY (`id`),
  KEY `idx_occupation_switch_id` (`switchId`),
  KEY `idx_frequency_block_code` (`frequencyBlockCode`),
  CONSTRAINT `fk_occupation_switch` FOREIGN KEY (`switchId`) REFERENCES `matrix_switch_status` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='占用实时状态表';

/*
  数据验证说明（以下7条实测数据）：
  
  记录2: 开关 CS10R-1-1-[2][2]，switchId=2
    入端口通道索引 RC2A → 通道C2A（接收）→ 起始频率14043 MHz
    偏移量=45，宽度=5
    → 输入：14043+45=14088 ~ 14088+5=14093 MHz
    → 输出通道C2A（发射）起始频率12293 MHz
    → 输出：12293+45=12338 ~ 12338+5=12343 MHz
    
  记录3~7: 开关 CS10R-1-1-[6][6]，switchId=6
    入端口通道索引 RC6A → 通道C6A（接收）→ 起始频率14283 MHz
    记录3: offset=15, BW=1  → 输入：14298~14299 MHz
    记录4: offset=16, BW=19 → 输入：14299~14318 MHz
    记录5: offset=35, BW=4  → 输入：14318~14322 MHz
    记录6: offset=39.8, BW=7.2 → 输入：14322.8~14330 MHz
    记录7: offset=47, BW=6  → 输入：14330~14336 MHz
    记录8: offset=53, BW=3  → 输入：14336~14339 MHz（注：略超14337止频，实际数据如此）
*/


-- ============================================================
-- CS12 卫星数据（来源：网络矩阵数据库实例.xlsx）
-- 含完整频率数据、14个通道组、94条通道、47个开关、108条真实占用记录
-- ============================================================

-- 卫星
INSERT INTO `satellite_basic_info` VALUES
(3, 'CS12', '中星12号', NULL, NULL, NULL, NULL, NULL, 0, 0, 1, NULL, 0, 1);

-- 矩阵（4个：C全球/S1-4/Ku中国/Ku MENA）
INSERT INTO `switch_matrix_info` VALUES
(10, 'CS12-1-1', 3, 'CS12', 1, 1, 24, 24, 1),
(11, 'CS12-1-2', 3, 'CS12', 1, 2,  4,  4, 1),
(12, 'CS12-1-3', 3, 'CS12', 1, 3, 13, 13, 1),
(13, 'CS12-1-4', 3, 'CS12', 1, 4,  6,  6, 1);

-- 通道组（14个）
INSERT INTO `feed_channel_group_info`
(id, channelGroupCode, channelGroupSeq, satelliteId, satelliteCode, feedPortCode, antennaName, txRxType, polarization, band, channelCount)
VALUES
(37, 'CS12-R-CS12W01V-C', NULL, 3, 'CS12', NULL, '全球', 'R', 'V', 'C', NULL),
(38, 'CS12-R-CS12W01H-C', NULL, 3, 'CS12', NULL, '全球', 'R', 'H', 'C', NULL),
(39, 'CS12-T-CS12W01H-C', NULL, 3, 'CS12', NULL, '全球', 'T', 'H', 'C', NULL),
(40, 'CS12-T-CS12W01V-C', NULL, 3, 'CS12', NULL, '全球', 'T', 'V', 'C', NULL),
(41, 'CS12-R-CS12S01H-EKu', NULL, 3, 'CS12', NULL, '点波束', 'R', 'H', 'EKu', NULL),
(42, 'CS12-T-CS12S01V-EKu', NULL, 3, 'CS12', NULL, '点波束', 'T', 'V', 'EKu', NULL),
(43, 'CS12-R-CS12W02H-Ku', NULL, 3, 'CS12', NULL, '中国', 'R', 'H', 'Ku', NULL),
(44, 'CS12-R-CS12W02V-Ku', NULL, 3, 'CS12', NULL, '中国', 'R', 'V', 'Ku', NULL),
(45, 'CS12-T-CS12W02V-Ku', NULL, 3, 'CS12', NULL, '中国', 'T', 'V', 'Ku', NULL),
(46, 'CS12-T-CS12W02H-Ku', NULL, 3, 'CS12', NULL, '中国', 'T', 'H', 'Ku', NULL),
(47, 'CS12-R-CS12S02H-Ku', NULL, 3, 'CS12', NULL, 'MENA', 'R', 'H', 'Ku', NULL),
(48, 'CS12-R-CS12S02V-Ku', NULL, 3, 'CS12', NULL, 'MENA', 'R', 'V', 'Ku', NULL),
(49, 'CS12-T-CS12S02V-Ku', NULL, 3, 'CS12', NULL, 'MENA', 'T', 'V', 'Ku', NULL),
(50, 'CS12-T-CS12S02H-Ku', NULL, 3, 'CS12', NULL, 'MENA', 'T', 'H', 'Ku', NULL);

-- 通道（94个，含完整起止频率）
INSERT INTO `channel_info`
(id, channelCodeLong, channelCodeShort, channelGroupId, channelGroupCode, channelSeq, channelBandwidth, channelStartFreq, channelEndFreq, commonName)
VALUES
(253, 'CS12-R-CS12W01V-C-1', 'R3A', 37, 'CS12-R-CS12W01V-C', 1, 36, 5927, 5963, '3A'),
(254, 'CS12-R-CS12W01V-C-2', 'R4A', 37, 'CS12-R-CS12W01V-C', 2, 36, 5967, 6003, '4A'),
(255, 'CS12-R-CS12W01V-C-3', 'R5A', 37, 'CS12-R-CS12W01V-C', 3, 36, 6007, 6043, '5A'),
(256, 'CS12-R-CS12W01V-C-4', 'R6A', 37, 'CS12-R-CS12W01V-C', 4, 36, 6047, 6083, '6A'),
(257, 'CS12-R-CS12W01V-C-5', 'R7A', 37, 'CS12-R-CS12W01V-C', 5, 36, 6087, 6123, '7A'),
(258, 'CS12-R-CS12W01V-C-6', 'R8A', 37, 'CS12-R-CS12W01V-C', 6, 36, 6127, 6163, '8A'),
(259, 'CS12-R-CS12W01V-C-7', 'R9A', 37, 'CS12-R-CS12W01V-C', 7, 36, 6167, 6203, '9A'),
(260, 'CS12-R-CS12W01V-C-8', 'R10A', 37, 'CS12-R-CS12W01V-C', 8, 36, 6207, 6243, '10A'),
(261, 'CS12-R-CS12W01V-C-9', 'R11A', 37, 'CS12-R-CS12W01V-C', 9, 36, 6247, 6283, '11A'),
(262, 'CS12-R-CS12W01V-C-10', 'R12A', 37, 'CS12-R-CS12W01V-C', 10, 36, 6287, 6323, '12A'),
(263, 'CS12-R-CS12W01V-C-11', 'R13A', 37, 'CS12-R-CS12W01V-C', 11, 36, 6327, 6363, '13A'),
(264, 'CS12-R-CS12W01V-C-12', 'R14A', 37, 'CS12-R-CS12W01V-C', 12, 36, 6367, 6403, '14A'),
(265, 'CS12-R-CS12W01H-C-13', 'R3B', 38, 'CS12-R-CS12W01H-C', 13, 36, 5947, 5983, '3B'),
(266, 'CS12-R-CS12W01H-C-14', 'R4B', 38, 'CS12-R-CS12W01H-C', 14, 36, 5987, 6023, '4B'),
(267, 'CS12-R-CS12W01H-C-15', 'R5B', 38, 'CS12-R-CS12W01H-C', 15, 36, 6027, 6063, '5B'),
(268, 'CS12-R-CS12W01H-C-16', 'R6B', 38, 'CS12-R-CS12W01H-C', 16, 36, 6067, 6103, '6B'),
(269, 'CS12-R-CS12W01H-C-17', 'R7B', 38, 'CS12-R-CS12W01H-C', 17, 36, 6107, 6143, '7B'),
(270, 'CS12-R-CS12W01H-C-18', 'R8B', 38, 'CS12-R-CS12W01H-C', 18, 36, 6147, 6183, '8B'),
(271, 'CS12-R-CS12W01H-C-19', 'R9B', 38, 'CS12-R-CS12W01H-C', 19, 36, 6187, 6223, '9B'),
(272, 'CS12-R-CS12W01H-C-20', 'R10B', 38, 'CS12-R-CS12W01H-C', 20, 36, 6227, 6263, '10B'),
(273, 'CS12-R-CS12W01H-C-21', 'R11B', 38, 'CS12-R-CS12W01H-C', 21, 36, 6267, 6303, '11B'),
(274, 'CS12-R-CS12W01H-C-22', 'R12B', 38, 'CS12-R-CS12W01H-C', 22, 36, 6307, 6343, '12B'),
(275, 'CS12-R-CS12W01H-C-23', 'R13B', 38, 'CS12-R-CS12W01H-C', 23, 36, 6347, 6383, '13B'),
(276, 'CS12-R-CS12W01H-C-24', 'R14B', 38, 'CS12-R-CS12W01H-C', 24, 36, 6387, 6423, '14B'),
(277, 'CS12-T-CS12W01H-C-1', 'T3A', 39, 'CS12-T-CS12W01H-C', 1, 36, 3702, 3738, '3A'),
(278, 'CS12-T-CS12W01H-C-2', 'T4A', 39, 'CS12-T-CS12W01H-C', 2, 36, 3742, 3778, '4A'),
(279, 'CS12-T-CS12W01H-C-3', 'T5A', 39, 'CS12-T-CS12W01H-C', 3, 36, 3782, 3818, '5A'),
(280, 'CS12-T-CS12W01H-C-4', 'T6A', 39, 'CS12-T-CS12W01H-C', 4, 36, 3822, 3858, '6A'),
(281, 'CS12-T-CS12W01H-C-5', 'T7A', 39, 'CS12-T-CS12W01H-C', 5, 36, 3862, 3898, '7A'),
(282, 'CS12-T-CS12W01H-C-6', 'T8A', 39, 'CS12-T-CS12W01H-C', 6, 36, 3902, 3938, '8A'),
(283, 'CS12-T-CS12W01H-C-7', 'T9A', 39, 'CS12-T-CS12W01H-C', 7, 36, 3942, 3978, '9A'),
(284, 'CS12-T-CS12W01H-C-8', 'T10A', 39, 'CS12-T-CS12W01H-C', 8, 36, 3982, 4018, '10A'),
(285, 'CS12-T-CS12W01H-C-9', 'T11A', 39, 'CS12-T-CS12W01H-C', 9, 36, 4022, 4058, '11A'),
(286, 'CS12-T-CS12W01H-C-10', 'T12A', 39, 'CS12-T-CS12W01H-C', 10, 36, 4062, 4098, '12A'),
(287, 'CS12-T-CS12W01H-C-11', 'T13A', 39, 'CS12-T-CS12W01H-C', 11, 36, 4102, 4138, '13A'),
(288, 'CS12-T-CS12W01H-C-12', 'T14A', 39, 'CS12-T-CS12W01H-C', 12, 36, 4142, 4178, '14A'),
(289, 'CS12-T-CS12W01V-C-13', 'T3B', 40, 'CS12-T-CS12W01V-C', 13, 36, 3722, 3758, '3B'),
(290, 'CS12-T-CS12W01V-C-14', 'T4B', 40, 'CS12-T-CS12W01V-C', 14, 36, 3762, 3798, '4B'),
(291, 'CS12-T-CS12W01V-C-15', 'T5B', 40, 'CS12-T-CS12W01V-C', 15, 36, 3802, 3838, '5B'),
(292, 'CS12-T-CS12W01V-C-16', 'T6B', 40, 'CS12-T-CS12W01V-C', 16, 36, 3842, 3878, '6B'),
(293, 'CS12-T-CS12W01V-C-17', 'T7B', 40, 'CS12-T-CS12W01V-C', 17, 36, 3882, 3918, '7B'),
(294, 'CS12-T-CS12W01V-C-18', 'T8B', 40, 'CS12-T-CS12W01V-C', 18, 36, 3922, 3958, '8B'),
(295, 'CS12-T-CS12W01V-C-19', 'T9B', 40, 'CS12-T-CS12W01V-C', 19, 36, 3962, 3998, '9B'),
(296, 'CS12-T-CS12W01V-C-20', 'T10B', 40, 'CS12-T-CS12W01V-C', 20, 36, 4002, 4038, '10B'),
(297, 'CS12-T-CS12W01V-C-21', 'T11B', 40, 'CS12-T-CS12W01V-C', 21, 36, 4042, 4078, '11B'),
(298, 'CS12-T-CS12W01V-C-22', 'T12B', 40, 'CS12-T-CS12W01V-C', 22, 36, 4082, 4118, '12B'),
(299, 'CS12-T-CS12W01V-C-23', 'T13B', 40, 'CS12-T-CS12W01V-C', 23, 36, 4122, 4158, '13B'),
(300, 'CS12-T-CS12W01V-C-24', 'T14B', 40, 'CS12-T-CS12W01V-C', 24, 36, 4162, 4198, '14B'),
(301, 'CS12-R-CS12S01H-EKu-1', 'RS1', 41, 'CS12-R-CS12S01H-EKu', 1, 54, 13756.5, 13810.5, 'S1'),
(302, 'CS12-R-CS12S01H-EKu-2', 'RS2', 41, 'CS12-R-CS12S01H-EKu', 2, 54, 13819, 13873, 'S2'),
(303, 'CS12-R-CS12S01H-EKu-3', 'RS3', 41, 'CS12-R-CS12S01H-EKu', 3, 54, 13881.5, 13935.5, 'S3'),
(304, 'CS12-R-CS12S01H-EKu-4', 'RS4', 41, 'CS12-R-CS12S01H-EKu', 4, 54, 13944, 13998, 'S4'),
(305, 'CS12-T-CS12S01V-EKu-1', 'TS1', 42, 'CS12-T-CS12S01V-EKu', 1, 54, 10954.5, 11008.5, 'S1'),
(306, 'CS12-T-CS12S01V-EKu-2', 'TS2', 42, 'CS12-T-CS12S01V-EKu', 2, 54, 11017, 11071, 'S2'),
(307, 'CS12-T-CS12S01V-EKu-3', 'TS3', 42, 'CS12-T-CS12S01V-EKu', 3, 54, 11079.5, 11133.5, 'S3'),
(308, 'CS12-T-CS12S01V-EKu-4', 'TS4', 42, 'CS12-T-CS12S01V-EKu', 4, 54, 11142, 11196, 'S4'),
(309, 'CS12-R-CS12W02H-Ku-1', 'RC1', 43, 'CS12-R-CS12W02H-Ku', 1, 54, 13995, 14049, 'C1'),
(310, 'CS12-R-CS12W02H-Ku-2', 'RC2', 43, 'CS12-R-CS12W02H-Ku', 2, 54, 14036.5, 14090.5, 'C2'),
(311, 'CS12-R-CS12W02H-Ku-3', 'RC3', 43, 'CS12-R-CS12W02H-Ku', 3, 54, 14078, 14132, 'C3'),
(312, 'CS12-R-CS12W02H-Ku-4', 'RC4', 43, 'CS12-R-CS12W02H-Ku', 4, 54, 14119.5, 14173.5, 'C4'),
(313, 'CS12-R-CS12W02H-Ku-5', 'RC5', 43, 'CS12-R-CS12W02H-Ku', 5, 54, 14161, 14215, 'C5'),
(314, 'CS12-R-CS12W02H-Ku-6', 'RC6', 43, 'CS12-R-CS12W02H-Ku', 6, 54, 14202.5, 14256.5, 'C6'),
(315, 'CS12-R-CS12W02V-Ku-7', 'RC7', 44, 'CS12-R-CS12W02V-Ku', 7, 54, 14005, 14059, 'C7'),
(316, 'CS12-R-CS12W02V-Ku-8', 'RC8', 44, 'CS12-R-CS12W02V-Ku', 8, 54, 14067.5, 14121.5, 'C8'),
(317, 'CS12-R-CS12W02V-Ku-9', 'RC9', 44, 'CS12-R-CS12W02V-Ku', 9, 54, 14119.5, 14173.5, 'C9'),
(318, 'CS12-R-CS12W02V-Ku-10', 'RC10', 44, 'CS12-R-CS12W02V-Ku', 10, 54, 14161, 14215, 'C10'),
(319, 'CS12-R-CS12W02V-Ku-11', 'RC11', 44, 'CS12-R-CS12W02V-Ku', 11, 54, 14202.5, 14256.5, 'C11'),
(320, 'CS12-R-CS12W02H-Ku-12', 'RC12', 43, 'CS12-R-CS12W02H-Ku', 12, 54, 14254.5, 14308.5, 'C12'),
(321, 'CS12-R-CS12W02H-Ku-13', 'RC13', 43, 'CS12-R-CS12W02H-Ku', 13, 54, 14317, 14371, 'C13'),
(322, 'CS12-T-CS12W02V-Ku-1', 'TC1', 45, 'CS12-T-CS12W02V-Ku', 1, 54, 12245, 12299, 'C1'),
(323, 'CS12-T-CS12W02V-Ku-2', 'TC2', 45, 'CS12-T-CS12W02V-Ku', 2, 54, 12286.5, 12340.5, 'C2'),
(324, 'CS12-T-CS12W02V-Ku-3', 'TC3', 45, 'CS12-T-CS12W02V-Ku', 3, 54, 12328, 12382, 'C3'),
(325, 'CS12-T-CS12W02V-Ku-4', 'TC4', 45, 'CS12-T-CS12W02V-Ku', 4, 54, 12369.5, 12423.5, 'C4'),
(326, 'CS12-T-CS12W02V-Ku-5', 'TC5', 45, 'CS12-T-CS12W02V-Ku', 5, 54, 12411, 12465, 'C5'),
(327, 'CS12-T-CS12W02V-Ku-6', 'TC6', 45, 'CS12-T-CS12W02V-Ku', 6, 54, 12452.5, 12506.5, 'C6'),
(328, 'CS12-T-CS12W02H-Ku-7', 'TC7', 46, 'CS12-T-CS12W02H-Ku', 7, 54, 12255, 12309, 'C7'),
(329, 'CS12-T-CS12W02H-Ku-8', 'TC8', 46, 'CS12-T-CS12W02H-Ku', 8, 54, 12317.5, 12371.5, 'C8'),
(330, 'CS12-T-CS12W02H-Ku-9', 'TC9', 46, 'CS12-T-CS12W02H-Ku', 9, 54, 12369.5, 12423.5, 'C9'),
(331, 'CS12-T-CS12W02H-Ku-10', 'TC10', 46, 'CS12-T-CS12W02H-Ku', 10, 54, 12411, 12465, 'C10'),
(332, 'CS12-T-CS12W02H-Ku-11', 'TC11', 46, 'CS12-T-CS12W02H-Ku', 11, 54, 12452.5, 12506.5, 'C11'),
(333, 'CS12-T-CS12W02V-Ku-12', 'TC12', 45, 'CS12-T-CS12W02V-Ku', 12, 54, 12504.5, 12558.5, 'C12'),
(334, 'CS12-T-CS12W02V-Ku-13', 'TC13', 45, 'CS12-T-CS12W02V-Ku', 13, 54, 12567, 12621, 'C13'),
(335, 'CS12-R-CS12S02H-Ku-1', 'RM14', 47, 'CS12-R-CS12S02H-Ku', 1, 54, 14379.5, 14433.5, 'M14'),
(336, 'CS12-R-CS12S02H-Ku-2', 'RM15', 47, 'CS12-R-CS12S02H-Ku', 2, 54, 14442, 14496, 'M15'),
(337, 'CS12-R-CS12S02V-Ku-3', 'RM16', 48, 'CS12-R-CS12S02V-Ku', 3, 54, 14254.5, 14308.5, 'M16'),
(338, 'CS12-R-CS12S02V-Ku-4', 'RM17', 48, 'CS12-R-CS12S02V-Ku', 4, 54, 14317, 14371, 'M17'),
(339, 'CS12-R-CS12S02V-Ku-5', 'RM18', 48, 'CS12-R-CS12S02V-Ku', 5, 54, 14379.5, 14433.5, 'M18'),
(340, 'CS12-R-CS12S02V-Ku-6', 'RM19', 48, 'CS12-R-CS12S02V-Ku', 6, 54, 14442, 14496, 'M19'),
(341, 'CS12-T-CS12S02V-Ku-1', 'TM14', 49, 'CS12-T-CS12S02V-Ku', 1, 54, 12629.5, 12683.5, 'M14'),
(342, 'CS12-T-CS12S02V-Ku-2', 'TM15', 49, 'CS12-T-CS12S02V-Ku', 2, 54, 12692, 12746, 'M15'),
(343, 'CS12-T-CS12S02H-Ku-3', 'TM16', 50, 'CS12-T-CS12S02H-Ku', 3, 54, 12504.5, 12558.5, 'M16'),
(344, 'CS12-T-CS12S02H-Ku-4', 'TM17', 50, 'CS12-T-CS12S02H-Ku', 4, 54, 12567, 12621, 'M17'),
(345, 'CS12-T-CS12S02H-Ku-5', 'TM18', 50, 'CS12-T-CS12S02H-Ku', 5, 54, 12629.5, 12683.5, 'M18'),
(346, 'CS12-T-CS12S02H-Ku-6', 'TM19', 50, 'CS12-T-CS12S02H-Ku', 6, 54, 12692, 12746, 'M19');

-- 端口（94个）
INSERT INTO `matrix_port_info`
(id, portCode, matrixId, matrixCode, ioType, portSeq, channelCodeShort)
VALUES
(103, 'CS12-1-1-入-1', 10, 'CS12-1-1', 'I', 1, 'R3A'),
(104, 'CS12-1-1-入-2', 10, 'CS12-1-1', 'I', 2, 'R4A'),
(105, 'CS12-1-1-入-3', 10, 'CS12-1-1', 'I', 3, 'R5A'),
(106, 'CS12-1-1-入-4', 10, 'CS12-1-1', 'I', 4, 'R6A'),
(107, 'CS12-1-1-入-5', 10, 'CS12-1-1', 'I', 5, 'R7A'),
(108, 'CS12-1-1-入-6', 10, 'CS12-1-1', 'I', 6, 'R8A'),
(109, 'CS12-1-1-入-7', 10, 'CS12-1-1', 'I', 7, 'R9A'),
(110, 'CS12-1-1-入-8', 10, 'CS12-1-1', 'I', 8, 'R10A'),
(111, 'CS12-1-1-入-9', 10, 'CS12-1-1', 'I', 9, 'R11A'),
(112, 'CS12-1-1-入-10', 10, 'CS12-1-1', 'I', 10, 'R12A'),
(113, 'CS12-1-1-入-11', 10, 'CS12-1-1', 'I', 11, 'R13A'),
(114, 'CS12-1-1-入-12', 10, 'CS12-1-1', 'I', 12, 'R14A'),
(115, 'CS12-1-1-入-13', 10, 'CS12-1-1', 'I', 13, 'R3B'),
(116, 'CS12-1-1-入-14', 10, 'CS12-1-1', 'I', 14, 'R4B'),
(117, 'CS12-1-1-入-15', 10, 'CS12-1-1', 'I', 15, 'R5B'),
(118, 'CS12-1-1-入-16', 10, 'CS12-1-1', 'I', 16, 'R6B'),
(119, 'CS12-1-1-入-17', 10, 'CS12-1-1', 'I', 17, 'R7B'),
(120, 'CS12-1-1-入-18', 10, 'CS12-1-1', 'I', 18, 'R8B'),
(121, 'CS12-1-1-入-19', 10, 'CS12-1-1', 'I', 19, 'R9B'),
(122, 'CS12-1-1-入-20', 10, 'CS12-1-1', 'I', 20, 'R10B'),
(123, 'CS12-1-1-入-21', 10, 'CS12-1-1', 'I', 21, 'R11B'),
(124, 'CS12-1-1-入-22', 10, 'CS12-1-1', 'I', 22, 'R12B'),
(125, 'CS12-1-1-入-23', 10, 'CS12-1-1', 'I', 23, 'R13B'),
(126, 'CS12-1-1-入-24', 10, 'CS12-1-1', 'I', 24, 'R14B'),
(127, 'CS12-1-1-出-1', 10, 'CS12-1-1', 'O', 1, 'T3A'),
(128, 'CS12-1-1-出-2', 10, 'CS12-1-1', 'O', 2, 'T4A'),
(129, 'CS12-1-1-出-3', 10, 'CS12-1-1', 'O', 3, 'T5A'),
(130, 'CS12-1-1-出-4', 10, 'CS12-1-1', 'O', 4, 'T6A'),
(131, 'CS12-1-1-出-5', 10, 'CS12-1-1', 'O', 5, 'T7A'),
(132, 'CS12-1-1-出-6', 10, 'CS12-1-1', 'O', 6, 'T8A'),
(133, 'CS12-1-1-出-7', 10, 'CS12-1-1', 'O', 7, 'T9A'),
(134, 'CS12-1-1-出-8', 10, 'CS12-1-1', 'O', 8, 'T10A'),
(135, 'CS12-1-1-出-9', 10, 'CS12-1-1', 'O', 9, 'T11A'),
(136, 'CS12-1-1-出-10', 10, 'CS12-1-1', 'O', 10, 'T12A'),
(137, 'CS12-1-1-出-11', 10, 'CS12-1-1', 'O', 11, 'T13A'),
(138, 'CS12-1-1-出-12', 10, 'CS12-1-1', 'O', 12, 'T14A'),
(139, 'CS12-1-1-出-13', 10, 'CS12-1-1', 'O', 13, 'T3B'),
(140, 'CS12-1-1-出-14', 10, 'CS12-1-1', 'O', 14, 'T4B'),
(141, 'CS12-1-1-出-15', 10, 'CS12-1-1', 'O', 15, 'T5B'),
(142, 'CS12-1-1-出-16', 10, 'CS12-1-1', 'O', 16, 'T6B'),
(143, 'CS12-1-1-出-17', 10, 'CS12-1-1', 'O', 17, 'T7B'),
(144, 'CS12-1-1-出-18', 10, 'CS12-1-1', 'O', 18, 'T8B'),
(145, 'CS12-1-1-出-19', 10, 'CS12-1-1', 'O', 19, 'T9B'),
(146, 'CS12-1-1-出-20', 10, 'CS12-1-1', 'O', 20, 'T10B'),
(147, 'CS12-1-1-出-21', 10, 'CS12-1-1', 'O', 21, 'T11B'),
(148, 'CS12-1-1-出-22', 10, 'CS12-1-1', 'O', 22, 'T12B'),
(149, 'CS12-1-1-出-23', 10, 'CS12-1-1', 'O', 23, 'T13B'),
(150, 'CS12-1-1-出-24', 10, 'CS12-1-1', 'O', 24, 'T14B'),
(151, 'CS12-1-2-入-1', 11, 'CS12-1-2', 'I', 1, 'RS1'),
(152, 'CS12-1-2-入-2', 11, 'CS12-1-2', 'I', 2, 'RS2'),
(153, 'CS12-1-2-入-3', 11, 'CS12-1-2', 'I', 3, 'RS3'),
(154, 'CS12-1-2-入-4', 11, 'CS12-1-2', 'I', 4, 'RS4'),
(155, 'CS12-1-2-出-1', 11, 'CS12-1-2', 'O', 1, 'TS1'),
(156, 'CS12-1-2-出-2', 11, 'CS12-1-2', 'O', 2, 'TS2'),
(157, 'CS12-1-2-出-3', 11, 'CS12-1-2', 'O', 3, 'TS3'),
(158, 'CS12-1-2-出-4', 11, 'CS12-1-2', 'O', 4, 'TS4'),
(159, 'CS12-1-3-入-1', 12, 'CS12-1-3', 'I', 1, 'RC1'),
(160, 'CS12-1-3-入-2', 12, 'CS12-1-3', 'I', 2, 'RC2'),
(161, 'CS12-1-3-入-3', 12, 'CS12-1-3', 'I', 3, 'RC3'),
(162, 'CS12-1-3-入-4', 12, 'CS12-1-3', 'I', 4, 'RC4'),
(163, 'CS12-1-3-入-5', 12, 'CS12-1-3', 'I', 5, 'RC5'),
(164, 'CS12-1-3-入-6', 12, 'CS12-1-3', 'I', 6, 'RC6'),
(165, 'CS12-1-3-入-7', 12, 'CS12-1-3', 'I', 7, 'RC7'),
(166, 'CS12-1-3-入-8', 12, 'CS12-1-3', 'I', 8, 'RC8'),
(167, 'CS12-1-3-入-9', 12, 'CS12-1-3', 'I', 9, 'RC9'),
(168, 'CS12-1-3-入-10', 12, 'CS12-1-3', 'I', 10, 'RC10'),
(169, 'CS12-1-3-入-11', 12, 'CS12-1-3', 'I', 11, 'RC11'),
(170, 'CS12-1-3-入-12', 12, 'CS12-1-3', 'I', 12, 'RC12'),
(171, 'CS12-1-3-入-13', 12, 'CS12-1-3', 'I', 13, 'RC13'),
(172, 'CS12-1-3-出-1', 12, 'CS12-1-3', 'O', 1, 'TC1'),
(173, 'CS12-1-3-出-2', 12, 'CS12-1-3', 'O', 2, 'TC2'),
(174, 'CS12-1-3-出-3', 12, 'CS12-1-3', 'O', 3, 'TC3'),
(175, 'CS12-1-3-出-4', 12, 'CS12-1-3', 'O', 4, 'TC4'),
(176, 'CS12-1-3-出-5', 12, 'CS12-1-3', 'O', 5, 'TC5'),
(177, 'CS12-1-3-出-6', 12, 'CS12-1-3', 'O', 6, 'TC6'),
(178, 'CS12-1-3-出-7', 12, 'CS12-1-3', 'O', 7, 'TC7'),
(179, 'CS12-1-3-出-8', 12, 'CS12-1-3', 'O', 8, 'TC8'),
(180, 'CS12-1-3-出-9', 12, 'CS12-1-3', 'O', 9, 'TC9'),
(181, 'CS12-1-3-出-10', 12, 'CS12-1-3', 'O', 10, 'TC10'),
(182, 'CS12-1-3-出-11', 12, 'CS12-1-3', 'O', 11, 'TC11'),
(183, 'CS12-1-3-出-12', 12, 'CS12-1-3', 'O', 12, 'TC12'),
(184, 'CS12-1-3-出-13', 12, 'CS12-1-3', 'O', 13, 'TC13'),
(185, 'CS12-1-4-入-1', 13, 'CS12-1-4', 'I', 1, 'RM14'),
(186, 'CS12-1-4-入-2', 13, 'CS12-1-4', 'I', 2, 'RM15'),
(187, 'CS12-1-4-入-3', 13, 'CS12-1-4', 'I', 3, 'RM16'),
(188, 'CS12-1-4-入-4', 13, 'CS12-1-4', 'I', 4, 'RM17'),
(189, 'CS12-1-4-入-5', 13, 'CS12-1-4', 'I', 5, 'RM18'),
(190, 'CS12-1-4-入-6', 13, 'CS12-1-4', 'I', 6, 'RM19'),
(191, 'CS12-1-4-出-1', 13, 'CS12-1-4', 'O', 1, 'TM14'),
(192, 'CS12-1-4-出-2', 13, 'CS12-1-4', 'O', 2, 'TM15'),
(193, 'CS12-1-4-出-3', 13, 'CS12-1-4', 'O', 3, 'TM16'),
(194, 'CS12-1-4-出-4', 13, 'CS12-1-4', 'O', 4, 'TM17'),
(195, 'CS12-1-4-出-5', 13, 'CS12-1-4', 'O', 5, 'TM18'),
(196, 'CS12-1-4-出-6', 13, 'CS12-1-4', 'O', 6, 'TM19');

-- 开关（47个）
INSERT INTO `matrix_switch_status`
(id, switchCode, matrixId, matrixCode, inputPortId, inputPortSeq, outputPortId, outputPortSeq,
 inputChannelCodeShort, outputChannelCodeShort, switchStatus, switchType,
 p0TwtId, p0TwtCode, p1TwtId, p1TwtCode, p2TwtId, p2TwtCode, twtValidStatusId, twtValidStatusCode)
VALUES
(52, 'CS12-1-1-[1][1]', 10, 'CS12-1-1', 103, 1, 127, 1, 'R3A', 'T3A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(53, 'CS12-1-1-[2][2]', 10, 'CS12-1-1', 104, 2, 128, 2, 'R4A', 'T4A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(54, 'CS12-1-1-[3][3]', 10, 'CS12-1-1', 105, 3, 129, 3, 'R5A', 'T5A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(55, 'CS12-1-1-[4][4]', 10, 'CS12-1-1', 106, 4, 130, 4, 'R6A', 'T6A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(56, 'CS12-1-1-[5][5]', 10, 'CS12-1-1', 107, 5, 131, 5, 'R7A', 'T7A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(57, 'CS12-1-1-[6][6]', 10, 'CS12-1-1', 108, 6, 132, 6, 'R8A', 'T8A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(58, 'CS12-1-1-[7][7]', 10, 'CS12-1-1', 109, 7, 133, 7, 'R9A', 'T9A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(59, 'CS12-1-1-[8][8]', 10, 'CS12-1-1', 110, 8, 134, 8, 'R10A', 'T10A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(60, 'CS12-1-1-[9][9]', 10, 'CS12-1-1', 111, 9, 135, 9, 'R11A', 'T11A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(61, 'CS12-1-1-[10][10]', 10, 'CS12-1-1', 112, 10, 136, 10, 'R12A', 'T12A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(62, 'CS12-1-1-[11][11]', 10, 'CS12-1-1', 113, 11, 137, 11, 'R13A', 'T13A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(63, 'CS12-1-1-[12][12]', 10, 'CS12-1-1', 114, 12, 138, 12, 'R14A', 'T14A', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(64, 'CS12-1-1-[13][13]', 10, 'CS12-1-1', 115, 13, 139, 13, 'R3B', 'T3B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(65, 'CS12-1-1-[14][14]', 10, 'CS12-1-1', 116, 14, 140, 14, 'R4B', 'T4B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(66, 'CS12-1-1-[15][15]', 10, 'CS12-1-1', 117, 15, 141, 15, 'R5B', 'T5B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(67, 'CS12-1-1-[16][16]', 10, 'CS12-1-1', 118, 16, 142, 16, 'R6B', 'T6B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(68, 'CS12-1-1-[17][17]', 10, 'CS12-1-1', 119, 17, 143, 17, 'R7B', 'T7B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(69, 'CS12-1-1-[18][18]', 10, 'CS12-1-1', 120, 18, 144, 18, 'R8B', 'T8B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(70, 'CS12-1-1-[19][19]', 10, 'CS12-1-1', 121, 19, 145, 19, 'R9B', 'T9B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(71, 'CS12-1-1-[20][20]', 10, 'CS12-1-1', 122, 20, 146, 20, 'R10B', 'T10B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(72, 'CS12-1-1-[21][21]', 10, 'CS12-1-1', 123, 21, 147, 21, 'R11B', 'T11B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(73, 'CS12-1-1-[22][22]', 10, 'CS12-1-1', 124, 22, 148, 22, 'R12B', 'T12B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(74, 'CS12-1-1-[23][23]', 10, 'CS12-1-1', 125, 23, 149, 23, 'R13B', 'T13B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(75, 'CS12-1-1-[24][24]', 10, 'CS12-1-1', 126, 24, 150, 24, 'R14B', 'T14B', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(76, 'CS12-1-2-[1][1]', 11, 'CS12-1-2', 151, 1, 155, 1, 'RS1', 'TS1', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(77, 'CS12-1-2-[2][2]', 11, 'CS12-1-2', 152, 2, 156, 2, 'RS2', 'TS2', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(78, 'CS12-1-2-[3][3]', 11, 'CS12-1-2', 153, 3, 157, 3, 'RS3', 'TS3', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(79, 'CS12-1-2-[4][4]', 11, 'CS12-1-2', 154, 4, 158, 4, 'RS4', 'TS4', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(80, 'CS12-1-3-[1][1]', 12, 'CS12-1-3', 159, 1, 172, 1, 'RC1', 'TC1', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(81, 'CS12-1-3-[2][2]', 12, 'CS12-1-3', 160, 2, 173, 2, 'RC2', 'TC2', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(82, 'CS12-1-3-[3][3]', 12, 'CS12-1-3', 161, 3, 174, 3, 'RC3', 'TC3', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(83, 'CS12-1-3-[4][4]', 12, 'CS12-1-3', 162, 4, 175, 4, 'RC4', 'TC4', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(84, 'CS12-1-3-[5][5]', 12, 'CS12-1-3', 163, 5, 176, 5, 'RC5', 'TC5', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(85, 'CS12-1-3-[6][6]', 12, 'CS12-1-3', 164, 6, 177, 6, 'RC6', 'TC6', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(86, 'CS12-1-3-[7][7]', 12, 'CS12-1-3', 165, 7, 178, 7, 'RC7', 'TC7', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(87, 'CS12-1-3-[8][8]', 12, 'CS12-1-3', 166, 8, 179, 8, 'RC8', 'TC8', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(88, 'CS12-1-3-[9][9]', 12, 'CS12-1-3', 167, 9, 180, 9, 'RC9', 'TC9', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(89, 'CS12-1-3-[10][10]', 12, 'CS12-1-3', 168, 10, 181, 10, 'RC10', 'TC10', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(90, 'CS12-1-3-[11][11]', 12, 'CS12-1-3', 169, 11, 182, 11, 'RC11', 'TC11', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(91, 'CS12-1-3-[12][12]', 12, 'CS12-1-3', 170, 12, 183, 12, 'RC12', 'TC12', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(92, 'CS12-1-3-[13][13]', 12, 'CS12-1-3', 171, 13, 184, 13, 'RC13', 'TC13', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(93, 'CS12-1-4-[1][1]', 13, 'CS12-1-4', 185, 1, 191, 1, 'RM14', 'TM14', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(94, 'CS12-1-4-[2][2]', 13, 'CS12-1-4', 186, 2, 192, 2, 'RM15', 'TM15', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(95, 'CS12-1-4-[3][3]', 13, 'CS12-1-4', 187, 3, 193, 3, 'RM16', 'TM16', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(96, 'CS12-1-4-[4][4]', 13, 'CS12-1-4', 188, 4, 194, 4, 'RM17', 'TM17', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(97, 'CS12-1-4-[5][5]', 13, 'CS12-1-4', 189, 5, 195, 5, 'RM18', 'TM18', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
(98, 'CS12-1-4-[6][6]', 13, 'CS12-1-4', 190, 6, 196, 6, 'RM19', 'TM19', 1, '常通', NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- 占用记录（108条，含真实客户信息）
-- 前端计算：输入起 = channel_info.channelStartFreq + frequencyOffset
--           输入止 = channel_info.channelStartFreq + frequencyOffset + occupiedBandwidth
INSERT INTO `occupation_realtime_status`
(id, frequencyBlockCode, productInstanceId, productInstanceCode, switchId, switchCode, occupiedBandwidth, frequencyOffset, occupationStatus, occupationStartTimeMs, occupationEndTimeMs)
VALUES
(8, 'CS12-1-1-[1][1]-OFF0.0-BW20.0', NULL, NULL, 52, 'CS12-1-1-[1][1]', 20.0, 0.0, '占用', NULL, NULL),
(9, 'CS12-1-1-[1][1]-OFF20.0-BW7.0', NULL, NULL, 52, 'CS12-1-1-[1][1]', 7.0, 20.0, '空闲', NULL, NULL),
(10, 'CS12-1-1-[1][1]-OFF27.0-BW3.6', NULL, NULL, 52, 'CS12-1-1-[1][1]', 3.6, 27.0, '占用', NULL, NULL),
(11, 'CS12-1-1-[1][1]-OFF30.6-BW2.64', NULL, NULL, 52, 'CS12-1-1-[1][1]', 2.64, 30.6, '占用', NULL, NULL),
(12, 'CS12-1-1-[1][1]-OFF33.24-BW0.6', NULL, NULL, 52, 'CS12-1-1-[1][1]', 0.6, 33.24, '空闲', NULL, NULL),
(13, 'CS12-1-1-[1][1]-OFF33.84-BW2.0', NULL, NULL, 52, 'CS12-1-1-[1][1]', 2.0, 33.84, '占用', NULL, NULL),
(14, 'CS12-1-1-[1][1]-OFF35.84-BW0.16', NULL, NULL, 52, 'CS12-1-1-[1][1]', 0.16, 35.84, '空闲', NULL, NULL),
(15, 'CS12-1-1-[2][2]-OFF-0.5-BW9.0', NULL, NULL, 53, 'CS12-1-1-[2][2]', 9.0, -0.5, '占用', NULL, NULL),
(16, 'CS12-1-1-[2][2]-OFF8.5-BW16.0', NULL, NULL, 53, 'CS12-1-1-[2][2]', 16.0, 8.5, '占用', NULL, NULL),
(17, 'CS12-1-1-[2][2]-OFF24.5-BW10.0', NULL, NULL, 53, 'CS12-1-1-[2][2]', 10.0, 24.5, '占用', NULL, NULL),
(18, 'CS12-1-1-[2][2]-OFF34.5-BW1.5', NULL, NULL, 53, 'CS12-1-1-[2][2]', 1.5, 34.5, '空闲', NULL, NULL),
(19, 'CS12-1-1-[2][2]-OFF36.0-BW0.6', NULL, NULL, 53, 'CS12-1-1-[2][2]', 0.6, 36.0, '占用', NULL, NULL),
(20, 'CS12-1-1-[3][3]-OFF0.0-BW36.0', NULL, NULL, 54, 'CS12-1-1-[3][3]', 36.0, 0.0, '占用', NULL, NULL),
(21, 'CS12-1-1-[4][4]-OFF0.0-BW36.0', NULL, NULL, 55, 'CS12-1-1-[4][4]', 36.0, 0.0, '占用', NULL, NULL),
(22, 'CS12-1-1-[5][5]-OFF0.0-BW36.0', NULL, NULL, 56, 'CS12-1-1-[5][5]', 36.0, 0.0, '占用', NULL, NULL),
(23, 'CS12-1-1-[6][6]-OFF0.0-BW20.0', NULL, NULL, 57, 'CS12-1-1-[6][6]', 20.0, 0.0, '占用', NULL, NULL),
(24, 'CS12-1-1-[6][6]-OFF20.0-BW16.0', NULL, NULL, 57, 'CS12-1-1-[6][6]', 16.0, 20.0, '空闲', NULL, NULL),
(25, 'CS12-1-1-[7][7]-OFF0.0-BW36.0', NULL, NULL, 58, 'CS12-1-1-[7][7]', 36.0, 0.0, '占用', NULL, NULL),
(26, 'CS12-1-1-[8][8]-OFF0.0-BW36.0', NULL, NULL, 59, 'CS12-1-1-[8][8]', 36.0, 0.0, '占用', NULL, NULL),
(27, 'CS12-1-1-[9][9]-OFF0.0-BW3.5', NULL, NULL, 60, 'CS12-1-1-[9][9]', 3.5, 0.0, '占用', NULL, NULL),
(28, 'CS12-1-1-[9][9]-OFF3.5-BW1.08', NULL, NULL, 60, 'CS12-1-1-[9][9]', 1.08, 3.5, '空闲', NULL, NULL),
(29, 'CS12-1-1-[9][9]-OFF4.58-BW7.8', NULL, NULL, 60, 'CS12-1-1-[9][9]', 7.8, 4.58, '占用', NULL, NULL),
(30, 'CS12-1-1-[9][9]-OFF12.38-BW0.12', NULL, NULL, 60, 'CS12-1-1-[9][9]', 0.12, 12.38, '占用', NULL, NULL),
(31, 'CS12-1-1-[9][9]-OFF12.5-BW1.5', NULL, NULL, 60, 'CS12-1-1-[9][9]', 1.5, 12.5, '占用', NULL, NULL),
(32, 'CS12-1-1-[9][9]-OFF14.0-BW3.0', NULL, NULL, 60, 'CS12-1-1-[9][9]', 3.0, 14.0, '占用', NULL, NULL),
(33, 'CS12-1-1-[9][9]-OFF17.0-BW7.2', NULL, NULL, 60, 'CS12-1-1-[9][9]', 7.2, 17.0, '占用', NULL, NULL),
(34, 'CS12-1-1-[9][9]-OFF24.2-BW9.0', NULL, NULL, 60, 'CS12-1-1-[9][9]', 9.0, 24.2, '占用', NULL, NULL),
(35, 'CS12-1-1-[9][9]-OFF33.2-BW3.81', NULL, NULL, 60, 'CS12-1-1-[9][9]', 3.81, 33.2, '占用', NULL, NULL),
(36, 'CS12-1-1-[10][10]-OFF0.0-BW1.22', NULL, NULL, 61, 'CS12-1-1-[10][10]', 1.22, 0.0, '占用', NULL, NULL),
(37, 'CS12-1-1-[10][10]-OFF1.22-BW1.78', NULL, NULL, 61, 'CS12-1-1-[10][10]', 1.78, 1.22, '空闲', NULL, NULL),
(38, 'CS12-1-1-[10][10]-OFF3.0-BW13.0', NULL, NULL, 61, 'CS12-1-1-[10][10]', 13.0, 3.0, '占用', NULL, NULL),
(39, 'CS12-1-1-[10][10]-OFF16.0-BW0.44', NULL, NULL, 61, 'CS12-1-1-[10][10]', 0.44, 16.0, '空闲', NULL, NULL),
(40, 'CS12-1-1-[10][10]-OFF16.44-BW0.5', NULL, NULL, 61, 'CS12-1-1-[10][10]', 0.5, 16.44, '占用', NULL, NULL),
(41, 'CS12-1-1-[10][10]-OFF16.94-BW7.0', NULL, NULL, 61, 'CS12-1-1-[10][10]', 7.0, 16.94, '占用', NULL, NULL),
(42, 'CS12-1-1-[10][10]-OFF23.94-BW11.84', NULL, NULL, 61, 'CS12-1-1-[10][10]', 11.84, 23.94, '占用', NULL, NULL),
(43, 'CS12-1-1-[10][10]-OFF35.78-BW0.22', NULL, NULL, 61, 'CS12-1-1-[10][10]', 0.22, 35.78, '空闲', NULL, NULL),
(44, 'CS12-1-1-[11][11]-OFF0.0-BW36.0', NULL, NULL, 62, 'CS12-1-1-[11][11]', 36.0, 0.0, '占用', NULL, NULL),
(45, 'CS12-1-1-[12][12]-OFF0.0-BW36.0', NULL, NULL, 63, 'CS12-1-1-[12][12]', 36.0, 0.0, '占用', NULL, NULL),
(46, 'CS12-1-1-[13][13]-OFF-2.0-BW9.0', NULL, NULL, 64, 'CS12-1-1-[13][13]', 9.0, -2.0, '占用', NULL, NULL),
(47, 'CS12-1-1-[13][13]-OFF7.0-BW20.0', NULL, NULL, 64, 'CS12-1-1-[13][13]', 20.0, 7.0, '占用', NULL, NULL),
(48, 'CS12-1-1-[13][13]-OFF27.0-BW11.0', NULL, NULL, 64, 'CS12-1-1-[13][13]', 11.0, 27.0, '占用', NULL, NULL),
(49, 'CS12-1-1-[14][14]-OFF0.0-BW36.0', NULL, NULL, 65, 'CS12-1-1-[14][14]', 36.0, 0.0, '占用', NULL, NULL),
(50, 'CS12-1-1-[15][15]-OFF-2.0-BW40.0', NULL, NULL, 66, 'CS12-1-1-[15][15]', 40.0, -2.0, '占用', NULL, NULL),
(51, 'CS12-1-1-[16][16]-OFF0.0-BW36.0', NULL, NULL, 67, 'CS12-1-1-[16][16]', 36.0, 0.0, '占用', NULL, NULL),
(52, 'CS12-1-1-[17][17]-OFF0.0-BW36.0', NULL, NULL, 68, 'CS12-1-1-[17][17]', 36.0, 0.0, '占用', NULL, NULL),
(53, 'CS12-1-1-[18][18]-OFF0.0-BW36.0', NULL, NULL, 69, 'CS12-1-1-[18][18]', 36.0, 0.0, '占用', NULL, NULL),
(54, 'CS12-1-1-[19][19]-OFF-2.0-BW20.0', NULL, NULL, 70, 'CS12-1-1-[19][19]', 20.0, -2.0, '占用', NULL, NULL),
(55, 'CS12-1-1-[19][19]-OFF18.0-BW20.0', NULL, NULL, 70, 'CS12-1-1-[19][19]', 20.0, 18.0, '占用', NULL, NULL),
(56, 'CS12-1-1-[20][20]-OFF-2.0-BW15.5', NULL, NULL, 71, 'CS12-1-1-[20][20]', 15.5, -2.0, '占用', NULL, NULL),
(57, 'CS12-1-1-[20][20]-OFF13.5-BW9.0', NULL, NULL, 71, 'CS12-1-1-[20][20]', 9.0, 13.5, '占用', NULL, NULL),
(58, 'CS12-1-1-[20][20]-OFF22.5-BW15.5', NULL, NULL, 71, 'CS12-1-1-[20][20]', 15.5, 22.5, '占用', NULL, NULL),
(59, 'CS12-1-1-[21][21]-OFF0.0-BW36.0', NULL, NULL, 72, 'CS12-1-1-[21][21]', 36.0, 0.0, '占用', NULL, NULL),
(60, 'CS12-1-1-[22][22]-OFF0.0-BW36.0', NULL, NULL, 73, 'CS12-1-1-[22][22]', 36.0, 0.0, '占用', NULL, NULL),
(61, 'CS12-1-1-[23][23]-OFF0.0-BW36.0', NULL, NULL, 74, 'CS12-1-1-[23][23]', 36.0, 0.0, '空闲', NULL, NULL),
(62, 'CS12-1-1-[24][24]-OFF0.0-BW10.5', NULL, NULL, 75, 'CS12-1-1-[24][24]', 10.5, 0.0, '占用', NULL, NULL),
(63, 'CS12-1-1-[24][24]-OFF10.5-BW2.8', NULL, NULL, 75, 'CS12-1-1-[24][24]', 2.8, 10.5, '占用', NULL, NULL),
(64, 'CS12-1-1-[24][24]-OFF13.3-BW3.0', NULL, NULL, 75, 'CS12-1-1-[24][24]', 3.0, 13.3, '占用', NULL, NULL),
(65, 'CS12-1-1-[24][24]-OFF16.3-BW5.3', NULL, NULL, 75, 'CS12-1-1-[24][24]', 5.3, 16.3, '占用', NULL, NULL),
(66, 'CS12-1-1-[24][24]-OFF21.6-BW8.8', NULL, NULL, 75, 'CS12-1-1-[24][24]', 8.8, 21.6, '占用', NULL, NULL),
(67, 'CS12-1-1-[24][24]-OFF30.4-BW2.2', NULL, NULL, 75, 'CS12-1-1-[24][24]', 2.2, 30.4, '空闲', NULL, NULL),
(68, 'CS12-1-1-[24][24]-OFF32.6-BW3.4', NULL, NULL, 75, 'CS12-1-1-[24][24]', 3.4, 32.6, '占用', NULL, NULL),
(69, 'CS12-1-3-[7][7]-OFF0.0-BW54.0', NULL, NULL, 86, 'CS12-1-3-[7][7]', 54.0, 0.0, '占用', NULL, NULL),
(70, 'CS12-1-3-[8][8]-OFF0.0-BW4.5', NULL, NULL, 87, 'CS12-1-3-[8][8]', 4.5, 0.0, '空闲', NULL, NULL),
(71, 'CS12-1-3-[8][8]-OFF4.5-BW8.0', NULL, NULL, 87, 'CS12-1-3-[8][8]', 8.0, 4.5, '占用', NULL, NULL),
(72, 'CS12-1-3-[8][8]-OFF12.5-BW3.0', NULL, NULL, 87, 'CS12-1-3-[8][8]', 3.0, 12.5, '占用', NULL, NULL),
(73, 'CS12-1-3-[8][8]-OFF15.5-BW4.0', NULL, NULL, 87, 'CS12-1-3-[8][8]', 4.0, 15.5, '占用', NULL, NULL),
(74, 'CS12-1-3-[8][8]-OFF19.5-BW34.5', NULL, NULL, 87, 'CS12-1-3-[8][8]', 34.5, 19.5, '空闲', NULL, NULL),
(75, 'CS12-1-3-[10][10]-OFF9.0-BW36.0', NULL, NULL, 89, 'CS12-1-3-[10][10]', 36.0, 9.0, '占用', NULL, NULL),
(76, 'CS12-1-3-[11][11]-OFF8.75-BW0.25', NULL, NULL, 90, 'CS12-1-3-[11][11]', 0.25, 8.75, '占用', NULL, NULL),
(77, 'CS12-1-3-[11][11]-OFF9.0-BW36.0', NULL, NULL, 90, 'CS12-1-3-[11][11]', 36.0, 9.0, '占用', NULL, NULL),
(78, 'CS12-1-4-[3][3]-OFF0.0-BW54.0', NULL, NULL, 95, 'CS12-1-4-[3][3]', 54.0, 0.0, '占用', NULL, NULL),
(79, 'CS12-1-4-[4][4]-OFF0.0-BW48.0', NULL, NULL, 96, 'CS12-1-4-[4][4]', 48.0, 0.0, '占用', NULL, NULL),
(80, 'CS12-1-4-[4][4]-OFF48.0-BW8.0', NULL, NULL, 96, 'CS12-1-4-[4][4]', 8.0, 48.0, '占用', NULL, NULL),
(81, 'CS12-1-4-[5][5]-OFF0.0-BW0.5', NULL, NULL, 97, 'CS12-1-4-[5][5]', 0.5, 0.0, '空闲', NULL, NULL),
(82, 'CS12-1-4-[5][5]-OFF0.5-BW14.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 14.0, 0.5, '占用', NULL, NULL),
(83, 'CS12-1-4-[5][5]-OFF14.5-BW3.5', NULL, NULL, 97, 'CS12-1-4-[5][5]', 3.5, 14.5, '空闲', NULL, NULL),
(84, 'CS12-1-4-[5][5]-OFF18.0-BW4.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 4.0, 18.0, '占用', NULL, NULL),
(85, 'CS12-1-4-[5][5]-OFF22.0-BW3.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 3.0, 22.0, '占用', NULL, NULL),
(86, 'CS12-1-4-[5][5]-OFF25.0-BW1.5', NULL, NULL, 97, 'CS12-1-4-[5][5]', 1.5, 25.0, '空闲', NULL, NULL),
(87, 'CS12-1-4-[5][5]-OFF26.5-BW1.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 1.0, 26.5, '空闲', NULL, NULL),
(88, 'CS12-1-4-[5][5]-OFF27.5-BW3.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 3.0, 27.5, '占用', NULL, NULL),
(89, 'CS12-1-4-[5][5]-OFF30.5-BW12.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 12.0, 30.5, '占用', NULL, NULL),
(90, 'CS12-1-4-[5][5]-OFF42.5-BW14.0', NULL, NULL, 97, 'CS12-1-4-[5][5]', 14.0, 42.5, '占用', NULL, NULL),
(91, 'CS12-1-4-[6][6]-OFF0.0-BW27.0', NULL, NULL, 98, 'CS12-1-4-[6][6]', 27.0, 0.0, '占用', NULL, NULL),
(92, 'CS12-1-4-[6][6]-OFF27.0-BW12.0', NULL, NULL, 98, 'CS12-1-4-[6][6]', 12.0, 27.0, '占用', NULL, NULL),
(93, 'CS12-1-4-[6][6]-OFF40.0-BW14.0', NULL, NULL, 98, 'CS12-1-4-[6][6]', 14.0, 40.0, '占用', NULL, NULL),
(94, 'CS12-1-3-[1][1]-OFF9.0-BW36.0', NULL, NULL, 80, 'CS12-1-3-[1][1]', 36.0, 9.0, '占用', NULL, NULL),
(95, 'CS12-1-3-[2][2]-OFF9.0-BW36.0', NULL, NULL, 81, 'CS12-1-3-[2][2]', 36.0, 9.0, '占用', NULL, NULL),
(96, 'CS12-1-3-[3][3]-OFF9.0-BW36.0', NULL, NULL, 82, 'CS12-1-3-[3][3]', 36.0, 9.0, '占用', NULL, NULL),
(97, 'CS12-1-3-[4][4]-OFF9.0-BW36.0', NULL, NULL, 83, 'CS12-1-3-[4][4]', 36.0, 9.0, '占用', NULL, NULL),
(98, 'CS12-1-3-[5][5]-OFF9.0-BW36.0', NULL, NULL, 84, 'CS12-1-3-[5][5]', 36.0, 9.0, '占用', NULL, NULL),
(99, 'CS12-1-3-[6][6]-OFF9.0-BW36.0', NULL, NULL, 85, 'CS12-1-3-[6][6]', 36.0, 9.0, '占用', NULL, NULL),
(100, 'CS12-1-3-[12][12]-OFF0.0-BW0.5', NULL, NULL, 91, 'CS12-1-3-[12][12]', 0.5, 0.0, '空闲', NULL, NULL),
(101, 'CS12-1-3-[12][12]-OFF0.5-BW5.0', NULL, NULL, 91, 'CS12-1-3-[12][12]', 5.0, 0.5, '占用', NULL, NULL),
(102, 'CS12-1-3-[12][12]-OFF5.5-BW22.0', NULL, NULL, 91, 'CS12-1-3-[12][12]', 22.0, 5.5, '占用', NULL, NULL),
(103, 'CS12-1-3-[12][12]-OFF27.5-BW15.0', NULL, NULL, 91, 'CS12-1-3-[12][12]', 15.0, 27.5, '占用', NULL, NULL),
(104, 'CS12-1-3-[12][12]-OFF42.5-BW10.0', NULL, NULL, 91, 'CS12-1-3-[12][12]', 10.0, 42.5, '占用', NULL, NULL),
(105, 'CS12-1-3-[12][12]-OFF52.5-BW0.5', NULL, NULL, 91, 'CS12-1-3-[12][12]', 0.5, 52.5, '空闲', NULL, NULL),
(106, 'CS12-1-3-[12][12]-OFF53.0-BW1.0', NULL, NULL, 91, 'CS12-1-3-[12][12]', 1.0, 53.0, '占用', NULL, NULL),
(107, 'CS12-1-3-[13][13]-OFF0.0-BW54.0', NULL, NULL, 92, 'CS12-1-3-[13][13]', 54.0, 0.0, '占用', NULL, NULL),
(108, 'CS12-1-4-[1][1]-OFF0.0-BW2.0', NULL, NULL, 93, 'CS12-1-4-[1][1]', 2.0, 0.0, '占用', NULL, NULL),
(109, 'CS12-1-4-[1][1]-OFF2.0-BW54.0', NULL, NULL, 93, 'CS12-1-4-[1][1]', 54.0, 2.0, '占用', NULL, NULL),
(110, 'CS12-1-4-[2][2]-OFF-3.0-BW3.0', NULL, NULL, 94, 'CS12-1-4-[2][2]', 3.0, -3.0, '占用', NULL, NULL),
(111, 'CS12-1-4-[2][2]-OFF0.0-BW54.0', NULL, NULL, 94, 'CS12-1-4-[2][2]', 54.0, 0.0, '占用', NULL, NULL),
(112, 'CS12-1-2-[1][1]-OFF0.0-BW54.0', NULL, NULL, 76, 'CS12-1-2-[1][1]', 54.0, 0.0, '占用', NULL, NULL),
(113, 'CS12-1-2-[2][2]-OFF0.0-BW54.0', NULL, NULL, 77, 'CS12-1-2-[2][2]', 54.0, 0.0, '占用', NULL, NULL),
(114, 'CS12-1-2-[3][3]-OFF0.0-BW54.0', NULL, NULL, 78, 'CS12-1-2-[3][3]', 54.0, 0.0, '占用', NULL, NULL),
(115, 'CS12-1-2-[4][4]-OFF0.0-BW54.0', NULL, NULL, 79, 'CS12-1-2-[4][4]', 54.0, 0.0, '占用', NULL, NULL);



-- ============================================================
-- CS10R 占用记录（来源：网络矩阵数据库实例.xlsx 占用状态表）
-- 共 80 条，覆盖全部 51 个开关
-- 偏移量 = 占用起始频率 - 对应通道起始频率
-- ============================================================
INSERT INTO `occupation_realtime_status`
(id, frequencyBlockCode, productInstanceId, productInstanceCode, switchId, switchCode,
 occupiedBandwidth, frequencyOffset, occupationStatus, occupationStartTimeMs, occupationEndTimeMs)
VALUES
(116, 'CS10R-1-1-[1][1]-OFF-1.0-BW32.0', NULL, NULL, 1, 'CS10R-1-1-[1][1]', 32.0, -1.0, '占用', NULL, NULL), -- 北京宏亮
(117, 'CS10R-1-1-[2][2]-OFF-2.5-BW2.5', NULL, NULL, 2, 'CS10R-1-1-[2][2]', 2.5, -2.5, '占用', NULL, NULL), -- 鑫诺香港 保护带
(118, 'CS10R-1-1-[3][3]-OFF0.0-BW54.0', NULL, NULL, 3, 'CS10R-1-1-[3][3]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(119, 'CS10R-1-1-[4][4]-OFF0.0-BW54.0', NULL, NULL, 4, 'CS10R-1-1-[4][4]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(120, 'CS10R-1-1-[5][5]-OFF0.0-BW54.0', NULL, NULL, 5, 'CS10R-1-1-[5][5]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(121, 'CS10R-1-1-[6][6]-OFF0.0-BW10.0', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 10.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(122, 'CS10R-1-1-[6][6]-OFF10.0-BW5.0', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 5.0, 10.0, '占用', NULL, NULL), -- 张京平预留
(123, 'CS10R-1-1-[6][6]-OFF15.0-BW1.0', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 1.0, 15.0, '占用', NULL, NULL), -- 西藏联通
(124, 'CS10R-1-1-[6][6]-OFF16.0-BW4.0', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 4.0, 16.0, '占用', NULL, NULL), -- 广东电力通科-基地项目（保留）
(125, 'CS10R-1-1-[6][6]-OFF35.0-BW1.2', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 1.2, 35.0, '占用', NULL, NULL), -- 澜沧江水电
(126, 'CS10R-1-1-[6][6]-OFF36.2-BW0.8', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 0.8, 36.2, '空闲', NULL, NULL),
(127, 'CS10R-1-1-[6][6]-OFF39.0-BW0.5', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 0.5, 39.0, '占用', NULL, NULL), -- 尼泊尔电信
(128, 'CS10R-1-1-[6][6]-OFF39.5-BW1.5', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 1.5, 39.5, '空闲', NULL, NULL),
(129, 'CS10R-1-1-[6][6]-OFF41.0-BW6.0', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 6.0, 41.0, '占用', NULL, NULL), -- 航天恒星503所-集团示范网915工程
(130, 'CS10R-1-1-[6][6]-OFF47.0-BW1.5', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 1.5, 47.0, '占用', NULL, NULL), -- 航天恒星-内蒙森工
(131, 'CS10R-1-1-[6][6]-OFF50.0-BW6.0', NULL, NULL, 6, 'CS10R-1-1-[6][6]', 6.0, 50.0, '占用', NULL, NULL), -- 航天恒星503-预留 有四川安迪反极化杂散
(132, 'CS10R-1-1-[7][7]-OFF0.0-BW54.0', NULL, NULL, 7, 'CS10R-1-1-[7][7]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(133, 'CS10R-1-1-[8][8]-OFF0.0-BW54.0', NULL, NULL, 8, 'CS10R-1-1-[8][8]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(134, 'CS10R-1-1-[9][9]-OFF12.0-BW23.0', NULL, NULL, 9, 'CS10R-1-1-[9][9]', 23.0, 12.0, '占用', NULL, NULL), -- 北京宏亮
(135, 'CS10R-1-1-[9][9]-OFF35.0-BW7.0', NULL, NULL, 9, 'CS10R-1-1-[9][9]', 7.0, 35.0, '占用', NULL, NULL), -- 北京宏亮
(136, 'CS10R-2-1-[1][1]-OFF-10.0-BW18.0', NULL, NULL, 20, 'CS10R-2-1-[1][1]', 18.0, -10.0, '占用', NULL, NULL), -- 北京宏亮
(137, 'CS10R-2-1-[5][5]-OFF-10.0-BW18.0', NULL, NULL, 24, 'CS10R-2-1-[5][5]', 18.0, -10.0, '占用', NULL, NULL), -- 北京宏亮
(138, 'CS10R-2-1-[1][1]-OFF8.0-BW1.0', NULL, NULL, 20, 'CS10R-2-1-[1][1]', 1.0, 8.0, '占用', NULL, NULL), -- 宏亮预留
(139, 'CS10R-2-1-[5][5]-OFF8.0-BW1.0', NULL, NULL, 24, 'CS10R-2-1-[5][5]', 1.0, 8.0, '占用', NULL, NULL), -- 宏亮预留
(140, 'CS10R-2-1-[1][1]-OFF9.0-BW36.0', NULL, NULL, 20, 'CS10R-2-1-[1][1]', 36.0, 9.0, '占用', NULL, NULL), -- 北京海科
(141, 'CS10R-2-1-[5][5]-OFF9.0-BW36.0', NULL, NULL, 24, 'CS10R-2-1-[5][5]', 36.0, 9.0, '占用', NULL, NULL), -- 北京海科
(142, 'CS10R-2-1-[2][2]-OFF0.0-BW54.0', NULL, NULL, 21, 'CS10R-2-1-[2][2]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(143, 'CS10R-2-1-[6][6]-OFF0.0-BW54.0', NULL, NULL, 25, 'CS10R-2-1-[6][6]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(144, 'CS10R-2-1-[3][3]-OFF0.0-BW54.0', NULL, NULL, 22, 'CS10R-2-1-[3][3]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(145, 'CS10R-2-1-[7][7]-OFF0.0-BW54.0', NULL, NULL, 26, 'CS10R-2-1-[7][7]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(146, 'CS10R-2-1-[4][4]-OFF0.0-BW54.0', NULL, NULL, 23, 'CS10R-2-1-[4][4]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(147, 'CS10R-2-1-[8][8]-OFF0.0-BW54.0', NULL, NULL, 27, 'CS10R-2-1-[8][8]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(148, 'CS10R-1-2-[1][1]-OFF0.0-BW54.0', NULL, NULL, 14, 'CS10R-1-2-[1][1]', 54.0, 0.0, '占用', NULL, NULL), -- 北京宏亮
(149, 'CS10R-1-2-[2][2]-OFF-1.2-BW1.2', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 1.2, -1.2, '占用', NULL, NULL), -- 澜沧江水电-原 已转至C6A
(150, 'CS10R-1-2-[2][2]-OFF0.0-BW1.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 1.0, 0.0, '占用', NULL, NULL), -- 清华大学-原 已转至中6E
(151, 'CS10R-1-2-[2][2]-OFF1.0-BW1.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 1.0, 1.0, '空闲', NULL, NULL),
(152, 'CS10R-1-2-[2][2]-OFF2.0-BW12.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 12.0, 2.0, '占用', NULL, NULL), -- 彩虹
(153, 'CS10R-1-2-[2][2]-OFF14.0-BW4.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 4.0, 14.0, '占用', NULL, NULL), -- 彩虹-备份-有杂散
(154, 'CS10R-1-2-[2][2]-OFF18.0-BW2.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 2.0, 18.0, '占用', NULL, NULL), -- 四川安迪-重庆公安 20251225：签合同交付这2M
(155, 'CS10R-1-2-[2][2]-OFF20.0-BW0.7', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 0.7, 20.0, '占用', NULL, NULL), -- 四川安迪（无合同）
(156, 'CS10R-1-2-[2][2]-OFF20.7-BW1.7', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 1.7, 20.7, '占用', NULL, NULL), -- 四川安迪-西藏 四川安迪合同1.7M
-- 20251225：因干扰多转Ku8B保护带12680-12683
-- 20251216：需现场操作挪频，预计202604腾退,
(157, 'CS10R-1-2-[2][2]-OFF22.4-BW0.7', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 0.7, 22.4, '空闲', NULL, NULL), -- 四川安迪在用
(158, 'CS10R-1-2-[2][2]-OFF23.1-BW10.4', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 10.4, 23.1, '占用', NULL, NULL), -- 北京油控/彩虹（应急备份） 彩虹使用12587-12596M
(159, 'CS10R-1-2-[2][2]-OFF33.5-BW2.5', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 2.5, 33.5, '占用', NULL, NULL), -- 鑫诺香港
(160, 'CS10R-1-2-[2][2]-OFF36.0-BW4.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 4.0, 36.0, '占用', NULL, NULL), -- 广东联通
(161, 'CS10R-1-2-[2][2]-OFF40.0-BW0.2', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 0.2, 40.0, '空闲', NULL, NULL),
(162, 'CS10R-1-2-[2][2]-OFF40.2-BW0.6', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 0.6, 40.2, '占用', NULL, NULL), -- 四川安迪
(163, 'CS10R-1-2-[2][2]-OFF40.8-BW2.8', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 2.8, 40.8, '空闲', NULL, NULL),
(164, 'CS10R-1-2-[2][2]-OFF43.6-BW10.4', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 10.4, 43.6, '占用', NULL, NULL), -- 北京油控
(165, 'CS10R-1-2-[2][2]-OFF56.0-BW2.0', NULL, NULL, 15, 'CS10R-1-2-[2][2]', 2.0, 56.0, '占用', NULL, NULL), -- 工程物理研究所
(166, 'CS10R-1-2-[3][3]-OFF30.0-BW54.0', NULL, NULL, 16, 'CS10R-1-2-[3][3]', 54.0, 30.0, '占用', NULL, NULL), -- 北京新海
(167, 'CS10R-1-2-[3][3]-OFF87.0-BW3.0', NULL, NULL, 16, 'CS10R-1-2-[3][3]', 3.0, 87.0, '占用', NULL, NULL), -- 四川安迪 20251225：因干扰从ku6B转过来测试
(168, 'CS10R-1-2-[4][4]-OFF0.0-BW1.0', NULL, NULL, 17, 'CS10R-1-2-[4][4]', 1.0, 0.0, '占用', NULL, NULL), -- 清华大学
(169, 'CS10R-1-2-[4][4]-OFF1.0-BW54.0', NULL, NULL, 17, 'CS10R-1-2-[4][4]', 54.0, 1.0, '占用', NULL, NULL), -- 北京宏亮
(170, 'CS10R-1-1-[10][10]-OFF0.0-BW12.0', NULL, NULL, 10, 'CS10R-1-1-[10][10]', 12.0, 0.0, '占用', NULL, NULL), -- 彩虹无人机-应急使用
(171, 'CS10R-1-1-[11][11]-OFF0.0-BW61.0', NULL, NULL, 11, 'CS10R-1-1-[11][11]', 61.0, 0.0, '空闲', NULL, NULL),
(172, 'CS10R-1-1-[12][12]-OFF0.0-BW52.0', NULL, NULL, 12, 'CS10R-1-1-[12][12]', 52.0, 0.0, '空闲', NULL, NULL),
(173, 'CS10R-1-1-[13][13]-OFF0.0-BW8.0', NULL, NULL, 13, 'CS10R-1-1-[13][13]', 8.0, 0.0, '占用', NULL, NULL), -- 雷凯（测试）
(174, 'CS10R-1-1-[13][13]-OFF8.0-BW44.0', NULL, NULL, 13, 'CS10R-1-1-[13][13]', 44.0, 8.0, '空闲', NULL, NULL), -- 空（临时业务）
(175, 'CS10R-2-4-[1][1]-OFF0.0-BW34.0', NULL, NULL, 44, 'CS10R-2-4-[1][1]', 34.0, 0.0, '空闲', NULL, NULL),
(176, 'CS10R-2-4-[5][5]-OFF0.0-BW34.0', NULL, NULL, 48, 'CS10R-2-4-[5][5]', 34.0, 0.0, '空闲', NULL, NULL),
(177, 'CS10R-2-4-[2][2]-OFF0.0-BW65.0', NULL, NULL, 45, 'CS10R-2-4-[2][2]', 65.0, 0.0, '空闲', NULL, NULL),
(178, 'CS10R-2-4-[6][6]-OFF0.0-BW65.0', NULL, NULL, 49, 'CS10R-2-4-[6][6]', 65.0, 0.0, '空闲', NULL, NULL),
(179, 'CS10R-2-4-[3][3]-OFF0.0-BW52.0', NULL, NULL, 46, 'CS10R-2-4-[3][3]', 52.0, 0.0, '空闲', NULL, NULL),
(180, 'CS10R-2-4-[7][7]-OFF0.0-BW52.0', NULL, NULL, 50, 'CS10R-2-4-[7][7]', 52.0, 0.0, '空闲', NULL, NULL),
(181, 'CS10R-2-4-[4][4]-OFF0.0-BW52.0', NULL, NULL, 47, 'CS10R-2-4-[4][4]', 52.0, 0.0, '空闲', NULL, NULL),
(182, 'CS10R-2-4-[8][8]-OFF0.0-BW52.0', NULL, NULL, 51, 'CS10R-2-4-[8][8]', 52.0, 0.0, '空闲', NULL, NULL),
(183, 'CS10R-1-3-[1][1]-OFF0.0-BW54.0', NULL, NULL, 18, 'CS10R-1-3-[1][1]', 54.0, 0.0, '空闲', NULL, NULL),
(184, 'CS10R-1-3-[2][2]-OFF0.0-BW54.0', NULL, NULL, 19, 'CS10R-1-3-[2][2]', 54.0, 0.0, '空闲', NULL, NULL),
(185, 'CS10R-2-3-[8][8]-OFF-60.0-BW54.0', NULL, NULL, 43, 'CS10R-2-3-[8][8]', 54.0, -60.0, '空闲', NULL, NULL),
(186, 'CS10R-2-2-[1][1]-OFF0.0-BW54.0', NULL, NULL, 28, 'CS10R-2-2-[1][1]', 54.0, 0.0, '空闲', NULL, NULL),
(187, 'CS10R-2-2-[2][2]-OFF0.0-BW54.0', NULL, NULL, 29, 'CS10R-2-2-[2][2]', 54.0, 0.0, '空闲', NULL, NULL),
(188, 'CS10R-2-2-[3][3]-OFF0.0-BW54.0', NULL, NULL, 30, 'CS10R-2-2-[3][3]', 54.0, 0.0, '空闲', NULL, NULL),
(189, 'CS10R-2-2-[4][4]-OFF0.0-BW54.0', NULL, NULL, 31, 'CS10R-2-2-[4][4]', 54.0, 0.0, '空闲', NULL, NULL),
(190, 'CS10R-2-3-[1][1]-OFF0.0-BW34.0', NULL, NULL, 36, 'CS10R-2-3-[1][1]', 34.0, 0.0, '空闲', NULL, NULL),
(191, 'CS10R-2-3-[5][5]-OFF-1.0-BW34.0', NULL, NULL, 40, 'CS10R-2-3-[5][5]', 34.0, -1.0, '空闲', NULL, NULL),
(192, 'CS10R-2-3-[2][2]-OFF0.0-BW65.0', NULL, NULL, 37, 'CS10R-2-3-[2][2]', 65.0, 0.0, '空闲', NULL, NULL),
(193, 'CS10R-2-3-[6][6]-OFF0.0-BW65.0', NULL, NULL, 41, 'CS10R-2-3-[6][6]', 65.0, 0.0, '空闲', NULL, NULL),
(194, 'CS10R-2-3-[3][3]-OFF0.0-BW40.0', NULL, NULL, 38, 'CS10R-2-3-[3][3]', 40.0, 0.0, '占用', NULL, NULL), -- 张京平测试
(195, 'CS10R-2-3-[7][7]-OFF0.0-BW40.0', NULL, NULL, 42, 'CS10R-2-3-[7][7]', 40.0, 0.0, '占用', NULL, NULL) -- 张京平测试;
SET FOREIGN_KEY_CHECKS = 1;

/*
  ====================================================================
  数据库说明
  ====================================================================

  卫星概览：
    id=1  CS10R  中星10R   7个矩阵  51个开关  7条占用
    id=2  CS6D   中星6D    2个矩阵  （端口/开关/频率待补全）
    id=3  CS12   中星12号  4个矩阵  47个开关  108条占用

  前端核心查询路径（转发器信息）：
    matrix_switch_status
      → inputChannelCodeShort → channel_info（接收侧频率范围、常用名）
      → outputChannelCodeShort → channel_info（发射侧频率范围）
      → channel_info.channelGroupId → feed_channel_group_info（波束/极化/频段）

  占用频率实时计算：
    输入起始频率 = channel_info.channelStartFreq + occupation.frequencyOffset
    输入终止频率 = channelStartFreq + frequencyOffset + occupiedBandwidth
    输出端使用对应发射侧通道的 channelStartFreq + 同偏移量

  示例查询（CS12 C转发器11A完整占用情况）：
  SELECT
    SUBSTRING(sw.inputChannelCodeShort, 2) AS transponder,
    occ.frequencyOffset AS offset_MHz,
    occ.occupiedBandwidth AS bw_MHz,
    (ci_rx.channelStartFreq + occ.frequencyOffset) AS rxStart,
    (ci_rx.channelStartFreq + occ.frequencyOffset + occ.occupiedBandwidth) AS rxEnd,
    occ.occupationStatus,
    occ.frequencyBlockCode
  FROM occupation_realtime_status occ
  JOIN matrix_switch_status sw ON sw.id = occ.switchId
  JOIN channel_info ci_rx ON ci_rx.channelCodeShort = sw.inputChannelCodeShort
  WHERE sw.matrixId = 10 AND sw.inputChannelCodeShort = 'R11A'
  ORDER BY occ.frequencyOffset;
  ====================================================================
*/