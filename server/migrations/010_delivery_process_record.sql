-- 010_delivery_process_record.sql
-- 创建「带宽合约-交付过程记录」表，记录分配块上的占用(P)/释放(R)操作
-- 对应 Excel Sheet: 带宽合约合约-交付过程记录

CREATE TABLE IF NOT EXISTS `delivery_process_record` (
  `id`                   INT NOT NULL AUTO_INCREMENT,
  `deliveryCode`         VARCHAR(300) NULL,
  `allocationBlockId`    INT          NULL,        -- FK → occupation_realtime_status.id
  `allocationBlockCode`  VARCHAR(300) NULL,
  `planningBlockId`      INT          NULL,        -- FK → frequency_block_realtime_status.id
  `planningBlockCode`    VARCHAR(300) NULL,
  `switchId`             INT          NULL,
  `switchCode`           VARCHAR(100) NULL,
  `occupyStatus`         CHAR(1)      NULL,        -- P=占用  R=释放
  `usageType`            VARCHAR(20)  NULL,
  `contractNo`           VARCHAR(200) NULL,        -- 合同号
  `partyA`               VARCHAR(200) NULL,        -- 甲方/使用方
  `operateUser`          VARCHAR(200) NULL,        -- 录入人员
  `supervisorUser`       VARCHAR(200) NULL,        -- 监管人员
  `operateTime`          BIGINT       NULL,        -- 操作时间 ms
  `remark`               TEXT         NULL,
  `isValid`              TINYINT(1)   NULL DEFAULT 1,
  `createdAt`            BIGINT       NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_alloc_block`     (`allocationBlockId`),
  INDEX `idx_planning_block`  (`planningBlockId`),
  INDEX `idx_switch`          (`switchId`),
  INDEX `idx_occupy_status`   (`occupyStatus`),
  INDEX `idx_operate_time`    (`operateTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='带宽合约-交付过程记录（P占用/R释放）';
