# Literature Positioning v1.0

Status: **Focused positioning for manuscript Discussion/Introduction**

This note is not a comprehensive systematic review. It identifies the closest conceptual streams needed to position the current contribution without claiming novelty by absence.

## 1. Enterprise / policy context

### RAND — enterprise Army M&S modernization

Hargrove et al. (2025), *A Modernized Enterprise Army Modeling and Simulation Concept*, frames the Army problem at enterprise scale: aging M&S infrastructure, model/data silos, and insufficient capture/curation/reuse of M&S-generated information across acquisition. Its modernization direction is broader than the present study.

**Our narrower contribution:** operationalize one T&E-facing slice of that problem at the model-capability/evidence boundary: how a legacy capability, heterogeneous replacement, semantics and qualification evidence can remain manageable through configuration change.

### DoD MOSA

Current MOSA guidance emphasizes modular, loosely coupled systems, open key interfaces, conformance, and component replacement across the lifecycle.

**Our addition:** empirical separation of:

```text
component replaceability
from
qualification-evidence inheritance
```

MS-01 demonstrates replacement at the architectural contract level; LC-01 demonstrates why prior implementation-specific qualification cannot be inherited automatically after a substantive algorithm/Implementation_ID change.

### VV&A policy

MIL-STD-3022 emphasizes common VV&A documentation structures and information reuse. DoDM 5000.102 explicitly requires intended use, version control, capabilities, assumptions, limitations, uncertainty and response variables in T&E M&S V&V planning.

**Our role:** TMSU does not replace VV&A/accreditation. It provides machine-manageable conformance, semantic, provenance and lifecycle evidence that can feed trial-specific VV&A decisions.

## 2. Closest academic streams

### Tolk et al. — composable/reference modeling

A. Tolk, S. Diallo, José J. Padilla, H. Herencia-Zapana. 2013. *Journal of Simulation* 7:69–82. **“Reference modelling in support of M&S—foundations and applications.”**

The paper integrates systems-engineering and M&S processes through requirements, conceptual modeling and V&V, and discusses composable models and simulations.

**Relationship to our work:** supports the importance of explicit requirements/conceptual boundaries for reuse/composition. Our study goes downstream into executable lifecycle evidence: a capability contract remains stable while implementation-specific evidence can become stale or require selective renewal.

### Winton et al. — validation use cases and evidence in digital engineering

James R. Winton, J. Colombi, D. Jacques, Kip Johnson. 2023. *INCOSE International Symposium* 33. **“Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering.”**

The paper emphasizes validation use cases capturing both intent (“why”) and evidence (“what”), with automated/manual assessment of quality, completeness and consistency.

**Relationship to our work:** conceptually aligned with use-relative evidence. EQ-01 operationalizes a similar principle at executable simulation capability level: the same implementation is qualified for one bounded use and `UNKNOWN` for another. EA/VU/LC then add lifecycle applicability and evidence inheritance.

### Hill — model-based and standards-based M&S VV&A

James H. Hill. 2025. *Proceedings of the Vertical Flight Society 81st Annual Forum and Technology Display*. **“Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework.”**

The work argues for structured, model-based and standards-based M&S VV&A within digital engineering ecosystems and for explicit metrics/status/maturity artifacts across program/product lifecycles.

**Relationship to our work:** close in evidence-governance motivation. Our contribution is an executable bounded experiment chain showing how individual evidence items can remain active, stale, historical or unresolved after concrete model/adapter changes, including a tested positive carry-forward case and a tested refusal boundary.

### Noguchi — interoperability standards gaps in digital engineering

Ryan A. Noguchi. 2025. *INCOSE International Symposium* 35. **“Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context.”**

The paper argues that models created in local contexts need standards for quality, usability and interoperability before broader reuse and federation in a digital-engineering ecosystem.

**Relationship to our work:** supports the distinction between local model usability and broader reusable interoperability. SP-01 adds a concrete semantic safeguard: schema/identifier agreement is insufficient. LC-01 adds that interface interoperability is also insufficient for qualification inheritance.

## 3. Distinctive empirical gap addressed by the present study

The literature and policy streams above already establish important principles:

```text
modular/open architectures matter;
model reuse/composability needs explicit structure;
validation depends on use and evidence;
VV&A should be structured and lifecycle-aware;
standards are required for broader interoperability.
```

The present study should not claim to originate these principles.

The specific empirical contribution is their integration into one executable T&E-facing lifecycle chain:

```text
real legacy behavior preservation
→ real heterogeneous substitution
→ semantic incompatibility / UNKNOWN
→ intended-use-specific qualification
→ change-radius evidence
→ append-only evidence accumulation
→ evidence-type-aware delta carry-forward
→ explicit refusal of automatic inheritance after a substantive model-algorithm change
```

This chain produces two paired empirical statements that are useful for manuscript novelty:

> Evidence reuse is not simply a property of model modularity; it is a claim-specific lifecycle decision whose dependencies must remain valid.

and:

> A model portfolio is manageable only if its evidence system can both carry evidence forward when justified and refuse inheritance when a change crosses the qualification boundary.

## 4. Recommended novelty language

Use:

> We operationalize modular M&S modernization for digital T&E as an evidence-lifecycle problem and empirically exercise both selective evidence carry-forward and its stopping rule in a real legacy/heterogeneous model case.

Avoid:

```text
first ever VV&A evidence framework
first model interoperability standard
new replacement for HLA/DIS/FMI
complete solution to model credibility
universal model reuse mechanism
```

## 5. Academic sources to add to the working bibliography

1. Tolk A, Diallo S, Padilla JJ, Herencia-Zapana H. Reference modelling in support of M&S—foundations and applications. *Journal of Simulation*. 2013;7:69–82.
2. Winton JR, Colombi J, Jacques D, Johnson K. Validation of Digital System Models: A Framework and SysML Profile for Model-Based Systems Engineering. *INCOSE International Symposium*. 2023;33.
3. Hill JH. Transforming Modeling and Simulation Verification, Validation & Accreditation with a Model-Based and Standards-Based Framework. *Proceedings of the Vertical Flight Society 81st Annual Forum and Technology Display*. 2025.
4. Noguchi RA. Standards Gaps for Enabling Model Interoperability for MBSE in a Digital Engineering Context. *INCOSE International Symposium*. 2025;35.

These sources strengthen positioning but do not replace the authoritative RAND/DoD/MIL-STD sources for policy and acquisition/T&E requirements.
