import { readFileSync, existsSync } from "fs";



// Recursively find key "token" in max response JSON
function findToken(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (obj.token) return obj.token;
  for (const key in obj) {
    const val = findToken(obj[key]);
    if (val) return val;
  }
  return null;
}

export async function publishMax(options: {
  message: string;
  imagePath?: string;
  chatId: string;
  botToken: string;
}): Promise<void> {
  const { message, imagePath, chatId, botToken } = options;
  if (!message || !chatId || !botToken) {
    throw new Error("Missing required options for Max publishing.");
  }

  let attachments: any[] = [];

  // 1. Handle Image Upload if provided
  if (imagePath && existsSync(imagePath)) {
    console.log("Uploading image to Max...");
    
    // Get Upload URL
    const uploadInitResponse = await fetch("https://platform-api.max.ru/uploads?type=image", {
      method: "POST",
      headers: {
        "Authorization": botToken
      }
    });

    if (!uploadInitResponse.ok) {
      const errText = await uploadInitResponse.text();
      throw new Error(`Failed to get upload URL from Max: ${uploadInitResponse.status} - ${errText}`);
    }

    const uploadInitJson: any = await uploadInitResponse.json();
    const uploadUrl = uploadInitJson.url;

    if (!uploadUrl) {
      throw new Error(`Failed to extract upload URL from Max: ${JSON.stringify(uploadInitJson)}`);
    }

    // Upload File
    const formData = new FormData();
    formData.append("data", Bun.file(imagePath));

    const uploadFileResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": botToken
      },
      body: formData
    });

    if (!uploadFileResponse.ok) {
      const errText = await uploadFileResponse.text();
      throw new Error(`Failed to upload file to Max: ${uploadFileResponse.status} - ${errText}`);
    }

    const uploadFileJson = await uploadFileResponse.json();
    const token = findToken(uploadFileJson);

    if (!token) {
      throw new Error(`Failed to extract token from Max upload response: ${JSON.stringify(uploadFileJson)}`);
    }

    attachments = [{ type: "image", payload: { token } }];
  }

  // 2. Send Message
  console.log("Sending message to Max...");
  const response = await fetch(`https://platform-api.max.ru/messages?chat_id=${chatId}`, {
    method: "POST",
    headers: {
      "Authorization": botToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: message,
      attachments,
      format: "html"
    })
  });

  const resText = await response.text();
  if (response.ok) {
    console.log("Successfully published to Max.");
  } else {
    throw new Error(`Max API returned HTTP ${response.status}: ${resText}`);
  }
}

function usage() {
  console.log("Usage: bun scripts/publish-max.ts --message <message-file> [--image <image-path>] [--chat-id <chat-id>] [--bot-token <bot-token>]");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  let messageFile = "";
  let imagePath = "";
  let chatId = process.env.MAX_CHANNEL_ID || "";
  let botToken = process.env.MAX_BOT_TOKEN || "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--message" && i + 1 < args.length) {
      messageFile = args[i + 1]!;
      i++;
    } else if (arg === "--image" && i + 1 < args.length) {
      imagePath = args[i + 1]!;
      i++;
    } else if (arg === "--chat-id" && i + 1 < args.length) {
      chatId = args[i + 1]!;
      i++;
    } else if (arg === "--bot-token" && i + 1 < args.length) {
      botToken = args[i + 1]!;
      i++;
    } else {
      console.error(`Unknown parameter: ${arg}`);
      usage();
    }
  }

  if (!messageFile || !existsSync(messageFile)) {
    console.error(`Error: Message file not found at '${messageFile}'`);
    process.exit(1);
  }

  const message = readFileSync(messageFile, "utf-8");
  try {
    await publishMax({ message, imagePath, chatId, botToken });
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
