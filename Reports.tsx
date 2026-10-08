import { useQuery } from '@tanstack/react-query'
import { Download, Clock, CheckCircle } from 'lucide-react'
import { fetchReportSummary, exportData } from '../services/api'
import { SeverityBadge } from '../components/Badges'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import toast from 'react-hot-toast'
import { formatDate } from '../utils/formatters'

const SEV_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  INFO: '#10b981',
}

export default function Reports() {
  const { data: report, isLoading } = useQuery({ queryKey: ['report-summary'], queryFn: fetchReportSummary })

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await exportData()
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'network_validator_export.json'; a.click()
        URL.revokeObjectURL(url)
        toast.success('Exported as JSON')
      } else {
        // CSV for violations
        const violations = data.violations || []
        const headers = ['id', 'severity', 'violation_type', 'source_zone', 'destination_zone', 'path', 'status', 'explanation']
        const rows = violations.map((v: any) => headers.map((h) => `"${(v[h] || '').toString().replace(/"/g, '""')}"`).join(','))
        const csv = [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'violations.csv'; a.click()
        URL.revokeObjectURL(url)
        toast.success('Exported violations as CSV')
      }
    } catch {
      toast.error('Export failed')
    }
  }

  const severityData = report
    ? Object.entries(report.severity_counts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, color: SEV_COLORS[name] || '#6b7280' }))
    : []

  const typeData = report
    ? Object.entries(report.type_counts)
        .map(([name, value]) => ({ name: name.replace(/_/g, ' ').split(' ').slice(0, 2).join(' '), fullName: name, value }))
    : []

  const statusData = report
    ? Object.entries(report.status_counts).map(([name, value]) => ({ name, value }))
    : []

  if (isLoading) return <div className="p-6 text-slate-400">Loading report...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-400">Security posture overview and export</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('json')} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Zones', value: report?.zones ?? 0, color: 'text-blue-400' },
          { label: 'Rules', value: report?.rules ?? 0, color: 'text-cyan-400' },
          { label: 'Policies', value: report?.policies ?? 0, color: 'text-purple-400' },
          { label: 'Total Violations', value: report?.total_violations ?? 0, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Violations by Severity</h2>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name">
                  {severityData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 6 }} />
                <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No violation data</div>
          )}
        </div>

        {/* Type */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Violations by Type</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 6 }}
                  formatter={(v, _name, p) => [v, (p.payload as any)?.fullName?.replace(/_/g, ' ')]}
                />
                <Bar dataKey="value" radius={3}>
                  {typeData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4'][i % 5]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No violation data</div>
          )}
        </div>

        {/* Status */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Violation Status</h2>
          {statusData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 6 }} />
                <Bar dataKey="value" radius={4}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#eab308" />
                  <Cell fill="#10b981" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No violation data</div>
          )}
        </div>
      </div>

      {/* Recent validation runs */}
      {report?.recent_runs && report.recent_runs.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Recent Validation Runs
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Validation ID</th>
                <th>Timestamp</th>
                <th>Violations</th>
                <th>Critical</th>
              </tr>
            </thead>
            <tbody>
              {report.recent_runs.map((run) => (
                <tr key={run.id}>
                  <td className="font-mono text-xs text-blue-400">{run.id}</td>
                  <td className="text-slate-400 text-sm">{formatDate(run.timestamp)}</td>
                  <td>
                    {run.violations === 0
                      ? <span className="text-green-400 text-sm flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Clean</span>
                      : <span className="text-orange-400 text-sm">{run.violations}</span>
                    }
                  </td>
                  <td>
                    {run.critical > 0
                      ? <SeverityBadge severity="CRITICAL" />
                      : <span className="text-slate-600 text-xs">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
