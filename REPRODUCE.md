# DTEP v1.2 Reproduction Guide

This guide reproduces the complete empirical chain supporting the manuscript:

> **Unifying Heterogeneous Simulation Models for Digital Test and Evaluation: Capability Abstraction and Bounded Evidence Inheritance across Model Evolution**

The exact author-final scientific freeze is commit:

```text
1e7a8f7de0428946aeca61529a04bee597165000
```

A frozen branch points to that exact commit:

```text
submission-v1.2
```

This `reproducibility-v1.2` branch starts from the same scientific freeze and adds only reproduction documentation/scripts. It does not change the frozen experiments or manuscript claims.

---

## 1. Repository contents

Main scientific code and evidence are organized as follows:

```text
mre1/openeaagles/                 BP-01 legacy OpenEaagles behavior preservation
mre2/model_substitution/          MS-01 heterogeneous model substitution
sp01/semantic_precheck/           SP-01 semantic precheck ablation
mre3/evidence_qualification/      EQ-01 intended-use/evidence screening
rq5/engineering_burden/           EB-01 paired change-locality experiment
research/ea01/                    EA-01 append-only evidence accumulation
research/vu01/                    VU-01a/b version carry-forward
research/lc01/                    LC-01 algorithm-change inheritance boundary
tmsu/conformance/                 frozen TMSU conformance profiles
tmsu/evidence/                    evidence lifecycle profiles and manifest
research/figures/                 main manuscript Figures 1–4
research/supplementary/           supporting methods/tables/figures
research/MANUSCRIPT_SUBMISSION_v1_2.md   author-final manuscript candidate
.github/workflows/                executable CI specifications for every experiment
```

The GitHub Actions workflows are the canonical executable specifications. If local results differ from CI, first compare the local environment and upstream commit hashes with the corresponding workflow.

---

## 2. Frozen external dependencies

The project deliberately does **not** vendor third-party upstream source. Clone these exact revisions:

```text
OpenEaagles
repository: doughodson/OpenEaagles
commit: b3d7e74a9bf52934e13fd6a11f45dc9767ac9192

JSBSim compatibility snapshot
repository: JSBSim-Team/jsbsim
commit: 140068895adf1b8981b45cc5e17a16d82990806d

RadarSimPublic
repository: Murmur-ops/RadarSimPublic
commit: 8b63f824a5744c1b3a3fca5e948fa7c59f897b17
```

The JSBSim checkout receives compiler-compatibility patches during build. OpenEaagles and RadarSimPublic upstream source are not patched by the DTEP experiments.

---

## 3. Recommended environment

The reference CI environment is Ubuntu 22.04/`ubuntu-latest` depending on the experiment. For the most reproducible full local run, use Ubuntu 22.04.

System packages:

```bash
sudo apt-get update
sudo apt-get install -y \
  git build-essential cmake libx11-dev libexpat1-dev \
  python3 python3-venv python3-pip
```

Clone the frozen project:

```bash
git clone https://github.com/qiangruhuang/DTEP.git
cd DTEP
git checkout submission-v1.2

git rev-parse HEAD
# expected:
# 1e7a8f7de0428946aeca61529a04bee597165000
```

Create the Python environment:

```bash
python3 -m venv .venv-repro
source .venv-repro/bin/activate
python -m pip install --upgrade pip
python -m pip install numpy
```

Create the upstream workspace:

```bash
mkdir -p upstream

git clone https://github.com/doughodson/OpenEaagles.git upstream/OpenEaagles
git -C upstream/OpenEaagles checkout b3d7e74a9bf52934e13fd6a11f45dc9767ac9192

git clone https://github.com/JSBSim-Team/jsbsim.git upstream/jsbsim
git -C upstream/jsbsim checkout 140068895adf1b8981b45cc5e17a16d82990806d

git clone https://github.com/Murmur-ops/RadarSimPublic.git upstream/RadarSimPublic
git -C upstream/RadarSimPublic checkout 8b63f824a5744c1b3a3fca5e948fa7c59f897b17
```

Verify all hashes before running experiments:

```bash
test "$(git rev-parse HEAD)" = "1e7a8f7de0428946aeca61529a04bee597165000"
test "$(git -C upstream/OpenEaagles rev-parse HEAD)" = "b3d7e74a9bf52934e13fd6a11f45dc9767ac9192"
test "$(git -C upstream/jsbsim rev-parse HEAD)" = "140068895adf1b8981b45cc5e17a16d82990806d"
test "$(git -C upstream/RadarSimPublic rev-parse HEAD)" = "8b63f824a5744c1b3a3fca5e948fa7c59f897b17"
```

---

## 4. Fastest reproduction route: GitHub Actions

This is the recommended route because the workflows freeze the OS image, dependency checkouts, commands and assertions used to generate the reported evidence.

From GitHub, open **Actions**, select the workflow, and use **Run workflow** (`workflow_dispatch`). The relevant workflow files are:

```text
.github/workflows/mre1-openeaagles-equivalence.yml
.github/workflows/mre2-model-substitution.yml
.github/workflows/sp01-semantic-precheck.yml
.github/workflows/eq01-evidence-qualification.yml
.github/workflows/rq5-engineering-burden.yml
.github/workflows/ea01-evidence-accumulation.yml
.github/workflows/vu01-real-version-carry-forward.yml
.github/workflows/lc01-algorithm-change-boundary.yml
```

Expected high-level outcomes:

| Experiment | Expected frozen result |
|---|---|
| BP-01 | 16/16 direct-vs-wrapper exact; negative control rejected |
| MS-01 | OpenEaagles 16/16; RadarSimPublic 16/16; upper-trial edits 0 |
| SP-01 | 5/5 injected semantic mismatches rejected; RF relation `UNKNOWN` |
| EQ-01 | 4/4 intended-use decisions match preregistration |
| EB-01 | paired outputs 16/16 identical; upper-core churn 0 vs 160; reassessment 1/4 vs 3/4 |
| EA-01 | evidence records accumulate 1→2→3→4→5; history retained; RF `UNKNOWN` persists |
| VU-01a | retained methodological failure: strict byte identity only 8/16 on repeated run |
| VU-01b | numerical-normalized equivalence 16/16; `+1e-6 m` negative control rejected |
| LC-01 | CV 16/16; CA 16/16; automatic implementation-specific inheritance rejected |

Do not reinterpret a PASS beyond the inference boundary stated in the matching frozen evidence report.

---

## 5. Full local reproduction

### 5.1 Build the OpenEaagles dependency chain

The authoritative commands are in:

```text
.github/workflows/mre1-openeaagles-equivalence.yml
.github/workflows/mre2-model-substitution.yml
```

Apply the documented JSBSim compiler-compatibility fixes exactly as specified there, then build JSBSim into `oe3rd/`, normalize the legacy include/library layout, and build only the OpenEaagles libraries required by the TWS probe:

```bash
export OE_ROOT="$PWD/upstream/OpenEaagles"
export OE_3RD_PARTY_ROOT="$PWD/oe3rd"
mkdir -p "$OE_ROOT/lib"
make -C "$OE_ROOT/src/base" -j2
make -C "$OE_ROOT/src/simulation" -j2
make -C "$OE_ROOT/src/terrain" -j2
make -C "$OE_ROOT/src/models" -j2
```

Compile the native probe exactly as specified by the workflow. The expected output location for MS-01 is:

```text
build/mre2/oe_tws_probe
```

Because the historical JSBSim snapshot needs several modern-compiler compatibility changes, using the workflow as the build recipe is strongly recommended rather than substituting a newer JSBSim revision.

### 5.2 BP-01 — legacy behavior preservation

After compiling `build/mre1/oe_tws_probe`:

```bash
export LD_LIBRARY_PATH="$PWD/oe3rd/lib:${LD_LIBRARY_PATH:-}"

./build/mre1/oe_tws_probe \
  --config mre1/openeaagles/scenario.edl \
  --frames 500 \
  > build/mre1/baseline_1.tsv

python3 mre1/openeaagles/tmsu_wrapper.py \
  --binary build/mre1/oe_tws_probe \
  --config mre1/openeaagles/scenario.edl \
  --frames 500 \
  --output build/mre1/wrapped.tsv \
  --evidence build/mre1/wrapper_evidence.json

python3 mre1/openeaagles/compare.py \
  build/mre1/baseline_1.tsv \
  build/mre1/wrapped.tsv \
  --report build/mre1/g2b_wrapper_transparency.json

python3 mre1/openeaagles/behavior_matrix.py \
  --binary build/mre1/oe_tws_probe \
  --template mre1/openeaagles/scenario_matrix_template.edl \
  --wrapper mre1/openeaagles/tmsu_wrapper.py \
  --frames 500 \
  --outdir build/mre1/behavior_matrix
```

Expected: `behavior_preservation_v1.json` reports all 16 cases PASS and `all_D_byte_zero=true`.

### 5.3 MS-01 — real heterogeneous model substitution

With `build/mre2/oe_tws_probe` compiled and RadarSimPublic checked out:

```bash
export LD_LIBRARY_PATH="$PWD/oe3rd/lib:${LD_LIBRARY_PATH:-}"

python3 mre2/model_substitution/orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --binding mre2/model_substitution/bindings/openeaagles_tws.json \
  --contract mre2/model_substitution/capability_contract.json \
  --outdir build/mre2/run_openeaagles

python3 mre2/model_substitution/orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
  --contract mre2/model_substitution/capability_contract.json \
  --outdir build/mre2/run_radarsimpublic

python3 mre2/model_substitution/evaluate_substitution.py \
  --trial mre2/model_substitution/trial_spec.json \
  --orchestrator mre2/model_substitution/orchestrator.py \
  --run-a build/mre2/run_openeaagles \
  --run-b build/mre2/run_radarsimpublic \
  --report build/mre2/e2_model_substitution_real_v2.json
```

Expected: 16 cases for each implementation, both contract-valid, `upper_trial_artifacts_modified_for_swap=0`, and binding-only selection.

### 5.4 SP-01 — semantic precheck

```bash
python3 sp01/semantic_precheck/semantic_precheck.py --out build/sp01
```

Expected: decision `PASS`, all 5 injected mismatches rejected, and the real RF ambiguity returned as `UNKNOWN`.

### 5.5 EQ-01 — intended-use/evidence screening

```bash
python3 mre3/evidence_qualification/eq01.py \
  --root . \
  --out build/eq01
```

Expected decisions:

```text
U1 kinematic bounded use       QUALIFIED_WITHIN_EVIDENCE
U2 RF-performance use          UNKNOWN
U3 outside executed domain     UNKNOWN
U4 explicit semantic conflict  NOT_QUALIFIED
```

### 5.6 EB-01 — paired change-locality experiment

```bash
python3 mre2/model_substitution/orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
  --contract mre2/model_substitution/capability_contract.json \
  --outdir build/rq5/tmsu

python3 rq5/engineering_burden/bespoke_orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --contract mre2/model_substitution/capability_contract.json \
  --upstream-root upstream/RadarSimPublic \
  --outdir build/rq5/bespoke

python3 rq5/engineering_burden/measure_burden.py \
  --tmsu-run build/rq5/tmsu \
  --bespoke-run build/rq5/bespoke \
  --generic-orchestrator mre2/model_substitution/orchestrator.py \
  --bespoke-orchestrator rq5/engineering_burden/bespoke_orchestrator.py \
  --adapter mre2/model_substitution/radarsimpublic_adapter.py \
  --binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
  --outdir build/rq5/evidence
```

Interpret this experiment as change locality/reassessment propagation, not engineer-time or total-code savings.

### 5.7 EA-01 — evidence accumulation/lifecycle replay

```bash
python3 research/ea01/ea01_evidence_accumulation.py \
  --ledger research/ea01/evidence_ledger.json \
  --changes research/ea01/change_events.json \
  --outdir build/ea01
```

Expected: decision `PASS`, five frozen evidence records retained, and the RF `UNKNOWN` remains unresolved.

### 5.8 VU-01b — corrected version carry-forward

```bash
python3 mre2/model_substitution/orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
  --contract mre2/model_substitution/capability_contract.json \
  --outdir build/vu01/run_v2

python3 research/vu01/vu01_delta_requalification.py \
  --baseline-hashes research/vu01/ms01_v2_radarsimpublic_trace_hashes.json \
  --old-binding mre2/model_substitution/bindings/radarsimpublic_tws.json \
  --new-binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
  --trial mre2/model_substitution/trial_spec.json \
  --orchestrator mre2/model_substitution/orchestrator.py \
  --contract mre2/model_substitution/capability_contract.json \
  --new-run build/vu01/run_v2 \
  --out build/vu01/vu01_result.json
```

Expected: 16/16 9-decimal normalized equivalence and deliberate `+1e-6 m` perturbation rejected.

VU-01a is intentionally retained as a failed earlier criterion: cross-run byte identity was too brittle for this numerical claim. Do not overwrite or suppress that negative result.

### 5.9 LC-01 — algorithm-change inheritance stop rule

```bash
python3 research/lc01/ca_state_probe.py \
  --upstream-root upstream/RadarSimPublic \
  --out build/lc01/ca_state_probe.json

python3 mre2/model_substitution/orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
  --contract mre2/model_substitution/capability_contract.json \
  --outdir build/lc01/cv

python3 mre2/model_substitution/orchestrator.py \
  --trial mre2/model_substitution/trial_spec.json \
  --binding mre2/model_substitution/bindings/radarsimpublic_tws_ca.json \
  --contract mre2/model_substitution/capability_contract.json \
  --outdir build/lc01/ca

python3 research/lc01/algorithm_discrimination_challenge.py \
  --upstream-root upstream/RadarSimPublic \
  --out build/lc01/algorithm_challenge.json

python3 research/lc01/lc01_carry_forward_boundary.py \
  --old-binding mre2/model_substitution/bindings/radarsimpublic_tws_v2.json \
  --new-binding mre2/model_substitution/bindings/radarsimpublic_tws_ca.json \
  --trial mre2/model_substitution/trial_spec.json \
  --orchestrator mre2/model_substitution/orchestrator.py \
  --contract mre2/model_substitution/capability_contract.json \
  --old-run build/lc01/cv \
  --new-run build/lc01/ca \
  --challenge build/lc01/algorithm_challenge.json \
  --out build/lc01/lc01_result.json
```

Expected high-level result:

```text
automatic_carry_forward_allowed = false
carry_forward.decision = REJECTED_FRESH_IMPLEMENTATION_QUALIFICATION_REQUIRED
BP-01 = ACTIVE_FROM_ORIGINAL_EVIDENCE
SP-01 = ACTIVE_FROM_ORIGINAL_EVIDENCE
MS-01-CA = PASS_FRESH_EXECUTION
kinematic_intended_use_CA = UNKNOWN_PENDING_FRESH_FITNESS_EVIDENCE
RF_semantic_relation = UNKNOWN
```

---

## 6. Manuscript and figure reproduction

The paper is already maintained as Markdown; no proprietary document generator is required.

Author-final manuscript candidate:

```text
research/MANUSCRIPT_SUBMISSION_v1_2.md
```

Main figure masters:

```text
research/figures/Figure1_TMSU_heterogeneous_model_unification.svg
research/figures/Figure2_evidence_ladder_and_unknown.svg
research/figures/Figure3_cumulative_evidence_nonmonotonic_qualification.svg
research/figures/Figure4_selective_carry_forward_vs_stop_rule.svg
```

Main tables are embedded in the manuscript and are also traceable to the frozen table/evidence files under `research/`.

Supporting package:

```text
research/SUPPORTING_EVIDENCE_PACKAGE_v1_1.md
research/supplementary/SUPPLEMENTARY_METHODS_v1.md
research/supplementary/SUPPLEMENTARY_TABLES_v1.md
research/supplementary/FigureS1_BP_behavior_matrix.svg
research/supplementary/FigureS2_LC_algorithm_discrimination.svg
```

---

## 7. Evidence audit and claim boundaries

Before comparing reproduced results with the paper, read:

```text
research/CLAIM_EVIDENCE_MATRIX_v1_2.md
research/METHOD_RESULT_CLAIM_AUDIT_v1_0.md
research/SUBMISSION_FREEZE_v1_2.md
research/REFERENCE_VERIFICATION_v1_2.md
```

Key interpretation rules:

```text
architectural substitution != semantic compatibility
semantic compatibility != intended-use fitness
QUALIFIED_WITHIN_EVIDENCE != authoritative accreditation
historical evidence retention != current applicability
numerical equivalence != byte identity
evidence reuse != blind inheritance
```

The project intentionally preserves `UNKNOWN`, stale states, and the VU-01a failure because they are part of the scientific result.

---

## 8. Expected reproducibility boundary

The strongest exact reproducibility target is GitHub Actions because it mirrors the reported CI environment. Local runs may differ in compiler-produced binary hashes or last-bit floating-point representation. Do not replace the experiment-specific comparison rule with a stricter or looser rule without recording that methodological change.

BP-01 uses exact byte identity because the direct/wrapped observation path is frozen and deterministic within one execution environment. VU-01b intentionally uses exact discrete structure plus a 9-decimal numerical representation criterion and a sensitivity negative control. These are different evidence types and should remain different.

---

## 9. Frozen scientific record

Exact scientific submission freeze:

```text
commit 1e7a8f7de0428946aeca61529a04bee597165000
branch submission-v1.2
```

The reproduction branch adds documentation only:

```text
branch reproducibility-v1.2
```

For publication, cite/tag/archive the exact submission commit separately from later engineering development.
