#!/bin/bash

# Configuration
# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set defaults from ENV or fallbacks
API_BASE="${OPENAI_API_BASE:-https://api.openai.com/v1}"
API_KEY="${OPENAI_API_KEY}"
MODEL="${OPENAI_MODEL:-gpt-4o}"
BLOG_DIR="content/ru/blog"
AGENTS_RULES="AGENTS.md"

# Load rules from AGENTS.md if available
RULES=""
if [ -f "$AGENTS_RULES" ]; then
  RULES=$(cat "$AGENTS_RULES" | grep -A 100 "## Содержание поста" | grep -v "## Контакты")
fi

# Parse optional arguments
OVERRIDE_TITLE=""
OVERRIDE_SLUG=""
OVERRIDE_DATE=""
INPUT_FILE=""

# Check if the first argument is a file
if [ -f "$1" ]; then
  INPUT_FILE="$1"
  shift
fi

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --title) OVERRIDE_TITLE="$2"; shift ;;
    --slug|-s) OVERRIDE_SLUG="$2"; shift ;;
    --date) OVERRIDE_DATE="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Read content
if [ -n "$INPUT_FILE" ]; then
  RAW_CONTENT=$(cat "$INPUT_FILE")
else
  # Check if stdin has data
  if [ ! -t 0 ]; then
    RAW_CONTENT=$(cat)
  else
    echo "Error: No input file provided and no content via stdin."
    exit 1
  fi
fi

if [ -z "$RAW_CONTENT" ]; then
  echo "Error: No content provided."
  exit 1
fi

TODAY=$(date +%Y-%m-%d)

echo "--- Processing content with LLM (Formatting + Metadata) ---"

# Prepare JSON prompt for LLM
PROMPT="You are a professional blog post editor. Your task is to take a raw draft or an existing post and format/fix it while following specific style guidelines.

RULES FROM AGENTS.MD:
$RULES

ADDITIONAL GUIDELINES:
- Use emojis for accents but moderately.
- Ensure empty lines between emoji-prefixed items.
- Ensure title, date, description, tags, authors, language are in the frontmatter.
- If frontmatter is missing, create it.
- If tags or description are weak, improve them.
- Slug must be a meaningful English slug (translated from title).
- If date is missing or generic, use today's date: $TODAY.
- The output must be a JSON object.

DRAFT/POST:
$RAW_CONTENT

Output ONLY the JSON object with fields: title, description, tags (array), slug, date (YYYY-MM-DD), content (markdown body)."

# Escape content for JSON
ESCAPED_PROMPT=$(echo "$PROMPT" | jq -Rs .)

# Call LLM
RESPONSE=$(curl -s "$API_BASE/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": $ESCAPED_PROMPT}],
    \"response_format\": { \"type\": \"json_object\" }
  }")

# Check for API error
if echo "$RESPONSE" | grep -q "error"; then
  echo "LLM API Error: $RESPONSE"
  exit 1
fi

# Parse metadata and content
METADATA=$(echo "$RESPONSE" | jq -r '.choices[0].message.content')
TITLE=$(echo "$METADATA" | jq -r '.title')
DESC=$(echo "$METADATA" | jq -r '.description')
TAGS_ARRAY=$(echo "$METADATA" | jq -rc '.tags')
SLUG=$(echo "$METADATA" | jq -r '.slug')
FORMATTED_CONTENT=$(echo "$METADATA" | jq -r '.content')
DATE=$(echo "$METADATA" | jq -r '.date')

# Apply overrides
TITLE="${OVERRIDE_TITLE:-$TITLE}"
SLUG="${OVERRIDE_SLUG:-$SLUG}"
DATE="${OVERRIDE_DATE:-$DATE}"
[ "$DATE" == "null" ] && DATE=$(date +%Y-%m-%d)

FINAL_FILENAME="$BLOG_DIR/$SLUG.md"

# If we have an input file, and it is in the blog dir, we might need to remove it if renaming
if [ -n "$INPUT_FILE" ] && [ "$INPUT_FILE" != "$FINAL_FILENAME" ]; then
  echo "--- Renaming/Moving: $INPUT_FILE -> $FINAL_FILENAME ---"
  # If it's a rename, we'll delete the old one after writing the new one
  OLD_FILE="$INPUT_FILE"
fi

if [ -f "$FINAL_FILENAME" ] && [ "$INPUT_FILE" != "$FINAL_FILENAME" ]; then
  echo "Warning: File $FINAL_FILENAME already exists. Appending timestamp."
  TIMESTAMP=$(date +%s)
  SLUG="$SLUG-$TIMESTAMP"
  FINAL_FILENAME="$BLOG_DIR/$SLUG.md"
fi

echo "--- Generating 'Read Also' section ---"
TAGS_CLEAN=$(echo "$METADATA" | jq -r '.tags | join(",")')
READ_ALSO=$(bun scripts/recommend.ts "$TAGS_CLEAN" "$SLUG")

echo "--- Writing file: $FINAL_FILENAME ---"

# Assemble the final content
cat > "$FINAL_FILENAME" <<EOF
---
title: "$TITLE"
date: '$DATE'
description: "$DESC"
tags: $TAGS_ARRAY
authors: ['slavb18']
language: 'ru'
---

$FORMATTED_CONTENT

---

## 📚 Читайте также

$READ_ALSO
EOF

# Remove old file if it was a rename
if [ -n "$OLD_FILE" ] && [ "$OLD_FILE" != "$FINAL_FILENAME" ]; then
  rm "$OLD_FILE"
fi

# Post-processing
bash scripts/clean-symbols.sh "$FINAL_FILENAME"
bash scripts/add-image.sh "$FINAL_FILENAME"
bash scripts/translate-post.sh "$FINAL_FILENAME"

echo "✅ Done! Post created at $FINAL_FILENAME"

