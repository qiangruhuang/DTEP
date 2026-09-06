# LC-01 — Model-Algorithm Change Carry-Forward Boundary

LC-01 is the stopping-rule / limit experiment for WP1 evidence lifecycle management.

It deliberately changes the selected RadarSimPublic tracking algorithm from the upstream constant-velocity Kalman filter to the upstream constant-acceleration Kalman filter while freezing the repository commit, upper trial, capability contract, semantic profile, and declared field mappings.

The question is not whether the CA filter is better. The question is whether a substantive implementation/algorithm identity change may inherit implementation-specific qualification from the preceding CV configuration merely because the common contract remains unchanged.

Expected lifecycle behavior:

- retain all historical evidence;
- keep BP-01 and SP-01 active where their dependencies are unchanged;
- mark CV-specific MS/EQ/EB/VU evidence historical/stale for the CA configuration;
- execute fresh architectural/contract checks for the CA binding;
- require fresh implementation-level fitness evidence before carrying forward an intended-use qualification;
- retain unresolved RF `UNKNOWN` unchanged.

A maneuvering-target challenge is included only to demonstrate that CV and CA are genuinely discriminable algorithm choices outside the original E2 envelope. It is not an operational validation or superiority comparison.
