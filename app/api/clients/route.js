import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getCurrentUser } from '@/lib/auth'
import getDb from '@/lib/db'
import path from 'path'
import fs from 'fs'

export async function GET(request) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const feeType = searchParams.get('fee_type') // 'mensal' | 'unico' | null
    const scope = searchParams.get('scope') // 'rd' | 'social' | 'blog' | 'site' | 'brand' | 'traffic' | null
    const status = searchParams.get('status') // 'active' | 'cancelled' | 'renewed' | null

    const db = await getDb()

    let query = `
      SELECT c.*
      FROM clients c
    `
    const conditions = []
    const params = []

    if (feeType) {
      conditions.push('c.fee_type = ?')
      params.push(feeType)
    }

    if (status) {
      conditions.push('c.status = ?')
      params.push(status)
    }

    if (scope) {
      query += ` INNER JOIN client_scopes cs ON cs.client_id = c.id AND cs.scope = ?`
      params.unshift(scope)
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ')
    }

    query += ` ORDER BY c.created_at DESC`

    const clients = db.prepare(query).all(...params)

    // Fetch scopes for each client
    const scopesStmt = db.prepare('SELECT * FROM client_scopes WHERE client_id = ?')
    const result = clients.map((client) => ({
      ...client,
      scopes: scopesStmt.all(client.id),
    }))

    return NextResponse.json({ clients: result })
  } catch (error) {
    console.error('[Clients GET] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()

    const name = formData.get('name')?.toString().trim()
    const email = formData.get('email')?.toString().trim()
    const whatsapp = formData.get('whatsapp')?.toString().trim()
    const fee_type = formData.get('fee_type')?.toString()
    const contract_value = parseFloat(formData.get('contract_value') || '0')
    const fee_duration_months = formData.get('fee_duration_months') ? parseInt(formData.get('fee_duration_months')) : null
    const payment_type = formData.get('payment_type')?.toString() || null
    const installments = formData.get('installments') ? parseInt(formData.get('installments')) : null
    const contract_start = formData.get('contract_start')?.toString()
    const contract_end = formData.get('contract_end')?.toString()
    const rescission_notice_days = parseInt(formData.get('rescission_notice_days') || '30')
    const scopesJson = formData.get('scopes')?.toString()

    // Validation
    if (!name || !email || !whatsapp || !fee_type || !contract_start || !contract_end) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    if (!['mensal', 'unico'].includes(fee_type)) {
      return NextResponse.json({ error: 'Tipo de fee inválido' }, { status: 400 })
    }

    // Handle contract file upload
    let contract_file_path = null
    const contractFile = formData.get('contract_file')
    if (contractFile && contractFile.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'data', 'uploads')
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      const ext = contractFile.name.split('.').pop()
      const filename = `${uuidv4()}.${ext}`
      const buffer = Buffer.from(await contractFile.arrayBuffer())
      fs.writeFileSync(path.join(uploadsDir, filename), buffer)
      contract_file_path = `/data/uploads/${filename}`
    }

    const portal_token = uuidv4()
    const db = await getDb()

    const insert = db.prepare(`
      INSERT INTO clients (
        portal_token, name, email, whatsapp, contract_file_path,
        fee_type, contract_value, fee_duration_months,
        payment_type, installments,
        contract_start, contract_end, rescission_notice_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = insert.run(
      portal_token, name, email, whatsapp, contract_file_path,
      fee_type, contract_value, fee_duration_months,
      payment_type, installments,
      contract_start, contract_end, rescission_notice_days
    )

    const clientId = result.lastInsertRowid

    // Insert scopes
    if (scopesJson) {
      const scopes = JSON.parse(scopesJson)
      const insertScope = db.prepare('INSERT INTO client_scopes (client_id, scope, quantity) VALUES (?, ?, ?)')
      for (const s of scopes) {
        if (s.scope && s.quantity > 0) {
          insertScope.run(clientId, s.scope, s.quantity)
        }
      }
    }

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId)
    const scopes = db.prepare('SELECT * FROM client_scopes WHERE client_id = ?').all(clientId)

    return NextResponse.json({ ok: true, client: { ...client, scopes } }, { status: 201 })
  } catch (error) {
    console.error('[Clients POST] Error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor: ' + error.message }, { status: 500 })
  }
}
