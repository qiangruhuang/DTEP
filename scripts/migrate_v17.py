#!/usr/bin/env python3
"""DTEP v1.7 governance metadata migration.

Adds role principals, approval/signature ontology types and links while preserving
CASE-01 in the v1.6 V0.3/BLOCKED initial state. No evidence-closure business step is
pre-executed here.
"""
import json, sqlite3, uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'db'/'custom.db'
con=sqlite3.connect(DB); con.execute('PRAGMA foreign_keys=ON'); cur=con.cursor()

def uid(p): return f"v17_{p}_{uuid.uuid4().hex[:24]}"
def dumps(v): return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def type_id(api):
    r=cur.execute('SELECT id FROM ObjectType WHERE apiName=?',(api,)).fetchone(); return r[0] if r else None

def ensure_type(api,display,desc,icon,props):
    tid=type_id(api)
    if not tid:
        tid=uid('ot'); cur.execute('INSERT INTO ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP)',(tid,api,display,desc,icon,0))
    else:
        cur.execute('UPDATE ObjectType SET displayName=?,description=?,icon=? WHERE id=?',(display,desc,icon,tid))
    for a,d,t in props:
        if not cur.execute('SELECT 1 FROM PropertyDef WHERE objectTypeId=? AND apiName=?',(tid,a)).fetchone():
            cur.execute('INSERT INTO PropertyDef(id,objectTypeId,apiName,displayName,dataType,description,isDerived) VALUES(?,?,?,?,?,?,0)',(uid('pd'),tid,a,d,t,''))
    return tid

def ensure_link(api,display,source,target,cardinality):
    if cur.execute('SELECT 1 FROM LinkType WHERE apiName=?',(api,)).fetchone(): return
    cur.execute('INSERT INTO LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) VALUES(?,?,?,?,?,?)',(uid('ln'),api,display,type_id(source),type_id(target),cardinality))

def upsert_entry(api,pk,title,data):
    tid=type_id(api); row=cur.execute('SELECT id FROM ObjectEntry WHERE objectTypeId=? AND pk=?',(tid,pk)).fetchone()
    if row: cur.execute('UPDATE ObjectEntry SET title=?,dataJson=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',(title,dumps(data),row[0]))
    else: cur.execute('INSERT INTO ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)',(uid('oe'),tid,pk,title,dumps(data)))

def refresh(api):
    tid=type_id(api); n=cur.execute('SELECT COUNT(*) FROM ObjectEntry WHERE objectTypeId=?',(tid,)).fetchone()[0]; cur.execute('UPDATE ObjectType SET objectCount=? WHERE id=?',(n,tid))

ensure_type('WorkflowPrincipal','工作流人员与角色','CASE-01 演示用岗位身份与单一职责角色映射；真实系统应由组织身份目录/PKI 提供。','users',[
 ('code','人员编号','string'),('caseId','适用 Case','string'),('name','姓名','string'),('title','岗位','string'),('roleId','角色编号','string'),('roleName','角色名称','string'),('active','是否有效','boolean'),('identityAssurance','身份保证','string')])
ensure_type('ApprovalRecord','审批记录','受控状态迁移动作的申请、独立审批与职责分离记录。','badge-check',[
 ('code','审批编号','string'),('caseId','所属 Case','string'),('stepId','状态步骤','string'),('status','审批状态','string'),('requestedBy','发起人','string'),('requestedRole','发起角色','string'),('requestedAt','发起时间','string'),('approvedBy','批准人','string'),('approvedRole','批准角色','string'),('approvedAt','批准时间','string'),('decision','审批决定','string')])
ensure_type('SignatureRecord','签署记录','对申请、审批或执行结果形成的 DEMO SHA-256 见证记录；用于原型审计，不等同于真实 PKI/CAC 数字签名。','signature',[
 ('code','签署编号','string'),('caseId','所属 Case','string'),('stepId','状态步骤','string'),('phase','签署阶段','string'),('signerId','签署人','string'),('signerRole','签署角色','string'),('signedAt','签署时间','string'),('subjectDigest','签署对象摘要','string'),('signatureHash','签署哈希','string'),('signatureScheme','签署机制','string'),('assurance','保证级别说明','string')])
for x in [
 ('caseHasApprovalRecord','Case 包含审批记录','DigitalTestCase','ApprovalRecord','一对多'),
 ('caseHasSignatureRecord','Case 包含签署记录','DigitalTestCase','SignatureRecord','一对多'),
 ('approvalActor','审批记录关联人员','ApprovalRecord','WorkflowPrincipal','多对多'),
 ('signatureActor','签署记录关联人员','SignatureRecord','WorkflowPrincipal','多对一')]: ensure_link(*x)

actors=[
 ('ACT-LIN','林晓东','试验执行员','test-executor','Live 试验执行'),
 ('ACT-LIU','刘晨','LVC 总控席','lvc-controller','LVC 联合试验执行'),
 ('ACT-HE','何斌','模型负责人','model-owner','模型/VV&A 提交'),
 ('ACT-ZHAO','赵岚','认可授权人','accreditation-authority','M&S 认可审批'),
 ('ACT-WU','吴静','数字试验运行席','digital-operator','正式数字 Run 执行'),
 ('ACT-TANG','唐宁','证据负责人','evidence-manager','Evidence Package 编制'),
 ('ACT-ZHOU','周衡','试验总师','test-director','试验执行/证据冻结审批'),
 ('ACT-SUN','孙立','鉴定评估负责人','evaluation-authority','正式 Evidence Gate'),
 ('ACT-QIN','秦岳','鉴定批准人','final-approver','正式结论批准与冻结')]
for code,name,title,role,role_name in actors:
    upsert_entry('WorkflowPrincipal',code,f'{title} · {name}',dict(code=code,caseId='CASE-01',name=name,title=title,roleId=role,roleName=role_name,active=True,identityAssurance='DEMO ROLE SWITCH / NOT AUTHENTICATED'))

# Delivery must start clean: governance records are created only by user clicks.
for api in ['ApprovalRecord','SignatureRecord']:
    tid=type_id(api)
    if tid:
        rows=cur.execute('SELECT id,dataJson FROM ObjectEntry WHERE objectTypeId=?',(tid,)).fetchall()
        ids=[]
        for oid,data in rows:
            try:
                if json.loads(data or '{}').get('caseId')=='CASE-01': ids.append(oid)
            except Exception: pass
        if ids: cur.executemany('DELETE FROM ObjectEntry WHERE id=?',[(x,) for x in ids])

for api in ['WorkflowPrincipal','ApprovalRecord','SignatureRecord']: refresh(api)
con.commit()
print('v1.7 governance migration complete')
print('WorkflowPrincipal:',cur.execute('SELECT objectCount FROM ObjectType WHERE apiName="WorkflowPrincipal"').fetchone()[0])
print('ApprovalRecord:',cur.execute('SELECT objectCount FROM ObjectType WHERE apiName="ApprovalRecord"').fetchone()[0])
print('SignatureRecord:',cur.execute('SELECT objectCount FROM ObjectType WHERE apiName="SignatureRecord"').fetchone()[0])
