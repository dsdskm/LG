#!/bin/bash
# compress-meshes.sh
#
# convert-meshes.sh 가 만든 meshes-glb 의 GLB 들은 assimp 가 단순 포맷 변환만 하므로
# 압축/정점병합/양자화가 없어 STL 보다도 크다. 이 스크립트로 meshopt 압축(EXT_meshopt_compression)
# 을 적용해 다운로드 크기를 크게 줄인다. (형상 손실 방지를 위해 simplify 는 끔)
#
# 선행: convert-meshes.sh 실행 (STL -> meshes-glb)
# 런타임: GLTFLoader.setMeshoptDecoder(MeshoptDecoder) 로 디코딩해야 함
set -e

ROOT="public/urdf/cloid_description_1k/meshes-glb"

total=$(find "$ROOT" -name '*.glb' | wc -l | tr -d ' ')
i=0
fail=0
while IFS= read -r f; do
  i=$((i + 1))
  tmp="${f%.glb}.tmp.glb"
  if npx --yes @gltf-transform/cli optimize "$f" "$tmp" \
      --compress meshopt --texture-compress false --simplify false >/dev/null 2>&1; then
    mv "$tmp" "$f"
    echo "[$i/$total] compressed: ${f#$ROOT/}"
  else
    rm -f "$tmp"
    echo "[$i/$total] FAIL: ${f#$ROOT/}"
    fail=$((fail + 1))
  fi
done < <(find "$ROOT" -name '*.glb')

echo "=== done. failures: $fail ==="
