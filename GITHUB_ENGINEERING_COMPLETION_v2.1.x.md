# DTEP v2.1.x — GitHub Engineering Completion Plan

## 1. Purpose

GitHub is used as the external engineering execution/control plane for the frozen DTEP v2.1 architecture. It does **not** replace the DTEP Ontology or test-range runtime. Its role is reproducible source control, CI, real product build/browser regression, release provenance, dependency/security management, and container publication.

The frozen A–H business architecture remains unchanged.

## 2. Repository gates

Every pull request should require:

1. `DTEP CI / frozen-architecture-and-build`
   - `bun ci` from the committed `bun.lock`
   - Prisma generation
   - frozen architecture/evidence validation
   - TypeScript typecheck
   - ESLint
   - real `next build`
2. `Engineering + Product Browser E2E / browser-e2e`
   - real OIDC RS256/JWKS service
   - real Ed25519 signing service
   - executable FMI 2.0 FMU
   - executable SAL reference C-ABI
   - real TCP L/V/C engineering federation harness
   - real Chromium engineering harness
   - **real built Next.js product UI navigation in OIDC mode**
3. Security/dependency review when enabled.

Direct pushes to `main` should be disabled. Require PR review and successful checks.

## 3. Why GitHub removes the current blockers

The chat execution environment has two known blockers: no complete npm cache and a local Chromium navigation policy. GitHub-hosted Ubuntu runners are clean networked VMs, so the workflow can fetch the exact dependency graph from `bun.lock`, build Next.js, install Playwright Chromium, start the local product, and navigate to it over real HTTP.

This converts `PRODUCT_UI_E2E_v2.1.1 = BLOCKED` from an environment limitation into an executable CI gate.

## 4. Deployment split

### GitHub-hosted runner

Use for:
- build/typecheck/lint
- frozen architecture validation
- browser product regression
- engineering OIDC/signer/FMI/SAL/TCP-LVC tests
- container image creation
- SBOM/provenance tasks that do not require protected range access

### Self-hosted protected runner

Use only when the real range/vendor systems are available:
- organization IdP/CAC/PKI/HSM
- actual SAL implementation supplied by the program/range
- real HLA RTI / DIS / TENA / DDS gateways
- classified/protected network endpoints
- hardware-in-the-loop / range interfaces

A self-hosted runner must be treated as part of the protected T&E environment, not as a general public CI host.

## 5. Release model

A release tag `v2.1.x` should:

1. rerun all required CI/E2E gates;
2. build `deploy/Dockerfile.app`;
3. push the image to GHCR;
4. record the immutable container digest and commit SHA;
5. publish architecture/evidence checksums as workflow artifacts;
6. optionally generate GitHub artifact attestations when repository visibility/plan permits.

The container digest should become an additional deployment provenance input in DTEP, but it must not change the frozen v2.1 business semantics.

## 6. Current GitHub handoff state

This source tree now contains:

- `.github/workflows/ci.yml`
- `.github/workflows/engineering-e2e.yml`
- `.github/workflows/performance.yml`
- `.github/workflows/release.yml`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`
- `.devcontainer/devcontainer.json`
- `scripts/e2e/github_product_smoke_v211.py`

The product browser script verifies the real Next.js UI under two signed OIDC actors, disables role switching, renders CASE-01, navigates Scenario Assembly/Federation, Evidence Gate and Decision Provenance, and saves screenshot/JSON evidence.

## 7. Remaining external qualifications

GitHub can complete the software engineering pipeline, but it cannot manufacture evidence for systems that are not connected. The following remain explicit external acceptance activities:

- organization IdP integration and identity assurance policy;
- approved CAC/PKI/HSM signer integration;
- program/range SAL conformance qualification;
- vendor/range HLA RTI, DIS, TENA and DDS interoperability;
- protected network deployment and cyber accreditation;
- HA database and backup/recovery qualification;
- range-scale load/capacity acceptance.
