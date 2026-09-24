# Engineering identity service

`oidc_idp.py` is a deliberately local OIDC-compatible engineering issuer used only for integration/E2E tests. It issues RS256 JWTs and exposes a JWKS endpoint. It is not a production identity provider.

Production mode uses the same application verifier (`src/lib/security/identity.ts`) against the organization's real OIDC issuer/JWKS. The application maps the immutable `sub` identity to a DTEP actor through `dtep_actor_id` (or a configured claim).
