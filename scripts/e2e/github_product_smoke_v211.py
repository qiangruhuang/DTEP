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

    graph_response = page.request.get(f'{APP}/api/links?type=DigitalTestCase&pk=CASE-01&depth=1', timeout=30000)
    check(graph_response.status == 200, 'Ontology graph traversal API', f'HTTP {graph_response.status}', checks)
    graph = graph_response.json()
    check(graph.get('root', {}).get('pk') == 'CASE-01' and isinstance(graph.get('links'), list), 'Ontology graph root resolution', 'compound object key + LinkEntry traversal contract rendered', checks)

    governance_response = page.request.get(f'{APP}/api/china-te-governance', timeout=30000)
    check(governance_response.status == 200, 'China T&E governance API', f'HTTP {governance_response.status}', checks)
    governance = governance_response.json()
    check(
        governance.get('version') == 'v2.3-prototype'
        and isinstance(governance.get('actions'), list)
        and len(governance.get('actions', [])) == 3,
        'China T&E governed action contract',
        'state qualification + operational test + fielding finalization actions returned',
        checks,
    )
    lifecycle = governance.get('authoritativeContext', {}).get('lifecycle', [])
    check(
        [item.get('label') for item in lifecycle] == ['性能试验', '状态鉴定', '作战试验', '列装定型', '在役考核'],
        'China T&E lifecycle semantics',
        'five-stage lifecycle returned in current-process order',
        checks,
    )

    # Ontology Action security: the client cannot choose the audit actor, and
    # the successful write must use the signed OIDC actor mapped by the server.
    ontology_response = page.request.get(f'{APP}/api/ontology', timeout=30000)
    check(ontology_response.status == 200, 'Ontology action catalog', f'HTTP {ontology_response.status}', checks)
    action_types = ontology_response.json().get('actionTypes', [])
    issue_order = next((a for a in action_types if a.get('apiName') == 'issueTestOrder'), None)
    live_fire = next((a for a in action_types if a.get('apiName') == 'authorizeLiveFire'), None)
    check(issue_order is not None and live_fire is not None, 'Ontology action types', 'issueTestOrder + authorizeLiveFire present', checks)

    events_response = page.request.get(f'{APP}/api/objects?type=TestEvent', timeout=30000)
    check(events_response.status == 200, 'Ontology action target set', f'HTTP {events_response.status}', checks)
    events = events_response.json().get('objects', [])
    check(bool(events), 'Ontology action target', 'at least one TestEvent available', checks)
    target_pk = events[0]['pk']

    forged = page.request.post(
        f'{APP}/api/actions',
        data={
            'actionTypeId': issue_order['id'],
            'objectPk': target_pk,
            'parameters': {'orderNo': 'E2E-FORGED-ACTOR'},
            'performedBy': 'FORGED-ACTOR',
        },
        timeout=30000,
    )
    check(forged.status == 400, 'Client-supplied performedBy rejected', f'HTTP {forged.status}', checks)

    unauthorized = page.request.post(
        f'{APP}/api/actions',
        data={
            'actionTypeId': live_fire['id'],
            'objectPk': target_pk,
            'parameters': {},
        },
        timeout=30000,
    )
    check(unauthorized.status == 403, 'Ontology action role policy', f'ACT-LIN denied authorizeLiveFire with HTTP {unauthorized.status}', checks)

    authorized = page.request.post(
        f'{APP}/api/actions',
        data={
            'actionTypeId': issue_order['id'],
            'objectPk': target_pk,
            'parameters': {'orderNo': 'E2E-OIDC-ACTOR', 'window': '本周内待令', 'priority': '常规'},
        },
        timeout=30000,
    )
    check(authorized.status == 200, 'OIDC authorized ontology action', f'HTTP {authorized.status}', checks)
    authorized_body = authorized.json()
    check(authorized_body.get('performedBy') == 'ACT-LIN', 'OIDC actor controls audit identity', f"performedBy={authorized_body.get('performedBy')}", checks)

    page.get_by_role('button', name='Scenario 场景沙箱').click()
    page.get_by_text('Test Model Assembly · 场景模型装配与3.0来源', exact=False).wait_for(timeout=30000)
    check(page.get_by_text('Test Environment Assembly · LVC Federation Configuration', exact=False).is_visible(), 'Scenario model/environment provenance', 'assembly and federation UI rendered', checks)

    page.get_by_role('button', name='Evidence Gate 证据门控').click()
    page.get_by_text('Evidence Gate · 鉴定证据门控', exact=False).wait_for(timeout=30000)
    check(page.get_by_text('Evidence Gate · 鉴定证据门控', exact=False).is_visible(), 'Evidence Gate UI', 'evidence gate rendered', checks)

    page.get_by_role('button', name='鉴定审计 / Decision Provenance').click()
    page.get_by_text('鉴定审计视图 / Decision Provenance', exact=False).wait_for(timeout=30000)
    provenance_text = page.get_by_text('结论 → 专家合议/终审', exact=False)
    provenance_text.wait_for(timeout=30000)
    check(provenance_text.is_visible(), 'Decision Provenance UI', 'human + machine provenance rendered', checks)

    page.get_by_role('button', name='试验鉴定治理工作台').click()
    object_centered = page.get_by_text('对象中心，而不是文件中心', exact=False)
    object_centered.wait_for(timeout=30000)
    check(object_centered.is_visible(), 'China T&E governance workspace', 'object-centered governance view rendered', checks)
    check(page.get_by_text('中国试验鉴定全寿命业务链', exact=False).is_visible(), 'China T&E lifecycle UI', 'five-stage lifecycle rendered', checks)
    assessment_heading = page.get_by_role('paragraph').filter(has_text='8 项专项评估')
    check(assessment_heading.is_visible(), 'Fielding finalization special assessments', 'eight-assessment panel rendered', checks)
    check(page.get_by_text('数据采信入口', exact=False).is_visible(), 'Data acceptance UI', 'four legal data-acceptance paths exposed', checks)
    blocked_action = page.get_by_role('button', name='当前不可提交').first
    check(blocked_action.is_visible() and blocked_action.is_disabled(), 'Governed action submission criteria UI', 'blocked business action is explained and disabled', checks)

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
