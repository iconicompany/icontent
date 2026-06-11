import { readFileSync, existsSync } from "fs";



export async function publishX(options: { text: string; token: string }): Promise<void> {
  const { text, token } = options;
  if (!text || !token) {
    throw new Error("Missing required options for X publishing (text, token).");
  }

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to publish to X: ${response.status} - ${errText}`);
  }

  console.log("✅ Success! Published to X.");
}

function usage() {
  console.log("Usage: bun scripts/publish-x.ts --message <message-file> [--token <x-token>]");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  let messageFile = "";
  let token = process.env.X_TOKEN || "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--message" && i + 1 < args.length) {
      messageFile = args[i + 1]!;
      i++;
    } else if (arg === "--token" && i + 1 < args.length) {
      token = args[i + 1]!;
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

  const text = readFileSync(messageFile, "utf-8");
  try {
    await publishX({ text, token });
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
