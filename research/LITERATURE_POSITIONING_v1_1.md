# Literature Positioning v1.1

Status: **Focused literature freeze for manuscript production**

Date: 2026-09-06

This note positions the manuscript against the closest policy and academic streams. It is not a systematic review and must not be used to claim novelty by absence.

## 1. Policy / enterprise modernization context

### RAND enterprise Army M&S modernization

Hargrove et al. (2025), *A Modernized Enterprise Army Modeling and Simulation Concept*, frames an enterprise-scale problem of aging M&S infrastructure, model/data silos and insufficient capture, curation and reuse of M&S-generated information across acquisition activities.

**Role in our paper:** establishes the modernization problem space. Our paper addresses one narrower T&E-facing implementation problem: how model capability identity and the evidence supporting its use can remain manageable when heterogeneous implementations are substituted or changed.

### DoD MOSA

MOSA policy emphasizes modular design, open key interfaces, conformance and the ability to add, modify or replace components across the lifecycle.

**Role in our paper:** motivates `Capability_ID != Implementation_ID` and heterogeneous substitution.

**Important distinction introduced by our evidence:**

```text
component replaceability
!=
qualification-evidence inheritance
```

### MIL-STD-3022 and DoDM 5000.102

MIL-STD-3022 promotes structured VV&A documentation and reuse of VV&A information. DoDM 5000.102 requires T&E M&S V&V planning to address intended use, version control, capabilities, assumptions, limitations, uncertainty and response variables.

**Role in our paper:** establishes that validity/credibility is use- and configuration-dependent. TMSU is not an accreditation mechanism; it organizes machine-manageable evidence that can inform later VV&A/accreditation.

## 2. Model reuse / interoperability stream

### Tolk et al. (2013) — reference modelling and composability

A. Tolk, S. Diallo, J. J. Padilla, H. Herencia-Zapana. *Reference modelling in support of M&S—foundations and applications*. Journal of Simulation 7:69–82.

The work integrates systems-engineering and M&S processes through requirements, conceptual modeling and V&V and discusses composable models and simulations.

**Connection:** supports explicit conceptual/requirements boundaries for reuse. Our study moves downstream into executable evidence lifecycle: the capability boundary remains stable while implementation-specific evidence can become stale or require renewal.

### Noguchi (2025) — standards gaps for broader interoperability

Ryan A. Noguchi. *Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context*. INCOSE International Symposium 35.

The paper argues that locally useful models need standards for quality, usability and interoperability before broader reuse and federation.

**Connection:** supports distinguishing local executability from reusable interoperability. SP-01 and LC-01 show two additional limits: structural compatibility does not guarantee semantic compatibility, and interface compatibility does not authorize qualification inheritance.

### Zschaler et al. (2025) — multiple modes of simulation reuse

Steffen Zschaler, Nav Mustafee, Alison Harper, Thomas Monks, B. Onggo, Christine Currie, Fiona A. C. Polack. *On simulation reuse in healthcare applications*. Simulation 102:149–165.

The review distinguishes FAIR/open-science reuse, reusable conceptual simulation domains, and black-box/component reuse including distributed simulation.

**Connection:** useful cross-domain evidence that simulation reuse is multi-dimensional. Our paper adds a T&E-specific fourth question: when a reusable executable component changes, which prior qualification evidence remains applicable?

## 3. Credibility / intended-use stream

### Winton et al. (2023) — validation use cases and evidence

James R. Winton, J. Colombi, D. Jacques, Kip Johnson. *Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering*. INCOSE International Symposium 33.

The framework emphasizes validation use cases capturing both intent (why) and evidence (what), with automated/manual assessment of quality, completeness and consistency.

**Connection:** directly supports use-relative validation. EQ-01 operationalizes this at executable simulation-capability level and EA/VU/LC extend it through configuration change.

### Hill (2025) — structured, model-based VV&A in digital engineering

James H. Hill. *Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework*. Proceedings of the Vertical Flight Society 81st Annual Forum and Technology Display.

The work argues for structured model-based and standards-based M&S VV&A and lifecycle-visible metrics/status artifacts.

**Connection:** close in evidence-governance motivation. Our contribution is an executable bounded lifecycle experiment chain with explicit `ACTIVE`, `STALE`, `HISTORICAL` and `UNKNOWN` evidence states plus positive and negative inheritance cases.

### Fonseca i Casas (2023) — continuous VV&A across the model lifecycle

Pau Fonseca i Casas. *A Continuous Process for Validation, Verification, and Accreditation of Simulation Models*. Mathematics.

The paper extends VV&A across multiple phases of the model lifecycle and emphasizes assumptions and correct use rather than code alone.

**Connection:** supports continuous/lifecycle VV&A. Our work addresses a more specific change-management question: evidence need not be either deleted or blindly inherited; applicability can be recomputed claim by claim after a declared configuration change.

### Owen and Chakrabortty (2022) — defense VV&A practice

Kerryn R. Owen, R. Chakrabortty. *Verification, validation, and accreditation for models and simulations in the Australian defence context: a review*. The Journal of Defense Modeling and Simulation 21:205–227.

The review emphasizes credibility in defense M&S and reports that executable comparison with referent physical or comparative-model data is common, while objective comparators can improve assessment.

**Connection:** useful defense-domain grounding for our comparator discipline and for retaining LC-01's maneuver challenge as a discrimination control rather than treating architectural conformance as validity.

### Eichenseer et al. (2023) — credibility process capability

Frank Eichenseer, H.-M. Heinkel, M. Benedikt, Maurizio Ahmann, M. Holzner, Christoph Stadler. *Modeling & Simulation SPICE: Assessing the Capability of Credible Simulation Processes*. INCOSE International Symposium 33.

The paper relates the required credibility level to simulation-task criticality and proposes assessing the capability of simulation processes.

**Connection:** supports the general principle that evidence sufficiency should depend on task/use. Our paper adds configuration dependency and tested evidence inheritance/stop behavior.

### Erdemir et al. (2020) — credible practice, version control and competing implementations

A. Erdemir et al. *Credible practice of modeling and simulation in healthcare: ten rules from a multidisciplinary perspective*. Journal of Translational Medicine 18.

The multidisciplinary framework includes context definition, context-appropriate evaluation, limitations, version control, documentation, competing implementations and standards.

**Connection:** although biomedical, it provides cross-domain convergence on the same credibility ingredients used operationally in the present study: intended context, version control, documentation, alternative implementations and explicit limitations.

## 4. What the literature already establishes

The manuscript must explicitly concede that prior work already supports:

```text
modularity and open interfaces;
model reuse and composability;
context/intended-use-dependent validity;
version control and documentation;
lifecycle-aware VV&A;
standards and semantic/interoperability discipline.
```

These are foundations, not our novelty claims.

## 5. Specific empirical gap addressed here

The narrower gap addressed by the present study is the **executable coupling between heterogeneous-model unification and evidence inheritance during model evolution**.

The paper empirically exercises one complete chain:

```text
legacy behavior preservation
-> real heterogeneous substitution
-> semantic mismatch / real UNKNOWN
-> intended-use qualification
-> change-radius measurement
-> append-only evidence accumulation
-> failed naive carry-forward criterion
-> corrected typed delta carry-forward
-> explicit refusal of inheritance after substantive algorithm change
```

This supports two manuscript-level statements:

> Evidence reuse is not merely a property of model modularity; it is a claim-specific lifecycle decision whose dependencies must remain valid.

> A model portfolio is evidence-manageable only if it can both carry prior evidence forward when justified and refuse inheritance when a change crosses the qualification boundary.

## 6. Novelty language

Preferred:

> We operationalize heterogeneous-model modernization for digital T&E as an evidence-lifecycle problem and empirically exercise both selective evidence carry-forward and its stopping rule in a real legacy/heterogeneous model case.

Also acceptable:

> We connect stable capability-level substitution with configuration-aware evidence applicability, allowing evidence history to accumulate while preventing automatic inheritance across a substantive model-algorithm change.

Avoid:

```text
first ever VV&A framework
first model interoperability standard
replacement for HLA/DIS/FMI
universal model reuse mechanism
complete model credibility solution
fully automated accreditation
```

## 7. Working academic references for the manuscript

1. Tolk A, Diallo S, Padilla JJ, Herencia-Zapana H. Reference modelling in support of M&S—foundations and applications. *Journal of Simulation*. 2013;7:69–82.
2. Winton JR, Colombi J, Jacques D, Johnson K. Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering. *INCOSE International Symposium*. 2023;33.
3. Hill JH. Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework. *Proceedings of the Vertical Flight Society 81st Annual Forum and Technology Display*. 2025.
4. Noguchi RA. Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context. *INCOSE International Symposium*. 2025;35.
5. Fonseca i Casas P. A Continuous Process for Validation, Verification, and Accreditation of Simulation Models. *Mathematics*. 2023.
6. Owen KR, Chakrabortty R. Verification, validation, and accreditation for models and simulations in the Australian defence context: a review. *The Journal of Defense Modeling and Simulation*. 2022/2024 issue;21:205–227.
7. Eichenseer F, Heinkel H-M, Benedikt M, Ahmann M, Holzner M, Stadler C. Modeling & Simulation SPICE: Assessing the Capability of Credible Simulation Processes. *INCOSE International Symposium*. 2023;33.
8. Erdemir A, Mulugeta L, Ku J, et al. Credible practice of modeling and simulation in healthcare: ten rules from a multidisciplinary perspective. *Journal of Translational Medicine*. 2020;18.
9. Zschaler S, Mustafee N, Harper A, et al. On simulation reuse in healthcare applications. *Simulation*. 2025;102:149–165.

The final submission bibliography must separately verify complete bibliographic metadata and DOI/URL against publisher or authoritative records.
