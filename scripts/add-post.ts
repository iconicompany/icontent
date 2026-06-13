import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, copyFileSync } from "fs";
import { basename, extname } from "path";
import { $ } from "bun";



const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gemini-2.5-flash-lite";
const BLOG_DIR = "content/ru/blog";
const AGENTS_RULES = "AGENTS.md";

function usage() {
  console.log("Usage: bun scripts/add-post.ts [--title \"Title\"] [--slug \"slug\"] [--date \"YYYY-MM-DD\"] [--post \"path/to/post.md\"] [--image \"path/to/image.png\"]");
  process.exit(1);
}

export async function addPost(options: {
  title?: string;
  slug?: string;
  date?: string;
  postFile?: string;
  imagePath?: string;
}): Promise<string> {
  const overrideTitle = options.title || "";
  const overrideSlug = options.slug || "";
  const overrideDate = options.date || "";
  const inputFile = options.postFile || "";
  const imagePath = options.imagePath || "";

  let rawContent = "";
  if (inputFile) {
    if (!existsSync(inputFile)) {
      throw new Error(`Input file not found at '${inputFile}'`);
    }
    rawContent = readFileSync(inputFile, "utf-8");
  } else {
    // Read from stdin
    if (!process.stdin.isTTY) {
      rawContent = await Bun.stdin.text();
    } else {
      throw new Error("No input file provided and no content via stdin.");
    }
  }

  if (!rawContent.trim()) {
    throw new Error("No content provided.");
  }

  // Load rules from AGENTS.md
  let rules = "";
  if (existsSync(AGENTS_RULES)) {
    const fullRules = readFileSync(AGENTS_RULES, "utf-8");
    const sectionIndex = fullRules.indexOf("## Содержание поста");
    if (sectionIndex !== -1) {
      rules = fullRules.substring(sectionIndex);
      const contactsIndex = rules.indexOf("## Контакты");
      if (contactsIndex !== -1) {
        rules = rules.substring(0, contactsIndex);
      }
    }
  }

  const today = new Date().toISOString().split("T")[0];

  console.log("--- Processing content with LLM (Formatting + Metadata) ---");
  const prompt = `You are a professional blog post editor. Your task is to take a raw draft or an existing post and format/fix it while following specific style guidelines.

RULES FROM AGENTS.MD:
${rules}

ADDITIONAL GUIDELINES:
- Use emojis for accents but moderately.
- Ensure empty lines between emoji-prefixed items.
- Ensure title, date, description, tags, authors, language are in the frontmatter.
- If frontmatter is missing, create it.
- If tags or description are weak, improve them.
- Slug must be a meaningful English slug (translated from title).
- If date is missing or generic, use today's date: ${today}.
- The output must be a JSON object.

DRAFT/POST:
${rawContent}

Output ONLY the JSON object with fields: title, description, tags (array), slug, date (YYYY-MM-DD), content (markdown body).`;

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    throw new Error(`LLM API Error: ${response.status} - ${await response.text()}`);
  }

  const json: any = await response.json();
  const metadataText = json.choices?.[0]?.message?.content;
  if (!metadataText) {
    throw new Error("LLM returned empty response");
  }

  let cleanMetadataText = metadataText.trim();
  if (cleanMetadataText.startsWith("```json")) {
    cleanMetadataText = cleanMetadataText.substring(7);
  } else if (cleanMetadataText.startsWith("```")) {
    cleanMetadataText = cleanMetadataText.substring(3);
  }
  if (cleanMetadataText.endsWith("```")) {
    cleanMetadataText = cleanMetadataText.substring(0, cleanMetadataText.length - 3);
  }
  cleanMetadataText = cleanMetadataText.trim();

  const metadata = JSON.parse(cleanMetadataText);
  let title = overrideTitle || metadata.title;
  let desc = metadata.description;
  const tagsArray = metadata.tags || [];
  let slug = overrideSlug || metadata.slug;
  let date = overrideDate || today;
  const formattedContent = metadata.content;

  let finalFilename = `${BLOG_DIR}/${slug}.md`;
  let oldFile = "";

  if (inputFile && inputFile !== finalFilename) {
    console.log(`--- Renaming/Moving: ${inputFile} -> ${finalFilename} ---`);
    oldFile = inputFile;
  }

  if (existsSync(finalFilename) && inputFile !== finalFilename) {
    console.warn(`Warning: File ${finalFilename} already exists. Appending timestamp.`);
    const timestamp = Math.floor(Date.now() / 1000);
    slug = `${slug}-${timestamp}`;
    finalFilename = `${BLOG_DIR}/${slug}.md`;
  }

  console.log("--- Generating 'Read Also' section ---");
  const tagsClean = tagsArray.join(",");
  const recommendOutput = await $`bun scripts/recommend.ts "${tagsClean}" "${slug}"`.text();
  const readAlso = recommendOutput.trim();

  console.log(`--- Writing file: ${finalFilename} ---`);
  const finalFileContent = `---
title: "${title}"
date: '${date}'
description: "${desc}"
tags: ${JSON.stringify(tagsArray)}
authors: ['slavb18']
language: 'ru'
---

${formattedContent}

---

## 📚 Читайте также

${readAlso}
`;

  mkdirSync(BLOG_DIR, { recursive: true });
  writeFileSync(finalFilename, finalFileContent, "utf-8");

  if (oldFile && existsSync(oldFile)) {
    unlinkSync(oldFile);
  }

  if (imagePath && existsSync(imagePath)) {
    console.log(`--- Using provided image: ${imagePath} ---`);
    mkdirSync("assets/blog", { recursive: true });
    copyFileSync(imagePath, `assets/blog/${slug}.png`);
  }

  // Post-processing
  await $`bun scripts/clean-symbols.ts "${finalFilename}"`;
  await $`bun scripts/add-image.ts "${finalFilename}"`;
  await $`bun scripts/translate-post.ts "${finalFilename}"`;

  console.log(`✅ Done! Post created at ${finalFilename}`);
  return finalFilename;
}

async function main() {
  const args = Bun.argv.slice(2);
  let overrideTitle = "";
  let overrideSlug = "";
  let overrideDate = "";
  let inputFile = "";
  let imagePath = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--title" && i + 1 < args.length) {
      overrideTitle = args[i + 1]!;
      i++;
    } else if ((arg === "--slug" || arg === "-s") && i + 1 < args.length) {
      overrideSlug = args[i + 1]!;
      i++;
    } else if (arg === "--date" && i + 1 < args.length) {
      overrideDate = args[i + 1]!;
      i++;
    } else if ((arg === "--post" || arg === "-p") && i + 1 < args.length) {
      inputFile = args[i + 1]!;
      i++;
    } else if ((arg === "--image" || arg === "-i") && i + 1 < args.length) {
      imagePath = args[i + 1]!;
      i++;
    } else if (!arg.startsWith("-")) {
      if (!inputFile) {
        inputFile = arg;
      } else {
        console.error(`Unknown parameter: ${arg}`);
        usage();
      }
    } else {
      console.error(`Unknown parameter: ${arg}`);
      usage();
    }
  }

  await addPost({
    title: overrideTitle,
    slug: overrideSlug,
    date: overrideDate,
    postFile: inputFile,
    imagePath
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Fatal Error:", err);
    process.exit(1);
  });
}
