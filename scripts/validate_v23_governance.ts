import {
  CHINA_TE_LIFECYCLE,
  FIELDING_FINALIZATION_REVIEW_DECISIONS,
  FINALIZATION_SPECIAL_ASSESSMENTS,
  STATE_QUALIFICATION_DECISIONS,
  buildChinaTeGovernanceSnapshot,
} from '../src/lib/china-te-governance'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.3 governance validation failed: ${message}`)
}

async function main() {
  const snapshot = await buildChinaTeGovernanceSnapshot()

  check(snapshot.version === 'v2.3-prototype', 'snapshot version must remain explicit prototype semantics')
  check(snapshot.rootObject?.pk === 'CASE-01', 'frozen delivery database must evaluate CASE-01 by default')

  const lifecycle = snapshot.authoritativeContext.lifecycle.map((item) => item.label)
  check(
    JSON.stringify(lifecycle) === JSON.stringify(['性能试验', '状态鉴定', '作战试验', '列装定型', '在役考核']),
    'five-stage lifecycle order drifted',
  )
  check(CHINA_TE_LIFECYCLE.length === 5, 'lifecycle constant must contain five stages')

  check(snapshot.actions.length === 3, 'exactly three governed lifecycle actions are expected in this prototype slice')
  check(
    JSON.stringify(snapshot.actions.map((item) => item.apiName)) === JSON.stringify([
      'submitStateQualificationReview',
      'authorizeOperationalTest',
      'submitFieldingFinalizationReview',
    ]),
    'governed action vocabulary drifted',
  )

  // The frozen delivery database intentionally lacks the formal lifecycle
  // approvals/classification records needed to advance these actions. A partial
  // digital-evidence score must never average away a hard business prerequisite.
  check(snapshot.actions.every((item) => item.allowed === false), 'initial delivery state must fail closed')
  check(snapshot.actions.every((item) => item.blockers.length > 0), 'every blocked action must explain its blockers')
  check(
    snapshot.actions.some((item) => item.blockers.some((blocker) => blocker.includes('装备分类'))),
    'equipment classification / authority-resolution blocker must remain explicit',
  )
  const operational = snapshot.actions.find((item) => item.apiName === 'authorizeOperationalTest')
  check(
    operational?.blockers.some((blocker) => blocker.includes('状态鉴定审批/批复')),
    'operational-test authorization must depend on formal state-qualification approval',
  )

  const coverageValues = [
    snapshot.stateQualification.summary.evidenceCoverage,
    snapshot.operationalTest.summary.evidenceCoverage,
    snapshot.fieldingFinalization.summary.evidenceCoverage,
  ]
  check(coverageValues.some((value) => value > 0), 'fixture should contain some usable digital evidence')
  check(
    snapshot.actions.every((item) => !item.allowed),
    'evidence coverage must remain informational and cannot override hard blockers',
  )

  check(snapshot.dataAcceptance.length === 4, 'four data-acceptance paths must remain explicit')
  check(
    snapshot.dataAcceptance.every((item) => item.status !== 'ready'),
    'candidate digital/LVC data must not be auto-promoted into formally accepted evidence',
  )

  check(
    snapshot.fieldingFinalization.specialAssessments.length === 8
      && FINALIZATION_SPECIAL_ASSESSMENTS.length === 8,
    'fielding-finalization special-assessment structure must remain eight explicit categories',
  )
  check(STATE_QUALIFICATION_DECISIONS.length === 3, 'state-qualification decision vocabulary drifted')
  check(FIELDING_FINALIZATION_REVIEW_DECISIONS.length === 5, 'fielding-finalization decision vocabulary drifted')

  check(
    snapshot.technicalState.stateQualificationApprovedBaseline === null
      && snapshot.technicalState.fieldingFinalizationApprovedBaseline === null,
    'digital execution baselines must not masquerade as formally approved equipment technical state',
  )
  check(
    snapshot.technicalState.warning.includes('不自动等同'),
    'technical-state semantic separation warning is missing',
  )
  check(
    snapshot.digitalModel.warning.includes('不同的对象'),
    'VV&A / execution baseline / formal digital-model review separation is missing',
  )

  const report = {
    overall: 'PASS',
    version: snapshot.version,
    rootCase: snapshot.rootObject?.pk,
    lifecycle,
    governedActions: snapshot.actions.map((item) => ({
      apiName: item.apiName,
      allowed: item.allowed,
      blockerCount: item.blockers.length,
    })),
    evidenceCoverage: {
      stateQualification: snapshot.stateQualification.summary.evidenceCoverage,
      operationalTest: snapshot.operationalTest.summary.evidenceCoverage,
      fieldingFinalization: snapshot.fieldingFinalization.summary.evidenceCoverage,
    },
    dataAcceptancePaths: snapshot.dataAcceptance.length,
    specialAssessments: snapshot.fieldingFinalization.specialAssessments.length,
    invariants: [
      'evidence coverage != formal submission authority',
      'ModelBaseline/TestModelAssembly != approved equipment technical state',
      'VV&A != formal digital-model review/effectiveness conclusion',
      'candidate digital/LVC data != formally accepted evidence',
      'operational test requires explicit state-qualification approval provenance',
    ],
  }

  console.log(JSON.stringify(report, null, 2))
}

main()
