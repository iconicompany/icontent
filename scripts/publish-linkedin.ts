import { readFileSync, existsSync } from "fs";
import { basename, extname } from "path";
import { extractCleanBody, cleanSymbols, generateAnnouncement } from "./generate-announce";



const TOKEN = process.env.LINKEDIN_TOKEN;
const AUTHOR = process.env.LINKEDIN_AUTHOR;
const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://iconicompany.com";

async function uploadImage(imagePath: string, token: string, author: string): Promise<string> {
  console.log("--- Uploading image to LinkedIn ---");
  
  // Step 1: Register Upload
  const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: author,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent"
        }]
      }
    })
  });

  if (!registerResponse.ok) {
    const errText = await registerResponse.text();
    throw new Error(`Failed to register upload on LinkedIn: ${registerResponse.status} - ${errText}`);
  }

  const registerJson: any = await registerResponse.json();
  const uploadUrl = registerJson.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const asset = registerJson.value?.asset;

  if (!uploadUrl || !asset) {
    throw new Error(`Invalid register upload response: ${JSON.stringify(registerJson)}`);
  }

  // Step 2: Upload Binary
  console.log(`Uploading binary to ${uploadUrl}...`);
  const imageFile = Bun.file(imagePath);
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream"
    },
    body: imageFile
  });

  if (!uploadResponse.ok) {
    const errText = await uploadResponse.text();
    throw new Error(`Failed to upload image binary: ${uploadResponse.status} - ${errText}`);
  }

  console.log(`✅ Image uploaded. Asset ID: ${asset}`);
  return asset;
}

export async function publishLinkedIn(options: {
  text: string;
  token: string;
  author: string;
  image?: string;
  title?: string;
  articleUrl?: string;
  description?: string;
  draft?: boolean;
}): Promise<void> {
  const { text, token, author, image, title, articleUrl, description, draft = false } = options;

  if (!token || !author || !text) {
    throw new Error("Missing required options for LinkedIn publishing.");
  }

  const lifecycleState = draft ? "DRAFT" : "PUBLISHED";
  let payload: any = {
    author: author,
    lifecycleState: lifecycleState,
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  };

  if (image && existsSync(image)) {
    const assetUrn = await uploadImage(image, token, author);
    payload.specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: text },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            description: { text: title || "Post Image" },
            media: assetUrn,
            title: { text: title || "Post Image" }
          }
        ]
      }
    };
  } else if (articleUrl) {
    console.log("--- Creating article post on LinkedIn ---");
    const mediaItem: any = {
      status: "READY",
      originalUrl: articleUrl,
      title: { text: title || "Article" }
    };
    if (description) {
      mediaItem.description = { text: description };
    }
    payload.specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: text },
        shareMediaCategory: "ARTICLE",
        media: [mediaItem]
      }
    };
  } else {
    console.log("--- Creating text-only post on LinkedIn ---");
    payload.specificContent = {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: text },
        shareMediaCategory: "NONE"
      }
    };
  }

  console.log("--- Sending post request ---");
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0"
    },
    body: JSON.stringify(payload)
  });

  const resText = await response.text();
  if (response.ok) {
    const resJson = JSON.parse(resText);
    console.log(`✅ Success! LinkedIn post ID: ${resJson.id}`);
  } else {
    throw new Error(`LinkedIn API returned HTTP ${response.status}: ${resText}`);
  }
}

function usage() {
  console.log("Usage: bun scripts/publish-linkedin.ts [--message \"path/to/message.txt\"] [--image \"path/to/image.png\"] [--title \"Title\"] [--article \"URL\"] [--description \"Description\"] [--draft] [--post \"path/to/post.md\"] [--mode announce|regular] [--announce] [--regular]");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  
  let messageFile = "";
  let image = "";
  let title = "";
  let articleUrl = "";
  let description = "";
  let draft = false;
  let postFile = "";
  let mode: "viral" | "regular" = "viral";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--message" && i + 1 < args.length) {
      messageFile = args[i + 1]!;
      i++;
    } else if (arg === "--image" && i + 1 < args.length) {
      image = args[i + 1]!;
      i++;
    } else if (arg === "--title" && i + 1 < args.length) {
      title = args[i + 1]!;
      i++;
    } else if (arg === "--article" && i + 1 < args.length) {
      articleUrl = args[i + 1]!;
      i++;
    } else if (arg === "--description" && i + 1 < args.length) {
      description = args[i + 1]!;
      i++;
    } else if (arg === "--draft") {
      draft = true;
    } else if (arg === "--post" && i + 1 < args.length) {
      postFile = args[i + 1]!;
      i++;
    } else if (arg === "--mode" && i + 1 < args.length) {
      const parsedMode = args[i + 1];
      if (parsedMode !== undefined) {
        mode = (parsedMode === "announce" || parsedMode === "viral") ? "viral" : "regular";
      }
      i++;
    } else if (arg === "--announce" || arg === "--viral") {
      mode = "viral";
    } else if (arg === "--regular") {
      mode = "regular";
    } else {
      console.error(`Unknown parameter: ${arg}`);
      usage();
    }
  }

  if (!TOKEN || !AUTHOR) {
    console.error("Error: LINKEDIN_TOKEN and LINKEDIN_AUTHOR environment variables must be set.");
    process.exit(1);
  }

  if (!AUTHOR.startsWith("urn:li:")) {
    console.error("Error: LINKEDIN_AUTHOR must be a full URN (e.g., urn:li:person:ABC or urn:li:organization:123).");
    process.exit(1);
  }

  let text = "";

  if (postFile) {
    if (!existsSync(postFile)) {
      console.error(`Error: Post file not found at '${postFile}'`);
      process.exit(1);
    }

    console.log(`--- Parsing markdown post file: ${postFile} (Mode: ${mode}) ---`);
    try {
      const lines = extractCleanBody(postFile).split("\n");
      const firstLine = lines[0];
      if (firstLine !== undefined) {
        const parsedTitle = firstLine.replace(/^#+\s*/, "").trim();
        title = title || parsedTitle;
      }
    } catch {}

    const isRussian = postFile.includes("content/ru/");
    const base = basename(postFile, extname(postFile));
    
    if (mode === "viral") {
      articleUrl = articleUrl || `${SITE_BASE_URL}/blog/${base}`;
    } else {
      articleUrl = ""; // Text post
    }

    console.log("Generating post message via LLM...");
    const rawContent = await generateAnnouncement(readFileSync(postFile, "utf-8"), isRussian, mode);
    text = cleanSymbols(rawContent, true);
  } else if (messageFile) {
    if (!existsSync(messageFile)) {
      console.error(`Error: Message file not found at '${messageFile}'`);
      process.exit(1);
    }
    text = readFileSync(messageFile, "utf-8");
  } else {
    console.error("Error: Either --message or --post must be provided.");
    usage();
  }

  try {
    await publishLinkedIn({ text, token: TOKEN, author: AUTHOR, image, title, articleUrl, description, draft });
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
