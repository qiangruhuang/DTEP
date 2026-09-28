#!/usr/bin/env python3
"""DTEP v2.3.4 reuse revocation/change-propagation ontology migration.

Extends EvidenceReuseAuthorization with content-addressed source-state fields
used to detect later source drift without introducing case-specific logic.
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


def ensure_property(
    con: sqlite3.Connection,
    object_type_id: str,
    api_name: str,
    display_name: str,
    data_type: str,
    description: str,
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
        (uid("v234_prop"), object_type_id, api_name, display_name, data_type, description),
    )


def migrate_connection(con: sqlite3.Connection) -> None:
    reuse = type_row(con, "EvidenceReuseAuthorization")
    if not reuse:
        raise RuntimeError("EvidenceReuseAuthorization missing; apply migrate_v233.py first")

    for spec in [
        (
            "sourceSnapshotDigest",
            "来源内容摘要",
            "string",
            "授权时来源对象 dataJson 的规范化 SHA-256；后续不一致即触发重新鉴定。",
        ),
        (
            "sourceValidationDomain",
            "来源验证域快照",
            "string",
            "授权时来源对象 validationDomain；后续变化视为适用域漂移。",
        ),
    ]:
        ensure_property(con, str(reuse[0]), *spec)


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
    print(f"migrated {db_path} to DTEP v2.3.4 reuse change-propagation ontology")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = ap.parse_args()
    migrate(args.db)
