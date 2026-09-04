#!/usr/bin/env python3
from pathlib import Path
import subprocess, zipfile, shutil, textwrap
ROOT=Path(__file__).resolve().parent
BUILD=ROOT/'build'; DIST=ROOT/'dist'; BUILD.mkdir(exist_ok=True); DIST.mkdir(exist_ok=True)
shutil.rmtree(BUILD/'fmu',ignore_errors=True)
(BUILD/'fmu'/'binaries'/'linux64').mkdir(parents=True)
so=BUILD/'fmu'/'binaries'/'linux64'/'reference.so'
subprocess.run(['gcc','-O2','-shared','-fPIC',str(ROOT/'reference_model.c'),'-o',str(so)],check=True)
xml='''<?xml version="1.0" encoding="UTF-8"?>
<fmiModelDescription fmiVersion="2.0" modelName="DTEPReferenceFMI" guid="{dtep-reference-fmi-2.0}" generationTool="DTEP v2.1.x engineering" variableNamingConvention="flat" numberOfEventIndicators="0">
  <CoSimulation modelIdentifier="reference" needsExecutionTool="false" canHandleVariableCommunicationStepSize="true" canReset="true"/>
  <ModelVariables>
    <ScalarVariable name="u" valueReference="0" causality="input" variability="continuous"><Real start="1.0"/></ScalarVariable>
    <ScalarVariable name="y" valueReference="1" causality="output" variability="continuous"><Real start="0.0"/></ScalarVariable>
  </ModelVariables>
  <ModelStructure><Outputs><Unknown index="2" dependencies="1"/></Outputs></ModelStructure>
</fmiModelDescription>'''
(BUILD/'fmu'/'modelDescription.xml').write_text(xml)
out=DIST/'dtep_reference_fmi2.fmu'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
    for p in (BUILD/'fmu').rglob('*'):
        if p.is_file(): z.write(p,p.relative_to(BUILD/'fmu'))
print(out)
