const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), 'data', 'invoicecontent.db')

let _db = null
let _initPromise = null

function saveDb() {
  try {
    const data = _db.export()
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, Buffer.from(data))
  } catch (e) {
    console.error('[DB] save error:', e.message)
  }
}

function makeStatement(sql) {
  return {
    run(...args) {
      const params = args.flat()
      _db.run(sql, params)
      const meta = _db.exec('SELECT last_insert_rowid() as id, changes() as c')
      const row = meta[0]?.values[0] || [0, 0]
      saveDb()
      return { lastInsertRowid: Number(row[0]), changes: Number(row[1]) }
    },
    get(...args) {
      const params = args.flat()
      const stmt = _db.prepare(sql)
      if (params.length) stmt.bind(params)
      const result = stmt.step() ? stmt.getAsObject() : null
      stmt.free()
      return result
    },
    all(...args) {
      const params = args.flat()
      const stmt = _db.prepare(sql)
      if (params.length) stmt.bind(params)
      const rows = []
      while (stmt.step()) rows.push(stmt.getAsObject())
      stmt.free()
      return rows
    },
  }
}

async function initDb() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
  })

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH))
  } else {
    _db = new SQL.Database()
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  _db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portal_token TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      contract_file_path TEXT,
      fee_type TEXT NOT NULL,
      contract_value REAL NOT NULL,
      fee_duration_months INTEGER,
      payment_type TEXT,
      installments INTEGER,
      contract_start DATE NOT NULL,
      contract_end DATE NOT NULL,
      rescission_notice_days INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'active',
      cancellation_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  _db.run(`
    CREATE TABLE IF NOT EXISTS client_scopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      scope TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    )
  `)

  // Seed admin user
  const bcrypt = require('bcryptjs')
  const existing = makeStatement('SELECT id FROM users WHERE email = ?').get('admin@invoicecontent.com')
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10)
    makeStatement('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run('Admin', 'admin@invoicecontent.com', hash)
  }

  saveDb()
  return { prepare: makeStatement }
}

async function getDb() {
  if (_db) return { prepare: makeStatement }
  if (!_initPromise) _initPromise = initDb()
  return _initPromise
}

module.exports = getDb
