'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SCOPE_LABELS = {
  rd: 'RD',
  social: 'Redes Sociais',
  blog: 'Blog',
  site: 'Site',
  brand: 'Brand',
  traffic: 'Tráfego',
}

const SCOPE_COLORS = {
  rd: 'bg-purple-50 text-purple-700 border-purple-100',
  social: 'bg-blue-50 text-blue-700 border-blue-100',
  blog: 'bg-green-50 text-green-700 border-green-100',
  site: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  brand: 'bg-pink-50 text-pink-700 border-pink-100',
  traffic: 'bg-orange-50 text-orange-700 border-orange-100',
}

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

function getDaysUntilEnd(endDate) {
  if (!endDate) return null
  try {
    return differenceInDays(parseISO(endDate), new Date())
  } catch {
    return null
  }
}

function StatusBadge({ status, endDate }) {
  if (status === 'cancelled') {
    return <span className="badge-cancelled">Cancelado</span>
  }
  if (status === 'renewed') {
    return <span className="badge-renewed">Renovado</span>
  }

  const days = getDaysUntilEnd(endDate)
  if (days !== null && days <= 30) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Vence em {days}d</span>
  }
  if (days !== null && days <= 60) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">Vence em {days}d</span>
  }
  if (days !== null && days <= 90) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">Vence em {days}d</span>
  }
  return <span className="badge-active">Ativo</span>
}

function StatCard({ title, value, subtitle, colorClass = 'text-gray-900', bgClass = '' }) {
  return (
    <div className={`card p-5 ${bgClass}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [feeFilter, setFeeFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (feeFilter) params.set('fee_type', feeFilter)
      if (scopeFilter) params.set('scope', scopeFilter)
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data.clients || [])
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }, [feeFilter, scopeFilter])

  useEffect(() => {
    setLoading(true)
    fetchClients()
  }, [fetchClients])

  // Stats
  const activeClients = clients.filter((c) => c.status === 'active')
  const ending90 = activeClients.filter((c) => {
    const d = getDaysUntilEnd(c.contract_end)
    return d !== null && d <= 90 && d > 60
  })
  const ending60 = activeClients.filter((c) => {
    const d = getDaysUntilEnd(c.contract_end)
    return d !== null && d <= 60 && d > 30
  })
  const ending30 = activeClients.filter((c) => {
    const d = getDaysUntilEnd(c.contract_end)
    return d !== null && d <= 30 && d >= 0
  })

  const totalMensal = activeClients
    .filter((c) => c.fee_type === 'mensal')
    .reduce((sum, c) => sum + (c.contract_value || 0), 0)

  const totalParcelas = activeClients
    .filter((c) => c.fee_type === 'unico' && c.payment_type === 'parcelado')
    .reduce((sum, c) => sum + (c.contract_value || 0), 0)

  const scopeButtons = [
    { key: '', label: 'Todos' },
    { key: 'rd', label: 'RD' },
    { key: 'social', label: 'Redes Sociais' },
    { key: 'blog', label: 'Blog' },
    { key: 'site', label: 'Site' },
    { key: 'brand', label: 'Brand' },
    { key: 'traffic', label: 'Tráfego' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral dos contratos e clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          title="Clientes Ativos"
          value={activeClients.length}
          subtitle="total"
        />
        <StatCard
          title="Finalizando 90d"
          value={ending90.length}
          colorClass="text-yellow-600"
        />
        <StatCard
          title="Finalizando 60d"
          value={ending60.length}
          colorClass="text-orange-600"
        />
        <StatCard
          title="Finalizando 30d"
          value={ending30.length}
          colorClass="text-red-600"
        />
        <StatCard
          title="Total Mensalidades"
          value={formatCurrency(totalMensal)}
          subtitle="clientes mensais ativos"
          colorClass="text-pink-600"
        />
        <StatCard
          title="Parcelas Pendentes"
          value={formatCurrency(totalParcelas)}
          subtitle="contratos parcelados"
          colorClass="text-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Fee filter */}
          <div className="flex items-center gap-1.5">
            {[
              { key: '', label: 'Todos' },
              { key: 'mensal', label: 'Fee Mensal' },
              { key: 'unico', label: 'Fee Único' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFeeFilter(key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  feeFilter === key
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          {/* Scope filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {scopeButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setScopeFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                  scopeFilter === key
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Carregando clientes...</span>
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-gray-400 text-xs mt-1">Adicione seu primeiro cliente para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Nome</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Escopo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Início</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Fim</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50/50 transition-colors duration-100 cursor-pointer"
                    onClick={() => router.push(`/dashboard/cliente/${client.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{client.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(client.scopes || []).slice(0, 3).map((s) => (
                          <span
                            key={s.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${SCOPE_COLORS[s.scope] || 'bg-gray-50 text-gray-600 border-gray-100'}`}
                          >
                            {SCOPE_LABELS[s.scope] || s.scope}
                            {s.quantity > 1 && ` ×${s.quantity}`}
                          </span>
                        ))}
                        {(client.scopes || []).length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            +{client.scopes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-700">
                        {client.fee_type === 'mensal' ? 'Mensal' : 'Único'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.contract_value)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{formatDate(client.contract_start)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600">{formatDate(client.contract_end)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={client.status} endDate={client.contract_end} />
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/cliente/${client.id}`)}
                        className="text-pink-500 hover:text-pink-700 text-sm font-medium transition-colors"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && clients.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} encontrado{clients.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
