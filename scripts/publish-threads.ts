import { readFileSync, existsSync } from "fs";



export async function publishThreads(options: { message: string; token: string; userId: string }): Promise<void> {
  const { message, token, userId } = options;
  if (!message || !token || !userId) {
    throw new Error("Missing required options for Threads publishing (message, token, userId).");
  }

  const creationResponse = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ media_type: "TEXT", text: message })
  });

  const creationJson: any = await creationResponse.json();
  const creationId = creationJson.id;

  if (!creationId) {
    throw new Error(`Failed to create Threads container: ${JSON.stringify(creationJson)}`);
  }

  const publishResponse = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ creation_id: creationId })
  });

  if (!publishResponse.ok) {
    const errText = await publishResponse.text();
    throw new Error(`Failed to publish Threads container: ${publishResponse.status} - ${errText}`);
  }

  console.log("✅ Success! Published to Threads.");
}

function usage() {
  console.log("Usage: bun scripts/publish-threads.ts --message <message-file> [--token <threads-token>] [--user-id <user-id>]");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  let messageFile = "";
  let token = process.env.THREADS_TOKEN || "";
  let userId = process.env.THREADS_USER_ID || "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--message" && i + 1 < args.length) {
      messageFile = args[i + 1]!;
      i++;
    } else if (arg === "--token" && i + 1 < args.length) {
      token = args[i + 1]!;
      i++;
    } else if (arg === "--user-id" && i + 1 < args.length) {
      userId = args[i + 1]!;
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
    await publishThreads({ message, token, userId });
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
