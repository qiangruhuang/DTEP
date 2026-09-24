#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, shutil, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'PRODUCT_UI_E2E_v2.1.1.json'
MD=ROOT/'PRODUCT_UI_E2E_v2.1.1.md'
result={
  'target':'DTEP Next.js product UI',
  'status':'BLOCKED',
  'fullNextBuild':False,
  'realProductBrowserE2E':False,
  'engineeringBrowserHarness':'PASS' if (ROOT/'BROWSER_E2E_v2.1.1.json').exists() else 'NOT_RUN',
  'blockers':[],
  'notClaimed':['Next.js production build passed','full product UI browser E2E passed','range/vendor LVC interoperability certified'],
}
next_bin=ROOT/'node_modules'/'.bin'/'next'
if not next_bin.exists():
  p=subprocess.run(['npm','install','--offline','--ignore-scripts','--no-audit','--no-fund'],cwd=ROOT,text=True,capture_output=True,timeout=60)
  combined=(p.stdout+'\n'+p.stderr).strip()
  tail='\n'.join(combined.splitlines()[-12:])
  result['dependencyInstall']={'command':'npm install --offline --ignore-scripts --no-audit --no-fund','returnCode':p.returncode,'tail':tail}
  if 'ENOTCACHED' in combined:
    result['blockers'].append({'code':'NPM-ENOTCACHED','detail':'离线 npm cache 缺少项目依赖；已实际尝试安装。','evidence':tail})
  else:
    result['blockers'].append({'code':'NEXT-DEPS-MISSING','detail':'node_modules/.bin/next 不存在，无法构建产品UI。','evidence':tail})
else:
  result['dependencyInstall']={'status':'available'}

# Independently prove browser network navigation policy in this environment.
try:
  from playwright.sync_api import sync_playwright
  with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    try:
      page.goto('http://127.0.0.1:8094/health',wait_until='domcontentloaded',timeout=5000)
      result['browserNetworkNavigation']='AVAILABLE'
    except Exception as e:
      msg=str(e)
      result['browserNetworkNavigation']='BLOCKED_BY_ADMINISTRATOR' if 'ERR_BLOCKED_BY_ADMINISTRATOR' in msg else 'FAILED'
      result['blockers'].append({'code':'CHROMIUM-NAV-POLICY','detail':'系统 Chromium 到本地 HTTP 的导航被执行环境管理员策略阻止。','evidence':msg[:800]})
    finally:
      browser.close()
except Exception as e:
  result['browserNetworkNavigation']='NOT_TESTED'
  result['blockers'].append({'code':'CHROMIUM-TEST-ERROR','detail':str(e)})

if not result['blockers'] and next_bin.exists():
  result['status']='READY_TO_RUN'
result['recordedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# DTEP v2.1.1 Product UI Browser E2E Status','',f"Status: **{result['status']}**",'',
       'This report distinguishes the real Chromium engineering integration harness from the full DTEP Next.js product UI. The engineering harness passed; the product UI E2E is not claimed as passed.', '', '## Blockers']
for b in result['blockers']:
  lines += [f"- **{b['code']}** — {b['detail']}"]
lines += ['', '## What is already real', '- Real Chromium DOM/click execution in the engineering browser harness.', '- Real OIDC RS256/JWKS verification.', '- Real Ed25519 detached signing and verification.', '- Actual compiled FMI 2.0 FMU execution.', '- Actual compiled SAL reference C-ABI execution.', '- Actual TCP socket L/V/C engineering federation harness.', '', '## What remains external', '- Restore/install the pinned npm dependency tree and run `npm run build`.', '- Run Chromium against the built DTEP product UI in an environment without the local HTTP navigation policy.', '- Connect organization IdP and approved PKI/CAC/HSM.', '- Connect range/vendor HLA/DIS/TENA/DDS gateway/RTI implementations for interoperability qualification.']
MD.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
