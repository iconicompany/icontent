import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename, extname } from "path";

// Prompt Library
interface PromptSet {
  ru: string;
  en: string;
}

export const PROMPTS = {
  viral: {
    ru: "Напиши вирусный пост по мотивам этой статьи. Весь текст должен быть строго до 800 символов (это жесткое ограничение). Структура: 1) Мощный крючок — первая строка, которая цепляет (провокационный вопрос или факт). 2) История или инсайт из 2-3 коротких абзацев (каждый абзац — 1-2 предложения, пустая строка между абзацами). 3) Главный вывод или призыв к действию. Не используй хэштеги. Пиши живым разговорным языком, избегай корпоративных клише. Не используй markdown-разметку: никаких **, *, _, #. Добавь 2-3 эмодзи по смыслу. Не добавляй ссылку — она будет добавлена автоматически. Отвечай только текстом поста, без пояснений и кавычек.",
    en: "Write a viral post based on this article. Keep the entire post strictly under 500 characters (including spaces, emojis) - this is a hard limit for Threads and X. Structure: 1) A powerful hook - the first line that grabs attention. 2) 1-2 sentences of key insight. 3) One clear takeaway or call to action. No hashtags. Write in a lively conversational style, avoid corporate clichés. Do not use markdown formatting: no **, *, _, #. Add 1-2 relevant emojis. Do not add a URL - it will be appended automatically. Reply with only the post text, no explanations or quotes."
  },
  regular: {
    ru: "Напиши развернутый пост по мотивам этой статьи. Весь текст должен быть строго до 3000 символов (это жесткое ограничение). Пиши живым, но профессиональным языком, избегай корпоративных клише. Структурируй текст с помощью абзацев, списков или эмодзи, чтобы его было удобно читать. Не используй markdown-разметку (никаких **, *, #). Не используй хэштеги. Не добавляй ссылку — она будет добавлена автоматически. Отвечай только текстом поста, без пояснений и кавычек.",
    en: "Write an in-depth post based on this article. Keep the entire post strictly under 3000 characters. Write in a lively professional style, avoid corporate clichés. Structure the text with paragraphs, bullet points, or emojis for readability. Do not use markdown formatting (no **, *, #). No hashtags. Do not add a URL - it will be appended automatically. Reply with only the post text, no explanations or quotes."
  }
} as const;

// Clean up common AI symbols and "smart" characters (equivalent to clean-symbols.sh)
export function cleanSymbols(text: string, stripMarkdown: boolean): string {
  let cleaned = text
    .replace(/•/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/×/g, "x")
    .replace(/°/g, "o");

  // Fix potential AI block leaks
  cleaned = cleaned.replace(/^```markdown/gm, "").replace(/^```/gm, "");

  if (stripMarkdown) {
    cleaned = cleaned
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/__/g, "")
      .replace(/^[ \t]*#+[ \t]*/gm, "")
      .replace(/^[ \t]*-[ \t]*/gm, "- ");
  }

  // Trim trailing whitespace on each line
  cleaned = cleaned.split("\n").map(line => line.trimEnd()).join("\n");
  return cleaned.trim();
}

export async function generateAnnouncement(fileContent: string, isRussian: boolean, promptType: "viral" | "regular"): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment.");
  }

  const promptSet = PROMPTS[promptType];
  const prompt = isRussian ? promptSet.ru : promptSet.en;

  const response = await fetch("https://litellm01.icncd.ru/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: fileContent
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LiteLLM API call failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const json: any = await response.json();
  const choice = json.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error("LiteLLM returned empty completion choice.");
  }

  return choice.message.content.trim();
}

export function extractCleanBody(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
  const body = content.replace(frontmatterRegex, "");

  // Remove leading whitespace/newlines
  let cleaned = body.trimStart();

  // Remove main header image markup (e.g. ![](...)) at the start of the body
  cleaned = cleaned.replace(/^!\[.*?\]\(.*?\)\r?\n?/, "").trimStart();

  // Remove "Читайте также" / "Read also" section
  const readAlsoRegex = /\r?\n(?:---\r?\n\s*)?##\s*(?:📚\s*)?[Чч]итайте\s+также[\s\S]*$/i;
  cleaned = cleaned.replace(readAlsoRegex, "").trim();

  return cleaned;
}

async function main() {
  const args = Bun.argv.slice(2);
  let mode: "viral" | "regular" = "viral";
  let file = "";
  let outputFile = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--mode" && i + 1 < args.length) {
      const parsedMode = args[i + 1];
      if (parsedMode !== undefined) {
        mode = (parsedMode === "announce" || parsedMode === "viral") ? "viral" : "regular";
      }
      i++;
    } else if (arg === "--announce" || arg === "--viral") {
      mode = "viral";
    } else if (arg === "--regular") {
      mode = "regular";
    } else if (arg.startsWith("-")) {
      console.error(`Unknown parameter: ${arg}`);
      process.exit(1);
    } else {
      if (!file) {
        file = arg;
      } else if (!outputFile) {
        outputFile = arg;
      } else {
        console.error("Too many arguments");
        process.exit(1);
      }
    }
  }

  if (!file) {
    console.error("Usage: bun scripts/generate-announce.ts [--mode viral|regular] [--viral] [--regular] <path-to-md-file> [output-file]");
    process.exit(1);
  }

  if (!existsSync(file)) {
    console.error(`Error: File not found at '${file}'`);
    process.exit(1);
  }

  const fileExt = extname(file);
  const base = basename(file, fileExt);
  const finalOutput = outputFile || file.replace(fileExt, ".txt");

  const isRussian = file.includes("content/ru/");
  const siteBaseUrl = process.env.SITE_BASE_URL || "https://iconicompany.com";
  const lang = isRussian ? "ru" : "en";
  const postUrl = `${siteBaseUrl}/${lang}/blog/${base}`;

  console.log(`Generating AI post (Mode: ${mode}) for: ${file}...`);
  try {
    const rawContent = await generateAnnouncement(readFileSync(file, "utf-8"), isRussian, mode);
    const cleaned = cleanSymbols(rawContent, true);
    
    // For regular mode, we don't necessarily append the post link unless needed, 
    // but we can append it at the bottom to remain helpful, or write just the text.
    // Let's write the text with link for viral, and clean text for regular.
    const finalText = mode === "viral" ? `${cleaned}\n\n👉 ${postUrl}\n` : cleaned;
    writeFileSync(finalOutput, finalText, "utf-8");
    console.log(`Generated ${finalOutput}`);
  } catch (err: any) {
    console.error(`Error generating post: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
