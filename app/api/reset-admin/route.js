import { NextResponse } from 'next/server'
import getDb from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const db = await getDb()
    const hash = await bcrypt.hash('N1c0las#123', 10)

    // Delete existing and recreate
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('nicolas@invoicecontent.com')
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'nicolas@invoicecontent.com')
      return NextResponse.json({ ok: true, action: 'updated', user: 'nicolas@invoicecontent.com' })
    } else {
      db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run('Nicolas', 'nicolas@invoicecontent.com', hash)
      return NextResponse.json({ ok: true, action: 'created', user: 'nicolas@invoicecontent.com' })
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
