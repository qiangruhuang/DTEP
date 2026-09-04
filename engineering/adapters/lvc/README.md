# LVC adapter boundary

- `federation_harness.py` uses **real TCP sockets and concurrent L/V/C nodes** to exercise DTEP's federation lifecycle, throughput, ordering, loss and time-monitoring paths. It deliberately does **not** claim to encode IEEE HLA/DIS/TENA/DDS wire formats.
- `external_gateway_adapter.py` is the production-facing boundary. DTEP connects to deployed HLA RTI / DIS / TENA / DDS gateway processes via explicit health/control endpoints. Vendor or range-specific gateway code stays outside DTEP.

This separation is intentional: SAL/FMI are model execution contracts; HLA/DIS/TENA/DDS are external federation/interoperability technologies. DTEP governs configuration, readiness, run control and evidence provenance without reimplementing proprietary RTIs.
