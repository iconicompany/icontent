import { Database } from "bun:sqlite";
import path from "node:path";
import { DATA_DIR } from "./config";

const DB_PATH = path.join(DATA_DIR, "content.db");

class BlogDatabase {
  private db: Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT,
        lang TEXT,
        title TEXT,
        description TEXT,
        date TEXT,
        published BOOLEAN,
        tags TEXT,
        authors TEXT,
        image TEXT,
        body TEXT,
        last_synced_at INTEGER,
        UNIQUE(slug, lang)
      )
    `);

    // FTS5 for search
    this.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS posts_search USING fts5(
        slug UNINDEXED,
        lang UNINDEXED,
        title,
        description,
        body,
        tokenize='unicode61'
      )
    `);
  }

  getDb() {
    return this.db;
  }

  upsertPost(post: any) {
    const query = this.db.prepare(`
      INSERT INTO posts (slug, lang, title, description, date, published, tags, authors, image, body, last_synced_at)
      VALUES ($slug, $lang, $title, $description, $date, $published, $tags, $authors, $image, $body, $lastSyncedAt)
      ON CONFLICT(slug, lang) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        date = excluded.date,
        published = excluded.published,
        tags = excluded.tags,
        authors = excluded.authors,
        image = excluded.image,
        body = excluded.body,
        last_synced_at = excluded.last_synced_at
    `);

    query.run({
      $slug: post.slug,
      $lang: post.lang,
      $title: post.title,
      $description: post.description,
      $date: post.date,
      $published: post.published ? 1 : 0,
      $tags: JSON.stringify(post.tags || []),
      $authors: JSON.stringify(post.authors || ['default']),
      $image: post.image || "",
      $body: post.body,
      $lastSyncedAt: Date.now()
    });

    // Update FTS
    this.db.run(`DELETE FROM posts_search WHERE slug = ? AND lang = ?`, [post.slug, post.lang]);
    this.db.run(`
      INSERT INTO posts_search (slug, lang, title, description, body)
      VALUES (?, ?, ?, ?, ?)
    `, [post.slug, post.lang, post.title, post.description, post.body]);
  }

  getPosts(lang: string) {
    return this.db.query("SELECT * FROM posts WHERE lang = ? ORDER BY date DESC").all(lang) as any[];
  }

  getPost(lang: string, slug: string) {
    return this.db.query("SELECT * FROM posts WHERE lang = ? AND slug = ?").get(lang, slug) as any;
  }
}

export const blogDb = new BlogDatabase();
