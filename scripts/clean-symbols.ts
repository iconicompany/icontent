import { readFileSync, writeFileSync, existsSync } from "fs";
import { cleanSymbols } from "./generate-announce";

function usage() {
  console.log("Usage: bun scripts/clean-symbols.ts [-a|--announcement] <file>");
  process.exit(1);
}

function main() {
  const args = Bun.argv.slice(2);
  let stripMarkdown = false;
  let file = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "-a" || arg === "--announcement") {
      stripMarkdown = true;
    } else if (arg.startsWith("-")) {
      console.error(`Unknown parameter: ${arg}`);
      usage();
    } else {
      file = arg;
    }
  }

  if (!file) {
    usage();
  }

  if (!existsSync(file)) {
    console.error(`Error: File not found at '${file}'`);
    process.exit(1);
  }

  const raw = readFileSync(file, "utf-8");
  const cleaned = cleanSymbols(raw, stripMarkdown);
  writeFileSync(file, cleaned, "utf-8");
  console.log(`✨ Cleaned AI symbols in ${file} (Mode: ${stripMarkdown ? "Announcement" : "Normal"})`);
}

main();
