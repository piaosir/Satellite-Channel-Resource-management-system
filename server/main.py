"""
RF Matrix API — Python / FastAPI 后端
======================================
启动:
    cd server
    pip install -r requirements.txt
    cp .env.example .env          # 填写 MySQL 配置
    uvicorn main:app --reload --port 8000

接口文档 (启动后自动生成):
    http://localhost:8000/docs

路由总览:
    GET    /api/health
    GET    /api/satellites
    GET    /api/matrices/{satellite_id}
    GET    /api/transponders/{satellite_id}
    GET    /api/frequency-blocks/satellite/{satellite_id}  ← 必须在 /{switch_id} 之前
    GET    /api/frequency-blocks/{switch_id}
    POST   /api/frequency-blocks
    PUT    /api/frequency-blocks/{fb_id}
    DELETE /api/frequency-blocks/{fb_id}

    -- 通道占用状态（分频工程师二次分配，v0.3）--
    GET    /api/occupation-records/satellite/{satellite_id}
    GET    /api/occupation-records/switch/{switch_id}
    GET    /api/occupation-records/planning-block/{planning_block_id}
    POST   /api/occupation-records
    PUT    /api/occupation-records/{record_id}
    DELETE /api/occupation-records/{record_id}
"""

import logging
import os
import time
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Optional

import pymysql
import pymysql.cursors
from dbutils.pooled_db import PooledDB
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from migrate import run_migrations

load_dotenv()

log = logging.getLogger(__name__)

# ── FastAPI 应用 ───────────────────────────────────────────────
app = FastAPI(title="RF Matrix API", version="1.0.0")


@app.on_event("startup")
async def _auto_migrate():
    """启动时自动应用尚未执行的数据库迁移。"""
    try:
        run_migrations(verbose=False)
    except Exception as exc:
        log.critical("数据库迁移失败，请检查 migrations/ 目录：%s", exc, exc_info=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 开发环境全放通；生产环境改为具体域名
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MySQL 连接池 ───────────────────────────────────────────────
# 使用连接池避免每次请求重新建立 TCP 连接，显著降低延迟
_pool = PooledDB(
    creator=pymysql,
    maxconnections=10,   # 最大活跃连接数
    mincached=2,         # 启动时预创建的空闲连接数
    maxcached=5,         # 最多缓存的空闲连接数
    blocking=True,       # 连接耗尽时排队等待
    ping=1,              # 取连接时检测可用性（自动重连断开的连接）
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "v5"),
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True,
)


@contextmanager
def get_cursor():
    """从连接池取连接，返回 DictCursor，结束后归还连接。"""
    conn = _pool.connection()
    try:
        with conn.cursor() as cur:
            yield cur
    finally:
        conn.close()   # 归还到连接池，而非真正关闭


def to_json(rows: list[dict]) -> list[dict]:
    """将 pymysql 返回的 Decimal/bytes 转换为 JSON 可序列化类型。"""
    def cast(v: Any) -> Any:
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, bytes):
            return v.decode("utf-8", errors="replace")
        return v
    return [{k: cast(v) for k, v in row.items()} for row in rows]


def db_error(e: Exception) -> HTTPException:
    return HTTPException(status_code=500, detail=str(e))


# ── Request body schemas ───────────────────────────────────────
class FrequencyBlockCreate(BaseModel):
    frequencyBlockCode:  Optional[str]   = None
    frequencyBlockCode2: Optional[str]   = None
    switchId:            int
    switchCode:          Optional[str]   = None
    frequencyOffset:     float
    occupiedBandwidth:   float
    partitionStatus:     Optional[str]   = "P"   # P=规划  R=已分配  N=无效
    usageType:           Optional[str]   = None   # 出租/合作/自用/禁用
    uplinkStartFreq:     Optional[float] = None
    uplinkEndFreq:       Optional[float] = None
    downlinkStartFreq:   Optional[float] = None
    downlinkEndFreq:     Optional[float] = None


class FrequencyBlockUpdate(BaseModel):
    frequencyOffset:   float
    occupiedBandwidth: float
    partitionStatus:   Optional[str]   = "P"
    usageType:         Optional[str]   = None
    uplinkStartFreq:   Optional[float] = None
    uplinkEndFreq:     Optional[float] = None
    downlinkStartFreq: Optional[float] = None
    downlinkEndFreq:   Optional[float] = None


# ══════════════════════════════════════════════════════════════
#  路由
# ══════════════════════════════════════════════════════════════

# ── 健康检查 ──────────────────────────────────────────────────
@app.get("/api/health")
def health():
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
        return {
            "status": "ok",
            "db": f"{os.getenv('DB_NAME','v5')} @ {os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','3306')}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB unreachable: {e}")


# ── 卫星列表 ──────────────────────────────────────────────────
@app.get("/api/satellites")
def list_satellites():
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, satelliteCode, satelliteName,
                       orbitPosition, statusText, coverage, transponderCount,
                       beacon, polarization, launchDate, designLife, ownership,
                       manufacturer, platform, attitudeStabilization,
                       stationKeepingAccuracy, remark
                FROM satellite_info
                ORDER BY id
                """
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ── 卫星详情 ──────────────────────────────────────────────────
@app.get("/api/satellites/{satellite_id}")
def get_satellite(satellite_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, satelliteCode, satelliteName,
                       orbitPosition, statusText, coverage, transponderCount,
                       beacon, polarization, launchDate, designLife, ownership,
                       manufacturer, platform, attitudeStabilization,
                       stationKeepingAccuracy, remark
                FROM satellite_info
                WHERE id = %s
                """,
                (satellite_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="satellite not found")
            return to_json([row])[0]
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ── 矩阵列表（按卫星，仅 effectiveStatus=1）───────────────────
@app.get("/api/matrices/{satellite_id}")
def list_matrices(satellite_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, matrixCode, satelliteId, satelliteCode,
                       areaNo, groupNo, inputPortCount, outputPortCount,
                       effectiveStatus, remark
                FROM switch_matrix_info
                WHERE satelliteId = %s AND effectiveStatus = 1
                ORDER BY areaNo, groupNo
                """,
                (satellite_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ── 转发器列表（按卫星，含频率 / 波束 / 开关状态） ─────────────
#
#  v5 Schema 路由链：
#    matrix_switch_status
#      → matrix_port_info (inputPortId / outputPortId)
#      → channel_info     (channelId)
#      → channel_group_info (channelGroupId + satelliteId 过滤)
#
#  antennaCode（中文波束名）映射到前端"波束"列（antennaName / txAntennaName）
# ─────────────────────────────────────────────────────────────
@app.get("/api/transponders/{satellite_id}")
def list_transponders(satellite_id: int):
    sql = """
        SELECT
            sw.id                                       AS switchId,
            sw.switchCode,
            sw.switchStatus,
            sw.switchType,
            sw.twtValidStatus                           AS twtValidStatusCode,
            sw.usedTwtCode,
            sw.p0, sw.p1, sw.p2,
            ci_rx.commonName                                    AS transponderName,
            ci_rx.id                                            AS inputChannelId,
            ci_rx.channelStartFreq                      AS rxStartFreq,
            ci_rx.channelEndFreq                        AS rxEndFreq,
            ci_rx.channelBandwidth                      AS channelBw,
            ci_tx.channelStartFreq                      AS txStartFreq,
            ci_tx.channelEndFreq                        AS txEndFreq,
            cg_rx.band,
            cg_rx.polarization,
            cg_rx.txRxType,
            cg_rx.antennaCode                          AS antennaName,
            cg_tx.band                                  AS txBand,
            cg_tx.polarization                          AS txPolarization,
            cg_tx.antennaCode                           AS txAntennaName,
            mpi_in.channelShortName                     AS inputChannelShortName,
            mpi_out.channelShortName                    AS outputChannelShortName,
            m.id                                        AS matrixId,
            m.matrixCode,
            m.remark                                    AS matrixRemark,
            m.satelliteId
        FROM matrix_switch_status sw
        JOIN switch_matrix_info   m       ON m.id        = sw.matrixId
        LEFT JOIN matrix_port_info     mpi_in  ON mpi_in.id  = sw.inputPortId
        LEFT JOIN matrix_port_info     mpi_out ON mpi_out.id = sw.outputPortId
        LEFT JOIN channel_info         ci_rx   ON ci_rx.id   = mpi_in.channelId
        LEFT JOIN channel_info         ci_tx   ON ci_tx.id   = mpi_out.channelId
        LEFT JOIN channel_group_info   cg_rx   ON cg_rx.id   = ci_rx.channelGroupId
        LEFT JOIN channel_group_info   cg_tx   ON cg_tx.id   = ci_tx.channelGroupId
        WHERE m.satelliteId = %s
        ORDER BY cg_rx.band, sw.inputPortSeq
    """
    try:
        with get_cursor() as cur:
            cur.execute(sql, (satellite_id,))
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ── 某卫星全部频率块（含完整关联字段，供报表 / 管理页） ─────────
#  ⚠️  此路由必须注册在 /{switch_id} 之前，否则 "satellite" 会被
#      FastAPI 解析为 switch_id 整数而触发 422
# ─────────────────────────────────────────────────────────────
@app.get("/api/frequency-blocks/satellite/{satellite_id}")
def list_frequency_blocks_by_satellite(satellite_id: int):
    sql = """
        SELECT
            fb.id,
            fb.frequencyBlockCode,
            fb.frequencyBlockCode2,
            fb.switchId,
            fb.switchCode,
            fb.frequencyOffset,
            fb.occupiedBandwidth,
            fb.partitionStatus,
            fb.statusUpdateTime,
            fb.usageType,
            fb.uplinkStartFreq,
            fb.uplinkEndFreq,
            fb.downlinkStartFreq,
            fb.downlinkEndFreq,
            sw.switchStatus,
            sw.switchType,
            sw.twtValidStatus                           AS twtValidStatusCode,
            mpi_in.channelShortName                     AS inputChannelShortName,
            mpi_out.channelShortName                    AS outputChannelShortName,
            ci_rx.commonName                                    AS transponderName,
            ci_rx.id                                            AS inputChannelId,
            m.satelliteCode,
            m.areaNo,
            m.groupNo,
            m.remark                                    AS matrixRemark,
            cg_rx.band,
            cg_rx.polarization,
            cg_rx.txRxType,
            cg_rx.antennaCode                           AS antennaName,
            cg_tx.band                                  AS txBand,
            cg_tx.polarization                          AS txPolarization,
            cg_tx.antennaCode                           AS txAntennaName,
            ci_rx.channelStartFreq,
            ci_rx.channelEndFreq,
            ci_rx.channelBandwidth,
            ci_tx.channelStartFreq                      AS txChannelStartFreq,
            ci_tx.channelEndFreq                        AS txChannelEndFreq,
            ci_tx.channelBandwidth                      AS txChannelBandwidth
        FROM frequency_block_realtime_status fb
        JOIN matrix_switch_status  sw      ON sw.id      = fb.switchId
        JOIN switch_matrix_info    m       ON m.id        = sw.matrixId
        LEFT JOIN matrix_port_info      mpi_in  ON mpi_in.id  = sw.inputPortId
        LEFT JOIN matrix_port_info      mpi_out ON mpi_out.id = sw.outputPortId
        LEFT JOIN channel_info          ci_rx   ON ci_rx.id   = mpi_in.channelId
        LEFT JOIN channel_info          ci_tx   ON ci_tx.id   = mpi_out.channelId
        LEFT JOIN channel_group_info    cg_rx   ON cg_rx.id   = ci_rx.channelGroupId
        LEFT JOIN channel_group_info    cg_tx   ON cg_tx.id   = ci_tx.channelGroupId
        WHERE m.satelliteId = %s
        ORDER BY cg_rx.band, sw.inputPortSeq, fb.frequencyOffset
    """
    try:
        with get_cursor() as cur:
            cur.execute(sql, (satellite_id,))
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ── 某开关的频率块列表 ────────────────────────────────────────
@app.get("/api/frequency-blocks/{switch_id}")
def list_frequency_blocks(switch_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, frequencyBlockCode, frequencyBlockCode2,
                       switchId, switchCode, frequencyOffset, occupiedBandwidth,
                       partitionStatus, statusUpdateTime, usageType,
                       uplinkStartFreq, uplinkEndFreq, downlinkStartFreq, downlinkEndFreq
                FROM frequency_block_realtime_status
                WHERE switchId = %s
                ORDER BY frequencyOffset
                """,
                (switch_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ── 新建频率块 ────────────────────────────────────────────────
@app.post("/api/frequency-blocks", status_code=201)
def create_frequency_block(body: FrequencyBlockCreate):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO frequency_block_realtime_status
                    (frequencyBlockCode, frequencyBlockCode2, switchId, switchCode,
                     frequencyOffset, occupiedBandwidth, partitionStatus, statusUpdateTime,
                     usageType, uplinkStartFreq, uplinkEndFreq, downlinkStartFreq, downlinkEndFreq)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    body.frequencyBlockCode,
                    body.frequencyBlockCode2,
                    body.switchId,
                    body.switchCode,
                    body.frequencyOffset,
                    body.occupiedBandwidth,
                    body.partitionStatus,
                    int(time.time() * 1000),   # 毫秒时间戳
                    body.usageType,
                    body.uplinkStartFreq,
                    body.uplinkEndFreq,
                    body.downlinkStartFreq,
                    body.downlinkEndFreq,
                ),
            )
            return {"id": cur.lastrowid}
    except Exception as e:
        raise db_error(e)


# ── 更新频率块 ────────────────────────────────────────────────
@app.put("/api/frequency-blocks/{fb_id}")
def update_frequency_block(fb_id: int, body: FrequencyBlockUpdate):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                UPDATE frequency_block_realtime_status
                SET frequencyOffset   = %s,
                    occupiedBandwidth = %s,
                    partitionStatus   = %s,
                    statusUpdateTime  = %s,
                    usageType         = %s,
                    uplinkStartFreq   = %s,
                    uplinkEndFreq     = %s,
                    downlinkStartFreq = %s,
                    downlinkEndFreq   = %s
                WHERE id = %s
                """,
                (
                    body.frequencyOffset,
                    body.occupiedBandwidth,
                    body.partitionStatus,
                    int(time.time() * 1000),
                    body.usageType,
                    body.uplinkStartFreq,
                    body.uplinkEndFreq,
                    body.downlinkStartFreq,
                    body.downlinkEndFreq,
                    fb_id,
                ),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="record not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ── 删除频率块 ────────────────────────────────────────────────
@app.delete("/api/frequency-blocks/{fb_id}")
def delete_frequency_block(fb_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                "DELETE FROM frequency_block_realtime_status WHERE id = %s",
                (fb_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="record not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)

# ── 修改通道常用名称 ───────────────────────────────────
@app.patch("/api/channels/{channel_id}/common-name")
def update_channel_common_name(channel_id: int, body: dict):
    common_name = body.get("commonName")
    if not common_name or not isinstance(common_name, str) or not common_name.strip():
        raise HTTPException(status_code=422, detail="commonName is required")
    try:
        with get_cursor() as cur:
            cur.execute(
                "UPDATE channel_info SET commonName = %s WHERE id = %s",
                (common_name.strip(), channel_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="channel not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ── 资源统计（设计带宽 vs 占用带宽，按频段 + 使用类型汇总） ────
@app.get("/api/stats/{satellite_id}")
def get_stats(satellite_id: int):
    """
    全卫星资源统计汇总，供资源统计页直接使用，避免前端大量 JOIN 计算。
    返回：
      byBand       — 各频段设计带宽 / 在用(P) / 回收(R)
      byUsageType  — 使用类型分布（仅 P 状态）
      summary      — 全局汇总数字
    """
    try:
        with get_cursor() as cur:
            # ① 各频段设计带宽（每个开关的输入通道带宽，按频段求和）
            cur.execute("""
                SELECT cg.band,
                       SUM(ci.channelBandwidth) AS designBw
                FROM matrix_switch_status    sw
                JOIN  switch_matrix_info     m   ON m.id   = sw.matrixId
                LEFT JOIN matrix_port_info   mpi ON mpi.id = sw.inputPortId
                LEFT JOIN channel_info       ci  ON ci.id  = mpi.channelId
                LEFT JOIN channel_group_info cg  ON cg.id  = ci.channelGroupId
                WHERE m.satelliteId = %s
                  AND cg.band IS NOT NULL
                GROUP BY cg.band
            """, (satellite_id,))
            design_rows = cur.fetchall()

            # ② 各频段已占用带宽（P / R 分开统计，通过相同 JOIN 链取 band）
            cur.execute("""
                SELECT cg.band,
                       SUM(CASE WHEN fb.partitionStatus = 'P'
                                THEN fb.occupiedBandwidth ELSE 0 END) AS usedBw,
                       SUM(CASE WHEN fb.partitionStatus = 'R'
                                THEN fb.occupiedBandwidth ELSE 0 END) AS recoveredBw
                FROM frequency_block_realtime_status fb
                JOIN  matrix_switch_status   sw  ON sw.id   = fb.switchId
                JOIN  switch_matrix_info     m   ON m.id    = sw.matrixId
                LEFT JOIN matrix_port_info   mpi ON mpi.id  = sw.inputPortId
                LEFT JOIN channel_info       ci  ON ci.id   = mpi.channelId
                LEFT JOIN channel_group_info cg  ON cg.id   = ci.channelGroupId
                WHERE m.satelliteId = %s
                  AND cg.band IS NOT NULL
                GROUP BY cg.band
            """, (satellite_id,))
            occ_rows = cur.fetchall()

            # ③ 使用类型分布（仅 P 状态）
            cur.execute("""
                SELECT COALESCE(fb.usageType, '未分类') AS usageType,
                       SUM(fb.occupiedBandwidth)         AS bw
                FROM frequency_block_realtime_status fb
                JOIN switch_matrix_info m ON m.id = (
                    SELECT matrixId FROM matrix_switch_status WHERE id = fb.switchId
                )
                WHERE m.satelliteId = %s
                  AND fb.partitionStatus = 'P'
                GROUP BY fb.usageType
            """, (satellite_id,))
            type_rows = cur.fetchall()

        design_map = {r["band"]: float(r["designBw"] or 0) for r in design_rows}
        occ_map = {
            r["band"]: {
                "usedBw":      float(r["usedBw"]      or 0),
                "recoveredBw": float(r["recoveredBw"] or 0),
            }
            for r in occ_rows
        }
        all_bands = sorted(set(list(design_map) + list(occ_map)))

        by_band: list[dict] = []
        total_design = total_used = total_recovered = 0.0
        for band in all_bands:
            d  = design_map.get(band, 0.0)
            o  = occ_map.get(band, {"usedBw": 0.0, "recoveredBw": 0.0})
            u, rv = o["usedBw"], o["recoveredBw"]
            by_band.append({
                "band":        band,
                "designBw":    round(d,  3),
                "usedBw":      round(u,  3),
                "recoveredBw": round(rv, 3),
            })
            total_design    += d
            total_used      += u
            total_recovered += rv

        return {
            "byBand": by_band,
            "byUsageType": [
                {"usageType": r["usageType"], "bw": round(float(r["bw"] or 0), 3)}
                for r in type_rows
            ],
            "summary": {
                "totalDesignBw":   round(total_design,              3),
                "usedBw":          round(total_used,                3),
                "recoveredBw":     round(total_recovered,           3),
                "totalOccupiedBw": round(total_used + total_recovered, 3),
            },
        }
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  行波管 TWT 实时状态
# ══════════════════════════════════════════════════════════════
class TwtUpdate(BaseModel):
    onOff:        Optional[str] = None
    mutingStatus: Optional[str] = None
    gainMode:     Optional[str] = None
    gainLevel:    Optional[int] = None


# ── 某卫星的 TWT 清单 ─────────────────────────────────────────
@app.get("/api/twt/satellite/{satellite_id}")
def list_twt(satellite_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, twtCodeLong, twtCodeShort, satelliteCode, satelliteId,
                       unitCode, onOff, mutingStatus, gainMode, gainLevel,
                       statusUpdateTime
                FROM twt_realtime_status
                WHERE satelliteId = %s
                ORDER BY id
                """,
                (satellite_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ── 更新某 TWT 状态（测控操作） ───────────────────────────────
@app.patch("/api/twt/{twt_id}")
def update_twt(twt_id: int, body: TwtUpdate):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=422, detail="no fields to update")
    sets = ", ".join(f"{k} = %s" for k in fields)
    params = list(fields.values()) + [int(time.time() * 1000), twt_id]
    try:
        with get_cursor() as cur:
            cur.execute(
                f"UPDATE twt_realtime_status SET {sets}, statusUpdateTime = %s WHERE id = %s",
                params,
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="twt not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  通道属性（增益 / SFD）
# ══════════════════════════════════════════════════════════════
@app.get("/api/channel-attributes/satellite/{satellite_id}")
def list_channel_attributes(satellite_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, switchCode, matrixCode, inputPortSeq, outputPortSeq,
                       inputChannelShortName, outputChannelShortName, gainMode,
                       currentLevel, startLevel, maxLevel, levelStep,
                       startSfdRef, currentSfd, satelliteId, switchId
                FROM channel_attribute_info
                WHERE satelliteId = %s
                ORDER BY matrixCode, inputPortSeq
                """,
                (satellite_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  开关组
# ══════════════════════════════════════════════════════════════
@app.get("/api/switch-groups/satellite/{satellite_id}")
def list_switch_groups(satellite_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, switchGroupCode, switchCode, matrixCode,
                       inputPortSeq, outputPortSeq, inputChannelShortName,
                       outputChannelShortName, switchStatus, switchType,
                       checkRule, satelliteId
                FROM switch_group_info
                WHERE satelliteId = %s
                ORDER BY switchGroupCode, inputPortSeq
                """,
                (satellite_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  合约记录（新）
# ══════════════════════════════════════════════════════════════
@app.get("/api/contracts")
def list_contracts(satellite: Optional[str] = None):
    where = "WHERE satelliteCode = %s" if satellite else ""
    params = (satellite,) if satellite else ()
    try:
        with get_cursor() as cur:
            cur.execute(
                f"""
                SELECT id, remarkInfo, productInstanceId, subOrderCode, partyA,
                       productName, contractNo, remark, frequencyBlockCode2,
                       exclusiveType, usedBandwidth, startTime, endTime,
                       satelliteCode, uplinkBeamCode, uplinkPolarization,
                       uplinkStartFreq, uplinkEndFreq, downlinkBeamCode,
                       downlinkPolarization, downlinkStartFreq, downlinkEndFreq,
                       satelliteId, frequencyBlockId
                FROM contract_record
                {where}
                ORDER BY id
                """,
                params,
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  商品实例清单
# ══════════════════════════════════════════════════════════════
@app.get("/api/product-instances")
def list_product_instances():
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, productInstanceCode, subOrderCode, productName,
                       instanceType, unitPrice, contractPeriod, planStartTime,
                       planEndTime, fulfillStatus, subOrderCategory, mainOrderCode,
                       contractNo, partyA, groupName, sales, reporter,
                       subOrderAmount, mainOrderAmount, bandwidthMHz,
                       satelliteCode, frequencyBlockCode2, exclusiveType, remark
                FROM product_instance
                ORDER BY id
                """
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  通道占用状态（occupation_realtime_status）
#  分频工程师（行业经理/网络系统工程师）在规划块上二次分配
# ══════════════════════════════════════════════════════════════

class OccupationRecordCreate(BaseModel):
    planningBlockId:   Optional[int]   = None
    planningBlockCode: Optional[str]   = None
    switchId:          int
    switchCode:        Optional[str]   = None
    frequencyOffset:   float
    occupiedBandwidth: float
    blockValid:        Optional[int]   = 1        # 1=有效 0=无效
    usageType:         Optional[str]   = None
    uplinkStartFreq:   Optional[float] = None
    uplinkEndFreq:     Optional[float] = None
    downlinkStartFreq: Optional[float] = None
    downlinkEndFreq:   Optional[float] = None
    remarkFulfillment: Optional[str]   = None
    remarkUser:        Optional[str]   = None
    remarkSales:       Optional[str]   = None


class OccupationRecordUpdate(BaseModel):
    frequencyOffset:   float
    occupiedBandwidth: float
    blockValid:        Optional[int]   = 1        # 1=有效 0=无效
    usageType:         Optional[str]   = None
    uplinkStartFreq:   Optional[float] = None
    uplinkEndFreq:     Optional[float] = None
    downlinkStartFreq: Optional[float] = None
    downlinkEndFreq:   Optional[float] = None
    remarkFulfillment: Optional[str]   = None
    remarkUser:        Optional[str]   = None
    remarkSales:       Optional[str]   = None


class DeliveryRecordCreate(BaseModel):
    allocationBlockId:   Optional[int] = None
    allocationBlockCode: Optional[str] = None
    planningBlockId:     Optional[int] = None
    planningBlockCode:   Optional[str] = None
    switchId:            Optional[int] = None
    switchCode:          Optional[str] = None
    occupyStatus:        str                       # P=占用  R=释放
    usageType:           Optional[str] = None
    contractNo:          Optional[str] = None
    partyA:              Optional[str] = None
    operateUser:         Optional[str] = None
    supervisorUser:      Optional[str] = None
    remark:              Optional[str] = None


_OCC_FULL_SQL = """
    SELECT
        occ.id,
        occ.occupationCode,
        occ.planningBlockId,
        occ.planningBlockCode,
        occ.switchId,
        occ.switchCode,
        occ.frequencyOffset,
        occ.occupiedBandwidth,
        occ.partitionStatus,
        occ.statusUpdateTime,
        occ.usageType,
        occ.uplinkStartFreq,
        occ.uplinkEndFreq,
        occ.downlinkStartFreq,
        occ.downlinkEndFreq,
        occ.remarkFulfillment,
        occ.remarkUser,
        occ.remarkSales,
        occ.isValid                             AS blockValid,
        COALESCE(fb.frequencyBlockCode2, occ.planningBlockCode) AS planningBlockCodeFull,
        fb.usageType                        AS planningUsageType,
        fb.frequencyOffset                  AS planningOffset,
        fb.occupiedBandwidth                AS planningBandwidth,
        sw.switchStatus,
        sw.switchType,
        sw.twtValidStatus                   AS twtValidStatusCode,
        mpi_in.channelShortName             AS inputChannelShortName,
        mpi_out.channelShortName            AS outputChannelShortName,
        ci_rx.commonName                    AS transponderName,
        ci_rx.id                            AS inputChannelId,
        m.satelliteCode,
        m.areaNo,
        m.groupNo,
        m.remark                            AS matrixRemark,
        m.id                                AS matrixId,
        m.matrixCode,
        cg_rx.band,
        cg_rx.polarization,
        cg_rx.txRxType,
        cg_rx.antennaCode                   AS antennaName,
        cg_tx.band                          AS txBand,
        cg_tx.polarization                  AS txPolarization,
        cg_tx.antennaCode                   AS txAntennaName,
        ci_rx.channelStartFreq,
        ci_rx.channelEndFreq,
        ci_rx.channelBandwidth,
        ci_tx.channelStartFreq              AS txChannelStartFreq,
        ci_tx.channelEndFreq                AS txChannelEndFreq,
        ci_tx.channelBandwidth              AS txChannelBandwidth
    FROM occupation_realtime_status occ
    JOIN  matrix_switch_status   sw      ON sw.id      = occ.switchId
    JOIN  switch_matrix_info     m       ON m.id        = sw.matrixId
    LEFT JOIN frequency_block_realtime_status fb
                                         ON fb.id      = occ.planningBlockId
    LEFT JOIN matrix_port_info   mpi_in  ON mpi_in.id  = sw.inputPortId
    LEFT JOIN matrix_port_info   mpi_out ON mpi_out.id = sw.outputPortId
    LEFT JOIN channel_info       ci_rx   ON ci_rx.id   = mpi_in.channelId
    LEFT JOIN channel_info       ci_tx   ON ci_tx.id   = mpi_out.channelId
    LEFT JOIN channel_group_info cg_rx   ON cg_rx.id   = ci_rx.channelGroupId
    LEFT JOIN channel_group_info cg_tx   ON cg_tx.id   = ci_tx.channelGroupId
"""


@app.get("/api/occupation-records/satellite/{satellite_id}")
def list_occupation_records_by_satellite(satellite_id: int):
    sql = _OCC_FULL_SQL + """
        WHERE m.satelliteId = %s
        ORDER BY cg_rx.band, sw.inputPortSeq, occ.frequencyOffset
    """
    try:
        with get_cursor() as cur:
            cur.execute(sql, (satellite_id,))
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


@app.get("/api/occupation-records/switch/{switch_id}")
def list_occupation_records_by_switch(switch_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, occupationCode, planningBlockId, planningBlockCode,
                       switchId, switchCode, frequencyOffset, occupiedBandwidth,
                       partitionStatus, isValid AS blockValid, statusUpdateTime, usageType,
                       uplinkStartFreq, uplinkEndFreq, downlinkStartFreq, downlinkEndFreq,
                       remarkFulfillment, remarkUser, remarkSales
                FROM occupation_realtime_status
                WHERE switchId = %s
                ORDER BY frequencyOffset
                """,
                (switch_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


@app.get("/api/occupation-records/planning-block/{planning_block_id}")
def list_occupation_records_by_planning_block(planning_block_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, occupationCode, planningBlockId, planningBlockCode,
                       switchId, switchCode, frequencyOffset, occupiedBandwidth,
                       partitionStatus, isValid AS blockValid, statusUpdateTime, usageType,
                       uplinkStartFreq, uplinkEndFreq, downlinkStartFreq, downlinkEndFreq,
                       remarkFulfillment, remarkUser, remarkSales
                FROM occupation_realtime_status
                WHERE planningBlockId = %s
                ORDER BY frequencyOffset
                """,
                (planning_block_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


@app.post("/api/occupation-records", status_code=201)
def create_occupation_record(body: OccupationRecordCreate):
    now_ms = int(time.time() * 1000)
    occ_code = f"OCC-{now_ms}-{body.switchId}"
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO occupation_realtime_status
                    (occupationCode, planningBlockId, planningBlockCode,
                     switchId, switchCode, frequencyOffset, occupiedBandwidth,
                     partitionStatus, statusUpdateTime, usageType,
                     uplinkStartFreq, uplinkEndFreq, downlinkStartFreq, downlinkEndFreq,
                     remarkFulfillment, remarkUser, remarkSales, isValid, createdAt)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'P', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    occ_code,
                    body.planningBlockId,
                    body.planningBlockCode,
                    body.switchId,
                    body.switchCode,
                    body.frequencyOffset,
                    body.occupiedBandwidth,
                    now_ms,
                    body.usageType,
                    body.uplinkStartFreq,
                    body.uplinkEndFreq,
                    body.downlinkStartFreq,
                    body.downlinkEndFreq,
                    body.remarkFulfillment,
                    body.remarkUser,
                    body.remarkSales,
                    1 if (body.blockValid is None or body.blockValid) else 0,
                    now_ms,
                ),
            )
            return {"id": cur.lastrowid}
    except Exception as e:
        raise db_error(e)


@app.put("/api/occupation-records/{record_id}")
def update_occupation_record(record_id: int, body: OccupationRecordUpdate):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                UPDATE occupation_realtime_status
                SET frequencyOffset   = %s,
                    occupiedBandwidth = %s,
                    isValid           = %s,
                    statusUpdateTime  = %s,
                    usageType         = %s,
                    uplinkStartFreq   = %s,
                    uplinkEndFreq     = %s,
                    downlinkStartFreq = %s,
                    downlinkEndFreq   = %s,
                    remarkFulfillment = %s,
                    remarkUser        = %s,
                    remarkSales       = %s
                WHERE id = %s
                """,
                (
                    body.frequencyOffset,
                    body.occupiedBandwidth,
                    1 if (body.blockValid is None or body.blockValid) else 0,
                    int(time.time() * 1000),
                    body.usageType,
                    body.uplinkStartFreq,
                    body.uplinkEndFreq,
                    body.downlinkStartFreq,
                    body.downlinkEndFreq,
                    body.remarkFulfillment,
                    body.remarkUser,
                    body.remarkSales,
                    record_id,
                ),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="record not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


@app.delete("/api/occupation-records/{record_id}")
def delete_occupation_record(record_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                "DELETE FROM occupation_realtime_status WHERE id = %s",
                (record_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="record not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)

# ══════════════════════════════════════════════════════════════════
# 带宽合约-交付过程记录（P=占用 / R=释放）
# ══════════════════════════════════════════════════════════════════

@app.get("/api/delivery-records/allocation-block/{allocation_block_id}")
def list_delivery_records_by_allocation_block(allocation_block_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT id, deliveryCode, allocationBlockId, allocationBlockCode,
                       planningBlockId, planningBlockCode, switchId, switchCode,
                       occupyStatus, usageType, contractNo, partyA,
                       operateUser, supervisorUser, operateTime, remark, isValid, createdAt
                FROM delivery_process_record
                WHERE allocationBlockId = %s AND isValid = 1
                ORDER BY operateTime DESC
                """,
                (allocation_block_id,),
            )
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


@app.post("/api/delivery-records", status_code=201)
def create_delivery_record(body: DeliveryRecordCreate):
    now_ms = int(time.time() * 1000)
    code = f"DLV-{now_ms}-{body.allocationBlockId or 0}"
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO delivery_process_record
                    (deliveryCode, allocationBlockId, allocationBlockCode,
                     planningBlockId, planningBlockCode, switchId, switchCode,
                     occupyStatus, usageType, contractNo, partyA,
                     operateUser, supervisorUser, operateTime, remark, isValid, createdAt)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1,%s)
                """,
                (
                    code, body.allocationBlockId, body.allocationBlockCode,
                    body.planningBlockId, body.planningBlockCode,
                    body.switchId, body.switchCode,
                    body.occupyStatus, body.usageType,
                    body.contractNo, body.partyA,
                    body.operateUser, body.supervisorUser,
                    now_ms, body.remark, now_ms,
                ),
            )
            return {"id": cur.lastrowid}
    except Exception as e:
        raise db_error(e)


@app.delete("/api/delivery-records/{record_id}")
def delete_delivery_record(record_id: int):
    try:
        with get_cursor() as cur:
            cur.execute(
                "UPDATE delivery_process_record SET isValid=0 WHERE id=%s",
                (record_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="record not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)
