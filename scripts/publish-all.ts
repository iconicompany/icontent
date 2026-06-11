import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { basename, extname, dirname, join } from "path";
import { spawn } from "child_process";
import { generateAnnouncement, cleanSymbols, extractCleanBody } from "./generate-announce";
import { publishTelegram } from "./publish-telegram";
import { publishLinkedIn } from "./publish-linkedin";
import { publishMax } from "./publish-max";
import { publishThreads } from "./publish-threads";
import { publishX } from "./publish-x";
import { publishMedium } from "./publish-medium";
import { publishTelegraph, htmlToNodes } from "./publish-telegraph";
import { marked } from "marked";



// Env configuration
const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://iconicompany.com";

function usage() {
  console.log("Usage: bun scripts/publish-all.ts --post <path-to-md-file> [--mode viral|regular] [--edit] [--draft] [--exclude <channels>]");
  process.exit(1);
}

async function editFileInteractive(filePath: string) {
  console.log(`\n📝 Review and edit announcement file: ${filePath}`);
  const editor = process.env.EDITOR || "nano";
  try {
    const child = spawn(editor, [filePath], { stdio: "inherit" });
    await new Promise((resolve) => child.on("exit", resolve));
  } catch (e) {
    console.log(`Could not launch editor '${editor}'. Please modify the file manually.`);
  }

  console.log("\nPress ENTER when you are ready to proceed with publishing...");
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });
}

async function main() {
  const args = Bun.argv.slice(2);
  let postFile = "";
  let mode: "viral" | "regular" = "viral";
  let edit = false;
  let draft = false;
  let excludeList: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--post" && i + 1 < args.length) {
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
    } else if (arg === "--edit") {
      edit = true;
    } else if (arg === "--draft") {
      draft = true;
    } else if (arg === "--exclude" && i + 1 < args.length) {
      const parsedExclude = args[i + 1];
      if (parsedExclude !== undefined) {
        excludeList = parsedExclude.toLowerCase().split(",").map(c => c.trim());
      }
      i++;
    } else {
      console.error(`Unknown parameter: ${arg}`);
      usage();
    }
  }

  if (!postFile) {
    console.error("Error: --post is required.");
    usage();
  }

  if (!existsSync(postFile)) {
    console.error(`Error: Post file not found at '${postFile}'`);
    process.exit(1);
  }

  // Detect paths and slug
  const fileExt = extname(postFile);
  const slug = basename(postFile, fileExt);

  // Set up Russian / English file paths
  let ruFile = "";
  let enFile = "";

  if (postFile.includes("content/ru/")) {
    ruFile = postFile;
    const potentialEn = postFile.replace("content/ru/", "content/en/");
    if (existsSync(potentialEn)) {
      enFile = potentialEn;
    }
  } else if (postFile.includes("content/en/")) {
    enFile = postFile;
    const potentialRu = postFile.replace("content/en/", "content/ru/");
    if (existsSync(potentialRu)) {
      ruFile = potentialRu;
    }
  } else {
    // Default to the provided file as RU
    ruFile = postFile;
  }

  const ruAnnounceDir = join(dirname(dirname(ruFile)), "announce");
  const ruAnnounceFile = join(ruAnnounceDir, `${slug}.txt`);
  let enAnnounceFile = "";

  if (enFile) {
    const enAnnounceDir = join(dirname(dirname(enFile)), "announce");
    enAnnounceFile = join(enAnnounceDir, `${slug}.txt`);
  }

  console.log("--- Generating Announcements ---");

  let ruText = "";
  if (ruFile) {
    mkdirSync(ruAnnounceDir, { recursive: true });
    if (existsSync(ruAnnounceFile)) {
      console.log(`Using existing Russian announcement: ${ruAnnounceFile}`);
      ruText = readFileSync(ruAnnounceFile, "utf-8");
    } else {
      console.log(`Generating Russian announcement (Mode: ${mode})...`);
      const rawRu = await generateAnnouncement(readFileSync(ruFile, "utf-8"), true, mode);
      ruText = cleanSymbols(rawRu, true);
      // Append URL for viral mode
      const postUrl = `${SITE_BASE_URL}/ru/blog/${slug}`;
      const finalText = mode === "viral" ? `${ruText}\n\n👉 ${postUrl}\n` : ruText;
      writeFileSync(ruAnnounceFile, finalText, "utf-8");
      console.log(`Saved Russian announcement to: ${ruAnnounceFile}`);
      ruText = finalText;
    }
  }

  let enText = "";
  if (enFile) {
    const enAnnounceDir = dirname(enAnnounceFile);
    mkdirSync(enAnnounceDir, { recursive: true });
    if (existsSync(enAnnounceFile)) {
      console.log(`Using existing English announcement: ${enAnnounceFile}`);
      enText = readFileSync(enAnnounceFile, "utf-8");
    } else {
      console.log(`Generating English announcement (Mode: ${mode})...`);
      const rawEn = await generateAnnouncement(readFileSync(enFile, "utf-8"), false, mode);
      enText = cleanSymbols(rawEn, true);
      // Append URL for viral mode
      const postUrl = `${SITE_BASE_URL}/en/blog/${slug}`;
      const finalText = mode === "viral" ? `${enText}\n\n👉 ${postUrl}\n` : enText;
      writeFileSync(enAnnounceFile, finalText, "utf-8");
      console.log(`Saved English announcement to: ${enAnnounceFile}`);
      enText = finalText;
    }
  }

  // Interactive review if requested
  if (edit) {
    if (ruFile) {
      await editFileInteractive(ruAnnounceFile);
    }
    if (enFile) {
      await editFileInteractive(enAnnounceFile);
    }
  }

  // Load final edited texts
  if (ruFile) ruText = readFileSync(ruAnnounceFile, "utf-8");
  if (enFile) enText = readFileSync(enAnnounceFile, "utf-8");

  // Title extraction for LinkedIn/Medium
  let ruTitle = "";
  if (ruFile) {
    try {
      const lines = extractCleanBody(ruFile).split("\n");
      const firstLine = lines[0];
      if (firstLine !== undefined) {
        ruTitle = firstLine.replace(/^#+\s*/, "").trim();
      }
    } catch { }
  }

  const postImage = `assets/blog/${slug}.png`;
  const hasImage = existsSync(postImage);

  console.log("\n--- Publishing Announcements ---");

  const skip = (channel: string) => excludeList.includes(channel) || excludeList.includes("all");

  // 1. Telegram
  if (!skip("telegram")) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const ruChatId = process.env.TELEGRAM_CHANNEL_ID;
    const enChatId = process.env.TELEGRAM_ENGLISH_CHANNEL_ID;

    if (botToken) {
      if (ruFile && ruChatId) {
        console.log("Publishing Russian announcement to Telegram...");
        try {
          await publishTelegram({
            message: ruText,
            imagePath: hasImage ? postImage : undefined,
            chatId: ruChatId,
            botToken
          });
        } catch (err: any) {
          console.error("❌ Telegram RU publish error:", err.message);
        }
      }
      if (enFile && enChatId) {
        console.log("Publishing English announcement to Telegram...");
        try {
          await publishTelegram({
            message: enText,
            imagePath: hasImage ? postImage : undefined,
            chatId: enChatId,
            botToken
          });
        } catch (err: any) {
          console.error("❌ Telegram EN publish error:", err.message);
        }
      }
    }
  }

  // 2. LinkedIn (Uses our newly created publish-linkedin.ts)
  if (!skip("linkedin")) {
    const token = process.env.LINKEDIN_TOKEN;
    const author = process.env.LINKEDIN_AUTHOR;

    if (token && author && ruFile) {
      console.log("Publishing announcement to LinkedIn...");
      const articleUrl = `${SITE_BASE_URL}/ru/blog/${slug}`;
      try {
        await publishLinkedIn({
          text: ruText,
          token,
          author,
          image: hasImage ? postImage : undefined,
          title: ruTitle,
          articleUrl: mode === "viral" ? articleUrl : undefined,
          draft
        });
      } catch (err: any) {
        console.error("❌ LinkedIn publish error:", err.message);
      }
    }
  }

  // 3. Max
  if (!skip("max")) {
    const maxToken = process.env.MAX_BOT_TOKEN;
    const maxChatId = process.env.MAX_CHANNEL_ID;

    if (maxToken && maxChatId && ruFile) {
      console.log("Publishing announcement to Max...");
      try {
        await publishMax({
          message: ruText,
          imagePath: hasImage ? postImage : undefined,
          chatId: maxChatId,
          botToken: maxToken
        });
      } catch (err: any) {
        console.error("❌ Max publish error:", err.message);
      }
    }
  }

  // 4. Threads
  if (!skip("threads")) {
    const threadsToken = process.env.THREADS_TOKEN;
    const threadsUserId = process.env.THREADS_USER_ID;
    const threadsLang = process.env.THREADS_LANG || "ru";

    if (threadsToken && threadsUserId) {
      console.log("Publishing announcement to Threads...");
      const message = threadsLang === "en" ? enText : ruText;
      if (message) {
        try {
          await publishThreads({
            message,
            token: threadsToken,
            userId: threadsUserId
          });
        } catch (err: any) {
          console.error("❌ Threads publish error:", err.message);
        }
      }
    }
  }

  // 5. X (Twitter)
  if (!skip("x")) {
    const xToken = process.env.X_TOKEN;

    if (xToken && enText) {
      console.log("Publishing English announcement to X...");
      try {
        await publishX({
          text: enText,
          token: xToken
        });
      } catch (err: any) {
        console.error("❌ X publish error:", err.message);
      }
    }
  }

  // 6. Medium
  if (!skip("medium")) {
    const mediumToken = process.env.MEDIUM_TOKEN;
    const mediumAuthorId = process.env.MEDIUM_AUTHOR_ID;

    if (mediumToken && mediumAuthorId && ruText) {
      console.log("Publishing Russian article to Medium...");
      try {
        await publishMedium({
          title: ruTitle || "New Announcement",
          content: ruText,
          canonicalUrl: `${SITE_BASE_URL}/ru/blog/${slug}`,
          token: mediumToken,
          authorId: mediumAuthorId
        });
      } catch (err: any) {
        console.error("❌ Medium publish error:", err.message);
      }
    }
  }

  // 7. Telegraph
  if (!skip("telegraph")) {
    const telegraphToken = process.env.TELEGRAPH_ACCESS_TOKEN;

    if (telegraphToken && enFile) {
      console.log("Publishing English Article to Telegraph...");
      try {
        const content = readFileSync(enFile, "utf-8");
        const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
        const fm = match ? match[1] : "";
        const frontmatter = fm !== undefined ? fm : "";
        const b = match ? match[2] : "";
        const body = b !== undefined ? b.trim() : content.trim();
        const titleMatch = frontmatter.match(/^title:\s*["']?(.*?)["']?$/m);
        const titleGroup = titleMatch ? titleMatch[1] : undefined;
        const title = titleGroup !== undefined ? titleGroup.trim() : "Article";

        const htmlBody = await marked.parse(body);
        const siteBase = SITE_BASE_URL.replace(/\/$/, "");
        const originalUrl = `${siteBase}/ru/blog/${slug}`;
        const enUrl = `${siteBase}/en/blog/${slug}`;
        const originalLinkHtml = `<p><a href="${enUrl}">Read in English</a> | <a href="${originalUrl}">Read original in Russian</a></p>`;
        const fullHtml = `${htmlBody}\n${originalLinkHtml}`;
        const nodes = htmlToNodes(fullHtml);

        const url = await publishTelegraph({
          accessToken: telegraphToken,
          title,
          nodes
        });
        console.log(`✅ Success! Published to Telegraph: ${url}`);
      } catch (err: any) {
        console.error("❌ Telegraph publication failed:", err.message);
      }
    }
  }

  console.log("\n🚀 All done!");
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
