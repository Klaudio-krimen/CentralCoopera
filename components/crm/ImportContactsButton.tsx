'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { parseCsv } from '@/lib/csv'

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['nombre', 'name'],
  email: ['email', 'correo'],
  phone: ['telefono', 'teléfono', 'phone'],
  role: ['cargo', 'role', 'puesto'],
  company: ['empresa', 'company'],
  temperature: ['temperatura', 'temperature'],
  source: ['fuente', 'source'],
}

function mapHeaders(headerRow: string[]) {
  const normalized = headerRow.map((h) => h.trim().toLowerCase())
  const map: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h))
    if (idx !== -1) map[field] = idx
  }
  return map
}

function downloadTemplate() {
  const template =
    'nombre,email,telefono,cargo,empresa,temperatura,fuente\n' +
    'Juan Pérez,juan@empresa.cl,+56912345678,Gerente de Compras,Empresa Ejemplo SpA,TIBIO,REFERIDO\n'
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-contactos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportContactsButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    setLoading(true)
    try {
      const text = await file.text()
      const table = parseCsv(text)
      if (table.length < 2) {
        toast.error('El archivo no tiene filas de datos')
        return
      }

      const [header, ...dataRows] = table
      const map = mapHeaders(header)
      if (map.name === undefined || map.company === undefined) {
        toast.error('El CSV necesita columnas "nombre" y "empresa"')
        return
      }

      const rows = dataRows.map((r) => ({
        name: r[map.name] ?? '',
        company: r[map.company] ?? '',
        email: map.email !== undefined ? r[map.email] : undefined,
        phone: map.phone !== undefined ? r[map.phone] : undefined,
        role: map.role !== undefined ? r[map.role] : undefined,
        temperature: map.temperature !== undefined ? r[map.temperature] : undefined,
        source: map.source !== undefined ? r[map.source] : undefined,
      }))

      const res = await fetch('/api/contactos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al importar')

      const parts = [
        `${data.created} contacto${data.created !== 1 ? 's' : ''} creado${data.created !== 1 ? 's' : ''}`,
      ]
      if (data.companiesCreated > 0) {
        parts.push(`${data.companiesCreated} empresa${data.companiesCreated !== 1 ? 's' : ''} nueva${data.companiesCreated !== 1 ? 's' : ''}`)
      }
      if (data.errors?.length > 0) {
        parts.push(`${data.errors.length} fila${data.errors.length !== 1 ? 's' : ''} con error`)
      }
      toast.success(parts.join(' · '))
      if (data.errors?.length > 0) console.warn('Errores de importación CSV:', data.errors)

      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo importar el archivo')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <button onClick={() => inputRef.current?.click()} disabled={loading} className="crm-btn-outline">
        <Upload className="h-3.5 w-3.5" />
        {loading ? 'Importando...' : 'Importar CSV'}
      </button>
      <button
        onClick={downloadTemplate}
        className="text-xs text-crm-muted hover:text-crm-primary hover:underline whitespace-nowrap"
      >
        Plantilla
      </button>
    </div>
  )
}
