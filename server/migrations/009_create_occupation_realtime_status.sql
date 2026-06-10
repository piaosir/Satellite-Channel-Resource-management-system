-- 009: 新建通道占用状态表（occupation_realtime_status）
-- 分频工程师（行业经理/网络系统工程师）在规划块（frequency_block_realtime_status）上二次分配产生的占用记录

CREATE TABLE IF NOT EXISTS `occupation_realtime_status` (
  `id`                 INT            NOT NULL AUTO_INCREMENT,
  `occupationCode`     VARCHAR(300)   NULL     COMMENT '占用记录标识（自动生成）',
  `planningBlockId`    INT            NULL     COMMENT '规划块ID (FK → frequency_block_realtime_status.id)',
  `planningBlockCode`  VARCHAR(300)   NULL     COMMENT '规划块频率标识（冗余存储，方便查询）',
  `switchId`           INT            NULL     COMMENT '矩阵开关ID',
  `switchCode`         VARCHAR(100)   NULL     COMMENT '矩阵开关代码',
  `frequencyOffset`    DECIMAL(12,3)  NULL     COMMENT '偏移量 (MHz)',
  `occupiedBandwidth`  DECIMAL(12,3)  NULL     COMMENT '占用宽度 (MHz)',
  `partitionStatus`    CHAR(1)        NULL     DEFAULT 'P' COMMENT 'P=规划 R=回收',
  `statusUpdateTime`   BIGINT         NULL     COMMENT '状态修改时间（毫秒时间戳）',
  `usageType`          VARCHAR(20)    NULL     COMMENT '用途: 出租/合作/自用/禁用（继承自规划块）',
  `uplinkStartFreq`    DECIMAL(12,3)  NULL     COMMENT '上行起始频率 (MHz)',
  `uplinkEndFreq`      DECIMAL(12,3)  NULL     COMMENT '上行终止频率 (MHz)',
  `downlinkStartFreq`  DECIMAL(12,3)  NULL     COMMENT '下行起始频率 (MHz)',
  `downlinkEndFreq`    DECIMAL(12,3)  NULL     COMMENT '下行终止频率 (MHz)',
  `remarkFulfillment`  TEXT           NULL     COMMENT '维护备注-履约状态',
  `remarkUser`         TEXT           NULL     COMMENT '维护备注-用户',
  `remarkSales`        TEXT           NULL     COMMENT '维护备注-销售',
  `isValid`            TINYINT(1)     NULL     DEFAULT 1 COMMENT '是否有效',
  `createdAt`          BIGINT         NULL     COMMENT '创建时间（毫秒时间戳）',
  PRIMARY KEY (`id`),
  INDEX `idx_switch_id`      (`switchId`),
  INDEX `idx_planning_block` (`planningBlockId`),
  INDEX `idx_switch_code`    (`switchCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通道占用状态（分频工程师二次分配）';
