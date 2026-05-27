import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import getDb from '@/lib/db'

export async function GET() {
  try {
    const payload = getCurrentUser()
    if (!payload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const db = getDb()
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(payload.id)

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[Me] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE() {
  // Logout
  const response = NextResponse.json({ ok: true })
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
