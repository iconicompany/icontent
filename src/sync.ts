import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { blogDb } from "./database";
import { DATA_DIR } from "./config";

async function processFile(filePath: string, lang: string) {
    try {
        const content = await readFile(filePath, "utf-8");
        const { data, content: body } = matter(content);
        const fileName = path.basename(filePath);

        const post = {
            ...data,
            slug: data.slug || fileName.replace(/\.mdx?$/, ""),
            lang,
            body,
        };

        blogDb.upsertPost(post);
        console.log(`✅ Indexed [${lang}] ${post.slug}`);
        return post;
    } catch (e: any) {
        console.error(`❌ Error processing ${filePath}: ${e.message}`);
        return null;
    }
}

export async function syncLocalContent(fileList?: string[]) {
    console.log("🚀 Starting local markdown sync...");

    await mkdir(DATA_DIR, { recursive: true });

    const langs = ["en", "ru"];
    const allPosts: any[] = [];

    if (fileList && fileList.length > 0) {
        console.log(`📂 Indexing ${fileList.length} specified files...`);
        for (const file of fileList) {
            // Determine lang from path: content/{lang}/blog/...
            const parts = file.split(path.sep);
            const contentIdx = parts.indexOf("content");
            if (contentIdx !== -1 && parts[contentIdx + 1]) {
                const lang = parts[contentIdx + 1];
                const post = await processFile(path.resolve(file), lang!);
                if (post) allPosts.push(post);
            } else {
                console.warn(`⚠️ Could not determine language for file: ${file}. Path must include 'content/{lang}/'`);
            }
        }
    } else {
        console.log("📂 Indexing all files in content directory...");
        for (const lang of langs) {
            const blogDir = path.join(process.cwd(), "content", lang, "blog");
            try {
                const files = await readdir(blogDir);
                for (const file of files) {
                    if (!file.endsWith(".md") && !file.endsWith(".mdx")) continue;
                    const post = await processFile(path.join(blogDir, file), lang);
                    if (post) allPosts.push(post);
                }
            } catch (e: any) {
                console.warn(`⚠️ Directory not found for lang ${lang}: ${blogDir}`);
            }
        }
    }

    console.log(`✨ Sync complete! Total posts: ${allPosts.length}`);
    return allPosts;
}

// Allow running from CLI
if (require.main === module || (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.path))) {
    const args = process.argv.slice(2);
    syncLocalContent(args.length > 0 ? args : undefined).catch(err => {
        console.error("Fatal error during sync:", err);
        process.exit(1);
    });
}
