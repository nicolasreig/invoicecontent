import { NextResponse } from 'next/server'

const ADMIN_USER = { id: 1, name: 'Nicolas', email: 'nicolas@invoicecontent.com' }

export async function GET() {
  return NextResponse.json({ user: ADMIN_USER })
}

export async function DELETE() {
  return NextResponse.json({ ok: true })
}
