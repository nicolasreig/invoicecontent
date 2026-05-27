'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SCOPES = [
  { key: 'rd', label: 'Gestão de RD' },
  { key: 'social', label: 'Gestão de Redes Sociais' },
  { key: 'blog', label: 'Conteúdo Blog' },
  { key: 'site', label: 'Site' },
  { key: 'brand', label: 'Brand' },
  { key: 'traffic', label: 'Tráfego Pago' },
]

function ScopeButton({ scope, selected, quantity, onToggle, onQuantityChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onToggle(scope.key)}
        className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
          selected
            ? 'border-pink-500 bg-pink-50 text-pink-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <span>{scope.label}</span>
        {selected && (
          <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      {selected && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onQuantityChange(scope.key, Math.max(1, quantity - 1))}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="w-6 text-center text-sm font-semibold text-gray-900">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(scope.key, quantity + 1)}
            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default function NovoClientePage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    fee_type: 'mensal',
    contract_value: '',
    fee_duration_months: '',
    payment_type: 'avista',
    installments: '',
    contract_start: '',
    contract_end: '',
    rescission_notice_days: '30',
  })
  const [contractFile, setContractFile] = useState(null)
  const [selectedScopes, setSelectedScopes] = useState({})
  const [scopeQuantities, setScopeQuantities] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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

  function setScopeQuantity(key, qty) {
    setScopeQuantities((prev) => ({ ...prev, [key]: qty }))
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const scopes = Object.keys(selectedScopes).map((key) => ({
        scope: key,
        quantity: scopeQuantities[key] || 1,
      }))

      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('email', form.email)
      formData.append('whatsapp', form.whatsapp)
      formData.append('fee_type', form.fee_type)
      formData.append('contract_value', parseCurrencyValue(form.contract_value))
      formData.append('contract_start', form.contract_start)
      formData.append('contract_end', form.contract_end)
      formData.append('rescission_notice_days', form.rescission_notice_days)
      formData.append('scopes', JSON.stringify(scopes))

      if (form.fee_type === 'mensal' && form.fee_duration_months) {
        formData.append('fee_duration_months', form.fee_duration_months)
      }
      if (form.fee_type === 'unico') {
        formData.append('payment_type', form.payment_type)
        if (form.payment_type === 'parcelado' && form.installments) {
          formData.append('installments', form.installments)
        }
      }
      if (contractFile) {
        formData.append('contract_file', contractFile)
      }

      const res = await fetch('/api/clients', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao criar cliente')
        return
      }

      setSuccess(data.client)
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const portalUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cliente/${success.portal_token}`
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cliente criado com sucesso!</h2>
          <p className="text-gray-500 text-sm mb-6">O cliente <strong>{success.name}</strong> foi adicionado ao sistema.</p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Link do Portal do Cliente</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-gray-800 font-mono break-all">{portalUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(portalUrl)}
                className="flex-shrink-0 btn-secondary text-xs px-3 py-2"
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(null)
                setForm({
                  name: '', email: '', whatsapp: '', fee_type: 'mensal',
                  contract_value: '', fee_duration_months: '', payment_type: 'avista',
                  installments: '', contract_start: '', contract_end: '', rescission_notice_days: '30',
                })
                setSelectedScopes({})
                setScopeQuantities({})
                setContractFile(null)
              }}
              className="btn-secondary"
            >
              Novo Cliente
            </button>
            <button
              onClick={() => router.push(`/dashboard/cliente/${success.id}`)}
              className="btn-primary"
            >
              Ver Cliente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Cliente</h1>
          <p className="text-gray-500 text-sm mt-0.5">Preencha os dados do contrato</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Informações do Cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="name">Nome do Cliente *</label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                placeholder="Nome da empresa ou pessoa"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="email">Email *</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                placeholder="contato@empresa.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="whatsapp">WhatsApp *</label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                className="form-input"
                placeholder="(11) 99999-9999"
                value={form.whatsapp}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Contract Info */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Contrato</h2>
          <div className="space-y-5">
            {/* File upload */}
            <div>
              <label className="form-label">Contrato (arquivo)</label>
              <div className="relative">
                <input
                  type="file"
                  id="contract_file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="contract_file"
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-colors duration-150"
                >
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {contractFile ? contractFile.name : 'Clique para anexar contrato (PDF, DOC)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Fee type toggle */}
            <div>
              <label className="form-label">Tipo de Fee *</label>
              <div className="flex gap-2">
                {[
                  { key: 'mensal', label: 'Fee Mensal' },
                  { key: 'unico', label: 'Fee Único' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, fee_type: key }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
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

            {/* Conditional fields */}
            {form.fee_type === 'mensal' && (
              <div>
                <label className="form-label" htmlFor="fee_duration_months">Duração (meses)</label>
                <input
                  id="fee_duration_months"
                  name="fee_duration_months"
                  type="number"
                  min="1"
                  className="form-input"
                  placeholder="Ex: 12"
                  value={form.fee_duration_months}
                  onChange={handleChange}
                />
              </div>
            )}

            {form.fee_type === 'unico' && (
              <div className="space-y-4">
                <div>
                  <label className="form-label">Forma de Pagamento</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'avista', label: 'À Vista' },
                      { key: 'parcelado', label: 'Parcelado' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, payment_type: key }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
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
                    <label className="form-label" htmlFor="installments">Número de Parcelas</label>
                    <input
                      id="installments"
                      name="installments"
                      type="number"
                      min="2"
                      max="60"
                      className="form-input"
                      placeholder="Ex: 12"
                      value={form.installments}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Contract value */}
            <div>
              <label className="form-label" htmlFor="contract_value">
                Valor do Contrato *
                {form.fee_type === 'unico' && form.payment_type === 'parcelado' && form.installments && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    (
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      (parseCurrencyValue(form.contract_value) || 0) / parseInt(form.installments || 1)
                    )}
                    /parcela)
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                <input
                  id="contract_value"
                  name="contract_value"
                  type="text"
                  className="form-input pl-9"
                  placeholder="0,00"
                  value={form.contract_value}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value)
                    setForm((prev) => ({ ...prev, contract_value: formatted }))
                  }}
                  required
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label" htmlFor="contract_start">Data de Início *</label>
                <input
                  id="contract_start"
                  name="contract_start"
                  type="date"
                  className="form-input"
                  value={form.contract_start}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="contract_end">Data de Término *</label>
                <input
                  id="contract_end"
                  name="contract_end"
                  type="date"
                  className="form-input"
                  value={form.contract_end}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Rescission notice */}
            <div>
              <label className="form-label" htmlFor="rescission_notice_days">Prazo de Rescisão (dias)</label>
              <input
                id="rescission_notice_days"
                name="rescission_notice_days"
                type="number"
                min="0"
                className="form-input"
                placeholder="30"
                value={form.rescission_notice_days}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Scopes */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Escopos de Serviço</h2>
          <p className="text-sm text-gray-400 mb-5">Selecione os serviços incluídos no contrato</p>
          <div className="space-y-2.5">
            {SCOPES.map((scope) => (
              <ScopeButton
                key={scope.key}
                scope={scope}
                selected={!!selectedScopes[scope.key]}
                quantity={scopeQuantities[scope.key] || 1}
                onToggle={toggleScope}
                onQuantityChange={setScopeQuantity}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end pb-8">
          <Link href="/dashboard" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={loading} className="btn-primary min-w-[140px]">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </span>
            ) : 'Criar Cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}

function parseCurrencyValue(str) {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
}
