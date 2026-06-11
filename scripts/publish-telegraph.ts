import { readFileSync, existsSync } from "fs";
import { marked } from "marked";

const SITE_BASE_URL = process.env.SITE_BASE_URL || "https://iconicompany.com";
const TELEGRAPH_ACCESS_TOKEN = process.env.TELEGRAPH_ACCESS_TOKEN || "";

type TelegraphNode = string | {
  tag: string;
  attrs?: Record<string, string>;
  children?: TelegraphNode[];
};

export function htmlToNodes(html: string): TelegraphNode[] {
  const nodes: TelegraphNode[] = [];
  const stack: TelegraphNode[][] = [nodes];
  
  const TAG_MAP: Record<string, string> = {
    h1: "h3",
    h2: "h3",
    h5: "h4",
    h6: "h4"
  };
  
  const ALLOWED_TAGS = new Set([
    "a", "aside", "b", "blockquote", "br", "caption", "code", "del",
    "details", "div", "em", "figcaption", "figure", "footer", "h3", "h4",
    "hr", "i", "iframe", "img", "kbd", "li", "mark", "ol", "p", "pre",
    "s", "section", "strike", "strong", "sub", "sup", "table", "td", "th",
    "thead", "tbody", "tfoot", "time", "tr", "ul", "var", "video"
  ]);

  const tagRegex = /(<([^>]+)>)/ig;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const textBetween = html.substring(lastIndex, match.index);
    if (textBetween) {
      const currentStack = stack[stack.length - 1];
      if (currentStack) {
        currentStack.push(textBetween);
      }
    }
    
    const tagToken = match[2];
    if (tagToken === undefined) continue;
    const isClosing = tagToken.startsWith("/");
    
    if (isClosing) {
      const tag = tagToken.substring(1).toLowerCase();
      const mappedTag = TAG_MAP[tag] || tag;
      if (ALLOWED_TAGS.has(mappedTag) && stack.length > 1) {
        stack.pop();
      }
    } else {
      const parts = tagToken.split(/\s+/);
      const parts0 = parts[0];
      if (parts0 !== undefined) {
        const originalTag = parts0.replace(/\/$/, "").toLowerCase();
        const isSelfClosing = tagToken.endsWith("/");
        
        const tag = TAG_MAP[originalTag] || originalTag;
        
        if (ALLOWED_TAGS.has(tag)) {
          const node: any = { tag, children: [] };
          
          // Parse attributes cleanly
          const attrRegex = /([a-zA-Z\-]+)="([^"]+)"/g;
          let attrMatch;
          const attrs: Record<string, string> = {};
          while ((attrMatch = attrRegex.exec(tagToken)) !== null) {
            const attrKey = attrMatch[1];
            const attrVal = attrMatch[2];
            if (attrKey !== undefined && attrVal !== undefined) {
              attrs[attrKey.toLowerCase()] = attrVal;
            }
          }
          
          if (tag === "a" && attrs.href) {
            node.attrs = { href: attrs.href };
          } else if (tag === "img" && attrs.src) {
            node.attrs = { src: attrs.src };
            if (attrs.alt) node.attrs.alt = attrs.alt;
          }
          
          const currentStack = stack[stack.length - 1];
          if (currentStack) {
            currentStack.push(node);
            if (!isSelfClosing && tag !== "br" && tag !== "hr" && tag !== "img") {
              stack.push(node.children);
            }
          }
        }
      }
    }
    
    lastIndex = tagRegex.lastIndex;
  }
  
  const remainingText = html.substring(lastIndex);
  if (remainingText) {
    const currentStack = stack[stack.length - 1];
    if (currentStack) {
      currentStack.push(remainingText);
    }
  }
  
  return nodes;
}

function parseMdx(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (match) {
    const fm = match[1];
    const body = match[2];
    if (fm !== undefined && body !== undefined) {
      return { frontmatter: fm, body: body.trim() };
    }
  }
  return { frontmatter: "", body: content.trim() };
}

function extractTitle(frontmatter: string): string {
  const match = frontmatter.match(/^title:\s*["']?(.*?)["']?$/m);
  if (match) {
    const title = match[1];
    if (title !== undefined) return title.trim();
  }
  return "Article";
}

export async function publishTelegraph(options: {
  accessToken: string;
  title: string;
  nodes: TelegraphNode[];
  authorName?: string;
  authorUrl?: string;
}): Promise<string> {
  const { accessToken, title, nodes, authorName = "Iconicompany", authorUrl = "https://iconicompany.com" } = options;
  if (!accessToken || !title || !nodes) {
    throw new Error("Missing required options for Telegraph publishing.");
  }

  const formData = new FormData();
  formData.append("access_token", accessToken);
  formData.append("title", title);
  formData.append("author_name", authorName);
  formData.append("author_url", authorUrl);
  formData.append("content", JSON.stringify(nodes));
  formData.append("return_content", "false");

  const response = await fetch("https://api.telegra.ph/createPage", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Telegraph API failed: ${response.status} - ${errText}`);
  }

  const json: any = await response.json();
  if (json.ok) {
    return json.result.url;
  } else {
    throw new Error(`Telegraph API error: ${JSON.stringify(json)}`);
  }
}

function usage() {
  console.log("Usage: bun scripts/publish-telegraph.ts <en-mdx-file> <ru-slug>");
  process.exit(1);
}

async function main() {
  const args = Bun.argv.slice(2);
  const enFile = args[0];
  const ruSlug = args[1];

  if (!enFile || !ruSlug) {
    usage();
    return;
  }

  if (!TELEGRAPH_ACCESS_TOKEN) {
    console.warn("TELEGRAPH_ACCESS_TOKEN is not set, skipping.");
    process.exit(0);
  }

  if (!existsSync(enFile)) {
    console.error(`Error: File not found at '${enFile}'`);
    process.exit(1);
  }

  const siteBase = SITE_BASE_URL.replace(/\/$/, "");
  const originalUrl = `${siteBase}/ru/blog/${ruSlug}`;
  const enUrl = `${siteBase}/en/blog/${ruSlug}`;

  const { frontmatter, body } = parseMdx(enFile);
  const title = extractTitle(frontmatter);

  // Parse markdown
  const htmlBody = await marked.parse(body);

  const originalLinkHtml = `<p><a href="${enUrl}">Read in English</a> | <a href="${originalUrl}">Read original in Russian</a></p>`;
  const fullHtml = `${htmlBody}\n${originalLinkHtml}`;

  const nodes = htmlToNodes(fullHtml);

  try {
    const url = await publishTelegraph({
      accessToken: TELEGRAPH_ACCESS_TOKEN,
      title,
      nodes
    });
    console.log(url);
  } catch (err: any) {
    console.error("Fatal Error:", err.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
