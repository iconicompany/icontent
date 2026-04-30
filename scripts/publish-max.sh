#!/bin/bash

# Usage: scripts/publish-max.sh --message "my-post.txt" --image "assets/blog/my-post.png" --chat-id "$MAX_CHANNEL_ID"

set -e

# Configuration
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

MESSAGE_FILE=""
IMAGE_PATH=""
CHAT_ID="${MAX_CHANNEL_ID}"
BOT_TOKEN="${MAX_BOT_TOKEN}"
PARSE_MODE="html"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --message) MESSAGE_FILE="$2"; shift ;;
        --image) IMAGE_PATH="$2"; shift ;;
        --chat-id) CHAT_ID="$2"; shift ;;
        --bot-token) BOT_TOKEN="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$BOT_TOKEN" ]; then
    echo "Error: MAX_BOT_TOKEN is not set."
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
ATTACHMENTS="[]"

# 1. Handle Image Upload if provided
if [ -n "$IMAGE_PATH" ] && [ -f "$IMAGE_PATH" ]; then
    echo "Uploading image to Max..."
    
    # Get Upload URL
    UPLOAD_INIT_RESPONSE=$(curl -s -X POST "https://platform-api.max.ru/uploads?type=image" \
        -H "Authorization: ${BOT_TOKEN}")
    
    UPLOAD_URL=$(echo "$UPLOAD_INIT_RESPONSE" | jq -r '.url')
    
    if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" == "null" ]; then
        echo "Error: Failed to get upload URL from Max."
        echo "$UPLOAD_INIT_RESPONSE"
        exit 1
    fi
    
    # Upload File
    UPLOAD_FILE_RESPONSE=$(curl -s -X POST "$UPLOAD_URL" \
        -H "Authorization: ${BOT_TOKEN}" \
        -F "data=@${IMAGE_PATH}")
    
    # Extract token - Max returns it in a nested photos object for type=image
    ATTACHMENT_TOKEN=$(echo "$UPLOAD_FILE_RESPONSE" | jq -r '.. .token? | select(. != null)' | head -n 1)
    
    if [ -z "$ATTACHMENT_TOKEN" ] || [ "$ATTACHMENT_TOKEN" == "null" ]; then
        echo "Error: Failed to upload file to Max."
        echo "$UPLOAD_FILE_RESPONSE"
        exit 1
    fi
    
    ATTACHMENTS=$(jq -n --arg token "$ATTACHMENT_TOKEN" '[{type: "image", payload: {token: $token}}]')
fi

# 2. Send Message
echo "Sending message to Max..."

PAYLOAD=$(jq -n --arg text "$MESSAGE" --argjson attachments "$ATTACHMENTS" \
    '{text: $text, attachments: $attachments, format: "html"}')

RESPONSE_FILE=$(mktemp)
HTTP_CODE=$(curl -s -w "%{http_code}" -X POST "https://platform-api.max.ru/messages?chat_id=${CHAT_ID}" \
    -H "Authorization: ${BOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    -o "$RESPONSE_FILE")

if [ "$HTTP_CODE" -ne 200 ]; then
    echo "Error: Max API returned HTTP $HTTP_CODE"
    cat "$RESPONSE_FILE"
    echo
    rm "$RESPONSE_FILE"
    exit 1
fi

rm "$RESPONSE_FILE"
echo "Successfully published to Max."
