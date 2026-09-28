#!/usr/bin/env python3
"""DTEP v2.3.3 governed cross-case evidence reuse ontology migration.

Adds a first-class authorization record for bounded cross-case reuse. The
authorization is linked to the receiving DigitalTestCase; evidence objects are
still linked through the existing case relation, which must reference the
authorization in relation properties.
"""
from __future__ import annotations

import argparse
import sqlite3
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "db" / "custom.db"


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def type_row(con: sqlite3.Connection, api_name: str):
    return con.execute("SELECT id FROM ObjectType WHERE apiName=?", (api_name,)).fetchone()


def ensure_type(
    con: sqlite3.Connection,
    api_name: str,
    display_name: str,
    description: str,
    icon: str,
) -> str:
    row = type_row(con, api_name)
    if row:
        con.execute(
            "UPDATE ObjectType SET displayName=?,description=?,icon=? WHERE apiName=?",
            (display_name, description, icon, api_name),
        )
        return str(row[0])
    object_type_id = uid("v233_type")
    con.execute(
        """INSERT INTO ObjectType(
             id,apiName,displayName,description,icon,objectCount,createdAt
           ) VALUES(?,?,?,?,?,0,CURRENT_TIMESTAMP)""",
        (object_type_id, api_name, display_name, description, icon),
    )
    return object_type_id


def ensure_property(
    con: sqlite3.Connection,
    object_type_id: str,
    api_name: str,
    display_name: str,
    data_type: str,
    description: str = "",
) -> None:
    row = con.execute(
        "SELECT id FROM PropertyDef WHERE objectTypeId=? AND apiName=?",
        (object_type_id, api_name),
    ).fetchone()
    if row:
        con.execute(
            """UPDATE PropertyDef
               SET displayName=?,dataType=?,description=?,isDerived=0
               WHERE id=?""",
            (display_name, data_type, description, row[0]),
        )
        return
    con.execute(
        """INSERT INTO PropertyDef(
             id,objectTypeId,apiName,displayName,dataType,description,isDerived
           ) VALUES(?,?,?,?,?,?,0)""",
        (uid("v233_prop"), object_type_id, api_name, display_name, data_type, description),
    )


def ensure_link_type(
    con: sqlite3.Connection,
    api_name: str,
    display_name: str,
    source_type: str,
    target_type: str,
    cardinality: str = "一对多",
) -> None:
    source = type_row(con, source_type)
    target = type_row(con, target_type)
    if not source or not target:
        raise RuntimeError(f"missing link endpoint: {source_type} -> {target_type}")
    row = con.execute("SELECT id FROM LinkType WHERE apiName=?", (api_name,)).fetchone()
    if row:
        con.execute(
            """UPDATE LinkType
               SET displayName=?,sourceTypeId=?,targetTypeId=?,cardinality=?
               WHERE id=?""",
            (display_name, source[0], target[0], cardinality, row[0]),
        )
        return
    con.execute(
        """INSERT INTO LinkType(
             id,apiName,displayName,sourceTypeId,targetTypeId,cardinality
           ) VALUES(?,?,?,?,?,?)""",
        (uid("v233_link"), api_name, display_name, source[0], target[0], cardinality),
    )


def recount(con: sqlite3.Connection) -> None:
    for (object_type_id,) in con.execute("SELECT id FROM ObjectType"):
        count = con.execute(
            "SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?",
            (object_type_id,),
        ).fetchone()[0]
        con.execute(
            "UPDATE ObjectType SET objectCount=? WHERE id=?",
            (count, object_type_id),
        )


def migrate_connection(con: sqlite3.Connection) -> None:
    reuse_type = ensure_type(
        con,
        "EvidenceReuseAuthorization",
        "跨 Case 证据复用授权",
        "对既有 Case 的试验、模型、指标或其他证据在另一 Case 中受控复用的采信记录；冻结来源、适用域、审批、有效期、限制和重新鉴定触发条件。",
        "git-merge",
    )
    for spec in [
        ("code", "授权编号", "string", "稳定、可审计的授权编号"),
        ("sourceCaseId", "来源 Case", "string", "证据原始归属 Case"),
        ("targetCaseId", "接收 Case", "string", "申请复用证据的 Case"),
        ("sourceObjectType", "来源对象类型", "string", "被复用证据对象的 Ontology 类型"),
        ("sourceObjectPk", "来源对象主键", "string", "被复用证据对象的 Ontology 主键"),
        ("relationApiName", "目标关系", "string", "接收 Case 用于挂接该证据的关系类型"),
        ("allowedGovernanceRoles", "允许治理角色", "json", "授权该证据承担的治理语义角色"),
        ("targetTaskTypes", "适用任务类型", "json", "允许复用的接收 Case taskType"),
        ("purpose", "采信用途", "string", "本次跨 Case 复用的受控用途"),
        ("status", "授权状态", "string", "approved / pending / revoked"),
        ("decision", "采信决定", "string", "accept-for-reuse / reject"),
        ("equivalenceBasis", "等效性依据", "string", "说明来源证据为何可用于目标 Case"),
        ("provenanceRef", "来源追溯", "string", "来源证据包、报告或审计链引用"),
        ("sourceSnapshotRef", "来源冻结快照", "string", "来源对象版本、哈希或冻结基线引用"),
        ("sourceApprovedBy", "来源批准人", "string", "来源 Case 侧授权责任人"),
        ("targetApprovedBy", "接收批准人", "string", "接收 Case 侧采信责任人"),
        ("approvedAt", "批准时间", "string", "授权批准时间"),
        ("validFrom", "生效时间", "string", "ISO-8601 生效时间"),
        ("validTo", "失效时间", "string", "ISO-8601 失效时间"),
        ("limitations", "复用限制", "json", "不能继承或需要限定解释的边界"),
        ("requalificationTriggers", "重新鉴定触发条件", "json", "配置、环境、任务或证据变化后必须重新评估的条件"),
    ]:
        ensure_property(con, reuse_type, *spec)

    ensure_link_type(
        con,
        "caseHasReuseAuthorization",
        "Case 包含跨 Case 证据复用授权",
        "DigitalTestCase",
        "EvidenceReuseAuthorization",
        "一对多",
    )
    recount(con)


def migrate(db_path: Path) -> None:
    con = sqlite3.connect(db_path)
    try:
        con.execute("PRAGMA foreign_keys=ON")
        migrate_connection(con)
        fk_errors = list(con.execute("PRAGMA foreign_key_check"))
        if fk_errors:
            raise RuntimeError(f"foreign_key_check failed: {fk_errors[:5]}")
        integrity = con.execute("PRAGMA integrity_check").fetchone()
        if not integrity or integrity[0] != "ok":
            raise RuntimeError(f"sqlite integrity_check failed: {integrity}")
        con.commit()
    finally:
        con.close()
    print(f"migrated {db_path} to DTEP v2.3.3 governed cross-case evidence reuse ontology")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = ap.parse_args()
    migrate(args.db)
