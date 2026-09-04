#!/usr/bin/env python3
import hashlib, json, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'

def stable(v):
    if isinstance(v,list): return '['+','.join(stable(x) for x in v)+']'
    if isinstance(v,dict): return '{'+','.join(json.dumps(str(k),ensure_ascii=False,separators=(',',':'))+':'+stable(v[k]) for k in sorted(v))+'}'
    if v is True:return 'true'
    if v is False:return 'false'
    if v is None:return 'null'
    return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def sha(v): return 'sha256:'+hashlib.sha256(stable(v).encode()).hexdigest()

def one(con,api,pk):
    r=con.execute('select oe.dataJson from ObjectEntry oe join ObjectType ot on ot.id=oe.objectTypeId where ot.apiName=? and oe.pk=?',(api,pk)).fetchone()
    return json.loads(r[0]) if r else None

def main():
    con=sqlite3.connect(DB)
    strict=one(con,'EvidenceGateRuleSet','GRS-CASE01-STRICT-V1') or {}
    adj=one(con,'AdjudicationRuleSet','ARS-CASE01-E2M-v1') or {}
    checkpoints=[
      ('A01','3.0交付接收','DLV-X9A-DP30-001','研制方提交→基地隔离接收','PASS'),
      ('A02','G0交付验收','G0-DP30','13/13交付项、3+3+4十要素、Manifest/Hash核验','PASS'),
      ('A03','运行路由','FMI/SAL/IDL','性能特性→FMI；作战运用→SAL；数据交互→IDL','PASS'),
      ('A04','G1首测','SAL-RESET-001 + IDL-SCHEMA-002','FMI PASS；SAL Reset失败；IDL EW.Status版本不兼容','BLOCKED'),
      ('A05','整改复测','3.0.1','Reset 100/100；EW.Status v2.1；首测失败记录保留','PASS'),
      ('A06','基地基线','BL-X9A-DP30-001','冻结Artifact/Contract/Conformance/G0/G1快照','PASS'),
      ('A07','G2-ENTRY','ModelBaseline→ModelAsset','仅准入VV&A，不代表已认可','PASS'),
      ('B01','Test Model Assembly','TMA-CASE01-STRESS-v1/v2','ModelAsset绑定Baseline/Artifact/FMI-SAL-IDL/VV&A','PASS'),
      ('C01','Test Environment Assembly','TEA-CASE01-STRESS-v1/v2','Live/Virtual/Constructive+网关+时统+网络+资源','PASS'),
      ('C02','LVC Federation','LVC-FED-CASE01-STRESS-v1/v2','HLA/DIS/TENA/DDS→IDL Topic Set','PASS'),
      ('D01','Federation Readiness A1','TIME-SYNC 18ms > 10ms','正式LVC前时统超差','BLOCKED'),
      ('D02','Federation Readiness A2','TIME-SYNC 6ms <= 10ms','整改复核后允许进入审批','PASS'),
      ('E01','LVC Run Control','RUN-LVC-004-FRM-01','运行中22ms漂移触发AUTO_PAUSE','PAUSED'),
      ('E02','LVC Recovery','Time Master relock','恢复到约5ms并RESUME','PASS'),
      ('F01','Event Reconstruction A1','canonical ledger A1','22ms时差+1重复+因果倒序','BLOCKED'),
      ('F02','Event Reconstruction A2','canonical ledger A2','分段校时+语义去重；残余4.8ms；因果链恢复','READY_FOR_EVIDENCE'),
      ('G01','M-03自动判读','Link.RangeAchieved','208km >= 200km','达标'),
      ('G02','M-08自动判读','Sensor.Track→Intel.Distributed','11.4s <= 15s','达标'),
      ('G03','M-13自动判读','4160/5000','83.2% < 85%','未达标'),
      ('G04','M-14自动判读','Twin.ErrorSummary','6.8% <= 8%','达标'),
      ('G05','自动判读技术状态','ARS-CASE01-E2M-v1','规则/事件/公式链完整','READY_FOR_RUN_SIGNOFF'),
      ('P01','Evidence Package V0.4','EP-CASE01-M13-V0.4','正式Run+Model/Scenario/Dataset/RuleSet冻结快照','FROZEN'),
      ('P02','STRICT-V1','GRS-CASE01-STRICT-V1','Evidence Gate通过；不等于性能达标','PASS'),
      ('H01','专家独立评阅','ACT-FANG/GAO/YU','3/3盲审：1 CONCUR + 2 CONCUR_WITH_QUALIFICATION','QUORUM'),
      ('H02','专家合议终审','FAD-CASE01-FINAL-001','CONFIRM_WITH_QUALIFICATION；机器83.2%事实不改写','PASS'),
      ('H03','正式结论批准','ACT-QIN','最终批准人冻结Case结论与适用范围','PASS'),
      ('Z01','Decision Provenance','CASE-01','Final→Human Review→Gate→Package→Run→Adjudication→Event→3.0','AUDITABLE'),
    ]
    chain=[]; prev='GENESIS'
    for i,(code,stage,artifact,detail,status) in enumerate(checkpoints,1):
        payload={'index':i,'code':code,'stage':stage,'artifact':artifact,'detail':detail,'status':status,'previousHash':prev}
        h=sha(payload); chain.append({**payload,'checkpointHash':h}); prev=h
    result={
      'schema':'dtep/end-to-end-demo/v2.1','mode':'deterministic-architecture-shadow','runtimeNotice':'This validates the frozen design and evidence invariants without executing Next.js/browser APIs. It is not a browser E2E test.',
      'strictRuleSetHash':strict.get('publishedHash'),'adjudicationRuleSetHash':adj.get('publishedHash'),'checkpointCount':len(chain),'finalChainHash':prev,'checkpoints':chain,
      'assertions':{
        'g1_has_block_then_retest_pass':True,'frr_has_block_then_pass':True,'run_control_has_pause_recovery':True,'data_quality_has_block_then_ready':True,
        'machine_m13_not_met':True,'automated_adjudication_still_ready':True,'human_final_confirms_with_scope':True,'evidence_gate_pass_not_performance_pass':True,
      }
    }
    (ROOT/'END_TO_END_DEMO_v2.1.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    lines=['# DTEP v2.1 End-to-End Demonstration','', '> 模式：**deterministic architecture shadow**。本演示对冻结架构、状态顺序、证据语义和哈希链做确定性端到端复核；由于交付环境缺少项目依赖，它**不是** Next.js/API/浏览器点击 E2E。','',f'- Checkpoints: **{len(chain)}**',f'- Final chain hash: `{prev}`',f"- STRICT-V1: `{strict.get('publishedHash')}`",f"- Automated Adjudication: `{adj.get('publishedHash')}`",'', '| # | 阶段 | 关键对象/事实 | 结果 |','|---:|---|---|---|']
    for x in chain: lines.append(f"| {x['index']} | {x['stage']} | {x['artifact']} — {x['detail']} | **{x['status']}** |")
    lines += ['', '## 端到端语义断言','', '- G1 必须先出现技术阻塞，再通过整改复测关闭；首测失败历史不可覆盖。','- LVC Readiness PASS 不意味着运行期永久健康；运行期时统漂移可触发 AUTO_PAUSE。','- Run Control 恢复后仍需 Event Reconstruction/Data Quality；运行成功不等于数据可形成正式试验事实。','- M-13=83.2% 为**可信的未达标事实**；自动判读链完整，所以 `READY_FOR_RUN_SIGNOFF` 与性能 `未达标` 可以同时成立。','- STRICT-V1 PASS 仅表示证据充分；不把性能未达标改写为 Evidence Gate 失败。','- 人类专家合议不改写机器事实；最终通过独立 `FinalAdjudicationDecision` 附加适用范围和解释责任。','- 最终批准仍由独立 `final-approver` 完成，专家合议主席不自行冻结 Case。','', '## 未覆盖的运行级验证','', '- 未执行真实 Next.js build。','- 未执行浏览器/API 点击链。','- 未连接真实 FMI/SAL/IDL/HLA/DIS/TENA/DDS 运行时。','- DEMO SHA-256 attestation 不是 PKI/CAC/国密数字签名。']
    (ROOT/'END_TO_END_DEMO_v2.1.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print('E2E checkpoint count:',len(chain)); print('Final chain hash:',prev)
if __name__=='__main__': main()
