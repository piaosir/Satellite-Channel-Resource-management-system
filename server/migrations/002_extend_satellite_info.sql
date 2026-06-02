-- 002: 扩展 satellite_info，补充卫星档案字段（MySQL 8，无 IF NOT EXISTS）
ALTER TABLE `satellite_info`
  ADD COLUMN `orbitPosition` VARCHAR(64) NULL COMMENT '轨道位置',
  ADD COLUMN `statusText` VARCHAR(32) NULL COMMENT '状态：在轨运营/停止服务/离轨/在建',
  ADD COLUMN `coverage` TEXT NULL COMMENT '覆盖范围',
  ADD COLUMN `transponderCount` VARCHAR(255) NULL COMMENT '转发器数量',
  ADD COLUMN `beacon` TEXT NULL COMMENT '信标(MHz)',
  ADD COLUMN `polarization` VARCHAR(64) NULL COMMENT '极化方式',
  ADD COLUMN `launchDate` DATE NULL COMMENT '发射时间',
  ADD COLUMN `designLife` VARCHAR(32) NULL COMMENT '设计寿命',
  ADD COLUMN `ownership` VARCHAR(32) NULL COMMENT '卫星归属：自有/代理',
  ADD COLUMN `manufacturer` VARCHAR(128) NULL COMMENT '制造商',
  ADD COLUMN `platform` VARCHAR(128) NULL COMMENT '卫星平台',
  ADD COLUMN `attitudeStabilization` VARCHAR(64) NULL COMMENT '姿态稳定',
  ADD COLUMN `stationKeepingAccuracy` VARCHAR(128) NULL COMMENT '位保精度',
  ADD COLUMN `remark` TEXT NULL COMMENT '备注';

UPDATE `satellite_info` SET `orbitPosition` = '125°E', `statusText` = '在轨运营', `coverage` = 'C频段：中国（含港澳、台湾）、南亚、西亚、东亚、中亚、东南亚、澳洲和南太平洋岛国
Ku频段：中国大陆地区及周边沿海、菲律宾和马来西亚', `transponderCount` = 'C频段25个转发器
Ku频段25个转发器', `beacon` = 'C频段：
下行水平信标：4198.5（H）
下行垂直信标：4197（V）
Ku频段：
下行水平信标：12251（H）
下行垂直信标：12250.5（V）', `polarization` = '线极化', `launchDate` = '2022-04-15', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星6D卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS6D';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS6D', '中星6D卫星', '125°E', '在轨运营', 'C频段：中国（含港澳、台湾）、南亚、西亚、东亚、中亚、东南亚、澳洲和南太平洋岛国
Ku频段：中国大陆地区及周边沿海、菲律宾和马来西亚', 'C频段25个转发器
Ku频段25个转发器', 'C频段：
下行水平信标：4198.5（H）
下行垂直信标：4197（V）
Ku频段：
下行水平信标：12251（H）
下行垂直信标：12250.5（V）', '线极化', '2022-04-15', '15年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS6D');
UPDATE `satellite_info` SET `orbitPosition` = '115.5°E', `statusText` = '在轨运营', `coverage` = 'C波段：中国领土领水、东南亚和其它亚洲和大洋洲卫星可见陆地地区', `transponderCount` = 'C频段23个转发器
前向Ku频段10个转发器
返向Ka频段2个转发器', `beacon` = 'C频段：
下行水平信标：3702（H）
下行垂直信标：4198（V）

Ku频段：
11700MHz（V）
12749MHz  (V)

Ka频段：
18700MHz（LHCP）', `polarization` = '线极化', `launchDate` = '2023-11-09', `designLife` = '14.2年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星6E卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS6E';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS6E', '中星6E卫星', '115.5°E', '在轨运营', 'C波段：中国领土领水、东南亚和其它亚洲和大洋洲卫星可见陆地地区', 'C频段23个转发器
前向Ku频段10个转发器
返向Ka频段2个转发器', 'C频段：
下行水平信标：3702（H）
下行垂直信标：4198（V）

Ku频段：
11700MHz（V）
12749MHz  (V)

Ka频段：
18700MHz（LHCP）', '线极化', '2023-11-09', '14.2年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS6E');
UPDATE `satellite_info` SET `orbitPosition` = '101.4°E', `statusText` = '在轨运营', `coverage` = '中国及周边海域', `transponderCount` = 'Ku频段25个转发器', `beacon` = '左旋信标：11700（LHCP）
右旋信标：12200（RHCP）', `polarization` = '圆极化', `launchDate` = '2021-09-09', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星9B卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS9B';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS9B', '中星9B卫星', '101.4°E', '在轨运营', '中国及周边海域', 'Ku频段25个转发器', '左旋信标：11700（LHCP）
右旋信标：12200（RHCP）', '圆极化', '2021-09-09', '15年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS9B');
UPDATE `satellite_info` SET `orbitPosition` = '92.2°E', `statusText` = '在轨运营', `coverage` = 'KuBSS频段：中国及周边海域
标准Ku频段：北京
规划Ku频段：中国西部地区
KaBSS频段：北京', `transponderCount` = 'KuBSS频段24个转发器
标准Ku频段5个转发器
规划Ku频段5个转发器
KaBSS频段1个转发器', `beacon` = '左旋信标：12199（LHCP）
右旋信标：11700（RHCP）', `polarization` = '圆极化', `launchDate` = '2025-06-20', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星9C卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS9C';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS9C', '中星9C卫星', '92.2°E', '在轨运营', 'KuBSS频段：中国及周边海域
标准Ku频段：北京
规划Ku频段：中国西部地区
KaBSS频段：北京', 'KuBSS频段24个转发器
标准Ku频段5个转发器
规划Ku频段5个转发器
KaBSS频段1个转发器', '左旋信标：12199（LHCP）
右旋信标：11700（RHCP）', '圆极化', '2025-06-20', '15年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS9C');
UPDATE `satellite_info` SET `orbitPosition` = '110.5°E', `statusText` = '在轨运营', `coverage` = '中国陆地及领海、印尼、马来西亚、南亚、中东及阿拉伯海', `transponderCount` = 'Ku频段35个转发器', `beacon` = '12748 MHz（V）、
12745MHz（H）
11450.5 MHz（V）、
11452.5 MHz（H）', `polarization` = '线极化', `launchDate` = '2025-02-22', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星10R卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS10R';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS10R', '中星10R卫星', '110.5°E', '在轨运营', '中国陆地及领海、印尼、马来西亚、南亚、中东及阿拉伯海', 'Ku频段35个转发器', '12748 MHz（V）、
12745MHz（H）
11450.5 MHz（V）、
11452.5 MHz（H）', '线极化', '2025-02-22', '15年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS10R');
UPDATE `satellite_info` SET `orbitPosition` = '98°E', `statusText` = '在轨运营', `coverage` = 'C频段：区域波束
Ku频段：海洋波束、印尼波束、南亚波束（已永久关闭）', `transponderCount` = 'C频段26个转发器
Ku频段19个转发器', `beacon` = 'C频段：
4198.3MHz(V)           
4199.9MHz(H)       

Ku频段：     
12737.5MHz（V）
11451MHz(V)                                            11453MHz(H)', `polarization` = '线极化', `launchDate` = '2013-05-02', `designLife` = '14年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东方红四号（DFH-4)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星11号卫星（98E卫星）' WHERE REPLACE(`satelliteCode`,'-','') = 'CS11';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS11', '中星11号卫星（98E卫星）', '98°E', '在轨运营', 'C频段：区域波束
Ku频段：海洋波束、印尼波束、南亚波束（已永久关闭）', 'C频段26个转发器
Ku频段19个转发器', 'C频段：
4198.3MHz(V)           
4199.9MHz(H)       

Ku频段：     
12737.5MHz（V）
11451MHz(V)                                            11453MHz(H)', '线极化', '2013-05-02', '14年', '自有', '中国空间技术研究院', '东方红四号（DFH-4)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS11');
UPDATE `satellite_info` SET `orbitPosition` = '87.5°E', `statusText` = '在轨运营', `coverage` = 'C频段：全球波束
Ku频段：中国波束
Ku频段：中东非波束
Ku频段：可移动点波束', `transponderCount` = 'C频段24个转发器
Ku频段23个转发器', `beacon` = 'C频段：
3701.5MHz(V)
4199.3MHz(H)
Ku频段：
11699.8MHz(LHCP)
12251MHz (RHCP)', `polarization` = '线极化', `launchDate` = '2012-11-27', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '法国泰雷兹阿莱尼亚宇航公司', `platform` = 'SB4000C2', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星12号卫星（中卫2号）' WHERE REPLACE(`satelliteCode`,'-','') = 'CS12';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS12', '中星12号卫星（中卫2号）', '87.5°E', '在轨运营', 'C频段：全球波束
Ku频段：中国波束
Ku频段：中东非波束
Ku频段：可移动点波束', 'C频段24个转发器
Ku频段23个转发器', 'C频段：
3701.5MHz(V)
4199.3MHz(H)
Ku频段：
11699.8MHz(LHCP)
12251MHz (RHCP)', '线极化', '2012-11-27', '15年', '自有', '法国泰雷兹阿莱尼亚宇航公司', 'SB4000C2', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS12');
UPDATE `satellite_info` SET `orbitPosition` = '51.5°E', `statusText` = '在轨运营', `coverage` = '非规划Ku频段：非洲波束
规划Ku频段：欧洲波束
C频段：全球波束
C频段：非洲波束
C频段：东部波束', `transponderCount` = 'C频段20个转发器，归属中国卫通7个
Ku频段18个转发器，归属中国卫通1个', `beacon` = 'C频段：
4194MHz(RHCP)
4195.6MHz(LHCP)

Ku频段：
11194MHz(V)非洲波束
11197MHz(H) 非洲波束
11445Mhz(H)欧洲波束', `polarization` = '圆极化（C）
线极化（Ku）', `launchDate` = '2016-01-17', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东方红四号(DFH-4)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星15号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS15';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS15', '中星15号卫星', '51.5°E', '在轨运营', '非规划Ku频段：非洲波束
规划Ku频段：欧洲波束
C频段：全球波束
C频段：非洲波束
C频段：东部波束', 'C频段20个转发器，归属中国卫通7个
Ku频段18个转发器，归属中国卫通1个', 'C频段：
4194MHz(RHCP)
4195.6MHz(LHCP)

Ku频段：
11194MHz(V)非洲波束
11197MHz(H) 非洲波束
11445Mhz(H)欧洲波束', '圆极化（C）
线极化（Ku）', '2016-01-17', '15年', '自有', '中国空间技术研究院', '东方红四号(DFH-4)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS15');
UPDATE `satellite_info` SET `orbitPosition` = '163°E', `statusText` = '在轨运营', `coverage` = '中国东部国土、东南亚以及包含北美航线在内的大部分太平洋区域', `transponderCount` = 'C频段2个
Ku频段13个
前向Ka频段14个
返向Ka频段2个', `beacon` = 'C频段：
4199.8MHz(L)

Ku频段：
11691MHz（H）
11695MHz（V）

Ka频段：
19700MHz(RHCP)', `polarization` = '线极化', `launchDate` = '2022-11-05', `designLife` = '12.5年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星19号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS19';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS19', '中星19号卫星', '163°E', '在轨运营', '中国东部国土、东南亚以及包含北美航线在内的大部分太平洋区域', 'C频段2个
Ku频段13个
前向Ka频段14个
返向Ka频段2个', 'C频段：
4199.8MHz(L)

Ku频段：
11691MHz（H）
11695MHz（V）

Ka频段：
19700MHz(RHCP)', '线极化', '2022-11-05', '12.5年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS19');
UPDATE `satellite_info` SET `orbitPosition` = '125°E', `statusText` = '在轨运营', `coverage` = '中国全境及周边水域、俄罗斯部分地区、东南亚、蒙古、日本、印度尼西亚、印度、印度洋等地区', `transponderCount` = '前向Ka频段36个
返向Ka频段 14个', `beacon` = '19130MHz(RHCP)\(LHCP)', `polarization` = '圆极化', `launchDate` = '2023-02-23', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星26号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS26';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS26', '中星26号卫星', '125°E', '在轨运营', '中国全境及周边水域、俄罗斯部分地区、东南亚、蒙古、日本、印度尼西亚、印度、印度洋等地区', '前向Ka频段36个
返向Ka频段 14个', '19130MHz(RHCP)\(LHCP)', '圆极化', '2023-02-23', '15年', '自有', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS26');
UPDATE `satellite_info` SET `orbitPosition` = '138°E', `statusText` = '在轨运营', `coverage` = 'AP波束：  中国、东南亚、澳大利亚及南太平洋岛国、夏威夷
6个区域波束：  CHN波束：中国
  MNG波束：蒙古
  IC波束：中南半岛
  IMR波束：印度尼西亚及马来西亚
  ANZ波束：南太平洋区域
  NP波束：北太平洋区域', `transponderCount` = 'C波段34个转发器
Ku波段20个转发器', `beacon` = NULL, `polarization` = '线极化', `launchDate` = '2018-09-10', `designLife` = '15年', `ownership` = '代理', `manufacturer` = '劳拉空间系统公司', `platform` = 'SSL 1300', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太5C卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT5C';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-5C', '亚太5C卫星', '138°E', '在轨运营', 'AP波束：  中国、东南亚、澳大利亚及南太平洋岛国、夏威夷
6个区域波束：  CHN波束：中国
  MNG波束：蒙古
  IC波束：中南半岛
  IMR波束：印度尼西亚及马来西亚
  ANZ波束：南太平洋区域
  NP波束：北太平洋区域', 'C波段34个转发器
Ku波段20个转发器', NULL, '线极化', '2018-09-10', '15年', '代理', '劳拉空间系统公司', 'SSL 1300', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT5C');
UPDATE `satellite_info` SET `orbitPosition` = '134°E', `statusText` = '在轨运营', `coverage` = 'C波段：  AP波束：中国、东南亚、澳大利亚及南太平洋岛国
Ku波段：  CHN波束：中国
  MNG波束：蒙古
  IC波束：中南半岛
Ka波段：  Ka北波束：北京/上海、渤海、黄海、东海
  Ka南波束：广州/香港、部分南海', `transponderCount` = 'C波段32个转发器
Ku波段20个转发器
Ka波段1个转发器', `beacon` = NULL, `polarization` = '线极化（C）
线极化（Ku）
圆极化（Ka）', `launchDate` = '2018-05-04', `designLife` = '15年', `ownership` = '代理', `manufacturer` = '中国空间技术研究院', `platform` = '东方红四号（DFH-4)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太6C卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT6C';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-6C', '亚太6C卫星', '134°E', '在轨运营', 'C波段：  AP波束：中国、东南亚、澳大利亚及南太平洋岛国
Ku波段：  CHN波束：中国
  MNG波束：蒙古
  IC波束：中南半岛
Ka波段：  Ka北波束：北京/上海、渤海、黄海、东海
  Ka南波束：广州/香港、部分南海', 'C波段32个转发器
Ku波段20个转发器
Ka波段1个转发器', NULL, '线极化（C）
线极化（Ku）
圆极化（Ka）', '2018-05-04', '15年', '代理', '中国空间技术研究院', '东方红四号（DFH-4)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT6C');
UPDATE `satellite_info` SET `orbitPosition` = '134°E', `statusText` = '在轨运营', `coverage` = '所在轨位对地球可视范围的全部覆盖，以亚太区域为重点，包括中国、周边地区、东南亚的覆盖', `transponderCount` = NULL, `beacon` = NULL, `polarization` = '线极化', `launchDate` = '2020-07-09', `designLife` = '15年', `ownership` = '代理', `manufacturer` = '中国空间技术研究院', `platform` = '东四增强型(DFH-4E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太6D卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT6D';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-6D', '亚太6D卫星', '134°E', '在轨运营', '所在轨位对地球可视范围的全部覆盖，以亚太区域为重点，包括中国、周边地区、东南亚的覆盖', NULL, NULL, '线极化', '2020-07-09', '15年', '代理', '中国空间技术研究院', '东四增强型(DFH-4E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT6D');
UPDATE `satellite_info` SET `orbitPosition` = '134°E', `statusText` = '在轨运营', `coverage` = 'Ku频段：印尼全境覆盖
Ka频段：东南亚', `transponderCount` = NULL, `beacon` = NULL, `polarization` = NULL, `launchDate` = '2023-01-13', `designLife` = '15年', `ownership` = '代理', `manufacturer` = '中国空间技术研究院', `platform` = '东方红三号增强型(DFH-3E)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太6E卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT6E';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-6E', '亚太6E卫星', '134°E', '在轨运营', 'Ku频段：印尼全境覆盖
Ka频段：东南亚', NULL, NULL, NULL, '2023-01-13', '15年', '代理', '中国空间技术研究院', '东方红三号增强型(DFH-3E)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT6E');
UPDATE `satellite_info` SET `orbitPosition` = '76.5°E', `statusText` = '在轨运营', `coverage` = 'C波段：  亚洲、澳洲、非洲、欧洲大部及太平洋、印度洋可视范围内的主要岛屿和海域
Ku波段：  CHN波束：中国及周边部分地区
  MENA波束：中东、北非、中亚及部分欧洲地区
  AFR波束：非洲大部
  SSB波束：可指向可视区域内的任意一点
  以上4个波束间可实现上、下行互相交链', `transponderCount` = 'C波段28个转发器
Ku波段28个转发器', `beacon` = NULL, `polarization` = '线极化', `launchDate` = '2012-03-31', `designLife` = '15年', `ownership` = '代理', `manufacturer` = '法国泰雷兹阿莱尼亚宇航公司', `platform` = 'SB4000C2', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太7号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT7';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-7', '亚太7号卫星', '76.5°E', '在轨运营', 'C波段：  亚洲、澳洲、非洲、欧洲大部及太平洋、印度洋可视范围内的主要岛屿和海域
Ku波段：  CHN波束：中国及周边部分地区
  MENA波束：中东、北非、中亚及部分欧洲地区
  AFR波束：非洲大部
  SSB波束：可指向可视区域内的任意一点
  以上4个波束间可实现上、下行互相交链', 'C波段28个转发器
Ku波段28个转发器', NULL, '线极化', '2012-03-31', '15年', '代理', '法国泰雷兹阿莱尼亚宇航公司', 'SB4000C2', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT7');
UPDATE `satellite_info` SET `orbitPosition` = '142°E', `statusText` = '在轨运营', `coverage` = 'C波段：  SEA波束： 印尼、马来西亚、巴新及周边地区
  AP波束： 亚太地区
Ku波段：  西波束+
  北波束+
  南波束：形成东印度洋到西太平洋的完整覆盖
  可移动波束：可指向可视区域内的任意一点
  以上4个波束间可实现上、下行互相交链', `transponderCount` = 'C波段32个转发器
Ku波段14个转发器', `beacon` = NULL, `polarization` = '线极化', `launchDate` = '2015-10-17', `designLife` = '15年', `ownership` = '代理', `manufacturer` = '中国空间技术研究院', `platform` = '东方红四号（DFH-4)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太9号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT9';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-9', '亚太9号卫星', '142°E', '在轨运营', 'C波段：  SEA波束： 印尼、马来西亚、巴新及周边地区
  AP波束： 亚太地区
Ku波段：  西波束+
  北波束+
  南波束：形成东印度洋到西太平洋的完整覆盖
  可移动波束：可指向可视区域内的任意一点
  以上4个波束间可实现上、下行互相交链', 'C波段32个转发器
Ku波段14个转发器', NULL, '线极化', '2015-10-17', '15年', '代理', '中国空间技术研究院', '东方红四号（DFH-4)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT9');
UPDATE `satellite_info` SET `orbitPosition` = '130°E', `statusText` = '在轨运营', `coverage` = '中国及周边地区、澳大利亚及南太岛国等国家和地区', `transponderCount` = 'C频段25个转发器', `beacon` = 'C频段：
下行水平信标：3676.5（H）
下行垂直信标：3642（V）', `polarization` = '线极化', `launchDate` = '2019-03-10', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东方红四号（DFH-4)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星6C卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS6C';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS6C', '中星6C卫星', '130°E', '在轨运营', '中国及周边地区、澳大利亚及南太岛国等国家和地区', 'C频段25个转发器', 'C频段：
下行水平信标：3676.5（H）
下行垂直信标：3642（V）', '线极化', '2019-03-10', '15年', '自有', '中国空间技术研究院', '东方红四号（DFH-4)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS6C');
UPDATE `satellite_info` SET `orbitPosition` = '110.5°E', `statusText` = '在轨运营', `coverage` = '中国及近海区域', `transponderCount` = '前向Ka频段10个转发器
返向Ka频段6个转发器', `beacon` = '18508.8MHz(RHCP)\(LHCP)', `polarization` = '圆极化', `launchDate` = '2017-04-12', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东方红三号B卫星平台(DFH-3B)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星16号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS16';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS16', '中星16号卫星', '110.5°E', '在轨运营', '中国及近海区域', '前向Ka频段10个转发器
返向Ka频段6个转发器', '18508.8MHz(RHCP)\(LHCP)', '圆极化', '2017-04-12', '15年', '自有', '中国空间技术研究院', '东方红三号B卫星平台(DFH-3B)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS16');
UPDATE `satellite_info` SET `orbitPosition` = '92.2°E', `statusText` = '停止服务', `coverage` = '中国及周边地区', `transponderCount` = '22个DBS频段转发器', `beacon` = NULL, `polarization` = '圆极化', `launchDate` = '2008-06-09', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '法国泰雷兹阿莱尼亚宇航公司', `platform` = 'SB4000', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星9号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS9';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS9', '中星9号卫星', '92.2°E', '停止服务', '中国及周边地区', '22个DBS频段转发器', NULL, '圆极化', '2008-06-09', '15年', '自有', '法国泰雷兹阿莱尼亚宇航公司', 'SB4000', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS9');
UPDATE `satellite_info` SET `orbitPosition` = '110.5°E', `statusText` = '停止服务', `coverage` = '中国及周边地区', `transponderCount` = 'C频段30个转发器
Ku频段16个转发器', `beacon` = NULL, `polarization` = '线极化', `launchDate` = '2011-06-21', `designLife` = '13.5年', `ownership` = '自有', `manufacturer` = '中国空间技术研究院', `platform` = '东方红四号（DFH-4)', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星10号卫星（鑫诺5号）' WHERE REPLACE(`satelliteCode`,'-','') = 'CS10';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS10', '中星10号卫星（鑫诺5号）', '110.5°E', '停止服务', '中国及周边地区', 'C频段30个转发器
Ku频段16个转发器', NULL, '线极化', '2011-06-21', '13.5年', '自有', '中国空间技术研究院', '东方红四号（DFH-4)', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS10');
UPDATE `satellite_info` SET `orbitPosition` = '115.5°E', `statusText` = '离轨', `coverage` = '中国、蒙古、朝鲜半岛、日本、俄罗斯亚洲部分、南亚、东南亚、中亚、西亚、澳大利亚、新西兰', `transponderCount` = 'C频段38个转发器', `beacon` = NULL, `polarization` = '线极化', `launchDate` = '2007-07-05', `designLife` = '15年', `ownership` = '自有', `manufacturer` = '法国阿尔卡特阿莱尼亚宇航公司', `platform` = 'SB4000', `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '中星6B卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS6B';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS6B', '中星6B卫星', '115.5°E', '离轨', '中国、蒙古、朝鲜半岛、日本、俄罗斯亚洲部分、南亚、东南亚、中亚、西亚、澳大利亚、新西兰', 'C频段38个转发器', NULL, '线极化', '2007-07-05', '15年', '自有', '法国阿尔卡特阿莱尼亚宇航公司', 'SB4000', '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS6B');
UPDATE `satellite_info` SET `orbitPosition` = '138°E', `statusText` = '离轨', `coverage` = '中国及周边地区', `transponderCount` = NULL, `beacon` = NULL, `polarization` = '线极化', `launchDate` = NULL, `designLife` = NULL, `ownership` = '代理', `manufacturer` = NULL, `platform` = NULL, `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太5号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT5';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-5', '亚太5号卫星', '138°E', '离轨', '中国及周边地区', NULL, NULL, '线极化', NULL, NULL, '代理', NULL, NULL, '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT5');
UPDATE `satellite_info` SET `orbitPosition` = '134°E', `statusText` = '离轨', `coverage` = '中国及周边地区', `transponderCount` = NULL, `beacon` = NULL, `polarization` = '线极化', `launchDate` = NULL, `designLife` = NULL, `ownership` = '代理', `manufacturer` = NULL, `platform` = NULL, `attitudeStabilization` = '三轴稳定', `stationKeepingAccuracy` = '±0.05°（E-W & N-S）', `remark` = NULL, `satelliteName` = '亚太6号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'APT6';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'APT-6', '亚太6号卫星', '134°E', '离轨', '中国及周边地区', NULL, NULL, '线极化', NULL, NULL, '代理', NULL, NULL, '三轴稳定', '±0.05°（E-W & N-S）', NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'APT6');
UPDATE `satellite_info` SET `orbitPosition` = NULL, `statusText` = '离轨', `coverage` = NULL, `transponderCount` = NULL, `beacon` = NULL, `polarization` = NULL, `launchDate` = NULL, `designLife` = NULL, `ownership` = NULL, `manufacturer` = NULL, `platform` = NULL, `attitudeStabilization` = NULL, `stationKeepingAccuracy` = NULL, `remark` = NULL, `satelliteName` = '中星6A卫星（鑫诺6号）' WHERE REPLACE(`satelliteCode`,'-','') = 'CS6A';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS6A', '中星6A卫星（鑫诺6号）', NULL, '离轨', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS6A');
UPDATE `satellite_info` SET `orbitPosition` = NULL, `statusText` = '离轨', `coverage` = NULL, `transponderCount` = NULL, `beacon` = NULL, `polarization` = NULL, `launchDate` = NULL, `designLife` = NULL, `ownership` = NULL, `manufacturer` = NULL, `platform` = NULL, `attitudeStabilization` = NULL, `stationKeepingAccuracy` = NULL, `remark` = NULL, `satelliteName` = '中星9A卫星（鑫诺4号）' WHERE REPLACE(`satelliteCode`,'-','') = 'CS9A';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS9A', '中星9A卫星（鑫诺4号）', NULL, '离轨', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS9A');
UPDATE `satellite_info` SET `orbitPosition` = NULL, `statusText` = '在建', `coverage` = NULL, `transponderCount` = NULL, `beacon` = NULL, `polarization` = NULL, `launchDate` = NULL, `designLife` = NULL, `ownership` = NULL, `manufacturer` = NULL, `platform` = NULL, `attitudeStabilization` = NULL, `stationKeepingAccuracy` = NULL, `remark` = NULL, `satelliteName` = '中星27号卫星' WHERE REPLACE(`satelliteCode`,'-','') = 'CS27';
INSERT INTO `satellite_info` (`satelliteCode`, `satelliteName`, `orbitPosition`, `statusText`, `coverage`, `transponderCount`, `beacon`, `polarization`, `launchDate`, `designLife`, `ownership`, `manufacturer`, `platform`, `attitudeStabilization`, `stationKeepingAccuracy`, `remark`)
  SELECT 'CS27', '中星27号卫星', NULL, '在建', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM DUAL
  WHERE NOT EXISTS (SELECT 1 FROM `satellite_info` WHERE REPLACE(`satelliteCode`,'-','') = 'CS27');
