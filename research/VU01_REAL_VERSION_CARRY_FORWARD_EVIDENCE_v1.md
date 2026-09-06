# VU-01 Real Version Update & Evidence Carry-Forward Evidence v1.0

Status: **Frozen result: PASS**

Research target: **RQ4/RQ5 refinement — cumulative evidence under a real lifecycle change**

Evidence run:

- DTEP branch: `vu01-real-version-carry-forward`
- GitHub Actions run: `34001226517`
- Tested DTEP head: `6713568b032963e212e2930f094b3902eea13bb5`
- Source MS-01 evidence run: `33971627414`
- Source MS-01 artifact: `9971118509`
- Source MS-01 artifact SHA-256: `7e4f421b04bf7dd9ca40964657ec7dc789fedcff1a66d85cefb9b6f2c6183bb1`
- VU-01 artifact: `9979541204`
- VU-01 artifact SHA-256: `3982a7df81356e0f3811d0898b14501b81ec7b547eeeefc96a72d9e59c5375bb`

## 1. Why VU-01 was needed

EA-01 showed, by replaying the frozen evidence dependency graph, that evidence can be retained while applicability is selectively invalidated after change.

VU-01 converts that rule-based result into an **actual lifecycle event**.

The question is:

> After a real adapter/binding revision, can the system preserve historical evidence, reuse evidence whose dependencies did not change, selectively re-run only the affected qualification path, and reconstruct the current decision without resetting the entire evidence base?

No new model or transport mechanism is introduced.

## 2. Controlled real change

The upstream RadarSimPublic model remains frozen at:

```text
8b63f824a5744c1b3a3fca5e948fa7c59f897b17
```

The shared upper trial also remains unchanged:

```text
trial_spec.json
SHA-256 = af041b33dbb481e0f0061e57d06a0d5e12623e9365b182570a654a314f1e4baf

orchestrator.py
SHA-256 = b8da984bd430cf0430ada9123f32077dc2c4d8c3e6667a9e07b7b1d8a4c939db

capability_contract.json
SHA-256 = f31bca5238105ea3925dca3b7cab8089cc6e00cd27efbce3f49c0d0b5fe67a2b
```

The change is limited to the RadarSimPublic adapter/binding revision:

```text
old adapter:
mre2/model_substitution/radarsimpublic_adapter.py

new adapter:
mre2/model_substitution/radarsimpublic_adapter_v2.py

old binding version: 1.0.0
new binding version: 1.1.0
```

The new adapter revision changes provenance evidence only. Canonical trace generation still delegates to the unchanged v1 adapter logic.

The following remain identical between the old and new binding:

```text
Capability_ID
Implementation_ID
Contract_ID
Semantic_Profile_ID
RadarSimPublic upstream commit
declared semantic mapping
```

This is deliberately a narrow, controlled version update suitable for testing evidence carry-forward.

## 3. Evidence state immediately after change

Before any delta reassessment, the dependency rules conservatively produce:

```text
ACTIVE:
  BP-01
  SP-01

STALE for the changed configuration:
  MS-01-v2
  EQ-01-v1
  EB-01-v1

HISTORICALLY RETAINED:
  BP-01
  MS-01-v2
  SP-01
  EQ-01-v1
  EB-01-v1
```

Thus the change does not erase prior experiments. It only changes which evidence can be used as current qualification evidence.

## 4. Selective delta requalification

VU-01 did not rebuild or re-run every preceding experiment.

It reused without re-execution:

```text
BP-01
SP-01
```

because the OpenEaagles behavior-preservation envelope and the declared semantic mapping/profile were unchanged.

The changed RadarSimPublic binding was then executed under the frozen upper trial for the same 16 E2 cases.

Result:

```text
updated binding cases executed:       16 / 16
updated binding cases passed:         16 / 16
updated outputs contract-valid:       16 / 16
```

The new canonical traces were compared against the exact RadarSimPublic trace hashes preserved from the prior MS-01 v2 artifact.

Result:

```text
new vs prior RadarSimPublic trace identity:
16 / 16 byte-identical
```

Therefore, for this controlled revision:

```text
Y_adapter_v2(i) == Y_adapter_v1(i)
for all 16 frozen cases
```

## 5. Current decision after delta evidence

Following the delta reassessment:

```text
reused without re-execution:
  BP-01
  SP-01

delta reassessed:
  MS-01 architectural substitution
  EQ-01 intended-use screening

retained historical, not re-executed:
  EB-01-v1
```

Current states are restored as:

```text
architectural substitution:
PASS_CARRIED_FORWARD_BY_DELTA_EVIDENCE

kinematic intended use:
QUALIFIED_WITHIN_EVIDENCE

RF-performance intended use:
UNKNOWN

RF semantic relation:
UNKNOWN
```

The real `UNKNOWN` therefore survives the version update. The successful adapter revision does not silently resolve an unrelated semantic-evidence gap.

## 6. VU-01 predicates

All nine frozen predicates passed:

| Predicate | Result |
|---|---|
| same RadarSimPublic upstream model commit | PASS |
| same capability, implementation, contract and semantic-profile identity | PASS |
| same declared semantic mapping | PASS |
| adapter/binding revision is real | PASS |
| frozen upper trial unchanged | PASS |
| old binding matches frozen MS-01 v2 reference | PASS |
| updated binding executes all 16 cases | PASS |
| updated outputs equal prior RadarSimPublic traces 16/16 | PASS |
| real RF `UNKNOWN` remains unresolved | PASS |

Overall:

```text
VU-01 = PASS
```

## 7. Research interpretation

VU-01 is the first actual lifecycle demonstration of **selective evidence carry-forward** in this study.

The important result is not that the change was small. It is that the evidence system behaved differently from both undesirable extremes:

```text
Extreme A:
any change -> rerun everything

Extreme B:
any change -> trust everything old
```

Instead:

```text
real change
  -> identify affected evidence
  -> preserve unaffected evidence
  -> re-run the affected current-decision path
  -> append delta evidence
  -> retain the old evidence historically
```

This is the operational meaning of "manageable and cumulative" in the present research.

## 8. Stronger combined EA-01 + VU-01 claim

EA-01 established the logic of an append-only, dependency-aware evidence chain.

VU-01 then exercised that logic with a real code/binding revision.

Together they support:

> Evidence accumulation can be provenance-monotonic while current qualification remains configuration-dependent. A real version change can invalidate only the affected applicability chain, preserve unrelated evidence, append delta evidence, and retain unresolved `UNKNOWN` states until relevant evidence explicitly resolves them.

This is a stronger digital T&E claim than source-code reduction or nominal integration-time reduction.

## 9. Boundary of inference

VU-01 remains deliberately narrow:

- it is an adapter/binding provenance revision, not an upstream RadarSimPublic model-algorithm update;
- the canonical output was expected to remain unchanged and did remain unchanged;
- it does not prove that major model-version changes can always use delta requalification;
- it does not establish authoritative VV&A or accreditation;
- it does not measure organization-wide governance performance;
- it does not imply that EB-01 remains current evidence after this revision; EB-01 is retained historically unless separately reassessed for the new configuration.

## 10. Evidence identity

```text
Evidence_Set_ID:
vu01.tws.real-version-carry-forward.2026-09-06.v1

CI Run:
34001226517

Tested DTEP head:
6713568b032963e212e2930f094b3902eea13bb5

Artifact ID:
9979541204

Artifact SHA-256:
3982a7df81356e0f3811d0898b14501b81ec7b547eeeefc96a72d9e59c5375bb
```
