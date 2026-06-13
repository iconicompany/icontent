import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { cleanSymbols } from "./generate-announce";



const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gemini-2.5-flash-lite";

function usage() {
  console.log("Usage: bun scripts/translate-post.ts <path-to-post-file.md>");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  const file = args[0];
  if (!file) {
    usage();
    return;
  }
  if (!existsSync(file)) {
    console.error(`Error: File not found at '${file}'`);
    process.exit(1);
  }

  const enFile = file.replace("content/ru/", "content/en/");
  if (file === enFile) {
    console.error("Error: Input file must be in content/ru/ directory.");
    process.exit(1);
  }

  const enDir = dirname(enFile);
  mkdirSync(enDir, { recursive: true });

  console.log(`--- Translating ${file} to English ---`);
  const rawContent = readFileSync(file, "utf-8");

  const prompt = `Translate the following markdown file from Russian to English. 
Maintain all markdown formatting, frontmatter, and technical terms. 
Important: in the YAML frontmatter, use double quotes (not single quotes) for all string values such as title and description, so that apostrophes in the text do not break the YAML syntax. 
Do not add any extra comments or explanations, JUST the translated markdown content.

FILE CONTENT:
${rawContent}`;

  const response = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`LLM API Error: ${response.status} - ${errText}`);
    process.exit(1);
  }

  const json: any = await response.json();
  let translatedContent = json.choices?.[0]?.message?.content;

  if (!translatedContent) {
    console.error("Error: LLM returned empty response");
    process.exit(1);
  }

  // Remove potential markdown code blocks wrapping the response
  if (translatedContent.startsWith("```markdown")) {
    translatedContent = translatedContent.substring(11);
  } else if (translatedContent.startsWith("```")) {
    translatedContent = translatedContent.substring(3);
  }
  if (translatedContent.endsWith("```")) {
    translatedContent = translatedContent.substring(0, translatedContent.length - 3);
  }
  translatedContent = translatedContent.trim();

  // Post-processing: clean symbols
  const cleaned = cleanSymbols(translatedContent, false);
  writeFileSync(enFile, cleaned, "utf-8");

  console.log(`✅ Done! Translation created at ${enFile}`);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
