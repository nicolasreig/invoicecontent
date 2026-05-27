'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SCOPE_LABELS = {
  rd: 'Gestão de RD',
  social: 'Gestão de Redes Sociais',
  blog: 'Conteúdo Blog',
  site: 'Site',
  brand: 'Brand',
  traffic: 'Tráfego Pago',
}

const SCOPE_COLORS = {
  rd: 'bg-purple-50 text-purple-700 border-purple-100',
  social: 'bg-blue-50 text-blue-700 border-blue-100',
  blog: 'bg-green-50 text-green-700 border-green-100',
  site: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  brand: 'bg-pink-50 text-pink-700 border-pink-100',
  traffic: 'bg-orange-50 text-orange-700 border-orange-100',
}

const SCOPE_OPTIONS = [
  { key: 'rd', label: 'Gestão de RD' },
  { key: 'social', label: 'Gestão de Redes Sociais' },
  { key: 'blog', label: 'Conteúdo Blog' },
  { key: 'site', label: 'Site' },
  { key: 'brand', label: 'Brand' },
  { key: 'traffic', label: 'Tráfego Pago' },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

function InfoCard({ title, children }) {
  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 sm:w-40 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value || '—'}</span>
    </div>
  )
}

// Renew Modal
function RenewModal({ client, onClose, onSuccess }) {
  const [form, setForm] = useState({
    contract_end: '',
    contract_value: formatCurrencyForInput(client.contract_value),
    fee_type: client.fee_type,
    fee_duration_months: client.fee_duration_months || '',
    payment_type: client.payment_type || 'avista',
    installments: client.installments || '',
  })
  const [selectedScopes, setSelectedScopes] = useState(() => {
    const m = {}
    ;(client.scopes || []).forEach((s) => { m[s.scope] = true })
    return m
  })
  const [scopeQuantities, setScopeQuantities] = useState(() => {
    const m = {}
    ;(client.scopes || []).forEach((s) => { m[s.scope] = s.quantity })
    return m
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const scopes = Object.keys(selectedScopes).map((key) => ({
        scope: key,
        quantity: scopeQuantities[key] || 1,
      }))

      const res = await fetch(`/api/clients/${client.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_end: form.contract_end,
          contract_value: parseCurrencyValue(form.contract_value),
          fee_type: form.fee_type,
          fee_duration_months: form.fee_duration_months ? parseInt(form.fee_duration_months) : null,
          payment_type: form.payment_type,
          installments: form.installments ? parseInt(form.installments) : null,
          scopes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao renovar contrato')
        return
      }
      onSuccess(data.client)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  function toggleScope(key) {
    setSelectedScopes((prev) => {
      const next = { ...prev }
      if (next[key]) {
        delete next[key]
      } else {
        next[key] = true
        if (!scopeQuantities[key]) {
          setScopeQuantities((q) => ({ ...q, [key]: 1 }))
        }
      }
      return next
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Renovar Contrato</h2>
            <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="form-label">Nova Data de Término *</label>
            <input
              type="date"
              className="form-input"
              value={form.contract_end}
              onChange={(e) => setForm((p) => ({ ...p, contract_end: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="form-label">Novo Valor</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
              <input
                type="text"
                className="form-input pl-9"
                placeholder="0,00"
                value={form.contract_value}
                onChange={(e) => {
                  const formatted = formatCurrencyInput(e.target.value)
                  setForm((p) => ({ ...p, contract_value: formatted }))
                }}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Tipo de Fee</label>
            <div className="flex gap-2">
              {[{ key: 'mensal', label: 'Fee Mensal' }, { key: 'unico', label: 'Fee Único' }].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, fee_type: key }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.fee_type === key
                      ? 'border-pink-500 bg-pink-500 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.fee_type === 'mensal' && (
            <div>
              <label className="form-label">Duração (meses)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="Ex: 12"
                value={form.fee_duration_months}
                onChange={(e) => setForm((p) => ({ ...p, fee_duration_months: e.target.value }))}
              />
            </div>
          )}

          {form.fee_type === 'unico' && (
            <div className="space-y-3">
              <div>
                <label className="form-label">Forma de Pagamento</label>
                <div className="flex gap-2">
                  {[{ key: 'avista', label: 'À Vista' }, { key: 'parcelado', label: 'Parcelado' }].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, payment_type: key }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.payment_type === key
                          ? 'border-pink-500 bg-pink-500 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {form.payment_type === 'parcelado' && (
                <div>
                  <label className="form-label">Parcelas</label>
                  <input
                    type="number"
                    min="2"
                    className="form-input"
                    placeholder="Ex: 12"
                    value={form.installments}
                    onChange={(e) => setForm((p) => ({ ...p, installments: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="form-label">Escopos</label>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((scope) => {
                const isSelected = !!selectedScopes[scope.key]
                return (
                  <div key={scope.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleScope(scope.key)}
                      className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{scope.label}</span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setScopeQuantities((q) => ({ ...q, [scope.key]: Math.max(1, (q[scope.key] || 1) - 1) }))}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{scopeQuantities[scope.key] || 1}</span>
                        <button
                          type="button"
                          onClick={() => setScopeQuantities((q) => ({ ...q, [scope.key]: (q[scope.key] || 1) + 1 }))}
                          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : 'Renovar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Cancel Modal
function CancelModal({ client, onClose, onSuccess }) {
  const [reason, setReason] = useState('')
  const [recipients, setRecipients] = useState([
    client.email,
    'financeiro@invoicecontent.com',
    'nicolas@invoicecontent.com',
  ].join(', '))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!reason.trim()) {
      setError('Por favor, informe o motivo do cancelamento.')
      return
    }
    setLoading(true)
    try {
      const recipientList = recipients.split(',').map((r) => r.trim()).filter(Boolean)
      const res = await fetch(`/api/clients/${client.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), recipients: recipientList }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao cancelar contrato')
        return
      }
      onSuccess(data.client)
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Cancelar Contrato</h2>
            <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700">
                Esta ação irá cancelar o contrato. Um email de notificação será enviado aos destinatários informados.
              </p>
            </div>
          </div>

          <div>
            <label className="form-label">Motivo do Cancelamento *</label>
            <textarea
              className="form-input min-h-[100px] resize-none"
              placeholder="Descreva o motivo do cancelamento..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Destinatários do Email</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              placeholder="email@exemplo.com, outro@exemplo.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Separe múltiplos emails com vírgula</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Voltar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-white hover:bg-red-50 text-red-600 font-semibold px-5 py-2.5 rounded-lg border border-red-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60">
              {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRenew, setShowRenew] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`)
      const data = await res.json()
      if (res.ok) setClient(data.client)
      else router.push('/dashboard')
    } catch {
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  function copyPortalLink() {
    const url = `${window.location.origin}/cliente/${client.portal_token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!client) return null

  const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cliente/${client.portal_token}`
  const daysUntilEnd = client.contract_end
    ? differenceInDays(parseISO(client.contract_end), new Date())
    : null

  const statusColor =
    client.status === 'cancelled'
      ? 'text-red-600 bg-red-50 border-red-100'
      : client.status === 'renewed'
      ? 'text-blue-600 bg-blue-50 border-blue-100'
      : daysUntilEnd !== null && daysUntilEnd <= 30
      ? 'text-red-600 bg-red-50 border-red-100'
      : daysUntilEnd !== null && daysUntilEnd <= 60
      ? 'text-orange-600 bg-orange-50 border-orange-100'
      : 'text-green-700 bg-green-50 border-green-100'

  const statusLabel =
    client.status === 'cancelled'
      ? 'Cancelado'
      : client.status === 'renewed'
      ? 'Renovado'
      : daysUntilEnd !== null && daysUntilEnd <= 0
      ? 'Expirado'
      : 'Ativo'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Cliente desde {formatDate(client.created_at)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        {client.status !== 'cancelled' && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowRenew(true)}
              className="btn-primary"
            >
              Renovar Contrato
            </button>
            <button
              onClick={() => setShowCancel(true)}
              className="btn-danger"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <InfoCard title="Contato">
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="WhatsApp" value={client.whatsapp} />
        </InfoCard>

        {/* Contract Info */}
        <InfoCard title="Contrato">
          <InfoRow
            label="Tipo de Fee"
            value={client.fee_type === 'mensal' ? 'Fee Mensal' : 'Fee Único'}
          />
          <InfoRow label="Valor" value={formatCurrency(client.contract_value)} />
          {client.fee_type === 'mensal' && client.fee_duration_months && (
            <InfoRow label="Duração" value={`${client.fee_duration_months} meses`} />
          )}
          {client.fee_type === 'unico' && (
            <>
              <InfoRow
                label="Pagamento"
                value={client.payment_type === 'avista' ? 'À Vista' : 'Parcelado'}
              />
              {client.payment_type === 'parcelado' && client.installments && (
                <InfoRow
                  label="Parcelas"
                  value={`${client.installments}x de ${formatCurrency(client.contract_value / client.installments)}`}
                />
              )}
            </>
          )}
          <InfoRow label="Início" value={formatDate(client.contract_start)} />
          <InfoRow label="Término" value={formatDate(client.contract_end)} />
          {daysUntilEnd !== null && client.status === 'active' && (
            <InfoRow
              label="Dias restantes"
              value={
                daysUntilEnd <= 0
                  ? 'Expirado'
                  : `${daysUntilEnd} dias`
              }
            />
          )}
          <InfoRow label="Aviso de rescisão" value={`${client.rescission_notice_days} dias`} />
        </InfoCard>

        {/* Scopes */}
        <InfoCard title="Escopos de Serviço">
          {(client.scopes || []).length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum escopo definido</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(client.scopes || []).map((s) => (
                <div
                  key={s.id}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border ${SCOPE_COLORS[s.scope] || 'bg-gray-50 text-gray-600 border-gray-100'}`}
                >
                  {SCOPE_LABELS[s.scope] || s.scope}
                  {s.quantity > 1 && (
                    <span className="bg-white/60 px-1.5 py-0.5 rounded-lg text-xs font-bold">
                      ×{s.quantity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </InfoCard>

        {/* Portal Link */}
        <InfoCard title="Portal do Cliente">
          <p className="text-xs text-gray-400 mb-3">
            Compartilhe este link com o cliente para acesso ao portal
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2">
            <code className="flex-1 text-xs text-gray-700 font-mono break-all leading-relaxed">
              {portalUrl}
            </code>
            <button
              onClick={copyPortalLink}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                copied
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </>
              )}
            </button>
          </div>
        </InfoCard>

        {/* Cancellation reason */}
        {client.status === 'cancelled' && client.cancellation_reason && (
          <div className="lg:col-span-2">
            <InfoCard title="Motivo do Cancelamento">
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-700">{client.cancellation_reason}</p>
              </div>
            </InfoCard>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRenew && (
        <RenewModal
          client={client}
          onClose={() => setShowRenew(false)}
          onSuccess={(updated) => {
            setClient(updated)
            setShowRenew(false)
          }}
        />
      )}
      {showCancel && (
        <CancelModal
          client={client}
          onClose={() => setShowCancel(false)}
          onSuccess={(updated) => {
            setClient({ ...updated, scopes: client.scopes })
            setShowCancel(false)
          }}
        />
      )}
    </div>
  )
}

function formatCurrencyForInput(value) {
  if (!value) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCurrencyInput(value) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseCurrencyValue(str) {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}
