import { test, expect } from "bun:test";
import { existsSync } from "fs";

test("all rewritten TS scripts exist in the scripts directory", () => {
  const tsScripts = [
    "scripts/generate-announce.ts",
    "scripts/publish-linkedin.ts",
    "scripts/publish-telegram.ts",
    "scripts/publish-max.ts",
    "scripts/translate-post.ts",
    "scripts/clean-symbols.ts",
    "scripts/add-image.ts",
    "scripts/add-post.ts",
    "scripts/sync-content.ts",
    "scripts/publish-all.ts"
  ];
  for (const script of tsScripts) {
    expect(existsSync(script)).toBe(true);
  }
});
