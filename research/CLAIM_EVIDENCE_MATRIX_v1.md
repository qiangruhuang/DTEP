# Manuscript Claim–Evidence Matrix v1.0

Status: **Frozen after WP1 empirical freeze**

Purpose: every paper-level empirical claim must point to a frozen evidence set. Claims not supported here must be presented as design rationale, external context, future work, or limitation.

| Claim ID | Manuscript claim | Evidence | Allowed strength | Prohibited extension |
|---|---|---|---|---|
| C1 | A real legacy OpenEaagles TWS capability can be externally wrapped without changing its declared observable behavior in the frozen deterministic envelope. | BP-01 | empirical, bounded | universal behavior equivalence; hidden-state equivalence; accreditation |
| C2 | Two genuinely heterogeneous implementations can execute behind one frozen upper trial/capability contract by changing implementation binding rather than upper trial logic. | MS-01 v2 | empirical, bounded | equal fidelity; numerical equivalence; plug-and-play for all models |
| C3 | Structural/schema compatibility does not imply semantic compatibility. | SP-01 | empirical for preregistered mutations | complete semantic reasoning; ontology completeness |
| C4 | A semantic precheck can reject the five preregistered unit/frame/sign/time mismatches and can return `UNKNOWN` for a real unresolved RF concept. | SP-01 | empirical, bounded | automatic semantic inference from source code |
| C5 | Qualification can differ for the same implementation when intended use changes. | EQ-01 | empirical, bounded | authoritative accreditation decision |
| C6 | Evidence insufficiency can be represented explicitly as `UNKNOWN` rather than silently promoted to compatible/qualified. | SP-01 + EQ-01 | empirical, bounded | `UNKNOWN` as proof of invalidity |
| C7 | The TMSU boundary can isolate model-specific change from the shared upper trial and reduce reassessment propagation for the controlled semantic-update benchmark. | EB-01 | comparative, bounded | fewer total LOC; lower engineer-hours; enterprise cost savings |
| C8 | Historical evidence can accumulate without deletion while current applicability changes selectively. | EA-01 | empirical mechanism result | enterprise-scale repository performance |
| C9 | Evidence history can be provenance-monotonic while qualification is configuration- and intended-use-dependent. | EA-01 + EQ-01 | conceptual result grounded in experiments | monotonic increase in trust |
| C10 | A strict cross-run byte-identity rule is not a robust generic comparator for the tested numerical traces. | VU-01a | retained negative result | all numerical simulations are non-bitwise reproducible |
| C11 | Evidence-type-aware numerical equivalence with a sensitivity control can support carry-forward for one controlled provenance-only adapter/binding revision. | VU-01b | empirical, bounded | universal delta-requalification rule |
| C12 | A successful maintenance/version update does not resolve an unrelated semantic `UNKNOWN`. | VU-01b | empirical lifecycle result | no future evidence can resolve it |
| C13 | Changing the selected RadarSimPublic algorithm from CV KF to CA KF constitutes a substantive implementation change despite unchanged repository commit, upper contract and declared semantic mapping. | LC-01 + frozen bindings | empirical configuration fact | claim that repository commit alone defines implementation identity |
| C14 | The old E2 envelope is not a sufficient basis for qualification inheritance after the algorithm change: both algorithms execute all 16 cases, 12/16 are behavior-equal at the frozen normalized criterion, and 4/16 differ. | LC-01 | empirical | old E2 envelope is globally inadequate for all purposes |
| C15 | A maneuvering-target challenge materially discriminates the CV and CA choices under the constructed sensitivity scenario. | LC-01 | empirical sensitivity result | CA is operationally superior/validated |
| C16 | Automatic implementation-specific qualification inheritance should be rejected for the LC-01 model-algorithm/Implementation_ID change while unaffected evidence remains reusable. | LC-01 | empirical lifecycle/stop-rule result | every algorithm change requires full rerun of all evidence |
| C17 | Fresh architectural execution for a changed implementation does not itself establish intended-use fitness. | LC-01 | empirical decision-state result | architecture PASS implies model validity |
| C18 | `UNKNOWN` is durable across unrelated evidence accumulation and lifecycle maintenance until relevant evidence resolves it. | SP-01 → EQ-01 → EA-01 → VU-01b → LC-01 | longitudinal evidence-state result | `UNKNOWN` is permanent |
| C19 | The demonstrated engineering value is manageability/change propagation rather than measured reduction in coding time. | EB-01 + EA-01 + VU + LC | evidence-synthesis claim | percentage engineer-time or schedule saving |
| C20 | TMSU provides a SAL-aligned capability/evidence organization mechanism rather than a new simulation runtime or replacement for HLA/DIS/FMI. | architecture freeze + implementation | design claim, not experimental outcome | claim that TMSU supersedes existing interoperability standards |

## Claim classes

### Empirical claims

C1–C19 must cite the corresponding frozen evidence report/run.

### Design/architecture claims

C20 and the definition of TMSU are design choices constrained by the research protocol. They should be labeled as architecture rather than empirical discovery.

### External-context claims

Statements about Army M&S modernization, MOSA, VV&A or T&E policy must be separately supported by authoritative external sources such as RAND RRA3261-1, DoD MOSA guidance, DoDM 5000.102 and MIL-STD-3022.

## Manuscript control rule

Before submission, every sentence containing a causal, comparative, quantitative or generalizable statement should be mapped to one of:

```text
frozen empirical evidence
external authoritative source
design choice
explicit inference
limitation/future work
```

No sentence should rely on an unstated mixture of these categories.
