#!/usr/bin/env python3
import argparse, hashlib, json, sqlite3, uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'db'/'custom.db'
CASE='DP30-INTAKE-01'; DELIVERY='DLV-X9A-DP30-001'; PROTO='DP30-X9A-S3'; MANIFEST='MAN-X9A-DP30-001'

def j(x): return json.dumps(x, ensure_ascii=False, separators=(',',':'))
def h(x): return 'sha256:'+hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def uid(prefix): return f'{prefix}_{uuid.uuid4().hex[:18]}'

def ot(con, api, display, desc, icon):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if r: return r[0]
    i=uid('v20aot'); con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(i,api,display,desc,icon)); return i

def upsert(con, api, pk, title, data):
    oid=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()[0]
    r=con.execute('select id from ObjectEntry where objectTypeId=? and pk=?',(oid,pk)).fetchone()
    if r: con.execute('update ObjectEntry set title=?,dataJson=?,updatedAt=CURRENT_TIMESTAMP where id=?',(title,j(data),r[0]))
    else: con.execute('insert into ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) values(?,?,?,?,?,CURRENT_TIMESTAMP)',(uid('v20aoe'),oid,pk,title,j(data)))

def delete_case(con, api, predicate):
    r=con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
    if not r: return
    oid=r[0]
    rows=con.execute('select id,pk,dataJson from ObjectEntry where objectTypeId=?',(oid,)).fetchall()
    for rid,pk,dj in rows:
        try: d=json.loads(dj or '{}')
        except: d={}
        if predicate(d,pk): con.execute('delete from ObjectEntry where id=?',(rid,))

def recount(con):
    for oid, in con.execute('select id from ObjectType'):
        n=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(oid,)).fetchone()[0]
        con.execute('update ObjectType set objectCount=? where id=?',(n,oid))

def link(con, api, display, s_api, t_api):
    if con.execute('select 1 from LinkType where apiName=?',(api,)).fetchone(): return
    s=con.execute('select id from ObjectType where apiName=?',(s_api,)).fetchone()[0]; t=con.execute('select id from ObjectType where apiName=?',(t_api,)).fetchone()[0]
    con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid('v20alt'),api,display,s,t,'一对多'))

ART=[
('ART-DP30-01','总体布局','产品构成','总体布局','非仿真运行类','STEP/CAD + PNG','Viewer','静态查看',None),
('ART-DP30-02','系统组成','产品构成','系统组成','非仿真运行类','SysML BDD/IBD + XML','Ontology Import','结构化/逻辑视图',None),
('ART-DP30-03','配套资源','产品构成','配套资源','非仿真运行类','XML/JSON','Resource Import','结构化数据',None),
('ART-DP30-04','功能特性','产品特性','功能特性','混合类','SysML ACT/STM + XML','Requirements/Measure Mapping','结构化+逻辑视图',None),
('ART-DP30-05','性能特性 FMU','产品特性','性能特性','仿真运行类','FMU','FMI Runtime','FMI 2.0 Co-Simulation','MD-01'),
('ART-DP30-06','通用质量特性','产品特性','通用质量特性','混合类','XML + FMU','FMI/Analysis','FMI 2.0 + XML',None),
('ART-DP30-07','操作使用','产品行为','操作使用','非仿真运行类','IETM + XML + STM','Procedure/Training','结构化+逻辑视图',None),
('ART-DP30-08','维修保障','产品行为','维修保障','非仿真运行类','IETM + XML','Support Workflow','结构化文本/数据',None),
('ART-DP30-09','作战运用 SAL 模型','产品行为','作战运用','仿真运行类','Binary + Config','SAL Runtime','SAL + IDL','MD-08'),
('ART-DP30-10','虚实交互适配器','产品行为','虚实交互','仿真运行类','Binary + IDL','LVC / Live Gateway','IDL Topic + SAL Interaction',None),
]
CONTRACTS=[
('CTR-DP30-FMI-01','X9A 性能模型 FMI 契约','FMI','2.0',['ART-DP30-05','ART-DP30-06'],['FMU 可解析','Instantiate/Initialize','doStep','Reset','跨平台加载','输入输出元数据完整']),
('CTR-DP30-SAL-01','X9A 作战运用 SAL 契约','SAL','1.0-demo',['ART-DP30-09'],['时间管理','事件管理','模型管理','交互管理','服务管理','阵营管理','PrepareData','Validate','Start','Reset']),
('CTR-DP30-IDL-01','X9A 模型交互 IDL 契约','IDL','1.3',['ART-DP30-09','ART-DP30-10'],['平台状态 Topic','传感器/目标 Topic','EW.Status v2.1','Mission.Status','WeaponEngagement','发布/订阅兼容']),
]
ACTORS=[
('DPA-ZHANG','张嵘','研制方交付代表','delivery-provider','数字样机交付/整改提交'),('DPA-CHEN','陈楷','数字样机接收员','intake-officer','交付接收与完整性核验'),('DPA-HAN','韩宁','模型符合性工程师','conformance-engineer','FMI/SAL/IDL 技术符合性试验'),('DPA-LUO','罗毅','配置平台主管','configuration-manager','配置审查与基地基线冻结'),('DPA-ZHAO','赵岚','模型资格认可授权人','qualification-authority','模型资格准入与 VV&A 移交')]

def baseline(con, reset=False):
    refs=[a[0] for a in ART]; crefs=[c[0] for c in CONTRACTS]
    delivery={'code':DELIVERY,'caseId':CASE,'name':'X9A 数字样机 3.0 交付批次','provider':'X9A 承研承制单位','receiver':'试验鉴定基地','targetProgram':'TP-25-01','targetCase':'CASE-01','deliveryVersion':'3.0.0','submittedAt':'2026-08-28T09:30:00+08:00','status':'研制方已提交 · 待基地签收','prototypeRef':PROTO,'manifestRef':MANIFEST,'media':{'label':'DP30-X9A-S3-001','classification':'DEMO','encrypted':True,'sizeGb':18.6},'custody':None,'baselineRef':None,'gates':{'G0':{'status':'未执行','label':'Delivery Acceptance'},'G1':{'status':'未执行','label':'Technical Conformance'},'G2':{'status':'未执行','label':'Qualification / VV&A Entry'}},'targetOutcome':'形成试验基地权威模型基线，并将可运行模型映射为 ModelAsset 进入 CASE-01 / Model VV&A。','demoNotice':'DEMO/SYNTHETIC：所有文件、版本、哈希和符合性结果仅用于原型演示。'}
    proto={'code':PROTO,'deliveryRef':DELIVERY,'name':'X9A 数字样机模型（3.0-交付）','stage':'3.0-交付','status':'待接收资格鉴定','composition':{'产品构成模型':['ART-DP30-01','ART-DP30-02','ART-DP30-03'],'产品特性模型':['ART-DP30-04','ART-DP30-05','ART-DP30-06'],'产品行为模型':['ART-DP30-07','ART-DP30-08','ART-DP30-09','ART-DP30-10']},'elementCount':10,'runtimeArtifactRefs':['ART-DP30-05','ART-DP30-06','ART-DP30-09','ART-DP30-10'],'staticArtifactRefs':['ART-DP30-01','ART-DP30-02','ART-DP30-03','ART-DP30-07','ART-DP30-08'],'sourceRule':'3.0 = 产品构成 + 产品特性 + 产品行为；运行类按性能试验/作战试验分别进入 FMI 与 SAL/IDL 技术路线。'}
    body={'schema':'dtep/dp30-delivery-manifest/v2.0a','deliveryRef':DELIVERY,'prototypeRef':PROTO,'artifactRefs':refs,'contractRefs':crefs,'declaredElementCount':10,'version':'3.0.0'}
    manifest={**body,'code':MANIFEST,'status':'待核验','declaredPackageHash':h({'media':'DP30-X9A-S3-001','version':'3.0.0','artifactRefs':refs,'contractRefs':crefs}),'manifestHash':h(body),'verifiedAt':None,'verifiedBy':None,'checks':None}
    if reset or not con.execute("select 1 from ObjectEntry e join ObjectType t on e.objectTypeId=t.id where t.apiName='DigitalPrototypeDelivery' and e.pk=?",(DELIVERY,)).fetchone():
        upsert(con,'DigitalPrototypeDelivery',DELIVERY,'X9A 数字样机 3.0 交付批次',delivery); upsert(con,'DigitalPrototype3',PROTO,'X9A 数字样机模型（3.0-交付）',proto); upsert(con,'DeliveryManifest',MANIFEST,'X9A 数字样机 3.0 Manifest',manifest)
    for pk,title,cat,el,rc,fmt,route,iface,prom in ART:
        if reset or not con.execute("select 1 from ObjectEntry e join ObjectType t on e.objectTypeId=t.id where t.apiName='ModelArtifact' and e.pk=?",(pk,)).fetchone():
            upsert(con,'ModelArtifact',pk,title,{'pk':pk,'title':title,'category':cat,'element':el,'runtimeClass':rc,'format':fmt,'deliveryVersion':'3.0.0','route':route,'interfaceProfile':iface,'promotedModelRef':prom,'deliveryRef':DELIVERY,'prototypeRef':PROTO,'status':'随包提交 · 待核验','fileHash':h({'pk':pk,'version':'3.0.0','format':fmt}),'conformanceStatus':'未测试','remediation':None})
    for pk,title,kind,ver,arefs,reqs in CONTRACTS:
        if reset or not con.execute("select 1 from ObjectEntry e join ObjectType t on e.objectTypeId=t.id where t.apiName='InterfaceContract' and e.pk=?",(pk,)).fetchone():
            upsert(con,'InterfaceContract',pk,title,{'pk':pk,'title':title,'kind':kind,'version':ver,'artifactRefs':arefs,'requirements':reqs,'deliveryRef':DELIVERY,'status':'随包提交 · 待核验','conformanceStatus':'未测试'})
    gates=[('G0-DP30','G0 · Delivery Acceptance','G0','交付给基地的数字样机3.0是否齐套、可识别、哈希一致？'),('G1-DP30','G1 · Technical Conformance','G1','运行类模型能否在基地环境按FMI/SAL/IDL契约运行和交互？'),('G2-DP30','G2 · Qualification / VV&A Entry','G2','是否可形成基地基线并进入具体Intended Use的VV&A/试验设计？')]
    for pk,title,g,q in gates:
        if reset or not con.execute("select 1 from ObjectEntry e join ObjectType t on e.objectTypeId=t.id where t.apiName='IntakeGate' and e.pk=?",(pk,)).fetchone(): upsert(con,'IntakeGate',pk,title,{'code':pk,'caseId':CASE,'gate':g,'question':q,'status':'未执行','blockers':[],'decision':None,**({'note':'G2-ENTRY通过不等于模型已完成VV&A认可。'} if g=='G2' else {})})

    if reset:
        for api in ['ConformanceTest','ConformanceResult','ModelBaseline','ApprovalRecord','SignatureRecord']:
            delete_case(con,api,lambda d,pk: d.get('caseId')==CASE or d.get('sourceDeliveryRef')==DELIVERY)
        # Remove v2.0A provenance only, preserving all prior CASE-01 state.
        for mpk in ['MD-01','MD-08']:
            r=con.execute("select e.id,e.title,e.dataJson from ObjectEntry e join ObjectType t on e.objectTypeId=t.id where t.apiName='ModelAsset' and e.pk=?",(mpk,)).fetchone()
            if r:
                d=json.loads(r[2] or '{}')
                for k in ['sourceDeliveryRef','sourcePrototypeRef','sourceArtifactRef','sourceBaselineRef','intakeQualification','intakeQualificationAt']: d.pop(k,None)
                con.execute('update ObjectEntry set dataJson=?,updatedAt=CURRENT_TIMESTAMP where id=?',(j(d),r[0]))
        r=con.execute("select e.id,e.dataJson from ObjectEntry e join ObjectType t on e.objectTypeId=t.id where t.apiName='DigitalTestCase' and e.pk='CASE-01'").fetchone()
        if r:
            d=json.loads(r[1] or '{}')
            for k in ['prototypeDeliveryRef','prototypeRef','prototypeBaselineRef','modelProvenanceRefs','intakeQualification']: d.pop(k,None)
            con.execute('update ObjectEntry set dataJson=?,updatedAt=CURRENT_TIMESTAMP where id=?',(j(d),r[0]))
        aid=con.execute("select id from ActionType where apiName='dp30IntakeTransition'").fetchone()
        if aid: con.execute('delete from ActionLog where actionTypeId=? and objectPk=?',(aid[0],DELIVERY))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--reset-demo',action='store_true'); args=ap.parse_args()
    con=sqlite3.connect(DB)
    types=[('DigitalPrototypeDelivery','数字样机3.0交付批次','研制方交付到试验鉴定基地的数字样机3.0交付对象、介质与门控状态。','package-open'),('DeliveryManifest','3.0交付清单','数字样机3.0的文件、版本、哈希、模型要素与接口契约清单。','list-checks'),('DigitalPrototype3','数字样机模型（3.0-交付）','由产品构成、产品特性、产品行为模型组成的试验鉴定交付对象。','cuboid'),('ModelArtifact','模型交付物','3.0十要素对应的可追溯交付物。','file-cog'),('InterfaceContract','模型接口契约','FMI、SAL、IDL运行与交互技术契约。','braces'),('ConformanceTest','符合性试验','试验基地执行的技术符合性测试。','flask-conical'),('ConformanceResult','符合性试验结果','首测/复测结果，追加保留。','badge-check'),('ModelBaseline','试验基地模型基线','通过G0/G1后冻结的基地权威运行基线。','git-commit-horizontal'),('IntakeGate','数字样机资格门控','G0/G1/G2-ENTRY门控。','shield-check')]
    for x in types: ot(con,*x)
    # governance types already exist in v1.8, but make script standalone.
    for x in [('WorkflowPrincipal','工作流人员与角色','受控工作流岗位身份目录。','users'),('ApprovalRecord','审批记录','受控状态迁移申请与审批。','badge-check'),('SignatureRecord','签署记录','DEMO SHA-256见证记录。','signature')]: ot(con,*x)
    for spec in [('deliveryHasManifest','交付批次—Manifest','DigitalPrototypeDelivery','DeliveryManifest'),('deliveryContainsPrototype','交付批次—数字样机3.0','DigitalPrototypeDelivery','DigitalPrototype3'),('prototypeHasArtifact','数字样机—模型交付物','DigitalPrototype3','ModelArtifact'),('artifactImplementsContract','交付物—接口契约','ModelArtifact','InterfaceContract'),('artifactTestedBy','交付物—符合性试验','ModelArtifact','ConformanceTest'),('testProducesResult','符合性试验—结果','ConformanceTest','ConformanceResult'),('baselineContainsArtifact','基地基线—交付物','ModelBaseline','ModelArtifact'),('artifactPromotedToModel','交付物—试验ModelAsset','ModelArtifact','ModelAsset'),('deliveryFeedsCase','3.0交付—数字试验Case','DigitalPrototypeDelivery','DigitalTestCase')]: link(con,*spec)
    for aid,name,title,role,rname in ACTORS: upsert(con,'WorkflowPrincipal',aid,f'{title} · {name}',{'code':aid,'caseId':CASE,'name':name,'title':title,'roleId':role,'roleName':rname,'active':True,'identityAssurance':'DEMO ROLE SWITCH / NOT AUTHENTICATED'})
    baseline(con,args.reset_demo)
    # Ensure action type.
    if not con.execute("select 1 from ActionType where apiName='dp30IntakeTransition'").fetchone():
        oid=con.execute("select id from ObjectType where apiName='DigitalPrototypeDelivery'").fetchone()[0]
        con.execute('insert into ActionType(id,apiName,displayName,objectTypeId,parametersJson,description,status) values(?,?,?,?,?,?,?)',(uid('v20aat'),'dp30IntakeTransition','数字样机3.0接收资格状态迁移',oid,j([{'name':'step','type':'string'}]),'DP30-INTAKE-01受控状态迁移动作。','active'))
    recount(con); con.commit(); print('v2.0-A migration complete:', DB)
if __name__=='__main__': main()
