#!/usr/bin/env bash
set -euo pipefail
source_dir=${1:?Pass the directory containing the original YAGG JPG files}
project_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
for image_id in 4257 4214 4220 4373 4566 3904 4366 4465 4155 4450 4647; do
  cwebp -quiet -q 82 -m 6 -resize 0 1800 -metadata none "$source_dir/YAGG$image_id.jpg" -o "$project_root/assets/photo-$image_id.webp"
done
cwebp -quiet -q 82 -m 6 -resize 1800 0 -metadata none "$source_dir/YAGG4099.jpg" -o "$project_root/assets/photo-4099.webp"
