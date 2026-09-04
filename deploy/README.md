# v2.1.1 deployment profiles

`compose.engineering.yml` is an integration environment, not an operational security accreditation package. It separates four processes: DTEP app, OIDC issuer, cryptographic signing service, and executable model/federation adapter daemon.

Production substitution points:
- Replace `oidc` with the organization's OIDC/identity service.
- Replace `signer` with the approved PKI/CAC/HSM/cryptographic signing service. Private keys must never reside in the DTEP application container.
- Replace loopback LVC harness with range/vendor HLA/DIS/TENA/DDS gateways through the external gateway adapter boundary.
- Move SQLite to the approved database/HA architecture before multi-node deployment; the frozen v2.1 Ontology object semantics do not depend on SQLite.
