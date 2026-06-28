import MapaClient from './MapaClient'

export default function MapaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Mapa de posiciones</h1>
        <p className="text-zinc-500 text-sm mt-1">Ubicación de choferes y recicladores activos</p>
      </div>
      <MapaClient />
    </div>
  )
}
