#!/bin/bash
# convert-meshes.sh
SRC_ROOT="public/urdf/cloid_description_1k/meshes"
OUT_ROOT="public/urdf/cloid_description_1k/meshes-glb"

find "$SRC_ROOT" -iname "*.stl" | while read -r f; do
  rel_path="${f#$SRC_ROOT/}"                     # 예: omnihand/thumb_dip.STL
  rel_dir=$(dirname "$rel_path")                  # omnihand
  filename=$(basename "$rel_path" .STL)           # thumb_dip

  mkdir -p "$OUT_ROOT/$rel_dir"
  assimp export "$f" "$OUT_ROOT/$rel_dir/$filename.glb"
  echo "converted: $rel_path -> $rel_dir/$filename.glb"
done