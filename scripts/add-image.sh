#!/bin/bash

# Configuration
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

API_BASE="${OPENAI_API_BASE:-https://api.openai.com/v1}"
API_KEY="${OPENAI_API_KEY}"
MODEL_TEXT="${OPENAI_MODEL:-gpt-4o}"
MODEL_IMAGE="gemini-2.5-flash-image"

FILE="$1"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <post-file.mdx>"
  exit 1
fi

SLUG=$(basename "$FILE" | sed 's/\.[^.]*$//')
DIR=$(dirname "$FILE")
IMAGE_FILE="$DIR/$SLUG.png"

echo "--- Generating image prompt for $FILE ---"

CONTENT=$(cat "$FILE")

# Request an image prompt from LLM
PROMPT_FOR_LLM="Based on the following blog post, create a descriptive prompt for an image generation AI (like Midjourney or DALL-E) that would serve as a great header image. The prompt should be in English, visual, and conceptual.

POST CONTENT:
$CONTENT

Output ONLY the image prompt text."

ESCAPED_CONTENT_PROMPT=$(echo "$PROMPT_FOR_LLM" | jq -Rs .)

IMAGE_PROMPT_RESPONSE=$(curl -s "$API_BASE/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"model\": \"$MODEL_TEXT\",
    \"messages\": [{\"role\": \"user\", \"content\": $ESCAPED_CONTENT_PROMPT}]
  }")

IMAGE_PROMPT=$(echo "$IMAGE_PROMPT_RESPONSE" | jq -r '.choices[0].message.content')

echo "Prompt: $IMAGE_PROMPT"
echo "--- Generating image ---"

# Call image generation API
curl -s --location "$API_BASE/images/generations" \
--header "Authorization: Bearer $API_KEY" \
--header 'Content-Type: application/json' \
--data "{
    \"model\": \"$MODEL_IMAGE\",
    \"prompt\": $(echo "$IMAGE_PROMPT (edge-to-edge, cinematic, no borders, no padding, fill entire frame)" | jq -Rs .),
    \"size\": \"1536x896\",
    \"n\": 1
}" | jq -r '.data[0].b64_json' | base64 -d > "$IMAGE_FILE"

if [ ! -s "$IMAGE_FILE" ]; then
  echo "❌ Error: Failed to generate or save image."
  exit 1
fi

echo "✅ Image saved as $IMAGE_FILE"

# Insert image into MDX
# Find the end of frontmatter (second ---) and insert after it
TITLE=$(grep -m1 '^title:' "$FILE" | sed 's/^title:[[:space:]]*//' | tr -d '"'"'" || echo "$SLUG")

# Check if image already exists in file
if grep -q "!\[.*\]($SLUG.png)" "$FILE"; then
  echo "ℹ️ Image reference already exists in file."
else
  # Insert after the second frontmatter line (second ---)
  awk -v img="![$TITLE]($SLUG.png)" '
    BEGIN {count=0; inserted=0}
    /^---$/ {
      count++
      print $0
      if (count == 2 && inserted == 0) {
        print ""
        print img
        inserted = 1
      }
      next
    }
    {print $0}
  ' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
  echo "✅ Image reference inserted into $FILE"
fi
