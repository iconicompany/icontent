import { $ } from "bun";
import { existsSync, readFileSync } from "fs";
import { basename, extname } from "path";
import { addPost } from "./add-post";
import { publishAll } from "./publish-all";
import { triggerContentSync } from "./content-sync";

async function main() {
  console.log("=== Starting content sync pipeline ===");

  // 1. Identify the new post
  let beforeSha = process.env.GITHUB_EVENT_BEFORE || "HEAD~1";
  if (beforeSha === "0000000000000000000000000000000000000000") {
    beforeSha = "HEAD~1";
  }
  const sha = process.env.GITHUB_SHA || "HEAD";

  let newPost = "";
  try {
    console.log(`Checking git diff between ${beforeSha} and ${sha}...`);
    const diffOutput = await $`git diff --name-only --diff-filter=A "${beforeSha}" "${sha}"`.text();
    const files = diffOutput
      .split("\n")
      .map(f => f.trim())
      .filter(f => f.startsWith("content/ru/blog/") && (f.endsWith(".md") || f.endsWith(".mdx")));
    
    if (files.length > 0) {
      newPost = files[0]!;
    }
  } catch (e: any) {
    console.log("Git diff failed. Checking git status for untracked/added files...");
    try {
      const statusOutput = await $`git status --porcelain`.text();
      const files = statusOutput
        .split("\n")
        .map(line => line.slice(3).trim())
        .filter(f => f.startsWith("content/ru/blog/") && (f.endsWith(".md") || f.endsWith(".mdx")));
      
      if (files.length > 0) {
        newPost = files[0]!;
      }
    } catch {}
  }

  if (!newPost) {
    console.log("No new posts found in content/ru/blog/. Skipping sync.");
    process.exit(0);
  }

  console.log(`Detected new post: ${newPost}`);

  // Check exclude rules in the file
  let exclude = "";
  if (existsSync(newPost)) {
    const content = readFileSync(newPost, "utf-8");
    const match = content.match(/^exclude:\s*(.*)$/m);
    if (match && match[1]) {
      exclude = match[1].replace(/['"]/g, "").trim();
    }
  }

  // 2. Finalize and format post using addPost function
  console.log(`\n--- Running addPost on ${newPost} ---`);
  const finalFile = await addPost({ postFile: newPost });
  console.log(`Finalized file path: ${finalFile}`);

  // 3. Commit and Push Changes (if in CI/Git environment)
  const isCI = process.env.GITHUB_ACTIONS === "true";
  if (isCI) {
    console.log("\n--- Committing and pushing changes ---");
    try {
      await $`git config --global user.name "github-actions[bot]"`;
      await $`git config --global user.email "github-actions[bot]@users.noreply.github.com"`;
      await $`git add content/ assets/`;
      
      const hasChanges = (await $`git diff --staged --quiet`.nothrow()).exitCode !== 0;
      if (hasChanges) {
        await $`git commit -m "docs: finalize post, assets and translations"`;
        await $`git push`;
        console.log("Changes pushed successfully.");
      } else {
        console.log("No changes to commit.");
      }
    } catch (e: any) {
      console.error("Failed to commit and push changes:", e.message);
    }
  } else {
    console.log("\nSkipping git commit/push (not in GitHub Actions).");
  }

  // 4. Trigger Content Sync (вынесено в scripts/content-sync.ts)
  console.log("");
  await triggerContentSync();

  // 5. Run publishAll function to handle announcements and publications
  if (exclude.toLowerCase().includes("all")) {
    console.log("\nPost excluded from all channels. Skipping announcements.");
  } else {
    console.log(`\n--- Running publishAll on ${finalFile} ---`);
    const excludeList = exclude ? exclude.toLowerCase().split(",").map(c => c.trim()) : [];
    await publishAll({
      postFile: finalFile,
      mode: "regular",
      excludeList
    });
  }

  console.log("\n=== Content sync pipeline completed ===");
}

main().catch(err => {
  console.error("Fatal Error in sync pipeline:", err);
  process.exit(1);
});
