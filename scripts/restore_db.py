#!/usr/bin/env python3
"""Restore the frozen synthetic DTEP demo database from the committed SQL dump.

The binary SQLite database is intentionally not versioned. The SQL dump is the
reviewable, portable source-of-truth for the frozen demo state used by CI/E2E.
"""
from __future__ import annotations
import argparse
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQL = ROOT / "db" / "custom.sql"
DEFAULT_DB = ROOT / "db" / "custom.db"


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
        row = con.execute("PRAGMA integrity_check").fetchone()
        if not row or row[0] != "ok":
            raise RuntimeError(f"sqlite integrity_check failed: {row}")
        con.commit()
    finally:
        con.close()
    print(f"restored {db_path} from {sql_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--sql", type=Path, default=DEFAULT_SQL)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    restore(args.sql, args.db, args.force)
