import { NextResponse } from 'next/server'
import getDb from '@/lib/db'

export async function GET() {
  try {
    // getDb() already calls seedDefaultUser on init
    const db = await getDb()
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE email = ?').get('admin@invoicecontent.com')

    if (user) {
      return NextResponse.json({ ok: true, message: 'Usuário admin já existe', user })
    }

    return NextResponse.json({ ok: true, message: 'Banco de dados inicializado' })
  } catch (error) {
    console.error('[Seed] Error:', error)
    return NextResponse.json({ error: 'Erro ao inicializar banco' }, { status: 500 })
  }
}
