import { existsSync, readFileSync } from "fs";
import { addPost } from "./add-post";
import { publishAll } from "./publish-all";

async function main() {
  const args = Bun.argv.slice(2);
  const postPath = args[0];

  if (!postPath) {
    console.error("Usage: bun scripts/process-post.ts <path-to-post.md>");
    process.exit(1);
  }

  if (!existsSync(postPath)) {
    console.error(`Error: Post file not found at '${postPath}'`);
    process.exit(1);
  }

  console.log(`Processing post: ${postPath}`);

  // Get exclude rules
  let exclude = "";
  try {
    const content = readFileSync(postPath, "utf-8");
    const match = content.match(/^exclude:\s*(.*)$/m);
    if (match && match[1]) {
      exclude = match[1].replace(/['"]/g, "").trim();
    }
  } catch (e: any) {
    console.warn(`Could not read exclude rules from file: ${e.message}`);
  }

  // 1. Run addPost function
  console.log(`\n--- Running addPost on ${postPath} ---`);
  const finalFile = await addPost({ postFile: postPath });
  console.log(`Finalized file path: ${finalFile}`);

  // 2. Run publishAll function to handle announcements
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

  console.log("\n=== Processing completed successfully ===");
}

main().catch(err => {
  console.error("Fatal Error in process-post:", err);
  process.exit(1);
});
