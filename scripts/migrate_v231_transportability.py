#!/usr/bin/env python3
"""DTEP v2.3.1 second-case transportability fixture and relation backfill.

This migration is additive and idempotent. It does not alter the frozen CASE-01
business values or v2.1 rule hashes. Legacy implicit references are materialized
as LinkEntry relations, then a small, clearly DEMO/SYNTHETIC CASE-02 is added
using only existing ontology types/link types.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "db" / "custom.db"
FIXED_AT = 1790208000000  # deterministic fixture timestamp


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def _id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("::".join(parts).encode("utf-8")).hexdigest()[:28]
    return f"{prefix}_{digest}"


def _type(con: sqlite3.Connection, api_name: str) -> sqlite3.Row:
    row = con.execute("SELECT id, apiName FROM ObjectType WHERE apiName=?", (api_name,)).fetchone()
    if not row:
        raise RuntimeError(f"missing ObjectType {api_name}")
    return row


def _entry(con: sqlite3.Connection, api_name: str, pk: str) -> sqlite3.Row | None:
    type_id = _type(con, api_name)["id"]
    return con.execute(
        "SELECT id, pk, title, dataJson FROM ObjectEntry WHERE objectTypeId=? AND pk=?",
        (type_id, pk),
    ).fetchone()


def _data(row: sqlite3.Row | None) -> dict:
    return json.loads(row["dataJson"] or "{}") if row else {}


def _create_object(
    con: sqlite3.Connection,
    api_name: str,
    pk: str,
    title: str,
    data: dict,
) -> sqlite3.Row:
    existing = _entry(con, api_name, pk)
    if existing:
        return existing
    type_id = _type(con, api_name)["id"]
    con.execute(
        "INSERT INTO ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) VALUES(?,?,?,?,?,?)",
        (_id("v231oe", api_name, pk), type_id, pk, title, _json(data), FIXED_AT),
    )
    return _entry(con, api_name, pk)


def _ensure_link(
    con: sqlite3.Connection,
    link_api: str,
    source_api: str,
    source_pk: str,
    target_api: str,
    target_pk: str,
    source_ref: str = "v2.3.1-transportability",
    properties: dict | None = None,
) -> bool:
    link = con.execute(
        "SELECT id,sourceTypeId,targetTypeId FROM LinkType WHERE apiName=?",
        (link_api,),
    ).fetchone()
    if not link:
        raise RuntimeError(f"missing LinkType {link_api}")
    source = _entry(con, source_api, source_pk)
    target = _entry(con, target_api, target_pk)
    if not source or not target:
        return False
    if _type(con, source_api)["id"] != link["sourceTypeId"] or _type(con, target_api)["id"] != link["targetTypeId"]:
        raise RuntimeError(f"LinkType {link_api} endpoint mismatch: {source_api}->{target_api}")
    con.execute(
        """
        INSERT OR IGNORE INTO LinkEntry
          (id,linkTypeId,sourceObjectId,targetObjectId,propertiesJson,sourceSystem,sourceRef,createdAt)
        VALUES(?,?,?,?,?,?,?,?)
        """,
        (
            _id("v231le", link_api, source_pk, target_pk, source_ref),
            link["id"],
            source["id"],
            target["id"],
            _json(properties or {}),
            "dtep-v2.3.1",
            source_ref,
            FIXED_AT,
        ),
    )
    return True


def _all(con: sqlite3.Connection, api_name: str) -> list[sqlite3.Row]:
    type_id = _type(con, api_name)["id"]
    return list(con.execute(
        "SELECT id,pk,title,dataJson FROM ObjectEntry WHERE objectTypeId=? ORDER BY pk",
        (type_id,),
    ))


def _refs(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if x]
    return [str(value)]


def _model_ref(value: object) -> str:
    return str(value).split("@", 1)[0]


def _materialize_case_relations(con: sqlite3.Connection, case_pk: str) -> None:
    case_row = _entry(con, "DigitalTestCase", case_pk)
    if not case_row:
        return
    case = _data(case_row)

    program_id = case.get("programId")
    if program_id:
        _ensure_link(con, "hasDigitalCase", "TestProgram", str(program_id), "DigitalTestCase", case_pk)

    thread_refs = _refs(case.get("missionThread"))
    scenario_refs = []
    for key in ("baselineScenario", "stressScenario", "scenarios"):
        scenario_refs.extend(_refs(case.get(key)))
    event_refs = _refs(case.get("eventPlan"))
    measure_refs = _refs(case.get("measures"))
    model_refs = _refs(case.get("models"))
    gate_refs = _refs(case.get("evidenceGates"))
    run_refs = _refs(case.get("runs"))
    package_refs = _refs(case.get("evidencePackages"))

    for ref in dict.fromkeys(thread_refs):
        _ensure_link(con, "caseUsesMissionThread", "DigitalTestCase", case_pk, "MissionThread", ref)
    for ref in dict.fromkeys(scenario_refs):
        _ensure_link(con, "caseUsesScenario", "DigitalTestCase", case_pk, "TestScenario", ref)
    for ref in dict.fromkeys(event_refs):
        _ensure_link(con, "caseUsesEvent", "DigitalTestCase", case_pk, "TestEvent", ref)
    for ref in dict.fromkeys(measure_refs):
        _ensure_link(con, "caseAssessesMeasure", "DigitalTestCase", case_pk, "Measure", ref)
    for ref in dict.fromkeys(model_refs):
        _ensure_link(con, "caseUsesModel", "DigitalTestCase", case_pk, "ModelAsset", ref)
    for ref in dict.fromkeys(gate_refs):
        _ensure_link(con, "caseControlledByGate", "DigitalTestCase", case_pk, "EvidenceGate", ref)
    for ref in dict.fromkeys(run_refs):
        _ensure_link(con, "caseHasRun", "DigitalTestCase", case_pk, "TestRun", ref)
    for ref in dict.fromkeys(package_refs):
        _ensure_link(con, "caseHasEvidencePackage", "DigitalTestCase", case_pk, "EvidencePackage", ref)

    for thread_ref in thread_refs:
        thread = _data(_entry(con, "MissionThread", thread_ref))
        linked_events = _refs(thread.get("events")) or event_refs
        linked_scenarios = _refs(thread.get("scenarioRef")) or scenario_refs
        for event_ref in dict.fromkeys(linked_events):
            _ensure_link(con, "threadUsesEvent", "MissionThread", thread_ref, "TestEvent", event_ref)
        for scenario_ref in dict.fromkeys(linked_scenarios):
            _ensure_link(con, "threadUsesScenario", "MissionThread", thread_ref, "TestScenario", scenario_ref)

    deficiencies = [(_data(row), row["pk"]) for row in _all(con, "Deficiency")]
    models = [(_data(row), row["pk"]) for row in _all(con, "ModelAsset")]
    reports = [(_data(row), row["pk"]) for row in _all(con, "Report")]
    runs = [(_data(row), row["pk"]) for row in _all(con, "TestRun")]

    for event_ref in event_refs:
        event = _data(_entry(con, "TestEvent", event_ref))
        assessed = _refs(event.get("assesses"))
        for measure_ref in assessed:
            _ensure_link(con, "assesses", "TestEvent", event_ref, "Measure", measure_ref)
        for deficiency, deficiency_pk in deficiencies:
            if deficiency.get("foundIn") == event_ref:
                _ensure_link(con, "foundDeficiency", "TestEvent", event_ref, "Deficiency", deficiency_pk)
        for model, model_pk in models:
            if event_ref in _refs(model.get("usedIn")):
                _ensure_link(con, "usesModel", "TestEvent", event_ref, "ModelAsset", model_pk)
        for run, run_pk in runs:
            if run.get("eventId") == event_ref and (not run.get("caseId") or run.get("caseId") == case_pk):
                _ensure_link(con, "eventHasRun", "TestEvent", event_ref, "TestRun", run_pk)
        for report, report_pk in reports:
            if event_ref in _refs(report.get("basedOnEvents")):
                for measure_ref in assessed:
                    _ensure_link(con, "supportsReport", "Measure", measure_ref, "Report", report_pk)

    for scenario_ref in scenario_refs:
        scenario = _data(_entry(con, "TestScenario", scenario_ref))
        for model_value in _refs(scenario.get("models")):
            _ensure_link(con, "scenarioUsesModel", "TestScenario", scenario_ref, "ModelAsset", _model_ref(model_value))

    gates = [(_data(row), row["pk"]) for row in _all(con, "EvidenceGate")]
    for gate, gate_pk in gates:
        measure_id = gate.get("measureId")
        if measure_id in measure_refs:
            _ensure_link(con, "measureGate", "Measure", str(measure_id), "EvidenceGate", gate_pk)

    for run_ref in run_refs:
        run = _data(_entry(con, "TestRun", run_ref))
        if run.get("eventId"):
            _ensure_link(con, "eventHasRun", "TestEvent", str(run["eventId"]), "TestRun", run_ref)
        if run.get("scenarioId"):
            _ensure_link(con, "runUsesScenario", "TestRun", run_ref, "TestScenario", str(run["scenarioId"]))
        for model_value in _refs(run.get("modelSnapshot")):
            _ensure_link(con, "runUsesModel", "TestRun", run_ref, "ModelAsset", _model_ref(model_value))

    for package_ref in package_refs:
        package = _data(_entry(con, "EvidencePackage", package_ref))
        for run_ref in _refs(package.get("runRefs")):
            _ensure_link(con, "packageContainsRun", "EvidencePackage", package_ref, "TestRun", run_ref)
        rule_ref = package.get("ruleSetRef")
        if rule_ref:
            _ensure_link(con, "packageControlledByRuleSet", "EvidencePackage", package_ref, "EvidenceGateRuleSet", str(rule_ref))
        for gate_ref in gate_refs:
            _ensure_link(con, "packageSupportsGate", "EvidencePackage", package_ref, "EvidenceGate", gate_ref)


def _create_case02(con: sqlite3.Connection) -> None:
    case_id = "CASE-02"
    _create_object(con, "MissionThread", "MT-COMMS-02", "D7 软件升级互操作性任务线程", {
        "code": "MT-COMMS-02", "caseId": case_id,
        "name": "D7 软件升级互操作性任务线程",
        "missionObjective": "验证软件升级后发现—建链—业务交换—故障恢复的互操作性链路。",
        "steps": [
            {"id": "C1", "name": "节点发现"}, {"id": "C2", "name": "建立会话"},
            {"id": "C3", "name": "交换业务数据"}, {"id": "C4", "name": "故障恢复"},
        ],
        "events": ["TE-26-101"], "measures": ["M-21", "M-22"], "coverage": 75,
        "status": "性能试验完成/状态鉴定准备", "owner": "互操作性试验组",
        "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "TestScenario", "SC-COMMS-BASE", "D7 软件升级互操作性基准场景", {
        "code": "SC-COMMS-BASE", "caseId": case_id, "name": "D7 软件升级互操作性基准场景",
        "kind": "软件互操作性/实验室网络", "status": "已执行",
        "missionThread": "MT-COMMS-02", "models": ["MD-COMMS-01@SW-5.2"],
        "linkedEvents": ["TE-26-101"],
        "assumptions": ["固定三节点拓扑", "不包含强电磁对抗和武器交战"],
        "taskProfile": "软件升级互操作性状态鉴定", "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "TestEvent", "TE-26-101", "D7 R5.2 软件互操作性性能试验", {
        "code": "TE-26-101", "caseId": case_id, "name": "D7 R5.2 软件互操作性性能试验",
        "phase": "DT", "type": "软件互操作性性能试验", "window": "DEMO D+1",
        "range": "互操作性实验室", "status": "已完成",
        "liveCount": 2, "virtualCount": 3, "constructiveCount": 0,
        "assesses": ["M-21", "M-22"], "produces": ["candidate/software/interop-101"],
        "progress": 100, "lead": "互操作性试验负责人", "anomalyScore": 0.08,
        "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "Measure", "M-21", "跨版本接口业务交换成功率", {
        "code": "M-21", "caseId": case_id, "name": "跨版本接口业务交换成功率",
        "category": "互操作性指标", "unit": "%", "threshold": 99.0, "objective": 99.9,
        "measured": 99.4, "status": "达标", "programId": "TP-25-04",
        "coveredBy": ["TE-26-101"], "confidence": 0.95, "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "Measure", "M-22", "软件升级后业务恢复时间", {
        "code": "M-22", "caseId": case_id, "name": "软件升级后业务恢复时间",
        "category": "适用性指标", "unit": "s", "threshold": 60, "objective": 30,
        "measured": 42, "status": "达标", "programId": "TP-25-04",
        "coveredBy": ["TE-26-101"], "confidence": 0.93, "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "ModelAsset", "MD-COMMS-01", "D7 协议栈与软件互操作模型", {
        "code": "MD-COMMS-01", "caseId": case_id, "name": "D7 协议栈与软件互操作模型",
        "kind": "软件/接口仿真模型", "vvaStatus": "已确认", "version": "SW-5.2",
        "verification": "通过", "validation": "通过", "accreditation": "有条件认可",
        "accreditingAuthority": "DEMO VV&A 评审组",
        "intendedUse": "软件升级接口兼容性与恢复逻辑补充分析",
        "validationDomain": "D7 R5.1/R5.2；固定三节点拓扑；实验室网络",
        "limitations": ["不覆盖对抗电磁环境", "不替代正式状态鉴定数字化模型审验"],
        "usedIn": ["TE-26-101"], "criticality": "支撑", "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "EvidenceGate", "EG-COMMS", "D7 软件互操作性证据门控", {
        "code": "EG-COMMS", "caseId": case_id, "name": "D7 软件互操作性证据门控",
        "measureId": "M-21", "decision": "有条件通过",
        "criteria": ["事件覆盖", "接口一致性", "模型适用域", "技术状态可追溯"],
        "blockers": ["正式状态鉴定技术状态基线尚未批准"],
        "requiredEvidence": ["状态鉴定技术状态批准记录", "正式数字化模型审验结论"],
        "owner": "DEMO 鉴定主管", "lastEvaluated": "DEMO D+2",
    })
    _create_object(con, "Deficiency", "DF-26-101", "R5.1/R5.2 初始握手字段兼容性问题", {
        "code": "DF-26-101", "caseId": case_id, "title": "R5.1/R5.2 初始握手字段兼容性问题",
        "severity": "III类", "status": "已闭环", "foundIn": "TE-26-101",
        "owner": "D7 软件组", "raisedAt": "DEMO D+1",
        "rootCause": "字段默认值不一致；修正映射并完成回归复测。", "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "Report", "RP-26-101", "D7 R5.2 软件互操作性性能试验报告", {
        "code": "RP-26-101", "caseId": case_id, "title": "D7 R5.2 软件互操作性性能试验报告",
        "type": "性能试验报告", "status": "已批准",
        "basedOnDatasets": ["candidate/software/interop-101"], "basedOnEvents": ["TE-26-101"],
        "verdict": "DEMO/SYNTHETIC：实验室互操作性指标达到本次性能试验门槛；不等同于状态鉴定批准。",
        "version": "V1.0-DEMO", "author": "互操作性试验组",
    })
    contract = _create_object(con, "InterfaceContract", "CTR-COMMS-API-01", "D7 R5.x 互操作接口契约", {
        "code": "CTR-COMMS-API-01", "caseId": case_id, "kind": "IDL/API",
        "version": "5.2-demo", "requirements": ["节点发现", "会话建立", "业务交换", "故障恢复"],
        "status": "试验基线", "conformanceStatus": "DEMO PASS", "demoNotice": "DEMO/SYNTHETIC",
    })
    baseline_manifest = {
        "caseId": case_id, "scenarioRef": "SC-COMMS-BASE",
        "modelRefs": ["MD-COMMS-01"], "contractRefs": [contract["pk"]],
        "purpose": "软件互操作性性能试验执行基线；不等同于状态鉴定批准技术状态。",
    }
    baseline_hash = "sha256:" + hashlib.sha256(_json(baseline_manifest).encode("utf-8")).hexdigest()
    _create_object(con, "ModelBaseline", "BL-COMMS-02", "D7 软件互操作性试验执行模型基线", {
        "code": "BL-COMMS-02", **baseline_manifest, "status": "已冻结（试验执行基线）",
        "baselineHash": baseline_hash, "formalTechnicalState": False, "demoNotice": "DEMO/SYNTHETIC",
    })
    assembly_manifest = {
        "caseId": case_id, "scenarioRef": "SC-COMMS-BASE", "baselineRef": "BL-COMMS-02",
        "modelBindings": [{"modelRef": "MD-COMMS-01", "version": "SW-5.2"}],
        "interfaceContractRefs": ["CTR-COMMS-API-01"],
    }
    assembly_hash = "sha256:" + hashlib.sha256(_json(assembly_manifest).encode("utf-8")).hexdigest()
    _create_object(con, "TestModelAssembly", "TMA-COMMS-02", "D7 软件互操作性 Test Model Assembly", {
        "code": "TMA-COMMS-02", **assembly_manifest, "assemblyHash": assembly_hash,
        "status": "已冻结/仅限本次性能试验", "demoNotice": "DEMO/SYNTHETIC",
    })
    _create_object(con, "DigitalTestCase", case_id, "D7 数据链终端软件升级互操作性状态鉴定", {
        "code": case_id, "name": "D7 数据链终端软件升级互操作性状态鉴定",
        "programId": "TP-25-04",
        "question": "D7 数据链终端升级至 R5.2 后，跨版本节点能否稳定发现、建立会话、交换业务数据并在软件故障后按门槛恢复？",
        "taskProfile": "软件升级互操作性/状态鉴定",
        "missionThread": "MT-COMMS-02", "baselineScenario": "SC-COMMS-BASE",
        "eventPlan": ["TE-26-101"], "measures": ["M-21", "M-22"],
        "models": ["MD-COMMS-01"], "evidenceGates": ["EG-COMMS"],
        "status": "状态鉴定准备/硬前置未齐",
        "decision": "DEMO/SYNTHETIC：性能试验已有可用输入，但尚缺正式技术状态批准、数据采信和数字化模型审验，不能提交状态鉴定结论。",
        "nextActions": ["建立正式技术状态批准对象", "完成数字化模型审验", "形成数据采信记录"],
        "owner": "D7 状态鉴定项目组", "runs": [], "evidencePackages": [],
        "demoNotice": "完全不同任务类型的最小第二Case，仅用于验证治理推理可迁移性。",
    })

    _materialize_case_relations(con, case_id)

    _ensure_link(con, "scenarioUsesAssembly", "TestScenario", "SC-COMMS-BASE", "TestModelAssembly", "TMA-COMMS-02")
    _ensure_link(con, "scenarioUsesModel", "TestScenario", "SC-COMMS-BASE", "ModelAsset", "MD-COMMS-01")
    _ensure_link(con, "baselineInstantiatesAssembly", "ModelBaseline", "BL-COMMS-02", "TestModelAssembly", "TMA-COMMS-02")
    _ensure_link(con, "assemblyUsesModel", "TestModelAssembly", "TMA-COMMS-02", "ModelAsset", "MD-COMMS-01")
    _ensure_link(con, "assemblyUsesContract", "TestModelAssembly", "TMA-COMMS-02", "InterfaceContract", "CTR-COMMS-API-01")


def migrate_connection(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    if not con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='LinkEntry'").fetchone():
        raise RuntimeError("v2.3.1 requires v2.2 LinkEntry migration first")

    _create_case02(con)
    for row in _all(con, "DigitalTestCase"):
        _materialize_case_relations(con, row["pk"])

    for api_name in [
        "DigitalTestCase", "MissionThread", "TestScenario", "TestEvent", "Measure",
        "ModelAsset", "EvidenceGate", "Deficiency", "Report", "InterfaceContract",
        "ModelBaseline", "TestModelAssembly",
    ]:
        type_id = _type(con, api_name)["id"]
        count = con.execute("SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?", (type_id,)).fetchone()[0]
        con.execute("UPDATE ObjectType SET objectCount=? WHERE id=?", (count, type_id))


def migrate(db_path: Path) -> None:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    try:
        con.execute("PRAGMA foreign_keys=ON")
        migrate_connection(con)
        fk = list(con.execute("PRAGMA foreign_key_check"))
        if fk:
            raise RuntimeError(f"foreign_key_check failed: {fk[:5]}")
        integrity = con.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"integrity_check failed: {integrity}")
        con.commit()
    finally:
        con.close()
    print(f"migrated {db_path} to DTEP v2.3.1 second-case transportability fixture")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = ap.parse_args()
    migrate(args.db)
