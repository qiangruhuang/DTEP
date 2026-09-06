#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OE_COMMIT="b3d7e74a9bf52934e13fd6a11f45dc9767ac9192"
JSBSIM_COMMIT="140068895adf1b8981b45cc5e17a16d82990806d"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 2; }; }
for c in git python3 cmake make g++; do need "$c"; done

mkdir -p upstream build

if [[ ! -d upstream/OpenEaagles/.git ]]; then
  git clone https://github.com/doughodson/OpenEaagles.git upstream/OpenEaagles
fi
git -C upstream/OpenEaagles fetch --all --tags
git -C upstream/OpenEaagles checkout --detach "$OE_COMMIT"

if [[ ! -d upstream/jsbsim/.git ]]; then
  git clone https://github.com/JSBSim-Team/jsbsim.git upstream/jsbsim
fi
git -C upstream/jsbsim fetch --all --tags
git -C upstream/jsbsim checkout --detach "$JSBSIM_COMMIT"

test "$(git -C upstream/OpenEaagles rev-parse HEAD)" = "$OE_COMMIT"
test "$(git -C upstream/jsbsim rev-parse HEAD)" = "$JSBSIM_COMMIT"

# Restore a clean frozen JSBSim checkout before applying the documented build-only fixes.
git -C upstream/jsbsim reset --hard "$JSBSIM_COMMIT"
git -C upstream/jsbsim clean -fdx

python3 - <<'PY'
from pathlib import Path
fixes = [
    ('upstream/jsbsim/src/FGFDMExec.cpp',
     'if (FDMctr > 0) (*FDMctr)--;',
     'if (FDMctr != 0 && *FDMctr > 0) (*FDMctr)--;'),
    ('upstream/jsbsim/src/input_output/FGInputSocket.cpp',
     '} else if (node > 0) {',
     '} else if (node != 0) {'),
    ('upstream/jsbsim/src/simgear/props/propertyObject.cxx',
     '#include <simgear/structure/exception.hxx>',
     '#include <stdexcept>'),
    ('upstream/jsbsim/src/simgear/props/propertyObject.cxx',
     'throw sg_exception("Unknown property:" + path);',
     'throw std::runtime_error("Unknown property:" + path);'),
]
for filename, old, new in fixes:
    p = Path(filename)
    s = p.read_text()
    assert s.count(old) == 1, f'Expected frozen expression exactly once: {filename}: {old}'
    p.write_text(s.replace(old, new))
PY

git -C upstream/jsbsim diff -- \
  src/FGFDMExec.cpp \
  src/input_output/FGInputSocket.cpp \
  src/simgear/props/propertyObject.cxx > jsbsim-build-compat.patch
sha256sum jsbsim-build-compat.patch

PREFIX="$ROOT/oe3rd"
rm -rf build/jsbsim "$PREFIX"
cmake -S upstream/jsbsim -B build/jsbsim \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX="$PREFIX" \
  -DBUILD_SHARED_LIBS=ON
cmake --build build/jsbsim --parallel 2
cmake --install build/jsbsim

mkdir -p "$PREFIX/include/JSBSim" "$PREFIX/lib"
if [[ -d "$PREFIX/include/jsbsim" ]]; then
  cp -a "$PREFIX/include/jsbsim/." "$PREFIX/include/JSBSim/"
fi
if [[ -d "$PREFIX/lib64" ]]; then
  cp -a "$PREFIX/lib64/." "$PREFIX/lib/"
fi

export OE_ROOT="$ROOT/upstream/OpenEaagles"
export OE_3RD_PARTY_ROOT="$PREFIX"
mkdir -p "$OE_ROOT/lib"
make -C "$OE_ROOT/src/base" -j2
make -C "$OE_ROOT/src/simulation" -j2
make -C "$OE_ROOT/src/terrain" -j2
make -C "$OE_ROOT/src/models" -j2

compile_probe() {
  local out="$1"
  mkdir -p "$(dirname "$out")"
  g++ -std=c++11 -O2 \
    -I"$OE_ROOT/include" -I"$PREFIX/include" \
    mre1/openeaagles/probe.cpp \
    -L"$OE_ROOT/lib" -L"$PREFIX/lib" \
    -Wl,-rpath,"$PREFIX/lib" \
    -Wl,--start-group -loe_models -loe_terrain -loe_simulation -loe_base -lJSBSim -Wl,--end-group \
    -lpthread -lrt -lX11 -ldl -lm \
    -o "$out"
}

compile_probe build/mre1/oe_tws_probe
compile_probe build/mre2/oe_tws_probe

sha256sum build/mre1/oe_tws_probe build/mre2/oe_tws_probe

echo "OpenEaagles/JSBSim stack built successfully."
echo "Set: export LD_LIBRARY_PATH=\"$ROOT/oe3rd/lib:\${LD_LIBRARY_PATH:-}\""
