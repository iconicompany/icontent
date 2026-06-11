import { test, expect } from "bun:test";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { cleanSymbols, extractCleanBody, PROMPTS } from "./generate-announce";



test("PROMPTS contains viral and regular prompt sets", () => {
  expect(PROMPTS.viral).toBeDefined();
  expect(PROMPTS.regular).toBeDefined();
  expect(PROMPTS.viral.ru).toContain("вирусный");
  expect(PROMPTS.regular.ru).toContain("развернутый");
});

test("cleanSymbols cleans AI-generated quotes, dashes, and other characters", () => {
  const input = "• point\n— long dash\n“quotes”\n… ellipsis";
  const cleaned = cleanSymbols(input, false);
  expect(cleaned).toContain("- point");
  expect(cleaned).toContain("- long dash");
  expect(cleaned).toContain('"quotes"');
  expect(cleaned).toContain("... ellipsis");
});

test("extractCleanBody extracts content without frontmatter, header image, and read also links", () => {
  const dummyMd = `---
title: "Test Post"
description: "A test description"
---

![Banner](../../assets/banner.png)

This is the main body.

## 📚 Читайте также

- [Link](somelink)
`;
  const dummyPath = "scripts/test-dummy.md";
  writeFileSync(dummyPath, dummyMd, "utf-8");

  try {
    const extracted = extractCleanBody(dummyPath);
    expect(extracted).toBe("This is the main body.");
  } finally {
    if (existsSync(dummyPath)) {
      unlinkSync(dummyPath);
    }
  }
});

test("Integration: fetch completion from LiteLLM endpoint with real API key", async () => {
  const apiKey = process.env.OPENAI_API_KEY;
  expect(apiKey).toBeDefined();
  
  console.log("Making live integration test call to LiteLLM...");
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
          role: "user",
          content: "Respond with a single word: Success"
        }
      ]
    })
  });

  expect(response.status).toBe(200);
  const json: any = await response.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  console.log("LiteLLM response:", text);
  expect(text).toMatch(/Success/i);
});
