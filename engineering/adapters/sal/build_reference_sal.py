#!/usr/bin/env python3
from pathlib import Path
import subprocess
ROOT=Path(__file__).resolve().parent; DIST=ROOT/'dist'; DIST.mkdir(exist_ok=True)
out=DIST/'libdtep_reference_sal.so'
subprocess.run(['gcc','-O2','-shared','-fPIC',str(ROOT/'reference_sal_model.c'),'-o',str(out)],check=True)
print(out)
