import { readFile } from 'node:fs/promises'
import { GOVERNANCE_ARCHITECTURE_V24 } from '../src/lib/governance-architecture'
import { buildChinaTeGovernanceSnapshot } from '../src/lib/china-te-governance'

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`v2.4 architecture consolidation validation failed: ${message}`)
}

function sum(values: Record<string, number>) {
  return Object.values(values).reduce((total, value) => total + value, 0)
}

async function main() {
  const [case01, case02] = await Promise.all([
    buildChinaTeGovernanceSnapshot('CASE-01'),
    buildChinaTeGovernanceSnapshot('CASE-02'),
  ])

  check(case01.version === 'v2.4-prototype', 'CASE-01 must expose v2.4 prototype contract')
  check(case02.version === 'v2.4-prototype', 'CASE-02 must expose v2.4 prototype contract')

  const layerIds = GOVERNANCE_ARCHITECTURE_V24.layers.map((layer) => layer.id)
  check(
    JSON.stringify(layerIds) === JSON.stringify(['object', 'relation', 'evidence', 'decision']),
    'architecture must contain exactly Object -> Relation -> Evidence -> Decision',
  )

  const mechanismIds = GOVERNANCE_ARCHITECTURE_V24.mechanisms.map((mechanism) => mechanism.id)
  check(
    JSON.stringify(mechanismIds) === JSON.stringify(['v2.3.1', 'v2.3.2', 'v2.3.3', 'v2.3.4']),
    'v2.3.1-v2.3.4 must map into one consolidated architecture',
  )

  for (const snapshot of [case01, case02]) {
    const architecture = snapshot.governanceArchitecture
    const runtime = architecture.runtime
    const transport = snapshot.transportability

    check(architecture.shortName === 'ORED Governance Compiler', 'architecture name drifted')
    check(architecture.layers.length === 4, 'runtime architecture must expose four layers')
    check(architecture.mechanisms.length === 4, 'runtime architecture must expose four boundary gates')
    check(runtime.caseId === snapshot.rootObject.pk, 'runtime architecture caseId must match root object')

    check(runtime.relationCount === transport.relationCount, 'relation count must come from the relation resolver')
    check(
      runtime.acceptedRelationCount + runtime.rejectedRelationCount === runtime.relationCount,
      'accepted + rejected relations must account for the resolved relation set',
    )
    check(
      runtime.hardErrorCount === transport.integrity.hardErrors.length,
      'hard-error count must match ontology integrity ledger',
    )
    check(
      runtime.acceptedReuseCount === transport.crossCaseReuse.acceptedReuseCount,
      'accepted reuse count must match evidence-admission state',
    )
    check(
      runtime.staleReuseCount === transport.crossCaseReuse.staleReuseCount,
      'stale reuse count must match lifecycle invalidation ledger',
    )
    check(
      runtime.trustedEvidenceRoleCount === sum(transport.semanticRoleCounts),
      'trusted evidence count must be derived from admitted semantic-role buckets',
    )

    const criteria = [
      ...snapshot.stateQualification.criteria,
      ...snapshot.operationalTest.criteria,
      ...snapshot.fieldingFinalization.criteria,
      ...snapshot.fieldingFinalization.specialAssessments,
    ]
    check(runtime.criterionCount === criteria.length, 'criterion runtime count must match decision-layer criteria')
    check(
      runtime.blockingCriterionCount === criteria.filter((criterion) => criterion.blocking).length,
      'blocking criterion count must match criteria state',
    )
    check(runtime.governedActionCount === snapshot.actions.length, 'governed action count must match decision output')
    check(
      runtime.blockedActionCount === snapshot.actions.filter((action) => !action.allowed).length,
      'blocked action count must match action output',
    )

    check(
      snapshot.actions.every((action) => action.blockers.length > 0 || action.allowed),
      'every blocked action must remain explainable',
    )
  }

  check(
    case01.governanceArchitecture.paperStory.problem
      === case02.governanceArchitecture.paperStory.problem,
    'research story must be case-independent',
  )

  const architectureSource = await readFile('src/lib/governance-architecture.ts', 'utf8')
  const governanceSource = await readFile('src/lib/china-te-governance.ts', 'utf8')
  const resolverSource = await readFile('src/lib/case-ontology-context.ts', 'utf8')
  for (const forbidden of ['TE-25-', 'TE-RMS-', 'M-13', 'M-RMS-', 'MD-07', 'MD-RMS-']) {
    check(!architectureSource.includes(forbidden), `architecture definition contains case-specific token: ${forbidden}`)
    check(!governanceSource.includes(forbidden), `governance compiler contains case-specific token: ${forbidden}`)
    check(!resolverSource.includes(forbidden), `relation/evidence resolver contains case-specific token: ${forbidden}`)
  }

  const researchDoc = await readFile('docs/V2.4_GOVERNANCE_ARCHITECTURE_CONSOLIDATION.md', 'utf8')
  for (const phrase of [
    'Objects → Typed Relations → Admissible Evidence → Governed Decisions',
    'Second-Case Transportability',
    'Governed Cross-Case Evidence Reuse',
    'Reuse Revocation & Change Propagation',
    'Further internal expansion of failure cases is unlikely',
  ]) {
    check(researchDoc.includes(phrase), `research narrative missing required consolidation phrase: ${phrase}`)
  }

  console.log(JSON.stringify({
    overall: 'PASS',
    gate: 'v2.4 Governance Architecture Consolidation Gate',
    architecture: {
      name: GOVERNANCE_ARCHITECTURE_V24.shortName,
      layers: layerIds,
      mechanisms: mechanismIds,
    },
    cases: [case01, case02].map((snapshot) => ({
      caseId: snapshot.rootObject.pk,
      runtime: snapshot.governanceArchitecture.runtime,
    })),
    invariants: [
      'one four-layer governance compiler replaces feature-by-feature storytelling',
      'runtime architecture counters are derived from the same resolver/criteria/action state used by the product',
      'v2.3.1-v2.3.4 are boundary-validation gates, not parallel governance implementations',
      'core governance architecture remains free of case-specific evidence identifiers',
      'paper/prototype narrative states the demonstrated claim and its external-validity boundary',
    ],
  }, null, 2))
}

main()
