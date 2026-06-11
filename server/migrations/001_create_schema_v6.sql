-- 001: v6 全新建表(19 张,对应《数据库建表数据-完整版-20260604》)
-- 命名沿用项目惯例:冗余 code 字段 + 解析 id 字段(后缀注释"解析")

-- ── 资源层 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `satellite_info` (
  `id` INT NOT NULL COMMENT '卫星清单ID(沿用Excel)',
  `satelliteCode` VARCHAR(64) NOT NULL COMMENT '卫星代号',
  `satelliteCodeNonStd` VARCHAR(64) NULL COMMENT '卫星代号(非标)',
  `satelliteName` VARCHAR(128) NULL COMMENT '卫星名称',
  `statusText` VARCHAR(32) NULL COMMENT '状态:在轨运营/在轨停服/离轨',
  `orbitPosition` VARCHAR(64) NULL COMMENT '轨位',
  `launchDate` DATE NULL COMMENT '发射时间',
  `designLife` VARCHAR(32) NULL COMMENT '寿命(年)',
  `manufacturer` VARCHAR(128) NULL COMMENT '制造商',
  `platform` VARCHAR(128) NULL COMMENT '卫星平台',
  `coverage` TEXT NULL COMMENT '覆盖',
  `payload` TEXT NULL COMMENT '有效载荷',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_satellite_code` (`satelliteCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='卫星清单';

CREATE TABLE IF NOT EXISTS `beacon_info` (
  `id` INT NOT NULL COMMENT '信标ID(沿用Excel)',
  `satelliteCode` VARCHAR(64) NULL COMMENT '关联卫星代号',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `band` VARCHAR(32) NULL COMMENT '频段:C/Ku/EKu/Ka',
  `polarization` VARCHAR(16) NULL COMMENT '极化:H/V/L/R',
  `frequency` DECIMAL(12,2) NULL COMMENT '频点(MHz)',
  PRIMARY KEY (`id`),
  KEY `idx_beacon_satellite` (`satelliteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='信标清单';

CREATE TABLE IF NOT EXISTS `channel_group_info` (
  `id` INT NOT NULL COMMENT '通道组ID(沿用Excel)',
  `channelGroupCode` VARCHAR(128) NOT NULL COMMENT '通道组代号',
  `groupSeq` VARCHAR(32) NULL COMMENT '通道组序号',
  `satelliteCode` VARCHAR(64) NULL COMMENT '关联卫星代号',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `antennaName` VARCHAR(128) NULL COMMENT '波束(天线)名称',
  `antennaCode` VARCHAR(32) NULL COMMENT '波束(天线)代号',
  `txRxType` VARCHAR(8) NULL COMMENT '收/发:R/T',
  `polarization` VARCHAR(16) NULL COMMENT '极化:H/V/L/R/X/Y',
  `band` VARCHAR(32) NULL COMMENT '频率(频段):C/EC/Ku/EKu/KuBSS/规划Ku/Ka/KaBSS',
  `channelCount` INT NULL COMMENT '通道数',
  `primaryReceiverCode` VARCHAR(64) NULL COMMENT '主份接收机代码',
  `backupReceiverCode1` VARCHAR(64) NULL COMMENT '一备接收机代码',
  `backupReceiverCode2` VARCHAR(64) NULL COMMENT '二备接收机代码',
  `receiverActiveStatus` VARCHAR(16) NULL COMMENT '接收机主备状态',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_channel_group_code` (`channelGroupCode`),
  KEY `idx_group_satellite` (`satelliteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通道组清单(含接收机主备)';

CREATE TABLE IF NOT EXISTS `channel_info` (
  `id` INT NOT NULL COMMENT '通道ID(沿用Excel)',
  `channelCode` VARCHAR(128) NOT NULL COMMENT '通道代号(唯一键)',
  `channelFullName` VARCHAR(128) NULL COMMENT '通道全称',
  `channelShortName` VARCHAR(64) NULL COMMENT '通道简称(非唯一)',
  `commonName` VARCHAR(128) NULL COMMENT '常用名',
  `channelGroupCode` VARCHAR(128) NULL COMMENT '关联通道组代号',
  `channelGroupId` INT NULL COMMENT '通道组id(解析)',
  `channelBandwidth` DECIMAL(12,2) NULL COMMENT '通道带宽(MHz)',
  `channelStartFreq` DECIMAL(12,2) NULL COMMENT '通道起始频率(MHz)',
  `channelEndFreq` DECIMAL(12,2) NULL COMMENT '通道终止频率(MHz)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_channel_code` (`channelCode`),
  KEY `idx_channel_group` (`channelGroupId`),
  KEY `idx_channel_short_name` (`channelShortName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通道清单';

CREATE TABLE IF NOT EXISTS `switch_matrix_info` (
  `id` INT NOT NULL COMMENT '矩阵ID(沿用Excel)',
  `matrixCode` VARCHAR(128) NOT NULL COMMENT '矩阵代码',
  `satelliteCode` VARCHAR(64) NULL COMMENT '关联卫星代号',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `matrixType` TINYINT NULL COMMENT '类型:1常规开关矩阵 2 DTP大矩阵',
  `matrixSeq` INT NULL COMMENT '序号',
  `inputPortCount` INT NULL COMMENT '输入端口数',
  `outputPortCount` INT NULL COMMENT '输出端口数',
  `effectiveStatus` TINYINT NULL COMMENT '生效状态:1有效 0无效',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `updateTime` DATETIME NULL COMMENT '变更时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_matrix_code` (`matrixCode`),
  KEY `idx_matrix_satellite` (`satelliteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='矩阵清单';

CREATE TABLE IF NOT EXISTS `matrix_port_info` (
  `id` INT NOT NULL COMMENT '端口ID(沿用Excel)',
  `portCode` VARCHAR(128) NULL COMMENT '端口代码',
  `matrixCode` VARCHAR(128) NULL COMMENT '关联矩阵代码',
  `matrixId` INT NULL COMMENT '矩阵id(解析)',
  `ioType` VARCHAR(8) NULL COMMENT '输入/输出:I/O',
  `portSeq` INT NULL COMMENT '序号',
  `channelShortName` VARCHAR(64) NULL COMMENT '关联通道代码(=通道简称)',
  `channelId` INT NULL COMMENT '通道id(解析;同卫星内简称多义时为NULL)',
  PRIMARY KEY (`id`),
  KEY `idx_port_matrix` (`matrixId`),
  KEY `idx_port_channel` (`channelId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='矩阵端口清单';

CREATE TABLE IF NOT EXISTS `matrix_switch_status` (
  `id` INT NOT NULL COMMENT '开关ID(沿用Excel)',
  `switchCode` VARCHAR(128) NOT NULL COMMENT '开关代码',
  `matrixCode` VARCHAR(128) NULL COMMENT '关联矩阵代码',
  `matrixId` INT NULL COMMENT '矩阵id(解析)',
  `inputPortSeq` INT NULL COMMENT '入端口号',
  `outputPortSeq` INT NULL COMMENT '出端口号',
  `inputPortId` INT NULL COMMENT '入端口id(解析)',
  `outputPortId` INT NULL COMMENT '出端口id(解析)',
  `switchType` VARCHAR(16) NULL COMMENT '开关是否可切:常通/可切',
  `switchStatus` TINYINT NULL COMMENT '开关状态:1通 0断',
  `primaryAmpCode` VARCHAR(64) NULL COMMENT '主份放大器代码',
  `backupAmpCode1` VARCHAR(64) NULL COMMENT '一备放大器代码',
  `backupAmpCode2` VARCHAR(64) NULL COMMENT '二备放大器代码',
  `ampActiveStatus` VARCHAR(16) NULL COMMENT '放大器主备状态:P0主份/P1一备/P2二备',
  `updateTime` DATETIME NULL COMMENT '变更时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_switch_code` (`switchCode`),
  KEY `idx_switch_matrix` (`matrixId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='矩阵开关状态(实时,含放大器主备)';

-- ── 切换日志(三张同构,结构先行) ────────────────────────────
CREATE TABLE IF NOT EXISTS `matrix_switch_log` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '切换日志ID',
  `switchCode` VARCHAR(128) NULL COMMENT '开关代码',
  `switchId` INT NULL COMMENT '开关id(解析)',
  `beforeStatus` VARCHAR(32) NULL COMMENT '切换前状态',
  `afterStatus` VARCHAR(32) NULL COMMENT '切换后状态',
  `switchTime` DATETIME NULL COMMENT '切换时间',
  `operator` VARCHAR(64) NULL COMMENT '操作人',
  `registrar` VARCHAR(64) NULL COMMENT '登记人',
  PRIMARY KEY (`id`),
  KEY `idx_mslog_switch` (`switchCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='矩阵开关切换日志';

CREATE TABLE IF NOT EXISTS `amplifier_switch_log` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '切换日志ID',
  `switchCode` VARCHAR(128) NULL COMMENT '开关代码',
  `switchId` INT NULL COMMENT '开关id(解析)',
  `beforeStatus` VARCHAR(32) NULL COMMENT '切换前状态',
  `afterStatus` VARCHAR(32) NULL COMMENT '切换后状态',
  `switchTime` DATETIME NULL COMMENT '切换时间',
  `operator` VARCHAR(64) NULL COMMENT '操作人',
  `registrar` VARCHAR(64) NULL COMMENT '登记人',
  PRIMARY KEY (`id`),
  KEY `idx_amplog_switch` (`switchCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='放大器切换日志';

CREATE TABLE IF NOT EXISTS `receiver_switch_log` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '切换日志ID',
  `channelGroupCode` VARCHAR(128) NULL COMMENT '通道组代号',
  `channelGroupId` INT NULL COMMENT '通道组id(解析)',
  `beforeStatus` VARCHAR(32) NULL COMMENT '切换前状态',
  `afterStatus` VARCHAR(32) NULL COMMENT '切换后状态',
  `switchTime` DATETIME NULL COMMENT '切换时间',
  `operator` VARCHAR(64) NULL COMMENT '操作人',
  `registrar` VARCHAR(64) NULL COMMENT '登记人',
  PRIMARY KEY (`id`),
  KEY `idx_rcvlog_group` (`channelGroupCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='接收机_变频器切换日志';

-- ── 状态层 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `channel_planning_status` (
  `id` INT NOT NULL COMMENT '规划记录ID(沿用Excel)',
  `blockCode` VARCHAR(128) NOT NULL COMMENT '块代码(已trim)',
  `usageType` VARCHAR(16) NULL COMMENT '用途:自用/出租/合作/禁用',
  `isValid` TINYINT NULL COMMENT '记录是否有效:1是 0否',
  `updateTime` DATETIME NULL COMMENT '最后更新时间',
  `satelliteCode` VARCHAR(64) NULL COMMENT '卫星代号(解析自块代码)',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `bandwidth` DECIMAL(12,2) NULL COMMENT '带宽MHz(解析)',
  `uplinkPolarization` VARCHAR(8) NULL COMMENT '上行极化(解析)',
  `uplinkBeam` VARCHAR(16) NULL COMMENT '上行波束(解析)',
  `uplinkStartFreq` DECIMAL(12,2) NULL COMMENT '上行起始频率(解析)',
  `uplinkEndFreq` DECIMAL(12,2) NULL COMMENT '上行终止频率(解析)',
  `downlinkPolarization` VARCHAR(8) NULL COMMENT '下行极化(解析)',
  `downlinkBeam` VARCHAR(16) NULL COMMENT '下行波束(解析)',
  `downlinkStartFreq` DECIMAL(12,2) NULL COMMENT '下行起始频率(解析)',
  `downlinkEndFreq` DECIMAL(12,2) NULL COMMENT '下行终止频率(解析)',
  `channelId` INT NULL COMMENT '所落接收通道id(解析:上行频率范围归属)',
  PRIMARY KEY (`id`),
  KEY `idx_plan_block_code` (`blockCode`),
  KEY `idx_plan_satellite` (`satelliteId`),
  KEY `idx_plan_channel` (`channelId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通道规划状态(基底:块+用途)';

CREATE TABLE IF NOT EXISTS `channel_allocation_status` (
  `id` INT NOT NULL COMMENT '占用记录ID(沿用Excel)',
  `blockCode` VARCHAR(128) NOT NULL COMMENT '块代码(已trim)',
  `isValid` TINYINT NULL COMMENT '分配是否有效:1是 0否(仅拆分/冲突时置0,与占用释放无关)',
  `updateTime` DATETIME NULL COMMENT '最后更新时间',
  `satelliteCode` VARCHAR(64) NULL COMMENT '卫星代号(解析自块代码)',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `bandwidth` DECIMAL(12,2) NULL COMMENT '带宽MHz(解析)',
  `uplinkPolarization` VARCHAR(8) NULL COMMENT '上行极化(解析)',
  `uplinkBeam` VARCHAR(16) NULL COMMENT '上行波束(解析)',
  `uplinkStartFreq` DECIMAL(12,2) NULL COMMENT '上行起始频率(解析)',
  `uplinkEndFreq` DECIMAL(12,2) NULL COMMENT '上行终止频率(解析)',
  `downlinkPolarization` VARCHAR(8) NULL COMMENT '下行极化(解析)',
  `downlinkBeam` VARCHAR(16) NULL COMMENT '下行波束(解析)',
  `downlinkStartFreq` DECIMAL(12,2) NULL COMMENT '下行起始频率(解析)',
  `downlinkEndFreq` DECIMAL(12,2) NULL COMMENT '下行终止频率(解析)',
  `planningBlockId` INT NULL COMMENT '所属规划块id(解析:同星同极化同波束范围包含)',
  `channelId` INT NULL COMMENT '所落接收通道id(解析)',
  PRIMARY KEY (`id`),
  KEY `idx_alloc_block_code` (`blockCode`),
  KEY `idx_alloc_satellite` (`satelliteId`),
  KEY `idx_alloc_planning` (`planningBlockId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通道分配状态(实际占用快照)';

-- ── 业务层 ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `customer_info` (
  `customerCode` VARCHAR(32) NOT NULL COMMENT '客户ID(KH-xxxxxxx)',
  `customerName` VARCHAR(255) NULL COMMENT '客户全称(存在重名,以customerCode为准)',
  `creditCode` VARCHAR(64) NULL COMMENT '统一社会信用代码',
  `status` TINYINT NULL COMMENT '客户状态',
  `createdTime` DATETIME NULL COMMENT '建档时间',
  `updateTime` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`customerCode`),
  KEY `idx_customer_name` (`customerName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客户信息';

CREATE TABLE IF NOT EXISTS `user_info` (
  `id` INT NOT NULL COMMENT '用户ID(沿用Excel,与合约一一对应)',
  `customerCode` VARCHAR(32) NULL COMMENT '所属客户ID',
  `customerName` VARCHAR(255) NULL COMMENT '所属客户全称(冗余)',
  `status` TINYINT NULL COMMENT '用户状态',
  `createdTime` DATETIME NULL COMMENT '建档时间',
  `updateTime` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_customer` (`customerCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户信息(客户与合约的中间实体)';

CREATE TABLE IF NOT EXISTS `bandwidth_contract_info` (
  `id` INT NOT NULL COMMENT '合约ID(沿用Excel)',
  `customerName` VARCHAR(255) NULL COMMENT '所属客户(名称)',
  `customerCode` VARCHAR(32) NULL COMMENT '客户ID(解析:经用户表)',
  `userId` INT NULL COMMENT '用户号(=user_info.id,一一对应)',
  `mainOrderCode` VARCHAR(64) NULL COMMENT '所属主订单',
  `productName` VARCHAR(128) NULL COMMENT '签约带宽商品',
  `productType` VARCHAR(32) NULL COMMENT '商品类型:长租等',
  `bandwidthMHz` DECIMAL(12,2) NULL COMMENT '签约带宽权益(MHz)',
  `divisibleBlockCount` INT NULL COMMENT '可分频率块数量',
  `periods` DECIMAL(8,2) NULL COMMENT '期数',
  `amount` DECIMAL(14,2) NULL COMMENT '签约金额',
  `startTime` DATETIME NULL COMMENT '开通时间',
  `endTime` DATETIME NULL COMMENT '到期时间',
  `updateTime` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_contract_user` (`userId`),
  KEY `idx_contract_customer` (`customerCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='(带宽)合约清单';

CREATE TABLE IF NOT EXISTS `contract_delivery_record` (
  `id` INT NOT NULL COMMENT '交付记录ID(沿用Excel)',
  `contractId` INT NULL COMMENT '关联合约ID',
  `blockCode` VARCHAR(128) NULL COMMENT '频率块代码(必须引用通道分配状态,已trim)',
  `allocationId` INT NULL COMMENT '分配块id(解析:块代码精确匹配)',
  `exclusiveType` VARCHAR(16) NULL COMMENT '独占/共享',
  `satelliteCode` VARCHAR(64) NULL COMMENT '频率块所属卫星',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `bandwidth` DECIMAL(12,2) NULL COMMENT '交付频率块带宽(MHz)',
  `action` VARCHAR(16) NULL COMMENT '动作:占用/释放',
  `actionTime` DATETIME NULL COMMENT '时间',
  `handler` VARCHAR(64) NULL COMMENT '受理人员',
  `registrar` VARCHAR(64) NULL COMMENT '登记人员',
  PRIMARY KEY (`id`),
  KEY `idx_delivery_contract` (`contractId`),
  KEY `idx_delivery_block` (`blockCode`),
  KEY `idx_delivery_allocation` (`allocationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='(带宽)合约-交付过程记录';

CREATE TABLE IF NOT EXISTS `own_business_system_info` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '业务系统ID',
  `systemCode` VARCHAR(128) NULL COMMENT '业务系统代称',
  `basebandName` VARCHAR(128) NULL COMMENT '基带系统名称',
  `createdTime` DATETIME NULL COMMENT '建档时间',
  `updateTime` DATETIME NULL COMMENT '最后更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='自有业务系统信息(结构先行)';

CREATE TABLE IF NOT EXISTS `own_carrier_info` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '载波ID',
  `businessSystemId` INT NULL COMMENT '所属业务系统ID',
  `direction` VARCHAR(16) NULL COMMENT '前向/返向',
  `bandwidth` DECIMAL(12,2) NULL COMMENT '载波带宽(MHz)',
  PRIMARY KEY (`id`),
  KEY `idx_carrier_system` (`businessSystemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='(自有)载波清单(结构先行)';

CREATE TABLE IF NOT EXISTS `own_carrier_usage_record` (
  `id` INT NOT NULL COMMENT '使用记录ID(沿用Excel)',
  `carrierId` INT NULL COMMENT '关联载波ID(当前数据为空)',
  `blockCode` VARCHAR(128) NULL COMMENT '频率块代码(必须引用通道分配状态,已trim)',
  `allocationId` INT NULL COMMENT '分配块id(解析:块代码精确匹配)',
  `exclusiveType` VARCHAR(16) NULL COMMENT '独占/共享',
  `satelliteCode` VARCHAR(64) NULL COMMENT '频率块所属卫星',
  `satelliteId` INT NULL COMMENT '卫星id(解析)',
  `bandwidth` DECIMAL(12,2) NULL COMMENT '频率块带宽(MHz)',
  `action` VARCHAR(16) NULL COMMENT '动作:占用/释放',
  `actionTime` DATETIME NULL COMMENT '时间',
  `handler` VARCHAR(64) NULL COMMENT '受理人员',
  `registrar` VARCHAR(64) NULL COMMENT '登记人员',
  PRIMARY KEY (`id`),
  KEY `idx_usage_carrier` (`carrierId`),
  KEY `idx_usage_block` (`blockCode`),
  KEY `idx_usage_allocation` (`allocationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='(自有)载波使用带宽过程记录';
