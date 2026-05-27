import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DB_PATH || './data/invoicecontent.db'

let db = null

function getDb() {
  if (db) return db

  const dbDir = path.dirname(path.resolve(DB_PATH))
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(path.resolve(DB_PATH))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  seedDefaultUser(db)

  return db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portal_token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      contract_file_path TEXT,
      fee_type TEXT NOT NULL CHECK(fee_type IN ('mensal', 'unico')),
      contract_value REAL NOT NULL,
      fee_duration_months INTEGER,
      payment_type TEXT CHECK(payment_type IN ('avista', 'parcelado')),
      installments INTEGER,
      contract_start DATE NOT NULL,
      contract_end DATE NOT NULL,
      rescission_notice_days INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled', 'renewed')),
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_scopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      scope TEXT NOT NULL CHECK(scope IN ('rd', 'social', 'blog', 'site', 'brand', 'traffic')),
      quantity INTEGER NOT NULL DEFAULT 1
    );
  `)
}

function seedDefaultUser(db) {
  const bcrypt = require('bcryptjs')
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@invoicecontent.com')
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(
      'Admin',
      'admin@invoicecontent.com',
      hash
    )
    console.log('[DB] Default admin user created: admin@invoicecontent.com / admin123')
  }
}

export default getDb
