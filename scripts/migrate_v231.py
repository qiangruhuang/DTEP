#!/usr/bin/env python3
"""DTEP v2.3.1 second-case transportability migration.

Case-specific identifiers belong in fixture/migration data. Runtime governance
must resolve a case by caseId and first-class ontology relations.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "db" / "custom.db"


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def type_id(con: sqlite3.Connection, api_name: str) -> str:
    row = con.execute("SELECT id FROM ObjectType WHERE apiName=?", (api_name,)).fetchone()
    if not row:
        raise RuntimeError(f"missing ObjectType: {api_name}")
    return str(row[0])


def entry_row(con: sqlite3.Connection, api_name: str, pk: str):
    tid = type_id(con, api_name)
    return con.execute(
        "SELECT id,title,dataJson FROM ObjectEntry WHERE objectTypeId=? AND pk=?",
        (tid, pk),
    ).fetchone()


def ensure_entry(con: sqlite3.Connection, api_name: str, pk: str, title: str, data: dict) -> str:
    tid = type_id(con, api_name)
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    row = con.execute(
        "SELECT id FROM ObjectEntry WHERE objectTypeId=? AND pk=?", (tid, pk)
    ).fetchone()
    if row:
        con.execute(
            "UPDATE ObjectEntry SET title=?,dataJson=?,updatedAt=(CAST(strftime('%s','now') AS INTEGER)*1000) WHERE id=?",
            (title, body, row[0]),
        )
        return str(row[0])
    eid = uid("obj")
    con.execute(
        "INSERT INTO ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) VALUES(?,?,?,?,?,(CAST(strftime('%s','now') AS INTEGER)*1000))",
        (eid, tid, pk, title, body),
    )
    return eid


def ensure_link_type(
    con: sqlite3.Connection,
    api_name: str,
    display_name: str,
    source_type: str,
    target_type: str,
    cardinality: str = "一对多",
) -> str:
    source_id = type_id(con, source_type)
    target_id = type_id(con, target_type)
    row = con.execute("SELECT id FROM LinkType WHERE apiName=?", (api_name,)).fetchone()
    if row:
        con.execute(
            "UPDATE LinkType SET displayName=?,sourceTypeId=?,targetTypeId=?,cardinality=? WHERE id=?",
            (display_name, source_id, target_id, cardinality, row[0]),
        )
        return str(row[0])
    lid = uid("lt")
    con.execute(
        "INSERT INTO LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) VALUES(?,?,?,?,?,?)",
        (lid, api_name, display_name, source_id, target_id, cardinality),
    )
    return lid


def ensure_link(
    con: sqlite3.Connection,
    link_api_name: str,
    source_type: str,
    source_pk: str,
    target_type: str,
    target_pk: str,
    properties: dict | None = None,
    source_ref: str = "v2.3.1",
) -> None:
    lt = con.execute("SELECT id FROM LinkType WHERE apiName=?", (link_api_name,)).fetchone()
    if not lt:
        raise RuntimeError(f"missing LinkType: {link_api_name}")
    source = entry_row(con, source_type, source_pk)
    target = entry_row(con, target_type, target_pk)
    if not source or not target:
        raise RuntimeError(
            f"missing relation endpoint: {source_type}/{source_pk} -> {target_type}/{target_pk}"
        )
    props = json.dumps(properties or {}, ensure_ascii=False, separators=(",", ":"))
    row = con.execute(
        """SELECT id FROM LinkEntry
           WHERE linkTypeId=? AND sourceObjectId=? AND targetObjectId=? AND sourceRef=?""",
        (lt[0], source[0], target[0], source_ref),
    ).fetchone()
    if row:
        con.execute(
            "UPDATE LinkEntry SET propertiesJson=?,sourceSystem='dtep-migration-v231' WHERE id=?",
            (props, row[0]),
        )
        return
    con.execute(
        """INSERT INTO LinkEntry(
             id,linkTypeId,sourceObjectId,targetObjectId,propertiesJson,
             sourceSystem,sourceRef,createdAt
           ) VALUES(?,?,?,?,?,'dtep-migration-v231',?,(CAST(strftime('%s','now') AS INTEGER)*1000))""",
        (uid("le"), lt[0], source[0], target[0], props, source_ref),
    )


def json_data(row) -> dict:
    return json.loads(row[2] or "{}") if row else {}


def list_entries(con: sqlite3.Connection, api_name: str) -> list[tuple[str, dict]]:
    tid = type_id(con, api_name)
    out: list[tuple[str, dict]] = []
    for pk, body in con.execute(
        "SELECT pk,dataJson FROM ObjectEntry WHERE objectTypeId=? ORDER BY pk", (tid,)
    ):
        try:
            data = json.loads(body or "{}")
        except json.JSONDecodeError:
            data = {}
        out.append((str(pk), data))
    return out


def recount(con: sqlite3.Connection) -> None:
    for (tid,) in con.execute("SELECT id FROM ObjectType"):
        count = con.execute(
            "SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?", (tid,)
        ).fetchone()[0]
        con.execute("UPDATE ObjectType SET objectCount=? WHERE id=?", (count, tid))


def ensure_governance_link_types(con: sqlite3.Connection) -> None:
    for spec in [
        ("caseHasDeficiency", "Case 关联问题闭环", "DigitalTestCase", "Deficiency", "一对多"),
        ("caseHasReport", "Case 关联报告", "DigitalTestCase", "Report", "一对多"),
        ("caseUsesModelBaseline", "Case 使用模型基线", "DigitalTestCase", "ModelBaseline", "一对多"),
        ("caseUsesModelAssembly", "Case 使用试验模型装配", "DigitalTestCase", "TestModelAssembly", "一对多"),
        ("caseUsesInterfaceContract", "Case 使用接口契约", "DigitalTestCase", "InterfaceContract", "一对多"),
    ]:
        ensure_link_type(con, *spec)


def backfill_case01_relations(con: sqlite3.Connection) -> None:
    case_pk = "CASE-01"
    row = entry_row(con, "DigitalTestCase", case_pk)
    if not row:
        raise RuntimeError("missing frozen CASE-01")
    data = json_data(row)

    program = data.get("programId")
    if isinstance(program, str) and entry_row(con, "TestProgram", program):
        ensure_link(con, "hasDigitalCase", "TestProgram", program, "DigitalTestCase", case_pk)

    for key, link_api, target_type, role in [
        ("missionThread", "caseUsesMissionThread", "MissionThread", "primary"),
        ("baselineScenario", "caseUsesScenario", "TestScenario", "baseline"),
        ("stressScenario", "caseUsesScenario", "TestScenario", "stress"),
    ]:
        value = data.get(key)
        if isinstance(value, str) and entry_row(con, target_type, value):
            ensure_link(
                con, link_api, "DigitalTestCase", case_pk, target_type, value,
                {"semanticRole": role},
            )

    for key, link_api, target_type in [
        ("eventPlan", "caseUsesEvent", "TestEvent"),
        ("measures", "caseAssessesMeasure", "Measure"),
        ("models", "caseUsesModel", "ModelAsset"),
        ("evidenceGates", "caseControlledByGate", "EvidenceGate"),
        ("runs", "caseHasRun", "TestRun"),
        ("evidencePackages", "caseHasEvidencePackage", "EvidencePackage"),
    ]:
        for value in data.get(key) or []:
            if isinstance(value, str) and entry_row(con, target_type, value):
                ensure_link(con, link_api, "DigitalTestCase", case_pk, target_type, value)

    # v2.3 treated these collections as CASE-01-global because no second case
    # existed. Preserve that behavior explicitly, but never absorb records that
    # declare another caseId on idempotent reruns.
    for target_type, link_api in [
        ("Deficiency", "caseHasDeficiency"),
        ("Report", "caseHasReport"),
        ("ModelBaseline", "caseUsesModelBaseline"),
        ("TestModelAssembly", "caseUsesModelAssembly"),
        ("InterfaceContract", "caseUsesInterfaceContract"),
    ]:
        for target_pk, target_data in list_entries(con, target_type):
            declared_case = target_data.get("caseId")
            if declared_case not in (None, "", case_pk):
                continue
            ensure_link(
                con, link_api, "DigitalTestCase", case_pk, target_type, target_pk,
                {"migrationBasis": "legacy-v2.3-case-global-scope"},
            )

    # Semantic roles replace case-specific IDs in runtime governance reasoning.
    for link_api, target_type, target_pk, role in [
        ("caseUsesEvent", "TestEvent", "TE-25-002", "qualification-performance-anchor"),
        ("caseUsesEvent", "TestEvent", "TE-25-004", "operational-evidence-anchor"),
        ("caseAssessesMeasure", "Measure", "M-03", "qualification-performance-measure"),
        ("caseAssessesMeasure", "Measure", "M-05", "qualification-performance-measure"),
        ("caseAssessesMeasure", "Measure", "M-07", "qualification-performance-measure"),
        ("caseAssessesMeasure", "Measure", "M-13", "operational-effectiveness-measure"),
        ("caseUsesModel", "ModelAsset", "MD-02", "formal-digital-model-review-input"),
        ("caseUsesModel", "ModelAsset", "MD-07", "formal-digital-model-review-input"),
        ("caseUsesModel", "ModelAsset", "MD-08", "formal-digital-model-review-input"),
    ]:
        if entry_row(con, target_type, target_pk):
            ensure_link(
                con, link_api, "DigitalTestCase", case_pk, target_type, target_pk,
                {"governanceRole": role},
            )


def create_case02(con: sqlite3.Connection) -> None:
    ensure_entry(
        con, "TestProgram", "TP-26-02",
        "MPS-2 机动保障电源站可靠性与维修性试验",
        {
            "code": "TP-26-02", "name": "MPS-2 机动保障电源站可靠性与维修性试验",
            "phase": "性能试验/状态鉴定准备", "lead": "综合保障试验室",
            "progress": 68, "eventsDone": 1, "eventsTotal": 2,
            "measuresMet": 1, "measuresTotal": 2,
        },
    )
    ensure_entry(
        con, "DigitalTestCase", "CASE-02",
        "MPS-2 连续供电与故障恢复可靠性试验鉴定",
        {
            "code": "CASE-02",
            "name": "MPS-2 连续供电与故障恢复可靠性试验鉴定",
            "programId": "TP-26-02",
            "taskType": "reliability-maintainability-supportability",
            "question": "MPS-2 在连续负载与单故障注入条件下，能否满足持续供电与规定时间内恢复供电的可靠性/维修性要求？",
            "missionThread": "MT-RMS-01",
            "baselineScenario": "SC-RMS-BASE",
            "stressScenario": "SC-RMS-FAULT",
            "eventPlan": ["TE-RMS-001", "TE-RMS-002"],
            "measures": ["M-RMS-01", "M-RMS-02"],
            "models": ["MD-RMS-01"],
            "evidenceGates": [], "runs": [], "evidencePackages": [],
            "status": "状态鉴定准备",
            "decision": "连续供电性能已有受控证据；故障恢复现场保障试验尚未完成。",
            "nextActions": ["完成故障注入与现场维修恢复试验", "形成正式状态鉴定文件资料"],
            "owner": "保障装备试验负责人",
        },
    )
    ensure_entry(
        con, "MissionThread", "MT-RMS-01",
        "保障电源连续供电—故障隔离—恢复任务线程",
        {
            "code": "MT-RMS-01", "name": "保障电源连续供电—故障隔离—恢复任务线程",
            "missionObjective": "验证保障电源在连续负载和单故障条件下保持/恢复供电能力。",
            "scenarioRef": "SC-RMS-BASE", "coverage": 55, "status": "试验中",
            "owner": "保障装备试验负责人",
            "measures": ["M-RMS-01", "M-RMS-02"], "events": ["TE-RMS-001", "TE-RMS-002"],
            "risks": ["现场故障恢复科目尚未完成"],
            "steps": [
                {"id": "S1", "label": "连续负载供电", "status": "covered"},
                {"id": "S2", "label": "故障注入与隔离", "status": "planned"},
                {"id": "S3", "label": "维修恢复与再供电", "status": "planned"},
            ],
        },
    )
    for pk, title, kind, status in [
        ("SC-RMS-BASE", "额定负载连续供电基准场景", "reliability-endurance", "已批准"),
        ("SC-RMS-FAULT", "单故障注入与现场恢复场景", "maintainability-recovery", "待执行"),
    ]:
        ensure_entry(
            con, "TestScenario", pk, title,
            {
                "code": pk, "name": title, "kind": kind, "status": status,
                "missionThread": "MT-RMS-01", "weather": "常温/标准保障场地",
            },
        )

    ensure_entry(
        con, "TestEvent", "TE-RMS-001", "额定负载 72 h 连续供电性能试验",
        {
            "code": "TE-RMS-001", "name": "额定负载 72 h 连续供电性能试验",
            "status": "已完成", "phase": "性能试验", "progress": 100, "produces": [],
        },
    )
    ensure_entry(
        con, "TestEvent", "TE-RMS-002", "单故障注入与现场维修恢复试验",
        {
            "code": "TE-RMS-002", "name": "单故障注入与现场维修恢复试验",
            "status": "待执行", "phase": "作战/保障使用试验", "progress": 0, "produces": [],
        },
    )
    ensure_entry(
        con, "Measure", "M-RMS-01", "连续供电可用度",
        {
            "code": "M-RMS-01", "name": "连续供电可用度", "status": "达标",
            "value": 99.4, "unit": "%", "threshold": ">=99.0%", "category": "reliability",
        },
    )
    ensure_entry(
        con, "Measure", "M-RMS-02", "单故障平均恢复时间",
        {
            "code": "M-RMS-02", "name": "单故障平均恢复时间", "status": "待考核",
            "value": None, "unit": "min", "threshold": "<=30 min", "category": "maintainability",
        },
    )
    ensure_entry(
        con, "ModelAsset", "MD-RMS-01", "保障电源可靠性状态模型",
        {
            "code": "MD-RMS-01", "name": "保障电源可靠性状态模型",
            "version": "RMS-1.0", "vvaStatus": "已确认", "verification": "通过",
            "validation": "通过", "accreditation": "已认可",
            "intendedUse": "连续供电可靠性试验设计与证据解释",
            "validationDomain": "额定负载；单故障模式；标准保障环境",
            "limitations": ["不覆盖多重共因故障"],
        },
    )
    ensure_entry(
        con, "ModelBaseline", "MB-RMS-01", "MPS-2 可靠性状态模型基线",
        {"code": "MB-RMS-01", "caseId": "CASE-02", "status": "frozen", "modelRefs": ["MD-RMS-01@RMS-1.0"]},
    )
    ensure_entry(
        con, "Report", "RPT-RMS-PERF-01", "MPS-2 连续供电性能试验阶段报告",
        {"code": "RPT-RMS-PERF-01", "caseId": "CASE-02", "status": "阶段报告", "scope": "72 h 连续供电性能试验"},
    )
    ensure_entry(
        con, "Deficiency", "DF-RMS-01", "冷启动接插件松动问题",
        {"code": "DF-RMS-01", "caseId": "CASE-02", "status": "已闭环", "severity": "II", "closureEvidence": ["TE-RMS-001"]},
    )

    ensure_link(con, "hasDigitalCase", "TestProgram", "TP-26-02", "DigitalTestCase", "CASE-02")
    ensure_link(con, "caseUsesMissionThread", "DigitalTestCase", "CASE-02", "MissionThread", "MT-RMS-01", {"semanticRole": "primary"})
    ensure_link(con, "caseUsesScenario", "DigitalTestCase", "CASE-02", "TestScenario", "SC-RMS-BASE", {"semanticRole": "baseline"})
    ensure_link(con, "caseUsesScenario", "DigitalTestCase", "CASE-02", "TestScenario", "SC-RMS-FAULT", {"semanticRole": "stress"})
    ensure_link(con, "caseUsesEvent", "DigitalTestCase", "CASE-02", "TestEvent", "TE-RMS-001", {"governanceRole": "qualification-performance-anchor"})
    ensure_link(con, "caseUsesEvent", "DigitalTestCase", "CASE-02", "TestEvent", "TE-RMS-002", {"governanceRole": "operational-evidence-anchor"})
    ensure_link(con, "caseAssessesMeasure", "DigitalTestCase", "CASE-02", "Measure", "M-RMS-01", {"governanceRole": "qualification-performance-measure"})
    ensure_link(con, "caseAssessesMeasure", "DigitalTestCase", "CASE-02", "Measure", "M-RMS-02", {"governanceRole": "operational-effectiveness-measure"})
    ensure_link(con, "caseUsesModel", "DigitalTestCase", "CASE-02", "ModelAsset", "MD-RMS-01", {"governanceRole": "formal-digital-model-review-input"})
    ensure_link(con, "caseUsesModelBaseline", "DigitalTestCase", "CASE-02", "ModelBaseline", "MB-RMS-01")
    ensure_link(con, "caseHasReport", "DigitalTestCase", "CASE-02", "Report", "RPT-RMS-PERF-01")
    ensure_link(con, "caseHasDeficiency", "DigitalTestCase", "CASE-02", "Deficiency", "DF-RMS-01")


def migrate_connection(con: sqlite3.Connection) -> None:
    ensure_governance_link_types(con)
    backfill_case01_relations(con)
    create_case02(con)
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
    print(f"migrated {db_path} to DTEP v2.3.1 second-case transportability fixture")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = ap.parse_args()
    migrate(args.db)
