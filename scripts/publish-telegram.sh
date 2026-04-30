#!/bin/bash

# Usage: scripts/publish-telegram.sh --message "my-post.txt" --image "assets/blog/my-post.png" --chat-id "$TELEGRAM_CHANNEL_ID"

set -e

MESSAGE_FILE=""
IMAGE_PATH=""
CHAT_ID="${TELEGRAM_CHANNEL_ID}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
PARSE_MODE="HTML"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --message) MESSAGE_FILE="$2"; shift ;;
        --image) IMAGE_PATH="$2"; shift ;;
        --chat-id) CHAT_ID="$2"; shift ;;
        --bot-token) BOT_TOKEN="$2"; shift ;;
        --parse-mode) PARSE_MODE="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$BOT_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN is not set."
    exit 1
fi

if [ -z "$CHAT_ID" ]; then
    echo "Error: CHAT_ID is not set."
    exit 1
fi

if [ -z "$MESSAGE_FILE" ] || [ ! -f "$MESSAGE_FILE" ]; then
    echo "Error: Message file not found."
    exit 1
fi

MESSAGE=$(cat "$MESSAGE_FILE")

if [ -n "$IMAGE_PATH" ] && [ -f "$IMAGE_PATH" ]; then
    echo "Sending photo to Telegram..."
    curl --fail --show-error -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto" \
        -F "chat_id=${CHAT_ID}" \
        -F "photo=@${IMAGE_PATH}" \
        -F "caption=${MESSAGE}" \
        -F "parse_mode=${PARSE_MODE}"
else
    echo "Sending text message to Telegram..."
    # Use jq to safely escape the message
    PAYLOAD=$(jq -n --arg chat_id "${CHAT_ID}" --arg text "${MESSAGE}" --arg parse_mode "${PARSE_MODE}" \
        '{chat_id: $chat_id, text: $text, parse_mode: $parse_mode, disable_web_page_preview: false}')
    
    curl --fail --show-error -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD"
fi

echo "Successfully published to Telegram."
