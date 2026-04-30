#!/bin/bash

# Usage: scripts/generate_announce.sh content/ru/blog/my-post.md
# Outputs: my-post.txt

set -e

FILE=$1
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <path-to-md-file>"
  exit 1
fi

SLUG=$(basename "$FILE" | sed 's/\.[^.]*$//')
LANG="en"
if [[ "$FILE" == *"content/ru/"* ]]; then
  LANG="ru"
fi

SITE_BASE_URL="${SITE_BASE_URL:-https://iconicompany.com}"
POST_URL="${SITE_BASE_URL}/${LANG}/blog/${SLUG}"

if [ "$LANG" == "ru" ]; then
  PROMPT="Напиши вирусный пост по мотивам этой статьи. Структура: 1) Мощный крючок — первая строка, которая цепляет и заставляет нажать 'ещё' (провокационный вопрос, неожиданный факт или смелое утверждение). 2) История или инсайт из 3-5 коротких абзацев (каждый абзац — 1-2 предложения, пустая строка между абзацами). 3) Главный вывод или призыв к действию. Не используй хэштеги. Пиши живым разговорным языком, избегай корпоративных клише. Не используй markdown-разметку: никаких **, *, _, #. Добавь 2-4 эмодзи по смыслу. Не добавляй ссылку — она будет добавлена автоматически. Отвечай только текстом поста, без пояснений и кавычек."
else
  PROMPT="Write a viral post based on this article. Keep the entire post strictly under 500 characters (including spaces, emojis) - this is a hard limit for Threads and X. Structure: 1) A powerful hook - the first line that grabs attention. 2) 1-2 sentences of key insight. 3) One clear takeaway or call to action. No hashtags. Write in a lively conversational style, avoid corporate clichés. Do not use markdown formatting: no **, *, _, #. Add 1-2 relevant emojis. Do not add a URL - it will be appended automatically. Reply with only the post text, no explanations or quotes."
fi

# Generate announcement using llm
ANNOUNCEMENT=$(llm -m litellm --system "$PROMPT" -f "$FILE" -x)

# Clean symbols
TEMP_FILE=$(mktemp)
echo "$ANNOUNCEMENT" > "$TEMP_FILE"
bash scripts/clean-symbols.sh -a "$TEMP_FILE"
ANNOUNCEMENT=$(cat "$TEMP_FILE")
rm "$TEMP_FILE"

OUTPUT_FILE="${2:-${SLUG}.txt}"

# Construct final text
if [ "$LANG" == "ru" ]; then
  # For Russian, we generate two versions if needed, but the primary slug.txt will be the Telegram version
  printf '%s\n\n<a href="%s">👉 Читать статью</a>\n<a href="%s">Телеграм</a> | <a href="%s">Дзен</a> | <a href="%s">Max</a>\n' \
    "$ANNOUNCEMENT" "$POST_URL" "${TELEGRAM_CHANNEL_URL}" "${DZEN_CHANNEL_URL}" "${MAX_CHANNEL_URL}" > "$OUTPUT_FILE"
  
  # Also create a plain version for other platforms if needed
  printf '%s\n\n👉 Статья: %s\n\n📢 %s\n' "$ANNOUNCEMENT" "$POST_URL" "${TELEGRAM_CHANNEL_URL}" > "${OUTPUT_FILE%.txt}_plain.txt"
else
  # For English
  printf '%s\n\n%s\n' "$ANNOUNCEMENT" "$POST_URL" > "$OUTPUT_FILE"
fi

echo "Generated $OUTPUT_FILE"
