import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import getDb from '@/lib/db'

export async function GET() {
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(process.cwd(), 'data', 'db.json')

  const info = {
    cwd: process.cwd(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    dbPath,
    dbFileExists: fs.existsSync(dbPath),
  }

  try {
    const db = await getDb()
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('nicolas@invoicecontent.com')
    info.adminUserFound = !!user
    if (user) info.adminUser = { id: user.id, email: user.email, hasHash: !!user.password_hash }
  } catch (e) {
    info.dbError = e.message
  }

  try {
    if (fs.existsSync(dbPath)) {
      const raw = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
      info.usersOnDisk = raw.users?.length ?? 0
      info.usersOnDiskEmails = raw.users?.map(u => u.email) ?? []
    }
  } catch (e) {
    info.diskReadError = e.message
  }

  return NextResponse.json(info)
}
