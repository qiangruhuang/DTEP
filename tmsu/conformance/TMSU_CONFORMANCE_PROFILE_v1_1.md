# TMSU Conformance Profile v1.1

Status: **Frozen profile amendment — v1.1**

This profile preserves TMSU Conformance Profile v1.0 unchanged and adds the semantic-qualification gate established by SP-01. The v1.0 BP-01 and MS-01 definitions remain in force; this amendment changes the interpretation of a substitution result by separating architectural substitutability from semantic qualification.

## 1. Gate sequence

For a wrapped legacy implementation participating in model substitution:

```text
BP-01 Behavior Preservation
          ↓
SP-01 Semantic Precheck
          ↓
MS-01 Model Substitution
          ↓
Trial-specific fitness-for-use / VV&A / accreditation
```

The gates answer different questions:

- **BP-01:** did packaging alter the existing legacy behavior?
- **SP-01:** does the implementation's declared meaning match the shared capability semantics, or is the relation incompatible/unknown?
- **MS-01:** can the upper trial select a different implementation without being rewritten?

A passing MS-01 result alone is **architectural/contract substitutability**, not semantic-qualified substitutability.

## 2. SP-01 — Semantic Precheck

### Purpose

SP-01 detects structurally valid bindings whose declared semantics conflict with the frozen capability semantic profile, and prevents missing semantic evidence from being silently treated as compatibility.

### Required semantic dimensions

For each exchanged field the candidate declaration SHALL cover:

```text
concept
datatype
unit
reference_frame
time_basis
sign_convention
```

### Decision states

- `COMPATIBLE`: all required dimensions match, and any non-identical concept mapping has explicit equivalence evidence.
- `INCOMPATIBLE`: at least one required dimension explicitly conflicts with the frozen semantic profile.
- `UNKNOWN`: no explicit conflict is established, but required semantic equivalence evidence is absent or unresolved.

`UNKNOWN` SHALL NOT be promoted to `COMPATIBLE` by default.

### Predicates

| Predicate | Requirement |
|---|---|
| SP01-P1 | candidate passes structural metadata validation |
| SP01-P2 | `Capability_ID`, `Contract_ID`, and controlled semantic-profile target are resolved |
| SP01-P3 | datatype compatibility is checked |
| SP01-P4 | unit compatibility is checked |
| SP01-P5 | reference-frame compatibility is checked |
| SP01-P6 | time-basis compatibility is checked |
| SP01-P7 | sign-convention compatibility is checked |
| SP01-P8 | concept relation is explicit; unresolved relation returns `UNKNOWN` |
| SP01-P9 | semantic decision contains machine-readable reason codes |
| SP01-P10 | precheck evidence is reproducible from frozen profile/case hashes |

### Reference evidence

```text
Evidence_Set_ID: sp01.tws.semantic-precheck.2026-09-05.v1
Research target: RQ3 / H4
CI Run: 33977174819
Tested DTEP head: 3555e1ef34f5b113b496adeaf2c5c7b65744015f
Injected mismatches rejected: 5 / 5
Structural-only passes: 7 / 7
Positive control: COMPATIBLE
Real RadarSimPublic RF ambiguity: UNKNOWN
Decision: PASS
```

Reference report: `research/SP01_SEMANTIC_PRECHECK_EVIDENCE_v1.md`.

## 3. Qualification interpretation

TMSU v1.1 distinguishes two statuses:

```text
Architectural substitutability:
    MS-01 = PASS

Semantic-qualified substitutability:
    MS-01 = PASS
    AND SP-01 = COMPATIBLE for the candidate binding
```

A candidate with:

```text
MS-01 = PASS
SP-01 = UNKNOWN
```

shall be reported as:

```text
ARCHITECTURALLY_SUBSTITUTABLE / SEMANTICALLY_UNRESOLVED
```

rather than as fully qualified.

## 4. Current OpenEaagles / RadarSimPublic interpretation

The real heterogeneous E2 result remains:

```text
MS-01 = PASS
```

because the upper trial is unchanged and both implementations execute under the same structural capability contract.

SP-01 now exposes one unresolved real mapping:

```text
canonical concept:   rf.track_average_signal
RadarSimPublic source: rf.signal_to_noise_ratio
status: UNKNOWN
```

Therefore the current combined status is:

```text
ARCHITECTURAL_SUBSTITUTION = PASS
SEMANTIC_QUALIFICATION     = UNKNOWN
```

This does not retract MS-01. It prevents architectural substitutability from being overinterpreted as semantic equivalence.

## 5. Preserved boundary

BP-01, SP-01 and MS-01 are conformance evidence gates. They do not replace trial-specific intended-use, validity-domain, uncertainty, VV&A or accreditation decisions.
