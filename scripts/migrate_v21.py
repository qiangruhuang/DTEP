#!/usr/bin/env python3
import json, sqlite3, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DB=ROOT/'db'/'custom.db'

def uid(): return 'v21_'+uuid.uuid4().hex

def type_row(con,api): return con.execute('select id from ObjectType where apiName=?',(api,)).fetchone()
def ensure_type(con,api,name,desc,icon):
    r=type_row(con,api)
    if r:
        con.execute('update ObjectType set displayName=?,description=?,icon=? where apiName=?',(name,desc,icon,api)); return r[0]
    i=uid(); con.execute('insert into ObjectType(id,apiName,displayName,description,icon,objectCount,createdAt) values(?,?,?,?,?,0,CURRENT_TIMESTAMP)',(i,api,name,desc,icon)); return i

def ensure_link(con,api,name,source,target,card='一对多'):
    s=type_row(con,source); t=type_row(con,target)
    if not s or not t: raise RuntimeError(f'missing type for link {api}: {source}->{target}')
    r=con.execute('select id from LinkType where apiName=?',(api,)).fetchone()
    if r: con.execute('update LinkType set displayName=?,sourceTypeId=?,targetTypeId=?,cardinality=? where id=?',(name,s[0],t[0],card,r[0]))
    else: con.execute('insert into LinkType(id,apiName,displayName,sourceTypeId,targetTypeId,cardinality) values(?,?,?,?,?,?)',(uid(),api,name,s[0],t[0],card))

def ensure_entry(con,api,pk,title,data):
    t=type_row(con,api)
    if not t: raise RuntimeError(f'missing type {api}')
    r=con.execute('select id from ObjectEntry where objectTypeId=? and pk=?',(t[0],pk)).fetchone()
    body=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    if r: con.execute('update ObjectEntry set title=?,dataJson=?,updatedAt=CURRENT_TIMESTAMP where id=?',(title,body,r[0]))
    else: con.execute('insert into ObjectEntry(id,objectTypeId,pk,title,dataJson,updatedAt) values(?,?,?,?,?,CURRENT_TIMESTAMP)',(uid(),t[0],pk,title,body))

def recount(con):
    for r in con.execute('select id from ObjectType'):
        c=con.execute('select count(*) from ObjectEntry where objectTypeId=?',(r[0],)).fetchone()[0]
        con.execute('update ObjectType set objectCount=? where id=?',(c,r[0]))

def main():
    con=sqlite3.connect(DB)
    for spec in [
      ('ReviewPanelSession','鉴定专家合议会话','冻结机器初审、证据包和专家成员范围；承载独立评阅、解除盲态与最终合议。','users-round'),
      ('ExpertOpinion','专家独立意见','专家对自动判读、证据充分性、适用范围和解释形成的追加式独立意见。','message-square-warning'),
      ('EvidenceRequest','补充证据请求','专家合议认为现有证据不足时形成的正式补试/补证请求；不得通过人工改写机器结果替代。','clipboard-plus'),
      ('FinalAdjudicationDecision','人类最终判定','专家合议对机器判读进行确认、附条件确认、退回补证或规则复核后的最终处置。','scale'),
    ]: ensure_type(con,*spec)
    for spec in [
      ('panelReviewsCase','合议—Case','ReviewPanelSession','DigitalTestCase'),
      ('panelReviewsEvidencePackage','合议—证据包','ReviewPanelSession','EvidencePackage'),
      ('panelReviewsAdjudication','合议—自动判读','ReviewPanelSession','RunAdjudicationDecision'),
      ('opinionBelongsToPanel','专家意见—合议','ExpertOpinion','ReviewPanelSession'),
      ('opinionTargetsMeasure','专家意见—指标','ExpertOpinion','Measure'),
      ('finalDecisionBelongsToPanel','最终判定—合议','FinalAdjudicationDecision','ReviewPanelSession'),
      ('finalDecisionReviewsEvidencePackage','最终判定—证据包','FinalAdjudicationDecision','EvidencePackage'),
      ('evidenceRequestBelongsToPanel','补证请求—合议','EvidenceRequest','ReviewPanelSession'),
    ]: ensure_link(con,*spec)
    principals=[
      ('ACT-FANG','方宁','作战效能专家','expert-reviewer','独立鉴定专家复核'),
      ('ACT-GAO','高远','模型与VV&A专家','expert-reviewer','独立鉴定专家复核'),
      ('ACT-YU','余珂','试验数据专家','expert-reviewer','独立鉴定专家复核'),
    ]
    for code,name,title,role,role_name in principals:
      ensure_entry(con,'WorkflowPrincipal',code,f'{title} · {name}',{'code':code,'caseId':'CASE-01','name':name,'title':title,'roleId':role,'roleName':role_name,'active':True,'identityAssurance':'DEMO ROLE SWITCH / NOT AUTHENTICATED'})
    # Delivery DB must remain pre-execution: do not seed panel/opinion/final decision records.
    for api in ['ReviewPanelSession','ExpertOpinion','EvidenceRequest','FinalAdjudicationDecision']:
      t=type_row(con,api)
      if t:
        rows=con.execute('select id,dataJson from ObjectEntry where objectTypeId=?',(t[0],)).fetchall()
        for rid,body in rows:
          try: data=json.loads(body or '{}')
          except: data={}
          if data.get('caseId')=='CASE-01': con.execute('delete from ObjectEntry where id=?',(rid,))
    recount(con); con.commit(); con.close(); print('v2.1 migration complete:',DB)
if __name__=='__main__': main()
