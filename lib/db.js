const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), 'data', 'db.json')

// In-memory store
let store = {
  users: [],
  clients: [],
  client_scopes: [],
  _sequences: { users: 0, clients: 0, client_scopes: 0 },
}

let _loaded = false
let _initPromise = null

function save() {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2))
  } catch (e) {
    console.error('[DB] save error:', e.message)
  }
}

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      store = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
    }
  } catch (e) {
    console.error('[DB] load error:', e.message)
  }
}

function nextId(table) {
  store._sequences[table] = (store._sequences[table] || 0) + 1
  return store._sequences[table]
}

// --- Query helpers ---

function matchWhere(row, where) {
  if (!where) return true
  return Object.entries(where).every(([k, v]) => row[k] === v)
}

// Simple SQL parser for the patterns used in this app
function parseAndRun(sql, params) {
  const s = sql.trim().replace(/\s+/g, ' ')

  // INSERT INTO table (...cols) VALUES (...)
  const insertMatch = s.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i)
  if (insertMatch) {
    const table = insertMatch[1]
    const cols = insertMatch[2].split(',').map(c => c.trim())
    const id = nextId(table)
    const row = { id }
    cols.forEach((col, i) => { row[col] = params[i] ?? null })
    row.created_at = row.created_at ?? new Date().toISOString()
    store[table].push(row)
    save()
    return { lastInsertRowid: id, changes: 1 }
  }

  // UPDATE table SET col=?,... WHERE col=?
  const updateMatch = s.match(/^UPDATE (\w+) SET (.+) WHERE (.+)/i)
  if (updateMatch) {
    const table = updateMatch[1]
    const setPairs = updateMatch[2].split(',').map(p => p.trim().split(/\s*=\s*\?/)[0].trim())
    const whereParts = updateMatch[3].match(/(\w+)\s*=\s*\?/g) || []
    const whereCols = whereParts.map(p => p.split(/\s*=\s*\?/)[0].trim())

    const setValues = params.slice(0, setPairs.length)
    const whereValues = params.slice(setPairs.length)

    let changes = 0
    store[table] = store[table].map(row => {
      const match = whereCols.every((col, i) => row[col] == whereValues[i])
      if (match) {
        changes++
        const updated = { ...row }
        setPairs.forEach((col, i) => { updated[col] = setValues[i] })
        updated.updated_at = new Date().toISOString()
        return updated
      }
      return row
    })
    save()
    return { changes }
  }

  // DELETE FROM table WHERE col=?
  const deleteMatch = s.match(/^DELETE FROM (\w+) WHERE (.+)/i)
  if (deleteMatch) {
    const table = deleteMatch[1]
    const whereParts = deleteMatch[2].match(/(\w+)\s*=\s*\?/g) || []
    const whereCols = whereParts.map(p => p.split(/\s*=\s*\?/)[0].trim())
    const before = store[table].length
    store[table] = store[table].filter(row =>
      !whereCols.every((col, i) => row[col] == params[i])
    )
    save()
    return { changes: before - store[table].length }
  }

  throw new Error('[DB] Unsupported SQL: ' + s.substring(0, 80))
}

function parseAndQuery(sql, params, single) {
  const s = sql.trim().replace(/\s+/g, ' ')

  // SELECT * FROM table [INNER JOIN ...] [WHERE ...] [ORDER BY ...]
  const selectMatch = s.match(/^SELECT (.+?) FROM (\w+)(.*)/i)
  if (!selectMatch) throw new Error('[DB] Unsupported SELECT: ' + s.substring(0, 80))

  const baseTable = selectMatch[2]
  let rows = [...(store[baseTable] || [])]

  const rest = selectMatch[3]

  // INNER JOIN client_scopes cs ON cs.client_id = c.id AND cs.scope = ?
  const joinMatch = rest.match(/INNER JOIN (\w+) \w+ ON \w+\.(\w+) = \w+\.(\w+) AND \w+\.(\w+) = \?/i)
  if (joinMatch) {
    const joinTable = joinMatch[1]
    const joinCol = joinMatch[2]   // client_id
    const baseCol = joinMatch[3]   // id
    const filterCol = joinMatch[4] // scope
    const filterVal = params.shift()
    const joinRows = store[joinTable] || []
    const matchingIds = new Set(
      joinRows.filter(r => r[filterCol] === filterVal).map(r => r[joinCol])
    )
    rows = rows.filter(r => matchingIds.has(r[baseCol]))
  }

  // WHERE conditions
  const whereMatch = rest.match(/WHERE (.+?)(?:\s+ORDER BY|$)/i)
  if (whereMatch) {
    const conditions = whereMatch[1].split(/\s+AND\s+/i)
    conditions.forEach(cond => {
      const m = cond.match(/\w+\.?(\w+)\s*=\s*\?/)
      if (m) {
        const col = m[1]
        const val = params.shift()
        rows = rows.filter(r => r[col] == val)
      }
    })
  }

  // ORDER BY
  const orderMatch = rest.match(/ORDER BY \w+\.?(\w+)\s*(DESC|ASC)?/i)
  if (orderMatch) {
    const col = orderMatch[1]
    const desc = orderMatch[2]?.toUpperCase() === 'DESC'
    rows.sort((a, b) => {
      if (a[col] < b[col]) return desc ? 1 : -1
      if (a[col] > b[col]) return desc ? -1 : 1
      return 0
    })
  }

  return single ? (rows[0] || null) : rows
}

function makeStatement(sql) {
  return {
    run(...args) {
      const params = args.flat()
      return parseAndRun(sql, params)
    },
    get(...args) {
      const params = args.flat()
      return parseAndQuery(sql, params, true)
    },
    all(...args) {
      const params = args.flat()
      return parseAndQuery(sql, params, false)
    },
  }
}

async function initDb() {
  load()

  const exists = store.users.find(u => u.email === 'nicolas@invoicecontent.com')
  if (!exists) {
    const id = nextId('users')
    store.users.push({
      id,
      name: 'Nicolas',
      email: 'nicolas@invoicecontent.com',
      password_hash: '$2a$10$ElUS1FzSRJUkux83.xKxb.HIDXo71CXvmBI3Z7tfEVvI.b1abc5Yy',
      created_at: new Date().toISOString(),
    })
    save()
  }

  _loaded = true
  return { prepare: makeStatement }
}

async function getDb() {
  if (_loaded) return { prepare: makeStatement }
  if (!_initPromise) _initPromise = initDb()
  return _initPromise
}

module.exports = getDb
