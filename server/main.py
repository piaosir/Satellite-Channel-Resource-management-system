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
"""

import os
import time
from contextlib import contextmanager
from decimal import Decimal
from typing import Any, Optional

import pymysql
import pymysql.cursors
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ── FastAPI 应用 ───────────────────────────────────────────────
app = FastAPI(title="RF Matrix API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 开发环境全放通；生产环境改为具体域名
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MySQL 连接 ─────────────────────────────────────────────────
def _make_conn() -> pymysql.connections.Connection:
    return pymysql.connect(
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
    """每次请求临时建连接，返回 DictCursor，结束后自动关闭。"""
    conn = _make_conn()
    try:
        with conn.cursor() as cur:
            yield cur
    finally:
        conn.close()


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
    partitionStatus:     Optional[str]   = "P"   # P=划分  R=回收
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
                "SELECT id, satelliteCode, satelliteName FROM satellite_info ORDER BY id"
            )
            return to_json(cur.fetchall())
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
        JOIN matrix_port_info     mpi_in  ON mpi_in.id  = sw.inputPortId
        JOIN matrix_port_info     mpi_out ON mpi_out.id = sw.outputPortId
        JOIN channel_info         ci_rx   ON ci_rx.id   = mpi_in.channelId
        JOIN channel_info         ci_tx   ON ci_tx.id   = mpi_out.channelId
        JOIN channel_group_info   cg_rx   ON cg_rx.id   = ci_rx.channelGroupId
                                         AND cg_rx.satelliteId = %s
        LEFT JOIN channel_group_info cg_tx ON cg_tx.id  = ci_tx.channelGroupId
                                          AND cg_tx.satelliteId = %s
        JOIN switch_matrix_info   m       ON m.id        = sw.matrixId
        WHERE m.satelliteId = %s
        ORDER BY cg_rx.band, sw.inputPortSeq
    """
    try:
        with get_cursor() as cur:
            cur.execute(sql, (satellite_id, satellite_id, satellite_id))
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
        JOIN matrix_port_info      mpi_in  ON mpi_in.id  = sw.inputPortId
        JOIN matrix_port_info      mpi_out ON mpi_out.id = sw.outputPortId
        JOIN channel_info          ci_rx   ON ci_rx.id   = mpi_in.channelId
        JOIN channel_info          ci_tx   ON ci_tx.id   = mpi_out.channelId
        JOIN channel_group_info    cg_rx   ON cg_rx.id   = ci_rx.channelGroupId
                                          AND cg_rx.satelliteId = %s
        LEFT JOIN channel_group_info cg_tx ON cg_tx.id   = ci_tx.channelGroupId
                                          AND cg_tx.satelliteId = %s
        JOIN switch_matrix_info    m       ON m.id        = sw.matrixId
        WHERE m.satelliteId = %s
        ORDER BY cg_rx.band, sw.inputPortSeq, fb.frequencyOffset
    """
    try:
        with get_cursor() as cur:
            cur.execute(sql, (satellite_id, satellite_id, satellite_id))
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