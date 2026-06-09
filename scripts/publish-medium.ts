import { readFileSync, existsSync } from "fs";



export async function publishMedium(options: {
  title: string;
  content: string;
  canonicalUrl: string;
  token: string;
  authorId: string;
}): Promise<void> {
  const { title, content, canonicalUrl, token, authorId } = options;
  if (!title || !content || !canonicalUrl || !token || !authorId) {
    throw new Error("Missing required options for Medium publishing.");
  }

  const response = await fetch(`https://api.medium.com/v1/users/${authorId}/posts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      contentFormat: "markdown",
      content,
      canonicalUrl,
      publishStatus: "public"
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to publish to Medium: ${response.status} - ${errText}`);
  }

  console.log("✅ Success! Published to Medium.");
}

function usage() {
  console.log("Usage: bun scripts/publish-medium.ts --message <message-file> --title <title> --canonical-url <url> [--token <medium-token>] [--author-id <author-id>]");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  let messageFile = "";
  let title = "";
  let canonicalUrl = "";
  let token = process.env.MEDIUM_TOKEN || "";
  let authorId = process.env.MEDIUM_AUTHOR_ID || "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--message" && i + 1 < args.length) {
      messageFile = args[i + 1]!;
      i++;
    } else if (arg === "--title" && i + 1 < args.length) {
      title = args[i + 1]!;
      i++;
    } else if (arg === "--canonical-url" && i + 1 < args.length) {
      canonicalUrl = args[i + 1]!;
      i++;
    } else if (arg === "--token" && i + 1 < args.length) {
      token = args[i + 1]!;
      i++;
    } else if (arg === "--author-id" && i + 1 < args.length) {
      authorId = args[i + 1]!;
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

  if (!title || !canonicalUrl) {
    console.error("Error: --title and --canonical-url are required.");
    usage();
  }

  const content = readFileSync(messageFile, "utf-8");
  try {
    await publishMedium({ title, content, canonicalUrl, token, authorId });
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
