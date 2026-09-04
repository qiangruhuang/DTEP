#!/usr/bin/env python3
from __future__ import annotations
import json, os, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
APP = os.environ.get('APP_URL', 'http://127.0.0.1:3000').rstrip('/')
OIDC = os.environ.get('DTEP_TEST_OIDC_ISSUER', 'http://127.0.0.1:8091').rstrip('/')
OUT_JSON = ROOT / 'GITHUB_PRODUCT_E2E_v2.1.1.json'
OUT_PNG = ROOT / 'GITHUB_PRODUCT_E2E_v2.1.1.png'


def issue(actor: str) -> str:
    data = json.dumps({'actor_id': actor, 'ttl': 900}).encode()
    req = urllib.request.Request(f'{OIDC}/token', data=data, headers={'Content-Type':'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())['access_token']


def check(condition: bool, name: str, detail: str, checks: list[dict]):
    checks.append({'name': name, 'pass': bool(condition), 'detail': detail})
    if not condition:
        raise AssertionError(f'{name}: {detail}')


checks: list[dict] = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)

    # Digital Prototype 3.0 intake under a real signed OIDC subject.
    token = issue('DPA-CHEN')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000}, extra_http_headers={'Authorization': f'Bearer {token}'})
    page = ctx.new_page()
    page.goto(APP, wait_until='networkidle', timeout=60000)
    check(page.get_by_text('数字样机3.0接收与资格', exact=True).first.is_visible(), 'Product shell / intake module', 'initial module rendered', checks)
    check(page.get_by_text('OIDC RS256 / JWKS VERIFIED', exact=False).first.is_visible(), 'OIDC identity visible in product UI', 'JWKS verified identity shown', checks)
    check('DPA-CHEN' in page.locator('body').inner_text(), 'OIDC actor mapping', 'DPA-CHEN visible in product UI', checks)
    select = page.locator('select').first
    check(select.is_disabled(), 'Role switch disabled in OIDC mode', 'actor selector disabled', checks)
    ctx.close()

    # CASE-01 / frozen v2.1 architecture under a different real signed OIDC subject.
    token = issue('ACT-LIN')
    ctx = browser.new_context(viewport={'width': 1440, 'height': 1000}, extra_http_headers={'Authorization': f'Bearer {token}'})
    page = ctx.new_page()
    page.goto(APP, wait_until='networkidle', timeout=60000)
    page.get_by_role('button', name='数字化试验鉴定 Case').click()
    page.get_by_text('CASE-01 GOVERNED STATE MACHINE · v2.1 FROZEN', exact=False).wait_for(timeout=30000)
    check(page.get_by_text('CASE-01 GOVERNED STATE MACHINE · v2.1 FROZEN', exact=False).is_visible(), 'CASE-01 governed state machine', 'frozen state machine rendered', checks)
    check('ACT-LIN' in page.locator('body').inner_text(), 'CASE identity mapping', 'ACT-LIN visible in product UI', checks)

    page.get_by_role('button', name='Scenario 场景沙箱').click()
    page.get_by_text('Test Model Assembly · 场景模型装配与3.0来源', exact=False).wait_for(timeout=30000)
    check(page.get_by_text('Test Environment Assembly · LVC Federation Configuration', exact=False).is_visible(), 'Scenario model/environment provenance', 'assembly and federation UI rendered', checks)

    page.get_by_role('button', name='Evidence Gate 证据门控').click()
    page.get_by_text('Evidence Gate · 鉴定证据门控', exact=False).wait_for(timeout=30000)
    check(page.get_by_text('Evidence Gate · 鉴定证据门控', exact=False).is_visible(), 'Evidence Gate UI', 'evidence gate rendered', checks)

    page.get_by_role('button', name='鉴定审计 / Decision Provenance').click()
    page.get_by_text('鉴定审计视图 / Decision Provenance', exact=False).wait_for(timeout=30000)
    check(page.get_by_text('结论 → 专家合议/终审', exact=False).is_visible(), 'Decision Provenance UI', 'human + machine provenance rendered', checks)

    page.screenshot(path=str(OUT_PNG), full_page=True)
    ctx.close()
    browser.close()

result = {
    'overall': 'PASS',
    'target': 'real DTEP Next.js product UI',
    'browser': 'Playwright Chromium',
    'authMode': 'OIDC RS256/JWKS with Authorization header injected by browser context',
    'realHttpNavigation': True,
    'realNextJsUi': True,
    'checks': checks,
}
OUT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
