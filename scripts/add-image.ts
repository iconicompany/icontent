import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { basename, extname } from "path";



const API_BASE = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL_TEXT = process.env.OPENAI_MODEL || "gemini-2.5-flash-lite";
const MODEL_IMAGE = "gemini-2.5-flash-image";

function usage() {
  console.log("Usage: bun scripts/add-image.ts <path-to-post-file.md>");
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

  const slug = basename(file, extname(file));
  const imageDir = "assets/blog";
  mkdirSync(imageDir, { recursive: true });
  const imageFile = `${imageDir}/${slug}.png`;

  // Move existing local image if present
  if (existsSync(`${slug}.png`)) {
    console.log(`ℹ️ Found local ${slug}.png. Moving to ${imageFile}.`);
    renameSync(`${slug}.png`, imageFile);
  }

  if (existsSync(imageFile)) {
    console.log(`ℹ️ Image ${imageFile} already exists. Skipping generation.`);
  } else {
    console.log(`--- Generating image prompt for ${file} ---`);
    const fileContent = readFileSync(file, "utf-8");

    const promptText = `Based on the following blog post, create a descriptive prompt for an image generation AI (like Midjourney or DALL-E) that would serve as a great header image. The prompt should be in English, visual, and conceptual.

POST CONTENT:
${fileContent}

Output ONLY the image prompt text.`;

    const chatResponse = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_TEXT,
        messages: [{ role: "user", content: promptText }]
      })
    });

    if (!chatResponse.ok) {
      console.error(`Error generating image prompt: ${chatResponse.status} - ${await chatResponse.text()}`);
      process.exit(1);
    }

    const chatJson: any = await chatResponse.json();
    const imagePrompt = chatJson.choices?.[0]?.message?.content?.trim();

    if (!imagePrompt) {
      console.error("Error: Received empty image prompt from LLM");
      process.exit(1);
    }

    console.log(`Prompt: ${imagePrompt}`);
    console.log("--- Generating image ---");

    const generationPrompt = `${imagePrompt} (edge-to-edge, cinematic, no borders, no padding, fill entire frame)`;

    const genResponse = await fetch(`${API_BASE}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_IMAGE,
        prompt: generationPrompt,
        aspect_ratio: "16:9",
        n: 1
      })
    });

    if (!genResponse.ok) {
      console.error(`Error generating image: ${genResponse.status} - ${await genResponse.text()}`);
      process.exit(1);
    }

    const genJson: any = await genResponse.json();
    const b64 = genJson.data?.[0]?.b64_json;

    if (!b64) {
      console.error(`Error: Failed to retrieve image data. Response: ${JSON.stringify(genJson)}`);
      process.exit(1);
    }

    const buffer = Buffer.from(b64, "base64");
    writeFileSync(imageFile, buffer);
    console.log(`✅ Image saved as ${imageFile}`);
  }

  // Insert image reference into markdown file
  let content = readFileSync(file, "utf-8");
  const relativeImageRef = `![Title](../../../assets/blog/${slug}.png)`;

  if (content.includes(`(../../../assets/blog/${slug}.png)`)) {
    console.log("ℹ️ Image reference already exists in file.");
  } else {
    // Look for YAML frontmatter ending block and insert
    const frontmatterRegex = /^(---\r?\n[\s\S]*?\r?\n---)(\r?\n)/;
    if (frontmatterRegex.test(content)) {
      content = content.replace(frontmatterRegex, `$1$2$2${relativeImageRef}$2`);
      writeFileSync(file, content, "utf-8");
      console.log(`✅ Image reference inserted into ${file}`);
    } else {
      console.log("⚠️ Could not detect YAML frontmatter to insert image reference.");
    }
  }
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
