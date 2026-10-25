#!/usr/bin/env bash
# Write the disk usage of the filesystem holding a folder to <assets-dir>/disk.json.
# The theme (custom.js) reads that file and shows the free space in the top bar.
# Run it on the dufs server, e.g. from cron every minute:
#
#   * * * * * /opt/dufs-theme/disk-usage.sh /srv/files /opt/dufs-theme
#
# Usage: disk-usage.sh <served-dir> <deployed-assets-dir>
set -euo pipefail

dir=${1:-}
out=${2:-}
[[ -n $dir && -n $out ]] || { echo "usage: disk-usage.sh <served-dir> <assets-dir>" >&2; exit 2; }
[[ -d $dir ]] || { echo "not a directory: $dir" >&2; exit 1; }
[[ -d $out ]] || { echo "not a directory: $out" >&2; exit 1; }

# df -P: POSIX output, one line per filesystem; sizes in 1K blocks.
read -r size used avail < <(df -Pk -- "$dir" | awk 'NR==2 {print $2, $3, $4}')

# Write to a temp file, then rename, so the page never reads a half-written file.
tmp=$(mktemp "$out/.disk.json.XXXXXX")
trap 'rm -f "$tmp"' EXIT
printf '{"size":%d,"used":%d,"free":%d,"updated":%d}\n' \
  $((size * 1024)) $((used * 1024)) $((avail * 1024)) "$(date +%s)" > "$tmp"
chmod 644 "$tmp"
mv "$tmp" "$out/disk.json"
