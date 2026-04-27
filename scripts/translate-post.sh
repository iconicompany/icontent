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

FILE="$1"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <post-file.md>"
  exit 1
fi

# Determine English path
EN_FILE="${FILE/content\/ru\//content\/en\/}"

if [ "$FILE" == "$EN_FILE" ]; then
  echo "Error: Input file must be in content/ru/ directory."
  exit 1
fi

EN_DIR=$(dirname "$EN_FILE")
mkdir -p "$EN_DIR"

echo "--- Translating $FILE to English ---"

RAW_CONTENT=$(cat "$FILE")

# Prepare prompt
PROMPT="Translate the following markdown file from Russian to English. 
Maintain all markdown formatting, frontmatter, and technical terms. 
Important: in the YAML frontmatter, use double quotes (not single quotes) for all string values such as title and description, so that apostrophes in the text do not break the YAML syntax. 
Do not add any extra comments or explanations, JUST the translated markdown content.

FILE CONTENT:
$RAW_CONTENT"

# Escape content for JSON
ESCAPED_PROMPT=$(echo "$PROMPT" | jq -Rs .)

# Call LLM
RESPONSE=$(curl -s "$API_BASE/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": $ESCAPED_PROMPT}]
  }")

# Check for API error
if echo "$RESPONSE" | grep -q "error"; then
  echo "LLM API Error: $RESPONSE"
  exit 1
fi

# Parse content
TRANSLATED_CONTENT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content')

# Remove potential markdown code blocks wrapping the response
# Sometimes LLM wraps the response in ```markdown ... ```
echo "$TRANSLATED_CONTENT" | sed '1{/^```/d}; ${/^```/d}' > "$EN_FILE"

# Post-processing
bash scripts/clean-symbols.sh "$EN_FILE"

echo "✅ Done! Translation created at $EN_FILE"
