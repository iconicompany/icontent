import { readFileSync, existsSync } from "fs";



export async function publishTelegram(options: {
  message: string;
  imagePath?: string;
  chatId: string;
  botToken: string;
  parseMode?: string;
}): Promise<void> {
  const { message, imagePath, chatId, botToken, parseMode = "HTML" } = options;
  if (!botToken || !chatId || !message) {
    throw new Error("Missing required options for Telegram publishing.");
  }

  let response: Response;

  if (imagePath && existsSync(imagePath)) {
    console.log("Sending photo to Telegram...");
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("photo", Bun.file(imagePath));
    formData.append("caption", message);
    formData.append("parse_mode", parseMode);

    response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      body: formData
    });
  } else {
    console.log("Sending text message to Telegram...");
    response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: false
      })
    });
  }

  const resText = await response.text();
  if (response.ok) {
    console.log("Successfully published to Telegram.");
  } else {
    throw new Error(`Telegram API returned HTTP ${response.status}: ${resText}`);
  }
}

function usage() {
  console.log("Usage: bun scripts/publish-telegram.ts --message <message-file> [--image <image-path>] [--chat-id <chat-id>] [--bot-token <bot-token>] [--parse-mode <parse-mode>]");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  let messageFile = "";
  let imagePath = "";
  let chatId = process.env.TELEGRAM_CHANNEL_ID || "";
  let botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  let parseMode = "HTML";

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
    } else if (arg === "--parse-mode" && i + 1 < args.length) {
      parseMode = args[i + 1]!;
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
    await publishTelegram({ message, imagePath, chatId, botToken, parseMode });
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
