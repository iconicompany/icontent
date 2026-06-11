import { readFileSync } from "fs";

function parseYAML(frontmatter: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = frontmatter.split("\n");
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
    if (match) {
      const key = match[1];
      const val = match[2];
      if (key !== undefined && val !== undefined) {
        let value = val.trim();
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        result[key.trim()] = value;
      }
    }
  }
  return result;
}

function parseMarkdown(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const match = content.match(frontmatterRegex);
  
  let frontmatter = {};
  let body = content;

  if (match) {
    const fm = match[1];
    if (fm !== undefined) {
      frontmatter = parseYAML(fm);
      body = content.replace(frontmatterRegex, "");
    }
  }

  // Remove main header image markup (e.g. ![](...)) at the start of the body
  body = body.replace(/^!\[.*?\]\(.*?\)\r?\n/, "");

  // Remove "Читайте также" / "Read also" section
  const readAlsoRegex = /\r?\n(?:---\r?\n\s*)?##\s*(?:📚\s*)?[Чч]итайте\s+также[\s\S]*$/i;
  body = body.replace(readAlsoRegex, "").trim();

  return {
    frontmatter,
    body
  };
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  let mode = "--body";
  let file = "";

  if (args.length === 1) {
    const arg0 = args[0];
    if (arg0 !== undefined) file = arg0;
  } else if (args.length === 2) {
    const arg0 = args[0];
    const arg1 = args[1];
    if (arg0 !== undefined && arg1 !== undefined) {
      mode = arg0;
      file = arg1;
    }
  } else {
    console.error("Usage: bun scripts/extract-content.ts [--title | --description | --body] <path-to-markdown-file>");
    process.exit(1);
  }

  try {
    const { frontmatter, body } = parseMarkdown(file);
    if (mode === "--title") {
      console.log((frontmatter as any).title || "");
    } else if (mode === "--description") {
      console.log((frontmatter as any).description || "");
    } else {
      console.log(body);
    }
  } catch (error: any) {
    console.error("Error reading file:", error.message);
    process.exit(1);
  }
}
