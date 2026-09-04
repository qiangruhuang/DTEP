#!/usr/bin/env python3
"""Restore the frozen synthetic DTEP demo database from the committed SQL dump.

The binary SQLite database is intentionally not versioned. The SQL dump is the
reviewable, portable source-of-truth for the frozen demo state used by CI/E2E.

Compatibility note
------------------
The frozen SQL dump contains two historical SQLite ``DATETIME`` representations:
older Prisma-created rows use Unix epoch milliseconds, while later rows inserted
through SQLite/raw fixture tooling use timestamp text such as
``2026-09-03 06:09:34``. Prisma 6.19's SQLite connector expects its DateTime
storage representation to be integer epoch milliseconds and raises P2023 when a
query materializes one of the text cells.

After replaying the frozen dump we therefore perform a deterministic,
storage-only compatibility normalization: text values in declared DATETIME
columns are parsed as UTC/ISO timestamps and rewritten to the same instant as
Unix epoch milliseconds. Existing integer values are preserved byte-for-byte.
Business objects, hashes stored inside dataJson, rule-set content and evidence
semantics are not changed.

The v2.2 ontology graph hardening migration is then applied idempotently. It
adds LinkEntry and the ObjectEntry (objectTypeId, pk) uniqueness constraint;
it aborts on duplicate object keys instead of rewriting frozen business data.
"""
from __future__ import annotations

import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from migrate_v22 import migrate_connection

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQL = ROOT / "db" / "custom.sql"
DEFAULT_DB = ROOT / "db" / "custom.db"


def _quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def _text_datetime_to_unix_millis(value: str) -> int:
    text = value.strip()
    if not text:
        raise ValueError("empty DATETIME text")
    # SQLite CURRENT_TIMESTAMP emits ``YYYY-MM-DD HH:MM:SS`` (UTC); Python's
    # ISO parser also accepts that separator. RFC3339 Z values are normalized
    # to an explicit UTC offset before parsing.
    normalized = text[:-1] + "+00:00" if text.endswith("Z") else text
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)
    return int(round(parsed.timestamp() * 1000.0))


def normalize_legacy_datetime_cells(con: sqlite3.Connection) -> int:
    """Convert textual DATETIME cells to Prisma-compatible epoch milliseconds."""
    converted = 0
    tables = [
        row[0]
        for row in con.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
    ]
    for table in tables:
        table_q = _quote_identifier(table)
        for column in con.execute(f"PRAGMA table_info({table_q})"):
            name = str(column[1])
            declared = str(column[2] or "").upper()
            if "DATETIME" not in declared:
                continue
            column_q = _quote_identifier(name)
            rows = list(
                con.execute(
                    f"SELECT rowid, {column_q} FROM {table_q} "
                    f"WHERE typeof({column_q})='text'"
                )
            )
            for rowid, value in rows:
                try:
                    millis = _text_datetime_to_unix_millis(str(value))
                except ValueError as exc:
                    raise RuntimeError(
                        f"cannot normalize DATETIME {table}.{name} rowid={rowid}: {value!r}"
                    ) from exc
                con.execute(
                    f"UPDATE {table_q} SET {column_q}=? WHERE rowid=?",
                    (millis, rowid),
                )
                converted += 1
    return converted


def restore(sql_path: Path, db_path: Path, force: bool = False) -> None:
    if db_path.exists():
        if not force:
            raise SystemExit(f"refusing to overwrite existing database: {db_path}; pass --force")
        db_path.unlink()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    script = sql_path.read_text(encoding="utf-8")
    con = sqlite3.connect(db_path)
    try:
        con.execute("PRAGMA foreign_keys=ON")
        con.executescript(script)
        converted = normalize_legacy_datetime_cells(con)
        migrate_connection(con)
        row = con.execute("PRAGMA integrity_check").fetchone()
        if not row or row[0] != "ok":
            raise RuntimeError(f"sqlite integrity_check failed: {row}")
        con.commit()
    finally:
        con.close()
    print(
        f"restored {db_path} from {sql_path}; normalized {converted} textual DATETIME cells "
        "to epoch milliseconds; applied v2.2 ontology graph hardening"
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql", type=Path, default=DEFAULT_SQL)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    restore(args.sql, args.db, args.force)
