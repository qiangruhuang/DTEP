# 天衡 DTEP

Digital Test & Evaluation Platform engineering baseline.

The v2.1 A–H business architecture is frozen. The v2.1.x line remains the engineering baseline for identity, cryptographic signatures, FMI/SAL/LVC adapters, deployment, CI/E2E, performance qualification, and release provenance.

The v2.4 governance research overlay does not add a new top-level business module. It consolidates the v2.3.1–v2.3.4 transport, relation-integrity, governed-reuse, and change-propagation work into one Object–Relation–Evidence–Decision (ORED) governance compiler. See `docs/V2.4_GOVERNANCE_ARCHITECTURE_CONSOLIDATION.md`.

## Reproducible build

```bash
bun ci
python scripts/restore_db.py --force
bunx prisma generate
python scripts/validate_v21.py
bunx tsc --noEmit
bun run lint
bun run build
```

`db/custom.sql` is a synthetic/demo database snapshot used for reproducible CI and CASE-01 demonstrations. The generated binary `db/custom.db` is intentionally not versioned.

## Engineering services

See `deploy/README.md` and `deploy/compose.engineering.yml`.

## GitHub engineering gates

See `GITHUB_ENGINEERING_COMPLETION_v2.1.x.md`. Pull requests are intended to run a real Next.js build and real Chromium product E2E on GitHub-hosted runners. Real range/vendor interoperability should run only on a protected self-hosted runner.

## Security boundary

The repository contains only engineering/demo credentials and synthetic CASE-01 material. Do not commit production IdP secrets, CAC/PKI/HSM material, private signing keys, protected range endpoints, or operational test data.
