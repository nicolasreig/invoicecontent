import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import getDb from '@/lib/db'
import { sendCancellationEmail } from '@/lib/email'

export async function POST(request, { params }) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { reason, recipients } = body

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Motivo de cancelamento é obrigatório' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json({ error: 'Contrato já está cancelado' }, { status: 400 })
    }

    db.prepare(`
      UPDATE clients SET
        status = 'cancelled',
        cancellation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason.trim(), params.id)

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)

    // Send cancellation email
    const emailRecipients = recipients || [
      existing.email,
      'financeiro@invoicecontent.com',
      'nicolas@invoicecontent.com',
    ]

    await sendCancellationEmail({
      client: updated,
      reason: reason.trim(),
      recipients: emailRecipients,
    })

    return NextResponse.json({ ok: true, client: updated })
  } catch (error) {
    console.error('[Client Cancel] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
