#!/bin/bash
# Centralized script to clean up AI-generated artifacts and special symbols.

set -e

# Ensure Unicode support for sed
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

STRIP_MARKDOWN=false
FILE=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    -a|--announcement) STRIP_MARKDOWN=true ;;
    *) FILE="$1" ;;
  esac
  shift
done

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 [-a] <file>"
  exit 1
fi

# 1. Clean up common AI symbols and "smart" characters
sed -i -E \
  -e 's/•/-/g' \
  -e 's/—/-/g' \
  -e 's/–/-/g' \
  -e 's/[“”]/"/g' \
  -e "s/[‘’]/'/g" \
  -e 's/…/.../g' \
  -e 's/×/x/g' \
  -e 's/°/o/g' \
  "$FILE"

# 2. Fix potential AI block leaks
sed -i -E 's/^```markdown//g' "$FILE"
sed -i -E 's/^```//g' "$FILE"

# 3. Announcement-specific processing (strip markdown)
if [ "$STRIP_MARKDOWN" = true ]; then
  sed -i -E \
    -e 's/\*\*//g' \
    -e 's/\*//g' \
    -e 's/__//g' \
    -e 's/^[[:space:]]*#+[[:space:]]*//' \
    -e 's/^[[:space:]]*-[[:space:]]*/- /g' \
    "$FILE"
fi

# 4. Trim trailing whitespace but preserve line structure
sed -i -E 's/[[:space:]]+$//g' "$FILE"

echo "✨ Cleaned AI symbols in $FILE (Mode: $( [ "$STRIP_MARKDOWN" = true ] && echo "Announcement" || echo "Normal" ))"
