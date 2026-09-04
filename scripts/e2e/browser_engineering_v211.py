#!/usr/bin/env python3
from pathlib import Path
import importlib.util, json, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
out_png=ROOT/'BROWSER_E2E_v2.1.1.png';out_json=ROOT/'BROWSER_E2E_v2.1.1.json'

spec=importlib.util.spec_from_file_location('browser_harness',ROOT/'engineering'/'services'/'browser_harness.py')
mod=importlib.util.module_from_spec(spec);sys.modules['browser_harness']=mod;assert spec.loader;spec.loader.exec_module(mod)

def backend(): return mod.run_e2e()

html='''<!doctype html><html><head><meta charset="utf-8"><title>DTEP v2.1.1 Browser E2E</title><style>body{font-family:Arial,sans-serif;margin:32px;max-width:1000px;color:#18181b}button{padding:10px 18px;border:1px solid #aaa;border-radius:6px;background:white}.pass{color:#087f23;font-weight:700}.fail{color:#b42318;font-weight:700}table{border-collapse:collapse;width:100%;margin-top:20px}td,th{border:1px solid #ddd;padding:9px;text-align:left}h1{font-size:24px}</style></head><body><h1>DTEP v2.1.1 Engineering Browser E2E</h1><p>Real Chromium DOM/click regression. Service calls are bridged by Playwright because this execution environment blocks browser network navigation by administrator policy.</p><button id="run">Run Engineering E2E</button><h2 id="overall">NOT RUN</h2><table id="checks"><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody></tbody></table><script>
const btn=document.getElementById('run');btn.onclick=async()=>{btn.disabled=true;document.getElementById('overall').textContent='RUNNING';const j=await window.runEngineeringBackend();const tb=document.querySelector('#checks tbody');tb.innerHTML='';for(const c of j.checks){const tr=document.createElement('tr');tr.innerHTML=`<td>${c.name}</td><td class="${c.pass?'pass':'fail'}">${c.pass?'PASS':'FAIL'}</td><td>${c.detail}</td>`;tb.appendChild(tr)}const o=document.getElementById('overall');o.textContent=j.overall;o.className=j.overall==='PASS'?'pass':'fail';btn.disabled=false};
</script></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    page.expose_function('runEngineeringBackend',backend)
    page.set_content(html,wait_until='load')
    page.click('#run')
    page.wait_for_function("document.getElementById('overall').textContent !== 'RUNNING'",timeout=60000)
    overall=page.locator('#overall').inner_text(); rows=[]
    for tr in page.locator('#checks tbody tr').all():
        tds=tr.locator('td').all_inner_texts(); rows.append({'name':tds[0],'result':tds[1],'detail':tds[2]})
    page.screenshot(path=str(out_png),full_page=True)
    browser.close()
result={'overall':overall,'rows':rows,'realChromium':True,'realDomClick':True,'serviceBoundaryExecuted':True,'browserNetworkNavigation':'BLOCKED_BY_ADMINISTRATOR','serviceBridge':'Playwright exposed function','target':'engineering integration harness','productNextJsUiE2E':False}
out_json.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
if overall!='PASS': raise SystemExit(1)
