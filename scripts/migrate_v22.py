#!/usr/bin/env python3
"""Idempotent DTEP v2.2 ontology graph hardening migration.

Adds first-class ontology link instances and enforces ObjectEntry primary-key
uniqueness within an ObjectType. The migration aborts instead of silently
repairing duplicate object keys.
"""
from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "db" / "custom.db"


def migrate_connection(con: sqlite3.Connection) -> None:
    duplicates = list(
        con.execute(
            """
            SELECT objectTypeId, pk, COUNT(*)
            FROM ObjectEntry
            GROUP BY objectTypeId, pk
            HAVING COUNT(*) > 1
            ORDER BY objectTypeId, pk
            """
        )
    )
    if duplicates:
        sample = ", ".join(f"{ot}:{pk} x{count}" for ot, pk, count in duplicates[:5])
        raise RuntimeError(f"cannot enforce ObjectEntry uniqueness; duplicates exist: {sample}")

    con.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "ObjectEntry_objectTypeId_pk_key" '
        'ON "ObjectEntry"("objectTypeId", "pk")'
    )

    con.execute(
        """
        CREATE TABLE IF NOT EXISTS "LinkEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "linkTypeId" TEXT NOT NULL,
          "sourceObjectId" TEXT NOT NULL,
          "targetObjectId" TEXT NOT NULL,
          "propertiesJson" TEXT NOT NULL DEFAULT '{}',
          "sourceSystem" TEXT NOT NULL DEFAULT 'dtep',
          "sourceRef" TEXT NOT NULL DEFAULT '',
          "validFrom" DATETIME,
          "validTo" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER) * 1000),
          CONSTRAINT "LinkEntry_linkTypeId_fkey" FOREIGN KEY ("linkTypeId") REFERENCES "LinkType" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "LinkEntry_sourceObjectId_fkey" FOREIGN KEY ("sourceObjectId") REFERENCES "ObjectEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "LinkEntry_targetObjectId_fkey" FOREIGN KEY ("targetObjectId") REFERENCES "ObjectEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    con.execute(
        'CREATE UNIQUE INDEX IF NOT EXISTS "LinkEntry_linkTypeId_sourceObjectId_targetObjectId_sourceRef_key" '
        'ON "LinkEntry"("linkTypeId", "sourceObjectId", "targetObjectId", "sourceRef")'
    )
    con.execute('CREATE INDEX IF NOT EXISTS "LinkEntry_sourceObjectId_idx" ON "LinkEntry"("sourceObjectId")')
    con.execute('CREATE INDEX IF NOT EXISTS "LinkEntry_targetObjectId_idx" ON "LinkEntry"("targetObjectId")')
    con.execute('CREATE INDEX IF NOT EXISTS "LinkEntry_linkTypeId_idx" ON "LinkEntry"("linkTypeId")')


def migrate(db_path: Path) -> None:
    con = sqlite3.connect(db_path)
    try:
        con.execute("PRAGMA foreign_keys=ON")
        migrate_connection(con)
        row = con.execute("PRAGMA integrity_check").fetchone()
        if not row or row[0] != "ok":
            raise RuntimeError(f"sqlite integrity_check failed: {row}")
        con.commit()
    finally:
        con.close()
    print(f"migrated {db_path} to DTEP v2.2 ontology graph schema")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = ap.parse_args()
    migrate(args.db)
