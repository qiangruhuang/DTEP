# FMI-01 — FMI 3.x TMSU onboarding micro-demonstration

Purpose: convert the manuscript's FMI compatibility statement into executable mechanism evidence without changing the main research question.

This experiment uses the Modelica Association Reference-FMUs v0.0.40 `BouncingBall` FMU only as a standards-compliant FMI 3.0 Co-Simulation transport/conformance carrier. It is **not** evidence for vehicle, weapon, or multi-capability fidelity. The test demonstrates that FMI machine-readable type/unit/interface metadata can populate structural portions of a TMSU, while T&E-only concepts remain in a sidecar.

M3 Native criterion used here: the FMU is executed through FMI 3.x Co-Simulation, its canonical variables are resolved from `modelDescription.xml`, and no model-specific procedural adapter is required. The sidecar adds only T&E-specific capability, concept, intended-use, and provenance declarations.
