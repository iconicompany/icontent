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

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --title) OVERRIDE_TITLE="$2"; shift ;;
    --slug) OVERRIDE_SLUG="$2"; shift ;;
    --date) OVERRIDE_DATE="$2"; shift ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# Read content from stdin
RAW_CONTENT=$(cat)

if [ -z "$RAW_CONTENT" ]; then
  echo "Error: No content provided via stdin."
  exit 1
fi

echo "--- Processing content with LLM (Formatting + Metadata) ---"

# Prepare JSON prompt for LLM
PROMPT="You are a professional blog post editor. Your task is to take a raw draft and format it into a high-quality Markdown blog post while following specific style guidelines.

RULES FROM AGENTS.MD:
$RULES

ADDITIONAL GUIDELINES:
- Use emojis for accents (✅, ❌, 👤, 💡, ⚡) but moderately.
- Ensure empty lines between emoji-prefixed items to prevent collapsing.
- Use ## and ### for headings.
- The output must be a JSON object with the following fields:
  - title (string): The post title (in Russian).
  - description (string): 1-2 sentence SEO description.
  - tags (array): 3-5 relevant tags from the categories in rules.
  - slug (string): URL-safe latin slug for the filename.
  - content (string): The FULL formatted blog post body in Markdown (excluding frontmatter).

Output ONLY the JSON object.

RAW DRAFT:
$RAW_CONTENT"

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

# Apply overrides
TITLE="${OVERRIDE_TITLE:-$TITLE}"
SLUG="${OVERRIDE_SLUG:-$SLUG}"
DATE="${OVERRIDE_DATE:-$(date +%Y-%m-%d)}"

FILENAME="$BLOG_DIR/$SLUG.mdx"

if [ -f "$FILENAME" ]; then
  echo "Warning: File $FILENAME already exists. Appending timestamp."
  TIMESTAMP=$(date +%s)
  SLUG="$SLUG-$TIMESTAMP"
  FILENAME="$BLOG_DIR/$SLUG.mdx"
fi

echo "--- Generating 'Read Also' section ---"
# Convert tags array literal for the recommend script
TAGS_CLEAN=$(echo "$METADATA" | jq -r '.tags | join(",")')
READ_ALSO=$(bun scripts/recommend.ts "$TAGS_CLEAN" "$SLUG")

echo "--- Writing file: $FILENAME ---"

# Assemble the final content
cat > "$FILENAME" <<EOF
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

# 1. Clean up AI symbols
bash scripts/clean-symbols.sh "$FILENAME"

# 2. Add AI Image (this script handles generation and insertion)
bash scripts/add-image.sh "$FILENAME"

echo "✅ Done! Post created at $FILENAME"
