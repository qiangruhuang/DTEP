# PAS 2161 External Validation Execution Log

**Protocol:** EXTERNAL_VALIDATION_PAS2161_PROTOCOL.md v1.0  
**Protocol freeze commit:** `1cbfc7885adfce8b3d3c1556dea841f71c3b2db7`  
**Execution branch:** `research/v2.4-paper-external-validation`  
**Acquisition snapshot:** 2026-09-28 18:45 +08:00  
**Current evidence tier:** Tier C  
**ORED core changes after protocol freeze:** none

## 1. Current acquisition state

The 2026 PAS 2161 process has not yet produced a public Tier-A technology package.

The publicly stated 2026 schedule places the process before its decision stage:

- engineer/provider calibration benchmark release: 2 October 2026;
- calibrated technology submission deadline: 6 November 2026;
- intended demonstrated/not-demonstrated announcement: 18 December 2026.

Accordingly, the protocol's primary endpoint cannot be executed on 28 September 2026 without violating the prospective holdout design.

The following required Tier-A artifacts are not yet available for the selected technology:

1. official 2026 technology-level assessment report containing the complete decision metrics;
2. official demonstrated/not-demonstrated outcome;
3. submitted technology-level QA/method identity sufficient to bind the approval to one configuration;
4. final 2026 criteria/version if TRL/DfT changes the 2025 thresholds; and
5. technology-level benchmark/repeat assessment values or an official metric table sufficient for independent decision reconstruction.

No 2025 package is substituted for these missing 2026 artifacts.

## 2. Holdout selection frozen before outcome

### Primary candidate

**Provider:** WDM Limited  
**Technology:** Type S / Road Assessment Vehicle (RAV)-based PAS 2161 method

Selection was frozen before the 2026 outcome because WDM publicly stated that it intended to submit/refine this Type S method in the 2026 PAS 2161 demonstration. The provider also described the method as a dedicated data-collection-vehicle approach based on RAV/SCANNER data.

The known 2025 result is treated only as prior public context and is not used as the 2026 outcome. The 2026 outcome was not available at selection time.

### Fallback rule

If WDM Type S does not participate in the 2026 process or no complete Tier-A package becomes obtainable for it, the holdout will be the first complete 2026 Tier-A package publicly released by TRL/DfT in chronological order. If multiple complete packages are released simultaneously, provider name and then technology name will be used as a lexicographic tie-break.

This rule is frozen before outcomes to prevent result-based sample selection.

## 3. Mapping endpoint execution

The external vocabulary has been frozen in:

`external/pas2161/2026_ORED_MAPPING_LOCK.json`

The mapping uses the existing ORED layers only:

| ORED layer | External artifact classes / functions |
|---|---|
| Object | Technology, Provider, LocalAuthorityNetwork, TrialRouteSection, EngineerBenchmark, ProviderBenchmark, TechnologyMainSubmission, TechnologyRepeatSubmission, QualityAssuranceForm, GapReport, TechnologyAssessmentReport, DemonstrationCertificate |
| Relation | provider/technology identity, route membership, benchmark applicability, submission ownership, repeat-of-main relation, QA binding, assessment inputs, certificate derivation |
| Evidence | official assessment metrics, benchmark/repeat evidence, QA/method identity, protocol version, approval-state validity |
| Decision | demonstrated / not-demonstrated and validity of continued use |

### Mapping result

**Artifact-class mapping:** 12 / 12 required external classes mapped to the existing four layers.  
**New top-level layer introduced:** 0.  
**PAS2161-specific branch added to ORED resolver/admission/decision core:** 0.

This is a **Tier-C architecture-sufficiency result at the public artifact-class level only**. It does not establish package-level completeness because the selected technology's final 2026 assessment package is not yet available.

## 4. Endpoint state

| Protocol endpoint | Status on 2026-09-28 | Reason |
|---|---|---|
| Architecture sufficiency / mapping | PARTIAL PASS | Public artifact classes map to ORED without a fifth layer; package-level verification pending |
| Exact decision reconstruction | BLOCKED | No official 2026 technology-level metrics and outcome yet |
| NC1 missing benchmark relation | BLOCKED | Requires instantiated external technology graph |
| NC2 cross-technology contamination | BLOCKED | Requires instantiated external technology graph |
| NC3 assessment-version mismatch | BLOCKED | Requires final technology assessment/version artifacts |
| NC4 incomplete QA/method identity | BLOCKED | Requires selected technology's submitted QA/method record |
| Change propagation | BLOCKED | Requires Tier-A method/QA state and official approval evidence |

## 5. Frozen decision policy

The pre-outcome mapping lock records the 2025 criteria as the frozen precedent:

- Engineer benchmark Precision 0 >= 60% — required;
- Engineer benchmark Precision 1 >= 90% — required;
- Engineer benchmark Chi-squared <= 250 — optional;
- Engineer benchmark Macro Recall >= 40% — optional;
- Provider benchmark Precision 0 >= 60% — required;
- Provider benchmark Precision 1 >= 90% — required;
- Provider benchmark Chi-squared <= 250 — optional;
- Provider benchmark Macro Recall >= 40% — optional;
- Repeat Consistency All Match >= 50% — required;
- Repeat Consistency None Match <= 5% — required;
- all required tests must pass; at least two of the four optional tests must pass.

Before the selected technology outcome is opened, this policy may be replaced only if TRL/DfT publishes an official 2026 criteria change. Such a change will be logged as external process evolution and will not modify the ORED architecture.

## 6. Core-freeze audit

Permitted after protocol freeze:

- external vocabulary mapping;
- artifact acquisition manifest;
- external parser/import adapter;
- source-specific field normalization.

Forbidden after protocol freeze:

- PAS2161-specific conditional logic in the ORED relation resolver;
- PAS2161-specific conditional logic in the ORED evidence-admission core;
- PAS2161-specific conditional logic in the governed decision core;
- a fifth top-level governance layer;
- outcome-driven alteration of negative controls or success criteria.

As of this execution snapshot, no forbidden change has been made.

## 7. Next admissible execution point

The next protocol step is artifact acquisition, not architecture modification.

A full Tier-A run begins only when one selected technology package contains:

1. official metric-level assessment evidence;
2. official outcome;
3. method/QA identity.

At that point the execution order remains frozen:

1. verify package identity and completeness;
2. instantiate the external ORED graph;
3. run exact decision reconstruction;
4. run NC1-NC4 on copies of that graph;
5. run the method/QA change-propagation test;
6. report each endpoint separately without a composite score;
7. leave the full gate open if any Tier-A requirement is missing.

## 8. Current judgment

The external protocol has **not passed** on 28 September 2026.

What has been established is narrower:

- the prospective holdout candidate and fallback rule are frozen before outcome;
- public PAS 2161 artifact classes fit the existing ORED four-layer structure;
- the decision-policy precedent is frozen;
- the acquisition gaps are explicit;
- the ORED core remains unchanged.

The study must remain in Tier-C / prospective status until the technology-level 2026 package exists.
