# Simulated JDMS Review — Manuscript v1.0

**Target:** The Journal of Defense Modeling and Simulation (JDMS)
**Review mode:** evidence-focused, single-anonymized-style simulation
**Basis:** `research/MANUSCRIPT_SUBMISSION_v1_0.md`, Figures 1–4, Main Tables 1–3, frozen BP/MS/SP/EQ/EB/EA/VU/LC evidence.

## Overall recommendation before revision

**Major revision before external submission.**

The manuscript is within JDMS scope and contains a technically credible practical M&S contribution. The strongest aspect is not an efficiency claim but the paired architecture/evidence result: heterogeneous implementations can be organized behind a stable trial-facing capability boundary, while qualification evidence remains configuration- and intended-use-dependent. The retained `UNKNOWN`, VU-01a `FAIL`, and LC-01 stop rule materially strengthen credibility.

The recommendation is driven mainly by presentation and submission-readiness issues rather than a need for additional mechanism experiments.

## Major comment 1 — Make the dual contribution explicit and balanced

The paper should present two co-equal contributions:

1. **Heterogeneous model unification:** TMSU stabilizes trial-facing capability identity and contract while keeping implementation identity explicit; BP-01/MS-01 provide the empirical base.
2. **Evidence lifecycle governance:** SP/EQ/EA/VU/LC show why model replaceability cannot imply qualification inheritance.

The manuscript should not read as if TMSU were only a precondition for the evidence-lifecycle result. Conversely, it should not stop at architectural substitution.

**Required revision:** retain the two-stage argument in title, abstract, Introduction, Results and Conclusion.

## Major comment 2 — JDMS abstract format is not compliant

The current abstract is too long and unstructured. Current JDMS author instructions require a **structured abstract of 150–200 words**.

**Required revision:** replace with a four-part structured abstract (`Purpose`, `Methods`, `Results`, `Conclusions`) within 150–200 words. Preserve the core quantitative anchors only: BP 16/16, MS 16/16+16/16, SP 5/5 plus RF `UNKNOWN`, VU 8/16→16/16, and LC inheritance rejection.

## Major comment 3 — Distinguish interoperability from credibility more sharply

MS-01 establishes architectural/contract substitution. SP-01 and EQ-01 correctly demonstrate that this does not establish semantic equivalence or intended-use fitness. The manuscript should make this hierarchy visually and verbally explicit:

```text
structural conformance
< semantic qualification
< execution / behavior evidence
< intended-use fitness
< authoritative accreditation
```

**Required revision:** keep `UNKNOWN` as a first-class state and avoid wording that implies semantic equivalence of the two radar implementations globally.

## Major comment 4 — VU-01b must be described as a correction after a retained failure

The transition from VU-01a to VU-01b is scientifically useful, but a reviewer may interpret nine-decimal normalization as a post-hoc relaxation unless the chronology is explicit.

**Required revision:** state that VU-01a exposed an unsuitable cross-run byte criterion; VU-01b is a corrected evidence-representation comparator, not a radar-validity tolerance. Preserve the `+1e-6 m` negative control as the sensitivity safeguard.

## Major comment 5 — The LC-01 stop rule is stronger than the maneuver performance numbers

LC-01 should not become a CV-vs-CA performance paper. The key result is that an algorithm/`Implementation_ID` change crosses the proven carry-forward envelope even though both implementations survive the old 16-case execution set.

**Required revision:** keep the 109.0755 m and 67.6108 m/s differences only as discrimination controls; do not foreground CA RMSE superiority in the main manuscript.

## Major comment 6 — Clarify the evidence dependency mechanism

The evidence lifecycle depends on `Dep(E) ∩ Delta(C)`. A reviewer will ask how dependencies are declared and how ACTIVE/STALE/HISTORICAL states are computed.

**Required revision:** provide concise pseudocode or an algorithm description in the supporting reproducibility package, while retaining only the governing rule in the main paper. Explicitly state that the dependency graph is a research profile, not a universal ontology.

## Major comment 7 — The engineering benefit must remain manageability, not efficiency

EB-01 is valuable because it prevents a misleading productivity narrative. The TMSU path has zero upper-core churn versus 160 direct-path changed lines, but the TMSU boundary itself contains 224 physical lines.

**Required revision:** phrase the contribution as change locality, evidence invalidation radius and manageability. Do not convert LOC or reassessment scopes into engineer-hours, cost or schedule savings.

## Major comment 8 — Supplement strategy must account for JDMS instructions

The current JDMS guidance is internally inconsistent: one section describes online supplemental material, while the file-upload section explicitly states that JDMS does not currently accept supplemental files. The safest submission strategy is therefore not to depend on a separate supplement.

**Required revision:** maintain a repository-hosted supporting evidence package for reproducibility, but keep every result necessary to evaluate the paper in the manuscript, its three main tables, and four main figures. If the editorial system permits supplemental files at submission time, the prepared package can be supplied; otherwise it remains a public reproducibility appendix.

## Major comment 9 — Add JDMS-required end matter

The manuscript currently lacks the required `Statements and Declarations` block.

**Required revision:** add at minimum:

- Ethical considerations
- Consent to participate
- Consent for publication
- Declaration of conflicting interest
- Funding statement
- Data availability

Do not invent author-specific conflict or funding declarations; leave explicit author-completion markers where needed.

## Major comment 10 — Reproducibility and provenance should be easier to audit

The repository/commit-level evidence is unusually strong and should be surfaced more efficiently. The main paper does not need all hashes, but readers should be able to find the frozen code/evidence path.

**Required revision:** add a short reproducibility/data-availability statement pointing to the public DTEP repository and frozen evidence manifest; retain detailed hashes in the repository evidence package rather than the main text.

## Minor comments

1. Shorten the title slightly while retaining both unification and bounded evidence inheritance.
2. Use consistent terminology: `Test Model Service Unit (TMSU)`, not variants.
3. Prefer `upper-trial logic` over alternating `upper core`, `upper orchestrator`, and `trial core` except where metrics require the exact artifact.
4. Use `qualification state` only for the research decision states and `accreditation` only for external authoritative decisions.
5. Define `QUALIFIED_WITHIN_EVIDENCE` at first use in the Results or Methods.
6. Keep figures readable without color: use labels, line styles and borders in addition to color.
7. Keep Figure 3 as the conceptual centerpiece; it most directly expresses the paper-level novelty.
8. Main Table 2 is important and should remain in the main manuscript because it makes inference boundaries auditable.

## Simulated reviewer conclusion

No additional model class, transport protocol or mechanism experiment is required for the present claim set. The manuscript should improve materially by compression, JDMS format compliance, stronger dependency/evidence documentation, and figure/table refinement. If these revisions are made without expanding the empirical claims, the paper would move from **major revision** to a credible **minor-revision / publishable-with-revision** candidate.