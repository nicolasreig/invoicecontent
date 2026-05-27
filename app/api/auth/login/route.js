import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import getDb from '@/lib/db'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const db = await getDb()
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim())

    if (!user) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name })
    const response = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } })
    setAuthCookie(response, token)

    return response
  } catch (error) {
    console.error('[Login] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
