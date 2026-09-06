# Journal Targeting v1.0

Status: **Provisional target freeze for manuscript production**

Date: 2026-09-06

## 1. Primary target

### The Journal of Defense Modeling and Simulation (JDMS)

**Recommended primary target.**

Rationale:

- explicit military/defense modeling and simulation scope;
- explicitly includes test and evaluation applications;
- emphasizes rigorous technical lessons from practical experience as well as defense M&S methodology and theory;
- current paper has two real public model codebases, executable CI evidence, a negative result, a lifecycle method and direct digital-T&E relevance;
- the bounded single-capability empirical design is better aligned with an applied defense-M&S methodology journal than with a journal expecting enterprise-scale deployment evidence.

Recommended manuscript framing for JDMS:

```text
practical defense M&S modernization problem
-> heterogeneous model unification
-> test-grade semantic / intended-use evidence
-> cumulative evidence lifecycle
-> positive carry-forward + explicit stop rule
```

Do not make the paper mainly a software-architecture description. JDMS fit improves when the manuscript emphasizes the technical T&E lesson:

> model replaceability and qualification-evidence inheritance are separate lifecycle decisions.

## 2. Stretch target

### Simulation Modelling Practice and Theory (SIMPAT)

Scope fit is scientifically plausible because the journal explicitly covers simulation interoperability and methods/algorithms for verification and validation.

However, this is a **stretch target** under the current evidence base because:

- one primary capability class is studied;
- the evidence lifecycle profile is demonstrated in one TWS chain rather than across several simulation paradigms;
- the manuscript's strongest motivation is defense T&E rather than a broadly validated general M&S methodology.

SIMPAT would become more defensible only if reviewers can see the evidence lifecycle mechanism as domain-general without requiring additional model experiments. Do not add low-value experiments solely to chase this target.

## 3. Strong alternatives

### Systems Engineering

Strong conceptual fit for lifecycle management, system evolution, reuse, architecture and digital engineering.

Potential weakness: the paper may appear too implementation-/simulation-specific unless the evidence-governance contribution is clearly abstracted to system/model lifecycle management.

### Journal of Simulation

Good methodological fit for simulation process, modelling/analysis methodology and defense application.

Potential weakness: current TWS/radar implementation details may need compression and broader simulation-method positioning.

## 4. Target decision

Current recommendation:

```text
Primary submission: JDMS
Stretch option:      SIMPAT
Alternative:         Systems Engineering / Journal of Simulation
```

No journal-target decision should trigger new experiments at this stage.

## 5. Manuscript consequences of selecting JDMS

### Keep in main text

- defense acquisition/T&E motivation;
- RAND modernization connection;
- MOSA/SAL relationship;
- real OpenEaagles/RadarSimPublic implementation details at a moderate level;
- BP/MS/SP/EQ/EA/VU/LC evidence ladder;
- lifecycle decision states and inference boundaries;
- LC-01 stop-rule result.

### Move to supplement/repository

- most hashes;
- CI implementation details;
- complete 16-case trace tables;
- diagnostic CA state-dimension probe;
- implementation boilerplate;
- full machine-readable evidence manifests.

### Tone

Use:

```text
bounded empirical result
technical lesson
research profile
intended-use evidence
selective requalification
```

Avoid:

```text
enterprise solution
universal framework
automated accreditation
plug-and-play validation
```

## 6. Submission-readiness criterion

The manuscript should not move to journal-specific formatting until:

```text
science/story freeze             PASS
claim-evidence audit             PASS
reference verification          PASS
main figures rendered            PASS
main tables frozen               PASS
sentence-level overclaim audit   PASS
```

At that point a JDMS-formatted version can be generated without changing the scientific content.
