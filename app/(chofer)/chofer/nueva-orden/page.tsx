'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash,
  Buildings,
  Package,
  Camera,
  PenNib,
  CheckCircle,
  MagnifyingGlass,
  SpinnerGap,
} from '@phosphor-icons/react'
import FirmaCanvas from '@/components/firma/FirmaCanvas'
import EvidenciaUploader, { EvidenciaPhoto } from '@/components/evidencia/EvidenciaUploader'

// ── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5

interface Empresa { id: string; name: string; address?: string }

interface MaterialItem {
  id: string
  materialTypeId: string
  quantity: string
  unit: string
}

interface MaterialType {
  id: string
  name: string
  unit: string
}

interface WizardState {
  step: Step
  orderId: string | null
  empresa: Empresa | null
  items: MaterialItem[]
  photos: EvidenciaPhoto[]
  signerName: string
  signatureDataUrl: string | null
  loading: boolean
  error: string | null
}

const STEP_LABELS: Record<Step, string> = {
  1: 'Empresa',
  2: 'Materiales',
  3: 'Fotos',
  4: 'Firma',
  5: 'Confirmación',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 20 : -20, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -20 : 20, opacity: 0 }),
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NuevaOrdenPage() {
  const router = useRouter()
  const [direction, setDirection]       = useState(1)
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([])

  useEffect(() => {
    fetch('/api/materiales').then((r) => r.json()).then(setMaterialTypes)
  }, [])

  const [state, setState] = useState<WizardState>({
    step: 1,
    orderId: null,
    empresa: null,
    items: [],
    photos: [],
    signerName: '',
    signatureDataUrl: null,
    loading: false,
    error: null,
  })

  // Empresa search
  const [empresaSearch, setEmpresaSearch] = useState('')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  const searchEmpresas = useCallback(async (q: string) => {
    setEmpresaSearch(q)
    if (q.length < 1) { setEmpresas([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/empresas?active=true&q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setEmpresas(data)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Navigation
  const goTo = (next: Step) => {
    setDirection(next > state.step ? 1 : -1)
    setState((s) => ({ ...s, step: next, error: null }))
  }

  // Step actions
  const handleSelectEmpresa = async (emp: Empresa) => {
    setState((s) => ({ ...s, empresa: emp, loading: true, error: null }))
    setEmpresas([])
    try {
      const res = await fetch('/api/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: emp.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState((s) => ({ ...s, orderId: data.id, loading: false }))
      goTo(2)
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message ?? 'Error al crear orden' }))
    }
  }

  const addItem = () => {
    setState((s) => ({
      ...s,
      items: [
        ...s.items,
        { id: crypto.randomUUID(), materialTypeId: '', quantity: '', unit: 'kg' },
      ],
    }))
  }

  const updateItem = (id: string, field: keyof MaterialItem, value: string) => {
    setState((s) => ({
      ...s,
      items: s.items.map((item) => {
        if (item.id !== id) return item
        if (field === 'materialTypeId') {
          const mt = materialTypes.find((m) => m.id === value)
          return { ...item, materialTypeId: value, unit: mt?.unit ?? item.unit }
        }
        return { ...item, [field]: value }
      }),
    }))
  }

  const removeItem = (id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }))
  }

  const handleSaveItems = async () => {
    if (!state.orderId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(`/api/ordenes/${state.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.items.map((i) => ({
            materialTypeId:   i.materialTypeId,
            declaredQuantity: parseFloat(i.quantity),
            unit:             i.unit,
          })),
        }),
      })
      if (!res.ok) throw new Error('Error al guardar materiales')
      setState((s) => ({ ...s, loading: false }))
      goTo(3)
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message }))
    }
  }

  const handleSaveFirma = async () => {
    if (!state.signatureDataUrl || !state.signerName.trim() || !state.orderId) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(`/api/ordenes/${state.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl: state.signatureDataUrl,
          clientSignerName: state.signerName.trim(),
        }),
      })
      if (!res.ok) throw new Error('Error al guardar firma')
      setState((s) => ({ ...s, loading: false }))
      goTo(5)
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message }))
    }
  }

  const handleConfirm = async () => {
    if (!state.orderId) return
    setState((s) => ({ ...s, loading: true, error: null }))

    let geo: { lat: number; lng: number } | null = null
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      )
      geo = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch {}

    try {
      const res = await fetch(`/api/ordenes/${state.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EN_TRANSITO', ...(geo ?? {}) }),
      })
      if (!res.ok) throw new Error('Error al confirmar')
      router.push(`/chofer/orden/${state.orderId}?success=1`)
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message }))
    }
  }

  // Step validation
  const canAdvance: Record<Step, boolean> = {
    1: !!state.empresa,
    2: state.items.length > 0 && state.items.every((i) => i.materialTypeId && parseFloat(i.quantity) > 0),
    3: state.photos.length > 0 && state.photos.every((p) => !p.uploading),
    4: !!state.signatureDataUrl && state.signerName.trim().length > 0,
    5: true,
  }

  const { step, empresa, items, photos, signerName, loading, error } = state

  return (
    <div className="min-h-[100dvh] bg-zinc-50 flex flex-col max-w-[430px] mx-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-zinc-50/90 backdrop-blur-md border-b border-zinc-100 px-4 pt-3 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => (step === 1 ? router.back() : goTo((step - 1) as Step))}
            aria-label="Volver al paso anterior"
            className="w-9 h-9 rounded-lg hover:bg-zinc-100 active:translate-y-[1px] flex items-center justify-center transition-all"
          >
            <ArrowLeft size={18} className="text-zinc-600" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-zinc-500 font-medium">
              <span className="font-mono tabular-nums">Paso {step} de 5</span> — {STEP_LABELS[step]}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5">
          {([1, 2, 3, 4, 5] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                s < step ? 'bg-emerald-500' : s === step ? 'bg-emerald-400' : 'bg-zinc-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="px-4 pt-6 pb-8"
          >
            {/* ── STEP 1: Empresa ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
                    Seleccionar empresa
                  </h2>
                  <p className="text-sm text-zinc-500">¿De qué empresa estás retirando?</p>
                </div>

                {/* Search input */}
                <div className="relative">
                  <MagnifyingGlass
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  {searchLoading && (
                    <SpinnerGap
                      size={16}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin"
                    />
                  )}
                  <input
                    type="text"
                    placeholder="Buscar empresa..."
                    value={empresaSearch}
                    onChange={(e) => searchEmpresas(e.target.value)}
                    className="input-base pl-9"
                    autoFocus
                  />
                </div>

                {/* Results */}
                {empresas.length > 0 && (
                  <div className="space-y-1.5">
                    {empresas.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelectEmpresa(emp)}
                        className="w-full text-left card px-4 py-3 hover:shadow-card-hover transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Buildings size={16} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{emp.name}</p>
                            {emp.address && (
                              <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[240px]">
                                {emp.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected */}
                {empresa && (
                  <div className="card p-4 border-emerald-200 bg-emerald-50/50">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{empresa.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Empresa seleccionada</p>
                      </div>
                    </div>
                  </div>
                )}

                {error && <ErrorBanner message={error} />}

                {loading && (
                  <div className="flex items-center justify-center gap-2 py-4 text-zinc-500 text-sm">
                    <SpinnerGap size={16} className="animate-spin" />
                    Creando orden...
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Materiales ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
                    Materiales
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Declara qué materiales y cuánto retiras de{' '}
                    <span className="font-medium text-zinc-700">{empresa?.name}</span>.
                  </p>
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-zinc-500">Material {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center transition-colors group"
                        >
                          <Trash size={14} className="text-zinc-500 group-hover:text-red-500 transition-colors" />
                        </button>
                      </div>

                      {/* Type */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-zinc-600">Tipo</label>
                        <select
                          value={item.materialTypeId}
                          onChange={(e) => updateItem(item.id, 'materialTypeId', e.target.value)}
                          className="input-base text-sm"
                        >
                          <option value="">Selecciona un tipo...</option>
                          {materialTypes.map((mt) => (
                            <option key={mt.id} value={mt.id}>{mt.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity + Unit */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">Cantidad</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            placeholder="0"
                            className="input-base text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-zinc-600">Unidad</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            className="input-base text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add item */}
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border-2 border-dashed border-zinc-300 hover:border-emerald-400 hover:bg-emerald-50/40 text-sm text-zinc-500 hover:text-emerald-600 transition-all"
                >
                  <Plus size={16} weight="bold" />
                  Agregar material
                </button>

                {items.length === 0 && (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <Package size={14} />
                    <span>Agrega al menos un material para continuar</span>
                  </div>
                )}

                {error && <ErrorBanner message={error} />}
              </div>
            )}

            {/* ── STEP 3: Fotos ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
                    Evidencia fotográfica
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Toma fotos del material antes de cargarlo. Mínimo 1, máximo 5.
                  </p>
                </div>

                <EvidenciaUploader
                  orderId={state.orderId ?? ''}
                  photos={photos}
                  onChange={(p) => setState((s) => ({ ...s, photos: p }))}
                  maxPhotos={5}
                />

                {error && <ErrorBanner message={error} />}
              </div>
            )}

            {/* ── STEP 4: Firma ── */}
            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
                    Firma del representante
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Entrega el teléfono al representante de{' '}
                    <span className="font-medium text-zinc-700">{empresa?.name}</span>{' '}
                    para que firme aquí.
                  </p>
                </div>

                <FirmaCanvas
                  onFirmaChange={(url) => setState((s) => ({ ...s, signatureDataUrl: url }))}
                />

                {/* Signer name */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Nombre completo del firmante
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setState((s) => ({ ...s, signerName: e.target.value }))}
                    placeholder="Ej: María González Pérez"
                    className="input-base"
                    autoCapitalize="words"
                  />
                </div>

                {error && <ErrorBanner message={error} />}
              </div>
            )}

            {/* ── STEP 5: Confirmación ── */}
            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 mb-1">
                    Confirmar retiro
                  </h2>
                  <p className="text-sm text-zinc-500">
                    Revisa el resumen antes de confirmar.
                  </p>
                </div>

                {/* Summary card */}
                <div className="card divide-y divide-zinc-50">
                  {/* Empresa */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <Buildings size={16} className="text-zinc-500 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500">Empresa</p>
                      <p className="text-sm font-medium text-zinc-900">{empresa?.name}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3">
                    <p className="text-xs text-zinc-500 mb-2">Materiales</p>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const mt = materialTypes.find((m) => m.id === item.materialTypeId)
                        return (
                          <div key={item.id} className="flex items-center justify-between">
                            <p className="text-sm text-zinc-700">{mt?.name ?? item.materialTypeId}</p>
                            <p className="text-sm font-medium text-zinc-900 font-mono">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <Camera size={16} className="text-zinc-500 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500">Fotos</p>
                      <p className="text-sm font-medium text-zinc-900">{photos.length} foto{photos.length !== 1 ? 's' : ''} adjunta{photos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Firma */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <PenNib size={16} className="text-zinc-500 shrink-0" />
                    <div>
                      <p className="text-xs text-zinc-500">Firmado por</p>
                      <p className="text-sm font-medium text-zinc-900">{signerName}</p>
                    </div>
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                {/* Confirm button */}
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="btn-primary w-full shadow-[0_8px_24px_-4px_rgba(34,197,94,0.35)]"
                >
                  {loading ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} weight="fill" />
                      Confirmar retiro
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom nav (steps 1-4) ── */}
      {step < 5 && (
        <div className="sticky bottom-0 bg-zinc-50/90 backdrop-blur-md border-t border-zinc-100 px-4 py-4">
          {error && step !== 1 && <ErrorBanner message={error} />}
          <button
            type="button"
            disabled={!canAdvance[step] || loading}
            onClick={() => {
              if (step === 2) handleSaveItems()
              else if (step === 4) handleSaveFirma()
              else goTo((step + 1) as Step)
            }}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
      {message}
    </div>
  )
}
