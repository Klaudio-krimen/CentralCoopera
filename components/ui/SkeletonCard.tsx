export default function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-28 rounded-md bg-zinc-100" />
        <div className="h-5 w-20 rounded-full bg-zinc-100" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded-md bg-zinc-100" style={{ width: `${70 - i * 15}%` }} />
      ))}
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="card p-5 animate-pulse space-y-2">
      <div className="h-3 w-16 rounded-md bg-zinc-100" />
      <div className="h-8 w-20 rounded-md bg-zinc-100" />
    </div>
  )
}
