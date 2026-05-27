import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import getDb from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const db = await getDb()
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const scopes = db.prepare('SELECT * FROM client_scopes WHERE client_id = ?').all(client.id)

    return NextResponse.json({ client: { ...client, scopes } })
  } catch (error) {
    console.error('[Client GET] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const db = await getDb()

    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const {
      name, email, whatsapp, fee_type, contract_value,
      fee_duration_months, payment_type, installments,
      contract_start, contract_end, rescission_notice_days,
      scopes
    } = body

    db.prepare(`
      UPDATE clients SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        whatsapp = COALESCE(?, whatsapp),
        fee_type = COALESCE(?, fee_type),
        contract_value = COALESCE(?, contract_value),
        fee_duration_months = ?,
        payment_type = ?,
        installments = ?,
        contract_start = COALESCE(?, contract_start),
        contract_end = COALESCE(?, contract_end),
        rescission_notice_days = COALESCE(?, rescission_notice_days),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || null, email || null, whatsapp || null, fee_type || null,
      contract_value != null ? contract_value : null,
      fee_duration_months != null ? fee_duration_months : existing.fee_duration_months,
      payment_type != null ? payment_type : existing.payment_type,
      installments != null ? installments : existing.installments,
      contract_start || null, contract_end || null,
      rescission_notice_days || null,
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

    return NextResponse.json({ ok: true, client: { ...updated, scopes: updatedScopes } })
  } catch (error) {
    console.error('[Client PUT] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
