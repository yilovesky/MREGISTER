import Database from "better-sqlite3";
import { DB_PATH, ensureRuntimeDirs } from "@/src/server/runtime";

let database;

function createDatabase() {
  try {
    ensureRuntimeDirs();
    // 使用 better-sqlite3 替代原生 node:sqlite
    const db = new Database(DB_PATH);
    
    // 基础性能配置
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // 创建表结构
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS credentials (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL, api_key TEXT NOT NULL, base_url TEXT NOT NULL, category_key TEXT, tag_key TEXT, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, platform TEXT NOT NULL, quantity INTEGER NOT NULL, results_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, source TEXT NOT NULL, credential_id INTEGER NOT NULL, console_path TEXT NOT NULL, output_dir TEXT NOT NULL, archive_path TEXT NOT NULL, config_json TEXT NOT NULL, error_message TEXT, pid INTEGER, auto_delete_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT);
      CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, key_hash TEXT NOT NULL, key_prefix TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, last_used_at TEXT);
    `);

    // 状态重置
    db.prepare(`UPDATE tasks SET status = ?, updated_at = ?, error_message = ? WHERE status IN (?, ?)`).run(
      'interrupted', 
      new Date().toISOString(), 
      'Server restarted', 
      'queued', 
      'running'
    );

    console.log("✅ [SQLite] Database connected via better-sqlite3");
    return db;
  } catch (error) {
    console.error("❌ [SQLite] Init failed:", error);
    throw error;
  }
}

export function getDb() {
  if (!database) database = createDatabase();
  return database;
}

export function nowIso() { return new Date().toISOString(); }

export function getSetting(key, fallback = null) {
  try {
    const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : fallback;
  } catch (e) { return fallback; }
}

export function setSetting(key, value) {
  getDb().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function all(sql, params = []) { return getDb().prepare(sql).all(...params); }
export function one(sql, params = []) { return getDb().prepare(sql).get(...params); }
export function run(sql, params = []) { return getDb().prepare(sql).run(...params); }
