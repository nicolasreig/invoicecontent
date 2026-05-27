import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import getDb from '@/lib/db'
import { sendRenewalEmail } from '@/lib/email'

export async function POST(request, { params }) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      contract_end,
      contract_value,
      fee_type,
      fee_duration_months,
      payment_type,
      installments,
      scopes
    } = body

    if (!contract_end) {
      return NextResponse.json({ error: 'Nova data de término é obrigatória' }, { status: 400 })
    }

    const db = getDb()
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    db.prepare(`
      UPDATE clients SET
        contract_end = ?,
        contract_value = COALESCE(?, contract_value),
        fee_type = COALESCE(?, fee_type),
        fee_duration_months = COALESCE(?, fee_duration_months),
        payment_type = COALESCE(?, payment_type),
        installments = COALESCE(?, installments),
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      contract_end,
      contract_value != null ? contract_value : null,
      fee_type || null,
      fee_duration_months != null ? fee_duration_months : null,
      payment_type || null,
      installments != null ? installments : null,
      params.id
    )

    if (scopes && Array.isArray(scopes)) {
      db.prepare('DELETE FROM client_scopes WHERE client_id = ?').run(params.id)
      const insertScope = db.prepare('INSERT INTO client_scopes (client_id, scope, quantity) VALUES (?, ?, ?)')
      for (const s of scopes) {
        if (s.scope && s.quantity > 0) {
          insertScope.run(params.id, s.scope, s.quantity)
        }
      }
    }

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)
    const updatedScopes = db.prepare('SELECT * FROM client_scopes WHERE client_id = ?').all(params.id)

    // Send renewal notification
    await sendRenewalEmail({
      client: updated,
      newEndDate: contract_end,
      newValue: contract_value || existing.contract_value,
    })

    return NextResponse.json({ ok: true, client: { ...updated, scopes: updatedScopes } })
  } catch (error) {
    console.error('[Client Renew] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
