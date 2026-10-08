import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  colorClass?: string
  borderClass?: string
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  colorClass = 'text-blue-400',
  borderClass = 'border-blue-800/30',
}: StatCardProps) {
  return (
    <div className={`card p-5 border ${borderClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${colorClass}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${colorClass} opacity-60`}>{icon}</div>
      </div>
    </div>
  )
}
