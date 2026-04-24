#!/bin/bash

# Configuration
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

TOKEN="${LINKEDIN_TOKEN}"
AUTHOR="${LINKEDIN_AUTHOR}"

# Help
usage() {
  echo "Usage: $0 --text \"Message\" [--image \"path/to/image.png\"] [--title \"Image Title\"]"
  exit 1
}

# Parse arguments
TEXT=""
IMAGE=""
TITLE=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --text) TEXT="$2"; shift ;;
    --image) IMAGE="$2"; shift ;;
    --title) TITLE="$2"; shift ;;
    *) echo "Unknown parameter: $1"; usage ;;
  esac
  shift
done

if [ -z "$TEXT" ]; then
  echo "Error: --text is required."
  usage
fi

if [ -z "$TOKEN" ] || [ -z "$AUTHOR" ]; then
  echo "Error: LINKEDIN_TOKEN and LINKEDIN_AUTHOR environment variables must be set."
  exit 1
fi

if [[ ! "$AUTHOR" =~ ^urn:li: ]]; then
  echo "Error: LINKEDIN_AUTHOR must be a full URN (e.g., urn:li:person:ABC or urn:li:organization:123)."
  echo "Current value: $AUTHOR"
  exit 1
fi

if [ -n "$IMAGE" ] && [ -f "$IMAGE" ]; then
  echo "--- Uploading image to LinkedIn ---"
  
  # Step 1: Register Upload
  REGISTER_JSON=$(jq -n --arg owner "$AUTHOR" '{
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: $owner,
      serviceRelationships: [{
        relationshipType: "OWNER",
        identifier: "urn:li:userGeneratedContent"
      }]
    }
  }')
  
  REGISTER_RESPONSE=$(curl -s -X POST "https://api.linkedin.com/v2/assets?action=upload" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-Restli-Protocol-Version: 2.0.0" \
    -d "$REGISTER_JSON")
  
  UPLOAD_URL=$(echo "$REGISTER_RESPONSE" | jq -r '.value.uploadMechanism."com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest".uploadUrl')
  ASSET=$(echo "$REGISTER_RESPONSE" | jq -r '.value.asset')
  
  if [ "$UPLOAD_URL" = "null" ] || [ -z "$UPLOAD_URL" ]; then
    echo "❌ Error registering LinkedIn upload: $REGISTER_RESPONSE"
    exit 1
  fi
  
  # Step 2: Upload Binary
  curl --fail --show-error -s -X PUT "$UPLOAD_URL" \
    -H "Authorization: Bearer $TOKEN" \
    --data-binary "@$IMAGE"
  
  echo "✅ Image uploaded. Asset ID: $ASSET"
  
  # Step 3: Create Post with Image
  PAYLOAD=$(jq -n \
    --arg author "$AUTHOR" \
    --arg text "$TEXT" \
    --arg asset "$ASSET" \
    --arg title "${TITLE:-Post Image}" \
    '{
      author: $author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: $text },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              description: { text: $title },
              media: $asset,
              title: { text: $title }
            }
          ]
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
      }
    }')
else
  echo "--- Creating text-only post on LinkedIn ---"
  PAYLOAD=$(jq -n --arg author "$AUTHOR" --arg text "$TEXT" '{
    author: $author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: $text },
        shareMediaCategory: "NONE"
      }
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  }')
fi

echo "--- Sending post request ---"
RESPONSE=$(curl -s -X POST "https://api.linkedin.com/v2/ugcPosts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restli-Protocol-Version: 2.0.0" \
  -d "$PAYLOAD")

if echo "$RESPONSE" | grep -q "id"; then
  echo "✅ Success! LinkedIn post ID: $(echo "$RESPONSE" | jq -r '.id')"
else
  echo "❌ Error creating post: $RESPONSE"
  exit 1
fi
