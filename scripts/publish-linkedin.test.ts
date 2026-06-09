import { test, expect } from "bun:test";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { extractCleanBody } from "./generate-announce";

test("LinkedIn Parser handles title extraction from markdown headers", () => {
  const dummyMd = `---
title: "AI and The Future of Coding"
description: "Why loop engineering is taking over"
---

# AI and The Future of Coding

This is some body content.
`;
  const dummyPath = "scripts/test-linkedin-dummy.md";
  writeFileSync(dummyPath, dummyMd, "utf-8");

  try {
    const lines = extractCleanBody(dummyPath).split("\n");
    const firstLine = lines[0];
    const title = firstLine !== undefined ? firstLine.replace(/^#+\s*/, "").trim() : "";
    expect(title).toBe("AI and The Future of Coding");
  } finally {
    if (existsSync(dummyPath)) {
      unlinkSync(dummyPath);
    }
  }
});
