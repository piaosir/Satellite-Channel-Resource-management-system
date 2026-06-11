"""
RF Matrix API v2 — Python / FastAPI 后端(v6 全新数据模型)
==========================================================
对应《数据库建表数据-完整版-20260604》19 张表,三层模型:
  资源层  卫星/信标/通道组/通道/矩阵/端口/开关 + 主备冗余与切换日志
  状态层  通道规划状态(块+用途) / 通道分配状态(实际占用快照)
  业务层  客户→用户→合约→交付记录;自有业务系统→载波→使用记录

启动:
    cd server
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

接口文档 (启动后自动生成):  http://localhost:8000/docs

核心口径(领导确认):
  - 块代码是状态层/业务层的关联键,入库一律 trim
  - "占用/释放"(交付动作)与"分配是否有效"(块结构状态)互相独立,无联动
  - 交付/使用记录中的频率块代码必须引用通道分配状态中已存在的块代码
"""

import logging
import os
import re
from contextlib import contextmanager
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

import pymysql
import pymysql.cursors
from dbutils.pooled_db import PooledDB
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from migrate import run_migrations

load_dotenv()

log = logging.getLogger(__name__)

app = FastAPI(title="RF Matrix API", version="2.0.0")


@app.on_event("startup")
async def _auto_migrate():
    """启动时自动应用尚未执行的数据库迁移(含建库)。"""
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
_pool = PooledDB(
    creator=pymysql,
    maxconnections=10,
    mincached=2,
    maxcached=5,
    blocking=True,
    ping=1,
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "v6"),
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True,
)


@contextmanager
def get_cursor():
    conn = _pool.connection()
    try:
        with conn.cursor() as cur:
            yield cur
    finally:
        conn.close()


def to_json(rows: list[dict]) -> list[dict]:
    def cast(v: Any) -> Any:
        if isinstance(v, Decimal):
            return float(v)
        if isinstance(v, datetime):
            return v.strftime("%Y-%m-%d %H:%M:%S")
        if isinstance(v, bytes):
            return v.decode("utf-8", errors="replace")
        return v
    return [{k: cast(v) for k, v in row.items()} for row in rows]


def db_error(e: Exception) -> HTTPException:
    return HTTPException(status_code=500, detail=str(e))


def fetch_all(sql: str, params: tuple = ()) -> list[dict]:
    try:
        with get_cursor() as cur:
            cur.execute(sql, params)
            return to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)


def fetch_one_or_404(sql: str, params: tuple, what: str) -> dict:
    try:
        with get_cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
    except Exception as e:
        raise db_error(e)
    if not row:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return to_json([row])[0]


# ── 块代码工具 ─────────────────────────────────────────────────
BLOCK_RE = re.compile(
    r"^(\w+?)_BW([\d.]+)"
    r"_U(.)(.{5})_S([\d.]+)_E([\d.]+)"
    r"_D(.)(.{5})_S([\d.]+)_E([\d.]+)$"
)


def parse_block_code(code: str) -> Optional[dict]:
    m = BLOCK_RE.match(code.strip())
    if not m:
        return None
    sat, bw, up, ub, us, ue, dp, db_, ds, de = m.groups()
    return {
        "satelliteCode": sat, "bandwidth": float(bw),
        "uplinkPolarization": up, "uplinkBeam": ub.strip("_"),
        "uplinkStartFreq": float(us), "uplinkEndFreq": float(ue),
        "downlinkPolarization": dp, "downlinkBeam": db_.strip("_"),
        "downlinkStartFreq": float(ds), "downlinkEndFreq": float(de),
    }


def build_block_code(sat: str, bw: float, upol: str, ubeam: str,
                     us: float, ue: float, dpol: str, dbeam: str,
                     ds: float, de: float) -> str:
    ub = ubeam.rjust(5, "_")
    db_ = dbeam.rjust(5, "_")
    return (f"{sat}_BW{bw:06.2f}"
            f"_U{upol}{ub}_S{us:08.2f}_E{ue:08.2f}"
            f"_D{dpol}{db_}_S{ds:08.2f}_E{de:08.2f}")


def _sat_id_by_code(cur, code: Optional[str]) -> Optional[int]:
    if not code:
        return None
    cur.execute("SELECT id FROM satellite_info WHERE satelliteCode = %s", (code,))
    row = cur.fetchone()
    return row["id"] if row else None


def _resolve_channel_id(cur, sat_code, pol, beam, us, ue) -> Optional[int]:
    """按上行频率范围归属解析接收通道(同星同极化同波束,范围包含,取最窄)。"""
    cur.execute("""
        SELECT c.id FROM channel_info c
        JOIN channel_group_info g ON g.id = c.channelGroupId
        WHERE g.satelliteCode = %s AND g.txRxType = 'R'
          AND g.polarization = %s AND g.antennaCode = %s
          AND c.channelStartFreq <= %s + 0.01 AND c.channelEndFreq >= %s - 0.01
        ORDER BY (c.channelEndFreq - c.channelStartFreq) ASC LIMIT 1
    """, (sat_code, pol, beam, us, ue))
    row = cur.fetchone()
    return row["id"] if row else None


# ══════════════════════════════════════════════════════════════
#  Request body schemas
# ══════════════════════════════════════════════════════════════
class SwitchStatusUpdate(BaseModel):
    switchStatus: int                      # 1通 0断
    operator: Optional[str] = None
    registrar: Optional[str] = None


class AmpStatusUpdate(BaseModel):
    ampActiveStatus: str                   # P0/P1/P2
    operator: Optional[str] = None
    registrar: Optional[str] = None


class ReceiverStatusUpdate(BaseModel):
    receiverActiveStatus: str              # P0/P1/P2
    operator: Optional[str] = None
    registrar: Optional[str] = None


class PlanningBlockCreate(BaseModel):
    blockCode: Optional[str] = None        # 不传则由下面的结构字段拼出
    usageType: str                         # 自用/出租/合作/禁用
    isValid: int = 1
    satelliteCode: Optional[str] = None
    bandwidth: Optional[float] = None
    uplinkPolarization: Optional[str] = None
    uplinkBeam: Optional[str] = None
    uplinkStartFreq: Optional[float] = None
    uplinkEndFreq: Optional[float] = None
    downlinkPolarization: Optional[str] = None
    downlinkBeam: Optional[str] = None
    downlinkStartFreq: Optional[float] = None
    downlinkEndFreq: Optional[float] = None


class PlanningBlockUpdate(BaseModel):
    usageType: Optional[str] = None
    isValid: Optional[int] = None
    uplinkStartFreq: Optional[float] = None
    uplinkEndFreq: Optional[float] = None
    downlinkStartFreq: Optional[float] = None
    downlinkEndFreq: Optional[float] = None


class AllocationBlockCreate(BaseModel):
    blockCode: Optional[str] = None
    isValid: int = 1
    planningBlockId: Optional[int] = None
    satelliteCode: Optional[str] = None
    bandwidth: Optional[float] = None
    uplinkPolarization: Optional[str] = None
    uplinkBeam: Optional[str] = None
    uplinkStartFreq: Optional[float] = None
    uplinkEndFreq: Optional[float] = None
    downlinkPolarization: Optional[str] = None
    downlinkBeam: Optional[str] = None
    downlinkStartFreq: Optional[float] = None
    downlinkEndFreq: Optional[float] = None


class AllocationBlockUpdate(BaseModel):
    isValid: Optional[int] = None          # 仅拆分/冲突时置0,与占用释放无关
    uplinkStartFreq: Optional[float] = None
    uplinkEndFreq: Optional[float] = None


class DeliveryRecordCreate(BaseModel):
    contractId: int
    blockCode: str                         # 必须已存在于通道分配状态
    action: str                            # 占用/释放
    exclusiveType: Optional[str] = "独占"
    bandwidth: Optional[float] = None
    handler: Optional[str] = None
    registrar: Optional[str] = None


class CarrierUsageRecordCreate(BaseModel):
    carrierId: Optional[int] = None
    blockCode: str                         # 必须已存在于通道分配状态
    action: str                            # 占用/释放
    exclusiveType: Optional[str] = "独占"
    bandwidth: Optional[float] = None
    handler: Optional[str] = None
    registrar: Optional[str] = None


class CommonNameUpdate(BaseModel):
    commonName: str


# ══════════════════════════════════════════════════════════════
#  健康检查
# ══════════════════════════════════════════════════════════════
@app.get("/api/health")
def health():
    try:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
        return {
            "status": "ok",
            "db": f"{os.getenv('DB_NAME','v6')} @ {os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','3306')}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB unreachable: {e}")


# ══════════════════════════════════════════════════════════════
#  资源层:卫星 / 信标
# ══════════════════════════════════════════════════════════════
@app.get("/api/satellites")
def list_satellites():
    return fetch_all("""
        SELECT s.*,
               (SELECT COUNT(*) FROM channel_group_info g WHERE g.satelliteId = s.id)  AS channelGroupCount,
               (SELECT COUNT(*) FROM switch_matrix_info m
                 WHERE m.satelliteId = s.id AND m.effectiveStatus = 1)                 AS matrixCount
        FROM satellite_info s
        ORDER BY s.id
    """)


@app.get("/api/satellites/{satellite_id}")
def get_satellite(satellite_id: int):
    return fetch_one_or_404("""
        SELECT s.*,
               (SELECT COUNT(*) FROM channel_group_info g WHERE g.satelliteId = s.id)  AS channelGroupCount,
               (SELECT COUNT(*) FROM switch_matrix_info m
                 WHERE m.satelliteId = s.id AND m.effectiveStatus = 1)                 AS matrixCount
        FROM satellite_info s WHERE s.id = %s
    """, (satellite_id,), "satellite")


@app.get("/api/satellites/{satellite_id}/beacons")
def list_beacons(satellite_id: int):
    return fetch_all(
        "SELECT * FROM beacon_info WHERE satelliteId = %s ORDER BY band, polarization",
        (satellite_id,))


# ══════════════════════════════════════════════════════════════
#  资源层:通道组 / 通道
# ══════════════════════════════════════════════════════════════
@app.get("/api/satellites/{satellite_id}/channel-groups")
def list_channel_groups(satellite_id: int):
    return fetch_all(
        "SELECT * FROM channel_group_info WHERE satelliteId = %s ORDER BY id",
        (satellite_id,))


@app.get("/api/satellites/{satellite_id}/channels")
def list_channels(satellite_id: int):
    return fetch_all("""
        SELECT c.*,
               g.satelliteCode, g.antennaName, g.antennaCode,
               g.txRxType, g.polarization, g.band
        FROM channel_info c
        JOIN channel_group_info g ON g.id = c.channelGroupId
        WHERE g.satelliteId = %s
        ORDER BY c.id
    """, (satellite_id,))


@app.patch("/api/channels/{channel_id}/common-name")
def update_channel_common_name(channel_id: int, body: CommonNameUpdate):
    name = body.commonName.strip()
    if not name:
        raise HTTPException(status_code=422, detail="commonName is required")
    try:
        with get_cursor() as cur:
            cur.execute("UPDATE channel_info SET commonName = %s WHERE id = %s",
                        (name, channel_id))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="channel not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ── 接收机主备切换(挂在通道组上)──────────────────────────────
@app.patch("/api/channel-groups/{group_id}/receiver")
def switch_receiver(group_id: int, body: ReceiverStatusUpdate):
    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT channelGroupCode, receiverActiveStatus FROM channel_group_info WHERE id = %s",
                (group_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="channel group not found")
            cur.execute(
                "UPDATE channel_group_info SET receiverActiveStatus = %s WHERE id = %s",
                (body.receiverActiveStatus, group_id))
            cur.execute("""
                INSERT INTO receiver_switch_log
                    (channelGroupCode, channelGroupId, beforeStatus, afterStatus,
                     switchTime, operator, registrar)
                VALUES (%s, %s, %s, %s, NOW(), %s, %s)
            """, (row["channelGroupCode"], group_id, row["receiverActiveStatus"],
                  body.receiverActiveStatus, body.operator, body.registrar))
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


@app.get("/api/logs/receiver")
def list_receiver_logs(channelGroupCode: Optional[str] = None, limit: int = Query(200, le=1000)):
    where = "WHERE channelGroupCode = %s" if channelGroupCode else ""
    params: tuple = (channelGroupCode, limit) if channelGroupCode else (limit,)
    return fetch_all(
        f"SELECT * FROM receiver_switch_log {where} ORDER BY switchTime DESC, id DESC LIMIT %s",
        params)


# ══════════════════════════════════════════════════════════════
#  资源层:矩阵 / 端口 / 开关
# ══════════════════════════════════════════════════════════════
@app.get("/api/satellites/{satellite_id}/matrices")
def list_matrices(satellite_id: int, effective_only: bool = True):
    where = "AND effectiveStatus = 1" if effective_only else ""
    return fetch_all(f"""
        SELECT * FROM switch_matrix_info
        WHERE satelliteId = %s {where}
        ORDER BY matrixType, matrixSeq
    """, (satellite_id,))


@app.get("/api/matrices/{matrix_id}/ports")
def list_matrix_ports(matrix_id: int):
    return fetch_all("""
        SELECT p.*, c.channelCode, c.channelFullName, c.commonName,
               c.channelStartFreq, c.channelEndFreq, c.channelBandwidth
        FROM matrix_port_info p
        LEFT JOIN channel_info c ON c.id = p.channelId
        WHERE p.matrixId = %s
        ORDER BY p.ioType, p.portSeq
    """, (matrix_id,))


# 开关全量视图:交叉点 + 入/出通道 + 通道组(波束/极化/频段) + 放大器主备
_SWITCH_FULL_SQL = """
    SELECT
        sw.id, sw.switchCode, sw.matrixId, sw.matrixCode,
        sw.inputPortSeq, sw.outputPortSeq, sw.switchType, sw.switchStatus,
        sw.primaryAmpCode, sw.backupAmpCode1, sw.backupAmpCode2,
        sw.ampActiveStatus, sw.updateTime,
        m.matrixType, m.matrixSeq, m.remark            AS matrixRemark,
        m.satelliteId, m.satelliteCode,
        pi.channelShortName                            AS inputChannelShortName,
        po.channelShortName                            AS outputChannelShortName,
        ci.id                                          AS inputChannelId,
        ci.channelCode                                 AS inputChannelCode,
        ci.commonName                                  AS inputCommonName,
        ci.channelStartFreq                            AS rxStartFreq,
        ci.channelEndFreq                              AS rxEndFreq,
        ci.channelBandwidth                            AS channelBandwidth,
        co.id                                          AS outputChannelId,
        co.channelCode                                 AS outputChannelCode,
        co.channelStartFreq                            AS txStartFreq,
        co.channelEndFreq                              AS txEndFreq,
        gi.band                                        AS rxBand,
        gi.polarization                                AS rxPolarization,
        gi.antennaName                                 AS rxAntennaName,
        gi.antennaCode                                 AS rxAntennaCode,
        go_.band                                       AS txBand,
        go_.polarization                               AS txPolarization,
        go_.antennaName                                AS txAntennaName,
        go_.antennaCode                                AS txAntennaCode
    FROM matrix_switch_status sw
    JOIN switch_matrix_info m        ON m.id  = sw.matrixId
    LEFT JOIN matrix_port_info pi    ON pi.id = sw.inputPortId
    LEFT JOIN matrix_port_info po    ON po.id = sw.outputPortId
    LEFT JOIN channel_info ci        ON ci.id = pi.channelId
    LEFT JOIN channel_info co        ON co.id = po.channelId
    LEFT JOIN channel_group_info gi  ON gi.id = ci.channelGroupId
    LEFT JOIN channel_group_info go_ ON go_.id = co.channelGroupId
"""


@app.get("/api/satellites/{satellite_id}/switches")
def list_switches(satellite_id: int):
    return fetch_all(
        _SWITCH_FULL_SQL + " WHERE m.satelliteId = %s ORDER BY sw.matrixId, sw.inputPortSeq",
        (satellite_id,))


@app.get("/api/matrices/{matrix_id}/switches")
def list_matrix_switches(matrix_id: int):
    return fetch_all(
        _SWITCH_FULL_SQL + " WHERE sw.matrixId = %s ORDER BY sw.inputPortSeq, sw.outputPortSeq",
        (matrix_id,))


# ── 开关通断切换(写矩阵开关切换日志)──────────────────────────
@app.patch("/api/switches/{switch_id}/status")
def switch_status(switch_id: int, body: SwitchStatusUpdate):
    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT switchCode, switchType, switchStatus FROM matrix_switch_status WHERE id = %s",
                (switch_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="switch not found")
            if row["switchType"] == "常通":
                raise HTTPException(status_code=409, detail="常通开关不可切换")
            cur.execute(
                "UPDATE matrix_switch_status SET switchStatus = %s, updateTime = NOW() WHERE id = %s",
                (body.switchStatus, switch_id))
            cur.execute("""
                INSERT INTO matrix_switch_log
                    (switchCode, switchId, beforeStatus, afterStatus, switchTime, operator, registrar)
                VALUES (%s, %s, %s, %s, NOW(), %s, %s)
            """, (row["switchCode"], switch_id, str(row["switchStatus"]),
                  str(body.switchStatus), body.operator, body.registrar))
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ── 放大器主备切换(写放大器切换日志)──────────────────────────
@app.patch("/api/switches/{switch_id}/amplifier")
def switch_amplifier(switch_id: int, body: AmpStatusUpdate):
    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT switchCode, primaryAmpCode, ampActiveStatus FROM matrix_switch_status WHERE id = %s",
                (switch_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="switch not found")
            if not row["primaryAmpCode"]:
                raise HTTPException(status_code=409, detail="该开关未配置放大器")
            cur.execute(
                "UPDATE matrix_switch_status SET ampActiveStatus = %s, updateTime = NOW() WHERE id = %s",
                (body.ampActiveStatus, switch_id))
            cur.execute("""
                INSERT INTO amplifier_switch_log
                    (switchCode, switchId, beforeStatus, afterStatus, switchTime, operator, registrar)
                VALUES (%s, %s, %s, %s, NOW(), %s, %s)
            """, (row["switchCode"], switch_id, row["ampActiveStatus"],
                  body.ampActiveStatus, body.operator, body.registrar))
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


@app.get("/api/logs/matrix-switch")
def list_switch_logs(switchCode: Optional[str] = None, limit: int = Query(200, le=1000)):
    where = "WHERE switchCode = %s" if switchCode else ""
    params: tuple = (switchCode, limit) if switchCode else (limit,)
    return fetch_all(
        f"SELECT * FROM matrix_switch_log {where} ORDER BY switchTime DESC, id DESC LIMIT %s",
        params)


@app.get("/api/logs/amplifier")
def list_amplifier_logs(switchCode: Optional[str] = None, limit: int = Query(200, le=1000)):
    where = "WHERE switchCode = %s" if switchCode else ""
    params: tuple = (switchCode, limit) if switchCode else (limit,)
    return fetch_all(
        f"SELECT * FROM amplifier_switch_log {where} ORDER BY switchTime DESC, id DESC LIMIT %s",
        params)


# ══════════════════════════════════════════════════════════════
#  状态层:通道规划状态(基底)
# ══════════════════════════════════════════════════════════════
@app.get("/api/satellites/{satellite_id}/planning-blocks")
def list_planning_blocks(satellite_id: int,
                         usage_type: Optional[str] = None,
                         valid_only: bool = False):
    conds, params = ["p.satelliteId = %s"], [satellite_id]
    if usage_type:
        conds.append("p.usageType = %s")
        params.append(usage_type)
    if valid_only:
        conds.append("p.isValid = 1")
    return fetch_all(f"""
        SELECT p.*,
               c.channelCode, c.channelShortName, c.commonName,
               c.channelStartFreq, c.channelEndFreq, c.channelBandwidth
        FROM channel_planning_status p
        LEFT JOIN channel_info c ON c.id = p.channelId
        WHERE {' AND '.join(conds)}
        ORDER BY p.uplinkPolarization, p.uplinkStartFreq
    """, tuple(params))


@app.get("/api/planning-blocks/{block_id}")
def get_planning_block(block_id: int):
    return fetch_one_or_404(
        "SELECT * FROM channel_planning_status WHERE id = %s", (block_id,), "planning block")


@app.post("/api/planning-blocks", status_code=201)
def create_planning_block(body: PlanningBlockCreate):
    code, parts = _normalize_block_input(
        body.blockCode, body.satelliteCode, body.bandwidth,
        body.uplinkPolarization, body.uplinkBeam, body.uplinkStartFreq, body.uplinkEndFreq,
        body.downlinkPolarization, body.downlinkBeam, body.downlinkStartFreq, body.downlinkEndFreq)
    try:
        with get_cursor() as cur:
            sat_id = _sat_id_by_code(cur, parts["satelliteCode"]) if parts else None
            cur.execute("SELECT COALESCE(MAX(id),0)+1 AS nid FROM channel_planning_status")
            nid = cur.fetchone()["nid"]
            cur.execute("""
                INSERT INTO channel_planning_status
                    (id, blockCode, usageType, isValid, updateTime,
                     satelliteCode, satelliteId, bandwidth,
                     uplinkPolarization, uplinkBeam, uplinkStartFreq, uplinkEndFreq,
                     downlinkPolarization, downlinkBeam, downlinkStartFreq, downlinkEndFreq)
                VALUES (%s,%s,%s,%s,NOW(),%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (nid, code, body.usageType, body.isValid,
                  parts["satelliteCode"] if parts else None, sat_id,
                  parts["bandwidth"] if parts else None,
                  parts["uplinkPolarization"] if parts else None,
                  parts["uplinkBeam"] if parts else None,
                  parts["uplinkStartFreq"] if parts else None,
                  parts["uplinkEndFreq"] if parts else None,
                  parts["downlinkPolarization"] if parts else None,
                  parts["downlinkBeam"] if parts else None,
                  parts["downlinkStartFreq"] if parts else None,
                  parts["downlinkEndFreq"] if parts else None))
            return {"id": nid, "blockCode": code}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


_FREQ_FIELDS = ("uplinkStartFreq", "uplinkEndFreq", "downlinkStartFreq", "downlinkEndFreq")


@app.put("/api/planning-blocks/{block_id}")
def update_planning_block(block_id: int, body: PlanningBlockUpdate):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=422, detail="no fields to update")
    freq_change = any(k in fields for k in _FREQ_FIELDS)
    try:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM channel_planning_status WHERE id = %s", (block_id,))
            cur_row = cur.fetchone()
            if not cur_row:
                raise HTTPException(status_code=404, detail="planning block not found")

            simple = {k: v for k, v in fields.items() if k in ("usageType", "isValid")}

            if freq_change:
                us = float(fields.get("uplinkStartFreq", cur_row["uplinkStartFreq"]))
                ue = float(fields.get("uplinkEndFreq", cur_row["uplinkEndFreq"]))
                ds = float(fields.get("downlinkStartFreq", cur_row["downlinkStartFreq"]))
                de = float(fields.get("downlinkEndFreq", cur_row["downlinkEndFreq"]))
                if us >= ue or ds >= de:
                    raise HTTPException(status_code=422, detail="起始频率必须小于终止频率")
                # 不能让既有分配块越出新范围(分配基于规划)
                cur.execute("""
                    SELECT id FROM channel_allocation_status
                    WHERE planningBlockId = %s
                      AND (uplinkStartFreq < %s - 0.01 OR uplinkEndFreq > %s + 0.01)
                """, (block_id, us, ue))
                bad = [r["id"] for r in cur.fetchall()]
                if bad:
                    raise HTTPException(
                        status_code=409,
                        detail=f"调整后范围将使既有分配块越界:{'、'.join(f'#{i}' for i in bad)},请先处理这些分配块")
                code = build_block_code(
                    cur_row["satelliteCode"], ue - us,
                    cur_row["uplinkPolarization"], cur_row["uplinkBeam"], us, ue,
                    cur_row["downlinkPolarization"], cur_row["downlinkBeam"], ds, de)
                chan_id = _resolve_channel_id(
                    cur, cur_row["satelliteCode"], cur_row["uplinkPolarization"],
                    cur_row["uplinkBeam"], us, ue)
                cur.execute("""
                    UPDATE channel_planning_status
                    SET blockCode = %s, bandwidth = %s,
                        uplinkStartFreq = %s, uplinkEndFreq = %s,
                        downlinkStartFreq = %s, downlinkEndFreq = %s,
                        channelId = %s, updateTime = NOW()
                    WHERE id = %s
                """, (code, round(ue - us, 2), us, ue, ds, de, chan_id, block_id))

            if simple:
                sets = ", ".join(f"`{k}` = %s" for k in simple)
                cur.execute(
                    f"UPDATE channel_planning_status SET {sets}, updateTime = NOW() WHERE id = %s",
                    tuple(simple.values()) + (block_id,))

            cur.execute("SELECT blockCode FROM channel_planning_status WHERE id = %s", (block_id,))
            return {"ok": True, "blockCode": cur.fetchone()["blockCode"]}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


@app.delete("/api/planning-blocks/{block_id}")
def delete_planning_block(block_id: int):
    try:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS n FROM channel_allocation_status WHERE planningBlockId = %s",
                        (block_id,))
            if cur.fetchone()["n"] > 0:
                raise HTTPException(status_code=409, detail="该规划块下存在分配块,不可删除")
            cur.execute("DELETE FROM channel_planning_status WHERE id = %s", (block_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="planning block not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


def _normalize_block_input(block_code, sat, bw, upol, ubeam, us, ue, dpol, dbeam, ds, de):
    """blockCode 与结构字段二选一:有 code 则解析,无 code 则由字段拼出。"""
    if block_code and block_code.strip():
        code = block_code.strip()
        parts = parse_block_code(code)
        if parts is None:
            raise HTTPException(status_code=422, detail="blockCode 格式不合法")
        return code, parts
    required = [sat, bw, upol, ubeam, us, ue, dpol, dbeam, ds, de]
    if any(v is None for v in required):
        raise HTTPException(status_code=422,
                            detail="缺少 blockCode,且结构字段不完整,无法拼出块代码")
    code = build_block_code(sat, bw, upol, ubeam, us, ue, dpol, dbeam, ds, de)
    return code, parse_block_code(code)


# ══════════════════════════════════════════════════════════════
#  状态层:通道分配状态(实际占用快照)
# ══════════════════════════════════════════════════════════════
# 附带占用状况汇总:合约/自有载波的占用-释放余额,以及当前占用方名称
_ALLOC_LIST_SQL = """
    SELECT a.*,
           p.blockCode  AS planningBlockCode,
           p.usageType  AS planningUsageType,
           c.channelCode, c.channelShortName, c.commonName,
           c.channelStartFreq, c.channelEndFreq,
           COALESCE(d.bal, 0)  AS contractBalance,
           COALESCE(u.bal, 0)  AS carrierBalance,
           d.occupants         AS occupantNames
    FROM channel_allocation_status a
    LEFT JOIN channel_planning_status p ON p.id = a.planningBlockId
    LEFT JOIN channel_info c            ON c.id = a.channelId
    LEFT JOIN (
        SELECT t.allocationId,
               SUM(t.cbal) AS bal,
               GROUP_CONCAT(DISTINCT CASE WHEN t.cbal > 0 THEN t.customerName END
                            SEPARATOR '、') AS occupants
        FROM (
            SELECT dr.allocationId, dr.contractId, ct.customerName,
                   SUM(CASE WHEN dr.action='占用' THEN 1 WHEN dr.action='释放' THEN -1 END) AS cbal
            FROM contract_delivery_record dr
            LEFT JOIN bandwidth_contract_info ct ON ct.id = dr.contractId
            GROUP BY dr.allocationId, dr.contractId, ct.customerName
        ) t
        GROUP BY t.allocationId
    ) d ON d.allocationId = a.id
    LEFT JOIN (
        SELECT allocationId,
               SUM(CASE WHEN action='占用' THEN 1 WHEN action='释放' THEN -1 END) AS bal
        FROM own_carrier_usage_record
        GROUP BY allocationId
    ) u ON u.allocationId = a.id
"""


@app.get("/api/satellites/{satellite_id}/allocation-blocks")
def list_allocation_blocks(satellite_id: int, valid_only: bool = False):
    where = "WHERE a.satelliteId = %s" + (" AND a.isValid = 1" if valid_only else "")
    return fetch_all(
        _ALLOC_LIST_SQL + where + " ORDER BY a.uplinkPolarization, a.uplinkStartFreq",
        (satellite_id,))


@app.get("/api/planning-blocks/{block_id}/allocation-blocks")
def list_allocation_blocks_of_planning(block_id: int):
    return fetch_all(
        _ALLOC_LIST_SQL + "WHERE a.planningBlockId = %s ORDER BY a.uplinkStartFreq",
        (block_id,))


@app.get("/api/allocation-blocks/{block_id}")
def get_allocation_block(block_id: int):
    return fetch_one_or_404(
        "SELECT * FROM channel_allocation_status WHERE id = %s", (block_id,), "allocation block")


@app.post("/api/allocation-blocks", status_code=201)
def create_allocation_block(body: AllocationBlockCreate):
    code, parts = _normalize_block_input(
        body.blockCode, body.satelliteCode, body.bandwidth,
        body.uplinkPolarization, body.uplinkBeam, body.uplinkStartFreq, body.uplinkEndFreq,
        body.downlinkPolarization, body.downlinkBeam, body.downlinkStartFreq, body.downlinkEndFreq)
    try:
        with get_cursor() as cur:
            sat_id = _sat_id_by_code(cur, parts["satelliteCode"]) if parts else None
            # 核心规则:分配必须基于规划,没规划的不能分。
            # 未显式给规划块时,按同星同上行极化波束 + 范围包含解析;解析不到即拒绝。
            planning_id = body.planningBlockId
            if planning_id is None and parts:
                cur.execute("""
                    SELECT id FROM channel_planning_status
                    WHERE satelliteCode = %s AND uplinkPolarization = %s AND uplinkBeam = %s
                      AND uplinkStartFreq <= %s + 0.01 AND uplinkEndFreq >= %s - 0.01
                      AND isValid = 1
                    ORDER BY (uplinkEndFreq - uplinkStartFreq) ASC LIMIT 1
                """, (parts["satelliteCode"], parts["uplinkPolarization"], parts["uplinkBeam"],
                      parts["uplinkStartFreq"], parts["uplinkEndFreq"]))
                row = cur.fetchone()
                planning_id = row["id"] if row else None
            if planning_id is None:
                raise HTTPException(
                    status_code=422,
                    detail="分配必须基于规划:该频率范围未落入任何有效规划块,不能分配")
            # 显式给了规划块时,校验范围确实落在该规划块内
            cur.execute(
                "SELECT * FROM channel_planning_status WHERE id = %s", (planning_id,))
            pb = cur.fetchone()
            if not pb:
                raise HTTPException(status_code=404, detail="planning block not found")
            if parts and pb["uplinkStartFreq"] is not None:
                if (parts["satelliteCode"] != pb["satelliteCode"]
                        or parts["uplinkPolarization"] != pb["uplinkPolarization"]
                        or parts["uplinkBeam"] != pb["uplinkBeam"]
                        or parts["uplinkStartFreq"] < float(pb["uplinkStartFreq"]) - 0.01
                        or parts["uplinkEndFreq"] > float(pb["uplinkEndFreq"]) + 0.01):
                    raise HTTPException(
                        status_code=422,
                        detail="分配块超出所选规划块的卫星/极化/波束/频率范围")
            cur.execute("SELECT COALESCE(MAX(id),0)+1 AS nid FROM channel_allocation_status")
            nid = cur.fetchone()["nid"]
            cur.execute("""
                INSERT INTO channel_allocation_status
                    (id, blockCode, isValid, updateTime,
                     satelliteCode, satelliteId, bandwidth,
                     uplinkPolarization, uplinkBeam, uplinkStartFreq, uplinkEndFreq,
                     downlinkPolarization, downlinkBeam, downlinkStartFreq, downlinkEndFreq,
                     planningBlockId)
                VALUES (%s,%s,%s,NOW(),%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (nid, code, body.isValid,
                  parts["satelliteCode"] if parts else None, sat_id,
                  parts["bandwidth"] if parts else None,
                  parts["uplinkPolarization"] if parts else None,
                  parts["uplinkBeam"] if parts else None,
                  parts["uplinkStartFreq"] if parts else None,
                  parts["uplinkEndFreq"] if parts else None,
                  parts["downlinkPolarization"] if parts else None,
                  parts["downlinkBeam"] if parts else None,
                  parts["downlinkStartFreq"] if parts else None,
                  parts["downlinkEndFreq"] if parts else None,
                  planning_id))
            return {"id": nid, "blockCode": code, "planningBlockId": planning_id}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


@app.put("/api/allocation-blocks/{block_id}")
def update_allocation_block(block_id: int, body: AllocationBlockUpdate):
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=422, detail="no fields to update")
    freq_change = "uplinkStartFreq" in fields or "uplinkEndFreq" in fields
    try:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM channel_allocation_status WHERE id = %s", (block_id,))
            cur_row = cur.fetchone()
            if not cur_row:
                raise HTTPException(status_code=404, detail="allocation block not found")

            if freq_change:
                # 占用中的块不能调整频率,先释放
                cur.execute("""
                    SELECT
                      (SELECT COALESCE(SUM(CASE WHEN action='占用' THEN 1 WHEN action='释放' THEN -1 END),0)
                         FROM contract_delivery_record WHERE allocationId = %s)
                    + (SELECT COALESCE(SUM(CASE WHEN action='占用' THEN 1 WHEN action='释放' THEN -1 END),0)
                         FROM own_carrier_usage_record WHERE allocationId = %s) AS bal
                """, (block_id, block_id))
                if (cur.fetchone()["bal"] or 0) > 0:
                    raise HTTPException(status_code=409,
                                        detail="该分配块正被占用,不能调整频率,请先登记释放")
                us = float(fields.get("uplinkStartFreq", cur_row["uplinkStartFreq"]))
                ue = float(fields.get("uplinkEndFreq", cur_row["uplinkEndFreq"]))
                if us >= ue:
                    raise HTTPException(status_code=422, detail="起始频率必须小于终止频率")
                # 新范围必须仍落在有效规划块内(没规划的不能分)
                cur.execute("""
                    SELECT * FROM channel_planning_status
                    WHERE satelliteCode = %s AND uplinkPolarization = %s AND uplinkBeam = %s
                      AND uplinkStartFreq <= %s + 0.01 AND uplinkEndFreq >= %s - 0.01
                      AND isValid = 1
                    ORDER BY (uplinkEndFreq - uplinkStartFreq) ASC LIMIT 1
                """, (cur_row["satelliteCode"], cur_row["uplinkPolarization"],
                      cur_row["uplinkBeam"], us, ue))
                pb = cur.fetchone()
                if not pb:
                    raise HTTPException(
                        status_code=422,
                        detail="调整后的范围未落入任何有效规划块,不能分配(没规划的不能分)")
                # 下行随上行成对平移(以所属规划块的上下行对应关系为基准)
                shift = us - float(pb["uplinkStartFreq"])
                ds = float(pb["downlinkStartFreq"]) + shift
                de = ds + (ue - us)
                code = build_block_code(
                    cur_row["satelliteCode"], ue - us,
                    cur_row["uplinkPolarization"], cur_row["uplinkBeam"], us, ue,
                    cur_row["downlinkPolarization"], cur_row["downlinkBeam"], ds, de)
                chan_id = _resolve_channel_id(
                    cur, cur_row["satelliteCode"], cur_row["uplinkPolarization"],
                    cur_row["uplinkBeam"], us, ue)
                cur.execute("""
                    UPDATE channel_allocation_status
                    SET blockCode = %s, bandwidth = %s,
                        uplinkStartFreq = %s, uplinkEndFreq = %s,
                        downlinkStartFreq = %s, downlinkEndFreq = %s,
                        planningBlockId = %s, channelId = %s, updateTime = NOW()
                    WHERE id = %s
                """, (code, round(ue - us, 2), us, ue, round(ds, 2), round(de, 2),
                      pb["id"], chan_id, block_id))

            if "isValid" in fields:
                cur.execute(
                    "UPDATE channel_allocation_status SET isValid = %s, updateTime = NOW() WHERE id = %s",
                    (fields["isValid"], block_id))

            cur.execute("SELECT blockCode, planningBlockId FROM channel_allocation_status WHERE id = %s",
                        (block_id,))
            row = cur.fetchone()
            return {"ok": True, "blockCode": row["blockCode"], "planningBlockId": row["planningBlockId"]}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


@app.delete("/api/allocation-blocks/{block_id}")
def delete_allocation_block(block_id: int):
    try:
        with get_cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) AS n FROM (
                    SELECT id FROM contract_delivery_record WHERE allocationId = %s
                    UNION ALL
                    SELECT id FROM own_carrier_usage_record WHERE allocationId = %s
                ) t
            """, (block_id, block_id))
            if cur.fetchone()["n"] > 0:
                raise HTTPException(status_code=409, detail="该分配块已有交付/使用过程记录,不可删除")
            cur.execute("DELETE FROM channel_allocation_status WHERE id = %s", (block_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="allocation block not found")
            return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  业务层:客户 / 用户 / 合约
# ══════════════════════════════════════════════════════════════
@app.get("/api/customers")
def list_customers(search: Optional[str] = None,
                   offset: int = 0, limit: int = Query(100, le=2000)):
    conds, params = [], []
    if search:
        conds.append("(customerName LIKE %s OR customerCode LIKE %s OR creditCode LIKE %s)")
        like = f"%{search}%"
        params += [like, like, like]
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    try:
        with get_cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS total FROM customer_info {where}", tuple(params))
            total = cur.fetchone()["total"]
            cur.execute(
                f"SELECT * FROM customer_info {where} ORDER BY customerCode DESC LIMIT %s OFFSET %s",
                tuple(params + [limit, offset]))
            rows = to_json(cur.fetchall())
    except Exception as e:
        raise db_error(e)
    return {"total": total, "items": rows}


@app.get("/api/customers/{customer_code}")
def get_customer(customer_code: str):
    cust = fetch_one_or_404(
        "SELECT * FROM customer_info WHERE customerCode = %s", (customer_code,), "customer")
    cust["users"] = fetch_all(
        "SELECT * FROM user_info WHERE customerCode = %s ORDER BY id", (customer_code,))
    return cust


@app.get("/api/users")
def list_users():
    return fetch_all("SELECT * FROM user_info ORDER BY id")


@app.get("/api/contracts")
def list_contracts(customer_code: Optional[str] = None,
                   satellite: Optional[str] = None):
    """satellite 过滤:合约名下任一交付记录涉及该卫星。"""
    conds, params = [], []
    if customer_code:
        conds.append("ct.customerCode = %s")
        params.append(customer_code)
    if satellite:
        conds.append("""EXISTS (SELECT 1 FROM contract_delivery_record d
                        WHERE d.contractId = ct.id AND d.satelliteCode = %s)""")
        params.append(satellite)
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    return fetch_all(f"""
        SELECT ct.*,
               (SELECT COUNT(*) FROM contract_delivery_record d
                 WHERE d.contractId = ct.id)                       AS deliveryRecordCount,
               (SELECT COALESCE(SUM(CASE WHEN d.action='占用' THEN d.bandwidth
                                         WHEN d.action='释放' THEN -d.bandwidth END),0)
                  FROM contract_delivery_record d
                 WHERE d.contractId = ct.id)                       AS occupiedBandwidth
        FROM bandwidth_contract_info ct
        {where}
        ORDER BY ct.id
    """, tuple(params))


@app.get("/api/contracts/{contract_id}")
def get_contract(contract_id: int):
    ct = fetch_one_or_404(
        "SELECT * FROM bandwidth_contract_info WHERE id = %s", (contract_id,), "contract")
    ct["deliveryRecords"] = fetch_all("""
        SELECT d.*, a.isValid AS allocationIsValid
        FROM contract_delivery_record d
        LEFT JOIN channel_allocation_status a ON a.id = d.allocationId
        WHERE d.contractId = %s
        ORDER BY d.actionTime, d.id
    """, (contract_id,))
    return ct


# ══════════════════════════════════════════════════════════════
#  业务层:交付过程记录(占用/释放)
# ══════════════════════════════════════════════════════════════
@app.get("/api/allocation-blocks/{block_id}/delivery-records")
def list_delivery_records_of_block(block_id: int):
    return fetch_all("""
        SELECT d.*, ct.customerName, ct.productName
        FROM contract_delivery_record d
        LEFT JOIN bandwidth_contract_info ct ON ct.id = d.contractId
        WHERE d.allocationId = %s
        ORDER BY d.actionTime DESC, d.id DESC
    """, (block_id,))


@app.post("/api/delivery-records", status_code=201)
def create_delivery_record(body: DeliveryRecordCreate):
    if body.action not in ("占用", "释放"):
        raise HTTPException(status_code=422, detail="action 必须为 占用/释放")
    code = body.blockCode.strip()
    try:
        with get_cursor() as cur:
            # 口径:交付记录的块代码必须引用通道分配状态中已存在的块
            cur.execute(
                "SELECT id, satelliteCode, satelliteId, bandwidth FROM channel_allocation_status WHERE blockCode = %s",
                (code,))
            alloc = cur.fetchone()
            if not alloc:
                raise HTTPException(status_code=422,
                                    detail="频率块代码未在通道分配状态中登记,请先创建分配块")
            cur.execute("SELECT id FROM bandwidth_contract_info WHERE id = %s", (body.contractId,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="contract not found")
            if body.action == "释放":
                # 同一(合约,块)必须先占用后释放
                cur.execute("""
                    SELECT COALESCE(SUM(CASE WHEN action='占用' THEN 1
                                             WHEN action='释放' THEN -1 END),0) AS bal
                    FROM contract_delivery_record
                    WHERE contractId = %s AND blockCode = %s
                """, (body.contractId, code))
                if cur.fetchone()["bal"] <= 0:
                    raise HTTPException(status_code=409, detail="该合约未占用此块,不能释放")
            cur.execute("SELECT COALESCE(MAX(id),0)+1 AS nid FROM contract_delivery_record")
            nid = cur.fetchone()["nid"]
            cur.execute("""
                INSERT INTO contract_delivery_record
                    (id, contractId, blockCode, allocationId, exclusiveType,
                     satelliteCode, satelliteId, bandwidth, action, actionTime,
                     handler, registrar)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s,%s)
            """, (nid, body.contractId, code, alloc["id"], body.exclusiveType,
                  alloc["satelliteCode"], alloc["satelliteId"],
                  body.bandwidth if body.bandwidth is not None else alloc["bandwidth"],
                  body.action, body.handler, body.registrar))
            return {"id": nid, "allocationId": alloc["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  业务层:自有业务系统 / 载波 / 使用记录
# ══════════════════════════════════════════════════════════════
@app.get("/api/business-systems")
def list_business_systems():
    return fetch_all("SELECT * FROM own_business_system_info ORDER BY id")


@app.get("/api/carriers")
def list_carriers(business_system_id: Optional[int] = None):
    where = "WHERE businessSystemId = %s" if business_system_id else ""
    params: tuple = (business_system_id,) if business_system_id else ()
    return fetch_all(f"SELECT * FROM own_carrier_info {where} ORDER BY id", params)


@app.get("/api/carrier-usage-records")
def list_carrier_usage_records(satellite: Optional[str] = None,
                               carrier_id: Optional[int] = None):
    conds, params = [], []
    if satellite:
        conds.append("u.satelliteCode = %s")
        params.append(satellite)
    if carrier_id:
        conds.append("u.carrierId = %s")
        params.append(carrier_id)
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    return fetch_all(f"""
        SELECT u.*, a.isValid AS allocationIsValid
        FROM own_carrier_usage_record u
        LEFT JOIN channel_allocation_status a ON a.id = u.allocationId
        {where}
        ORDER BY u.actionTime DESC, u.id DESC
    """, tuple(params))


@app.get("/api/allocation-blocks/{block_id}/carrier-usage-records")
def list_usage_records_of_block(block_id: int):
    return fetch_all("""
        SELECT * FROM own_carrier_usage_record
        WHERE allocationId = %s
        ORDER BY actionTime DESC, id DESC
    """, (block_id,))


@app.post("/api/carrier-usage-records", status_code=201)
def create_carrier_usage_record(body: CarrierUsageRecordCreate):
    if body.action not in ("占用", "释放"):
        raise HTTPException(status_code=422, detail="action 必须为 占用/释放")
    code = body.blockCode.strip()
    try:
        with get_cursor() as cur:
            cur.execute(
                "SELECT id, satelliteCode, satelliteId, bandwidth FROM channel_allocation_status WHERE blockCode = %s",
                (code,))
            alloc = cur.fetchone()
            if not alloc:
                raise HTTPException(status_code=422,
                                    detail="频率块代码未在通道分配状态中登记,请先创建分配块")
            cur.execute("SELECT COALESCE(MAX(id),0)+1 AS nid FROM own_carrier_usage_record")
            nid = cur.fetchone()["nid"]
            cur.execute("""
                INSERT INTO own_carrier_usage_record
                    (id, carrierId, blockCode, allocationId, exclusiveType,
                     satelliteCode, satelliteId, bandwidth, action, actionTime,
                     handler, registrar)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s,%s)
            """, (nid, body.carrierId, code, alloc["id"], body.exclusiveType,
                  alloc["satelliteCode"], alloc["satelliteId"],
                  body.bandwidth if body.bandwidth is not None else alloc["bandwidth"],
                  body.action, body.handler, body.registrar))
            return {"id": nid, "allocationId": alloc["id"]}
    except HTTPException:
        raise
    except Exception as e:
        raise db_error(e)


# ══════════════════════════════════════════════════════════════
#  统计:按卫星的频段带宽汇总
# ══════════════════════════════════════════════════════════════
# 分配块占用余额(合约 + 自有,>0 即"实际占用,非空闲")
_ALLOC_BALANCE_SQL = """
    COALESCE((SELECT SUM(CASE WHEN d.action='占用' THEN 1 WHEN d.action='释放' THEN -1 END)
                FROM contract_delivery_record d WHERE d.allocationId = a.id), 0)
  + COALESCE((SELECT SUM(CASE WHEN u.action='占用' THEN 1 WHEN u.action='释放' THEN -1 END)
                FROM own_carrier_usage_record u WHERE u.allocationId = a.id), 0)
"""


@app.get("/api/satellites/{satellite_id}/stats")
def get_stats(satellite_id: int):
    """
    返回:
      byBand       — 各频段:设计带宽 / 最大带宽(开关置1) / 规划 / 分配 / 已用(实际占用)
      byUsageType  — 规划用途分布(有效规划块)
      allocation   — 分配块统计(总数/有效/带宽)
      usage        — 使用统计:最大带宽(开关通) / 已用(实际占用) / 空闲分配 / 使用率
      summary      — 全局汇总
    口径:开关状态=1(通)的输入通道带宽合计为最大带宽;
         实际占用中(占用-释放余额>0,非空闲)的分配块带宽合计为已用。
    """
    try:
        with get_cursor() as cur:
            # 设计带宽:接收通道组下全部通道带宽,按频段汇总
            cur.execute("""
                SELECT g.band, SUM(c.channelBandwidth) AS designBw
                FROM channel_info c
                JOIN channel_group_info g ON g.id = c.channelGroupId
                WHERE g.satelliteId = %s AND g.txRxType = 'R' AND g.band IS NOT NULL
                GROUP BY g.band
            """, (satellite_id,))
            design_rows = cur.fetchall()

            # 最大带宽:开关置1(通)的输入通道(去重)带宽,按频段汇总
            cur.execute("""
                SELECT g.band, SUM(c.channelBandwidth) AS maxBw
                FROM (
                    SELECT DISTINCT p.channelId
                    FROM matrix_switch_status sw
                    JOIN switch_matrix_info m ON m.id = sw.matrixId
                    JOIN matrix_port_info p   ON p.id = sw.inputPortId
                    WHERE m.satelliteId = %s AND m.effectiveStatus = 1
                      AND sw.switchStatus = 1 AND p.channelId IS NOT NULL
                ) t
                JOIN channel_info c       ON c.id = t.channelId
                JOIN channel_group_info g ON g.id = c.channelGroupId
                WHERE g.band IS NOT NULL
                GROUP BY g.band
            """, (satellite_id,))
            max_rows = cur.fetchall()

            # 规划带宽:有效规划块经 channelId → 通道组频段
            cur.execute("""
                SELECT g.band, SUM(p.bandwidth) AS plannedBw
                FROM channel_planning_status p
                JOIN channel_info c       ON c.id = p.channelId
                JOIN channel_group_info g ON g.id = c.channelGroupId
                WHERE p.satelliteId = %s AND p.isValid = 1 AND g.band IS NOT NULL
                GROUP BY g.band
            """, (satellite_id,))
            plan_rows = cur.fetchall()

            # 分配/已用带宽(分频段):有效分配块;余额>0 记为已用
            cur.execute(f"""
                SELECT g.band,
                       SUM(a.bandwidth) AS allocatedBw,
                       SUM(CASE WHEN ({_ALLOC_BALANCE_SQL}) > 0 THEN a.bandwidth ELSE 0 END) AS occupiedBw
                FROM channel_allocation_status a
                JOIN channel_info c       ON c.id = a.channelId
                JOIN channel_group_info g ON g.id = c.channelGroupId
                WHERE a.satelliteId = %s AND a.isValid = 1 AND g.band IS NOT NULL
                GROUP BY g.band
            """, (satellite_id,))
            occ_rows = cur.fetchall()

            # 用途分布(有效规划块)
            cur.execute("""
                SELECT usageType, SUM(bandwidth) AS bw, COUNT(*) AS blockCount
                FROM channel_planning_status
                WHERE satelliteId = %s AND isValid = 1
                GROUP BY usageType
            """, (satellite_id,))
            type_rows = cur.fetchall()

            # 分配统计 + 全星已用合计(不依赖频段解析,口径完整)
            cur.execute(f"""
                SELECT COUNT(*)                                     AS totalBlocks,
                       SUM(CASE WHEN a.isValid = 1 THEN 1 ELSE 0 END) AS validBlocks,
                       COALESCE(SUM(CASE WHEN a.isValid = 1 THEN a.bandwidth ELSE 0 END),0) AS validBw,
                       COALESCE(SUM(CASE WHEN ({_ALLOC_BALANCE_SQL}) > 0
                                         THEN a.bandwidth ELSE 0 END),0)                   AS occupiedBw,
                       SUM(CASE WHEN ({_ALLOC_BALANCE_SQL}) > 0 THEN 1 ELSE 0 END)         AS occupiedBlocks
                FROM channel_allocation_status a
                WHERE a.satelliteId = %s
            """, (satellite_id,))
            alloc_row = cur.fetchone()
    except Exception as e:
        raise db_error(e)

    design_map = {r["band"]: float(r["designBw"] or 0) for r in design_rows}
    max_map = {r["band"]: float(r["maxBw"] or 0) for r in max_rows}
    plan_map = {r["band"]: float(r["plannedBw"] or 0) for r in plan_rows}
    alloc_map = {r["band"]: float(r["allocatedBw"] or 0) for r in occ_rows}
    occ_map = {r["band"]: float(r["occupiedBw"] or 0) for r in occ_rows}
    bands = sorted(set(design_map) | set(max_map) | set(plan_map) | set(alloc_map))
    by_band = [{
        "band": b,
        "designBw": round(design_map.get(b, 0.0), 3),
        "maxBw": round(max_map.get(b, 0.0), 3),
        "plannedBw": round(plan_map.get(b, 0.0), 3),
        "allocatedBw": round(alloc_map.get(b, 0.0), 3),
        "occupiedBw": round(occ_map.get(b, 0.0), 3),
    } for b in bands]

    total_max = sum(max_map.values())
    total_occupied = float(alloc_row["occupiedBw"] or 0)
    total_valid_alloc = float(alloc_row["validBw"] or 0)

    return {
        "byBand": by_band,
        "byUsageType": [
            {"usageType": r["usageType"], "bw": round(float(r["bw"] or 0), 3),
             "blockCount": int(r["blockCount"])}
            for r in type_rows
        ],
        "allocation": {
            "totalBlocks": int(alloc_row["totalBlocks"] or 0),
            "validBlocks": int(alloc_row["validBlocks"] or 0),
            "validBw": round(total_valid_alloc, 3),
        },
        "usage": {
            "maxBw": round(total_max, 3),                       # 开关置1的通道带宽
            "occupiedBw": round(total_occupied, 3),             # 实际占用(非空闲)
            "occupiedBlocks": int(alloc_row["occupiedBlocks"] or 0),
            "idleAllocatedBw": round(max(total_valid_alloc - total_occupied, 0), 3),
            "utilization": round(total_occupied / total_max * 100, 1) if total_max > 0 else 0,
        },
        "summary": {
            "totalDesignBw": round(sum(design_map.values()), 3),
            "totalMaxBw": round(total_max, 3),
            "totalPlannedBw": round(sum(plan_map.values()), 3),
            "totalOccupiedBw": round(total_occupied, 3),
        },
    }
