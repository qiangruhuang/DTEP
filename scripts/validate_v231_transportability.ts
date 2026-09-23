import { readFile } from 'node:fs/promises'
import {
  buildChinaTeGovernanceSnapshot,
} from '../src/lib/china-te-governance'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.3.1 transportability validation failed: ${message}`)
}

async function sourceText(path: string) {
  return readFile(path, 'utf8')
}

async function main() {
  const [case01, case02] = await Promise.all([
    buildChinaTeGovernanceSnapshot('CASE-01'),
    buildChinaTeGovernanceSnapshot('CASE-02'),
  ])

  check(case01.rootObject.pk === 'CASE-01', 'CASE-01 must resolve explicitly')
  check(case02.rootObject.pk === 'CASE-02', 'CASE-02 must resolve explicitly')
  check(
    case02.rootObject.taskType === 'reliability-maintainability-supportability',
    'CASE-02 must exercise a different reliability/maintainability task type',
  )

  const actionNames = (snapshot: Awaited<ReturnType<typeof buildChinaTeGovernanceSnapshot>>) =>
    snapshot.actions.map((item) => item.apiName)

  check(
    JSON.stringify(actionNames(case01)) === JSON.stringify(actionNames(case02)),
    'both cases must use the same governed action vocabulary',
  )
  check(
    case01.transportability.relationDriven && case02.transportability.relationDriven,
    'both cases must be resolved through ontology relations',
  )
  check(case01.transportability.relationCount > 0, 'CASE-01 must have first-class ontology relations')
  check(case02.transportability.relationCount > 0, 'CASE-02 must have first-class ontology relations')

  for (const snapshot of [case01, case02]) {
    const roles = snapshot.transportability.semanticRoleCounts
    check(roles.qualificationPerformanceAnchors > 0, `${snapshot.rootObject.pk} missing qualification anchor role`)
    check(roles.qualificationPerformanceMeasures > 0, `${snapshot.rootObject.pk} missing qualification measure role`)
    check(roles.operationalEvidenceAnchors > 0, `${snapshot.rootObject.pk} missing operational anchor role`)
    check(roles.operationalEffectivenessMeasures > 0, `${snapshot.rootObject.pk} missing operational measure role`)
    check(roles.formalDigitalModelReviewInputs > 0, `${snapshot.rootObject.pk} missing digital-model review role`)
    check(snapshot.actions.every((item) => item.blockers.length > 0), `${snapshot.rootObject.pk} must fail closed while formal lifecycle prerequisites are absent`)
  }

  const case02Json = JSON.stringify(case02)
  for (const legacyToken of ['TE-25-', 'M-13', 'MD-07', 'SC-COA-01', 'MT-01']) {
    check(!case02Json.includes(legacyToken), `CASE-02 leaked CASE-01 evidence token: ${legacyToken}`)
  }

  const governanceSource = await sourceText('src/lib/china-te-governance.ts')
  const resolverSource = await sourceText('src/lib/case-ontology-context.ts')
  for (const forbidden of ['CASE-01', 'CASE-02', 'TE-25-', 'M-13', 'MD-07', 'TE-RMS-', 'M-RMS-', 'MD-RMS-']) {
    check(
      !governanceSource.includes(forbidden),
      `core governance reasoning contains case-specific token: ${forbidden}`,
    )
    check(
      !resolverSource.includes(forbidden),
      `case ontology resolver contains case-specific token: ${forbidden}`,
    )
  }

  check(
    case01.objectCoverage.events !== case02.objectCoverage.events
      || case01.objectCoverage.measures !== case02.objectCoverage.measures
      || case01.objectCoverage.models !== case02.objectCoverage.models,
    'second case should not be a renamed clone of CASE-01 object scope',
  )

  console.log(JSON.stringify({
    overall: 'PASS',
    gate: 'v2.3.1 Second-Case Transportability Gate',
    cases: [
      {
        caseId: case01.rootObject.pk,
        taskType: case01.rootObject.taskType,
        relations: case01.transportability.relationCount,
        objectCoverage: case01.objectCoverage,
      },
      {
        caseId: case02.rootObject.pk,
        taskType: case02.rootObject.taskType,
        relations: case02.transportability.relationCount,
        objectCoverage: case02.objectCoverage,
      },
    ],
    invariants: [
      'governance core contains no case-specific object identifiers',
      'case scope is resolved from DigitalTestCase(caseId) + LinkEntry relations',
      'semantic roles, not object PKs, bind evidence to governance criteria',
      'CASE-01 and CASE-02 share one governance action vocabulary',
      'formal lifecycle prerequisites remain fail-closed',
    ],
  }, null, 2))
}

main()
