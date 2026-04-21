import fs from 'fs';
import path from 'path';

/**
 * Searches for blog posts with the highest tag overlap.
 * Usage: bun scripts/recommend.ts "tag1, tag2, tag3" [excludeSlug]
 */

const BLOG_DIR = path.join(process.cwd(), 'content/ru/blog');

function getFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const metadata: Record<string, any> = {};
  
  lines.forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      let value = rest.join(':').trim();
      // Simple parsing for strings and arrays
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        try {
          // Convert array string to real array
          value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        } catch (e) {
          value = [];
        }
      }
      metadata[key.trim()] = value;
    }
  });
  return metadata;
}

const inputTags = process.argv[2] ? process.argv[2].split(',').map(t => t.trim().toLowerCase()) : [];
const excludeSlug = process.argv[3];

if (inputTags.length === 0) {
  process.exit(0);
}

const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
const recommendations: { title: string, slug: string, score: number }[] = [];

files.forEach(file => {
  const slug = file.replace(/\.mdx$|\.md$/, '');
  if (slug === excludeSlug) return;

  const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
  const fm = getFrontmatter(content);

  if (fm && fm.tags && Array.isArray(fm.tags)) {
    const postTags = fm.tags.map((t: string) => t.toLowerCase());
    const intersection = postTags.filter((t: string) => inputTags.includes(t));
    
    if (intersection.length > 0) {
      recommendations.push({
        title: fm.title || slug,
        slug: slug,
        score: intersection.length
      });
    }
  }
});

// Sort by score (descending) and then by slug (to keep it deterministic)
recommendations.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

// Output top 5
recommendations.slice(0, 5).forEach(rec => {
  console.log(`- [${rec.title}](${rec.slug})`);
});
