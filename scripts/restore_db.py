#!/usr/bin/env python3
"""Restore the frozen synthetic DTEP demo database from the committed SQL dump.

The binary SQLite database is intentionally not versioned. The SQL dump is the
reviewable, portable source-of-truth for the frozen demo state used by CI/E2E.

Compatibility note
------------------
Earlier DTEP prototype revisions wrote some SQLite ``DATETIME`` columns as Unix
milliseconds. Prisma 6.19 rejects those legacy integer cells with P2023 when a
query materializes the DateTime field, even though the business payload itself
is valid. After replaying the frozen dump we therefore perform a deterministic,
storage-only compatibility normalization: numeric values in declared DATETIME
columns are rewritten to the same UTC instant in RFC3339 text form. Business
objects, hashes stored inside dataJson, rule-set content and evidence semantics
are not changed.
"""
from __future__ import annotations

import argparse
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQL = ROOT / "db" / "custom.sql"
DEFAULT_DB = ROOT / "db" / "custom.db"


def _quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def _to_rfc3339_utc(value: int | float) -> str:
    numeric = float(value)
    # DTEP legacy Prisma/JS timestamps are millisecond Unix epochs (~1e12).
    # Keep a conservative seconds fallback for any older fixture that used a
    # standard Unix epoch instead.
    seconds = numeric / 1000.0 if abs(numeric) >= 100_000_000_000 else numeric
    return datetime.fromtimestamp(seconds, tz=timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def normalize_legacy_datetime_cells(con: sqlite3.Connection) -> int:
    """Normalize numeric cells in declared DATETIME columns for Prisma 6.x.

    The operation is deterministic and preserves the represented instant. Text
    values are intentionally left untouched so committed fixture timestamps are
    not reformatted unnecessarily.
    """
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
                    f"WHERE typeof({column_q}) IN ('integer','real')"
                )
            )
            for rowid, value in rows:
                con.execute(
                    f"UPDATE {table_q} SET {column_q}=? WHERE rowid=?",
                    (_to_rfc3339_utc(value), rowid),
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
        con.executescript(script)
        converted = normalize_legacy_datetime_cells(con)
        row = con.execute("PRAGMA integrity_check").fetchone()
        if not row or row[0] != "ok":
            raise RuntimeError(f"sqlite integrity_check failed: {row}")
        con.commit()
    finally:
        con.close()
    print(f"restored {db_path} from {sql_path}; normalized {converted} legacy DATETIME cells")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql", type=Path, default=DEFAULT_SQL)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    restore(args.sql, args.db, args.force)
