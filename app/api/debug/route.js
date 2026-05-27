import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const info = {
    cwd: process.cwd(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'invoicecontent.db'),
  }

  // Test sql.js loading
  try {
    const initSqlJs = require('sql.js')
    const wasmPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    info.wasmExists = fs.existsSync(wasmPath)
    info.wasmPath = wasmPath

    const SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    })
    const db = new SQL.Database()
    db.run('CREATE TABLE test (id INTEGER)')
    db.close()
    info.sqljs = 'OK'
  } catch (e) {
    info.sqljs = 'ERROR: ' + e.message
  }

  // Test data dir write
  try {
    const dataDir = path.join(process.cwd(), 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, 'test.txt'), 'ok')
    fs.unlinkSync(path.join(dataDir, 'test.txt'))
    info.fsWrite = 'OK'
  } catch (e) {
    info.fsWrite = 'ERROR: ' + e.message
  }

  return NextResponse.json(info)
}
