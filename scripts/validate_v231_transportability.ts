import { buildChinaTeGovernanceSnapshotV231 } from '../src/lib/china-te-governance-v231'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.3.1 transportability validation failed: ${message}`)
}

function directRefs(snapshot: Awaited<ReturnType<typeof buildChinaTeGovernanceSnapshotV231>>) {
  return new Set(snapshot.transportabilityGate.requiredRelationCoverage.flatMap((item) => item.refs))
}

async function main() {
  const [case01, case02] = await Promise.all([
    buildChinaTeGovernanceSnapshotV231('CASE-01'),
    buildChinaTeGovernanceSnapshotV231('CASE-02'),
  ])

  check(case01.version === 'v2.3.1' && case02.version === 'v2.3.1', 'both cases must use v2.3.1 engine')
  check(case01.rootObject.pk === 'CASE-01', 'CASE-01 root mismatch')
  check(case02.rootObject.pk === 'CASE-02', 'CASE-02 root mismatch')
  check(case01.rootObject.taskProfile !== case02.rootObject.taskProfile, 'second case must be a different task profile')

  for (const snapshot of [case01, case02]) {
    check(snapshot.transportabilityGate.reasoningMode === 'caseId+ontology-relations', `${snapshot.rootObject.pk} must be relation-driven`)
    check(snapshot.transportabilityGate.relationDerived === true, `${snapshot.rootObject.pk} relationDerived=false`)
    check(snapshot.transportabilityGate.decision === 'PASS', `${snapshot.rootObject.pk} transportability gate must PASS`)
    check(snapshot.transportabilityGate.leakageCheck === 'PASS', `${snapshot.rootObject.pk} leakage check must PASS`)
    check(snapshot.transportabilityGate.foreignCaseRefs.length === 0, `${snapshot.rootObject.pk} contains foreign-case direct refs`)
    check(snapshot.transportabilityGate.requiredRelationCoverage.every((item) => item.present), `${snapshot.rootObject.pk} missing a required direct relation category`)
    check(snapshot.transportabilityGate.directRelationCount >= 6, `${snapshot.rootObject.pk} relation graph too sparse`)
    check(snapshot.actions.length === 3, `${snapshot.rootObject.pk} governed-action vocabulary changed`)
    check(snapshot.actions.every((item) => !item.allowed && item.blockers.length > 0), `${snapshot.rootObject.pk} must fail closed in delivery fixture`)
  }

  const expectedActions = ['submitStateQualificationReview', 'authorizeOperationalTest', 'submitFieldingFinalizationReview']
  check(JSON.stringify(case01.actions.map((item) => item.apiName)) === JSON.stringify(expectedActions), 'CASE-01 action vocabulary drifted')
  check(JSON.stringify(case02.actions.map((item) => item.apiName)) === JSON.stringify(expectedActions), 'CASE-02 must reuse the same action vocabulary')

  const case01Refs = directRefs(case01)
  const case02Refs = directRefs(case02)
  const crossDirect = [...case02Refs].filter((ref) => case01Refs.has(ref))
  check(crossDirect.length === 0, `CASE-02 direct governance relations leaked CASE-01 refs: ${crossDirect.join(', ')}`)

  check(case02.objectCoverage.events === 1, 'CASE-02 should remain a minimal one-event fixture')
  check(case02.objectCoverage.measures === 2, 'CASE-02 should have exactly two direct/derived measures')
  check(case02.objectCoverage.models === 1, 'CASE-02 should have one model')
  check(case02.technicalState.currentModelBaselines.includes('BL-COMMS-02'), 'CASE-02 relation traversal must recover its model baseline')
  check(case02.technicalState.currentAssemblies.includes('TMA-COMMS-02'), 'CASE-02 relation traversal must recover its model assembly')
  check(case02.fieldingFinalization.specialAssessments.length === 8, 'eight finalization assessments must remain intact')
  check(case02.dataAcceptance.length === 4, 'four data-acceptance paths must remain explicit')
  check(case02.dataAcceptance.every((item) => ['missing', 'partial'].includes(String(item.status))), 'CASE-02 candidate inputs must not auto-promote into accepted evidence')
  check(case02.digitalModel.warning.includes('不同的对象'), 'VV&A/formal-review semantic separation missing')

  const report = {
    overall: 'PASS',
    version: 'v2.3.1',
    engine: 'caseId+ontology-relations',
    cases: [case01, case02].map((snapshot) => ({
      caseId: snapshot.rootObject.pk,
      taskProfile: snapshot.rootObject.taskProfile,
      transportabilityGate: snapshot.transportabilityGate.decision,
      directRelationCount: snapshot.transportabilityGate.directRelationCount,
      linkedNodeCount: snapshot.transportabilityGate.linkedNodeCount,
      leakageCheck: snapshot.transportabilityGate.leakageCheck,
      actionAllowed: snapshot.actions.map((item) => ({ apiName: item.apiName, allowed: item.allowed })),
    })),
    crossCaseDirectRefIntersection: crossDirect,
    invariants: [
      'same governance function, different task profile',
      'context recovered from LinkEntry relations',
      'no CASE-01 direct evidence leakage into CASE-02',
      'evidence coverage != submission authority',
      'Gate PASS here means transportability of governance reasoning, not equipment qualification',
    ],
  }
  console.log(JSON.stringify(report, null, 2))
}

main()
