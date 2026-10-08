import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Network,
  PlayCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import { SeverityBadge, StatusBadge } from '../components/Badges'
import { fetchStatistics, fetchViolations } from '../services/api'
import { formatDate, formatViolationType } from '../utils/formatters'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  INFO: '#10b981',
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: fetchStatistics,
    refetchInterval: 60_000,
  })
  const { data: violations } = useQuery({
    queryKey: ['violations'],
    queryFn: fetchViolations,
  })

  const recentViolations = violations
    ?.filter((v) => v.status !== 'RESOLVED')
    .slice(0, 5) ?? []

  const severityChartData = stats
    ? [
        { name: 'CRITICAL', value: stats.critical, color: '#ef4444' },
        { name: 'HIGH', value: stats.high, color: '#f97316' },
        { name: 'MEDIUM', value: stats.medium, color: '#eab308' },
        { name: 'LOW', value: stats.low, color: '#3b82f6' },
        { name: 'INFO', value: stats.info, color: '#10b981' },
      ].filter((d) => d.value > 0)
    : []

  const typeChartData = stats
    ? Object.entries(stats.violations_by_type).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').split(' ').slice(0, 2).join(' '),
        fullName: name,
        value,
      }))
    : []

  const rulesData = stats
    ? [
        { name: 'ALLOW', value: stats.allow_rules, color: '#10b981' },
        { name: 'DENY', value: stats.deny_rules, color: '#ef4444' },
      ]
    : []

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Network Security Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {stats?.last_validation
              ? `Last validation: ${formatDate(stats.last_validation)}`
              : 'No validation run yet — go to Validator to analyze'}
          </p>
        </div>
        <Link to="/validator" className="btn-primary">
          <PlayCircle className="w-4 h-4" />
          Run Validation
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Network Zones"
          value={stats?.zones ?? 0}
          icon={<Globe className="w-7 h-7" />}
          colorClass="text-blue-400"
          borderClass="border-blue-800/30"
        />
        <StatCard
          title="Firewall Rules"
          value={stats?.rules ?? 0}
          icon={<Shield className="w-7 h-7" />}
          colorClass="text-cyan-400"
          borderClass="border-cyan-800/30"
        />
        <StatCard
          title="Allowed Rules"
          value={stats?.allow_rules ?? 0}
          icon={<CheckCircle className="w-7 h-7" />}
          colorClass="text-green-400"
          borderClass="border-green-800/30"
        />
        <StatCard
          title="Denied Rules"
          value={stats?.deny_rules ?? 0}
          icon={<XCircle className="w-7 h-7" />}
          colorClass="text-red-400"
          borderClass="border-red-800/30"
        />
        <StatCard
          title="Violations"
          value={stats?.violations ?? 0}
          icon={<AlertTriangle className="w-7 h-7" />}
          colorClass="text-orange-400"
          borderClass="border-orange-800/30"
        />
        <StatCard
          title="Critical"
          value={stats?.critical ?? 0}
          subtitle={`${stats?.high ?? 0} HIGH`}
          icon={<TrendingUp className="w-7 h-7" />}
          colorClass="text-red-400"
          borderClass="border-red-800/40"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity distribution */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Violations by Severity</h2>
          {severityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  nameKey="name"
                >
                  {severityChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 6 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-slate-500 text-sm">
              Run validation to see data
            </div>
          )}
        </div>

        {/* Violations by type */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Violations by Type</h2>
          {typeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 6 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v, _name, props) => [v, (props.payload as any)?.fullName?.replace(/_/g, ' ')]}
                />
                <Bar dataKey="value" radius={3}>
                  {typeChartData.map((_, i) => (
                    <Cell key={i} fill={['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#10b981'][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-44 text-slate-500 text-sm">
              Run validation to see data
            </div>
          )}
        </div>

        {/* Allow vs Deny */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Allowed vs Denied Rules</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rulesData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: 6 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="value" radius={4}>
                {rulesData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: topology mini + recent violations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Zone connectivity */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Zone Connectivity</h2>
            <Link to="/topology" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View Graph <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.zone_connectivity && stats.zone_connectivity.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-[#2d3748]">
                  <th className="text-left pb-2">Zone</th>
                  <th className="text-right pb-2">In</th>
                  <th className="text-right pb-2">Out</th>
                  <th className="text-right pb-2">Reaches</th>
                </tr>
              </thead>
              <tbody>
                {stats.zone_connectivity.map((z) => (
                  <tr key={z.zone} className="border-b border-[#1e2433]">
                    <td className="py-2 text-slate-300">{z.zone}</td>
                    <td className="py-2 text-right text-slate-400">{z.in_connections}</td>
                    <td className="py-2 text-right text-slate-400">{z.out_connections}</td>
                    <td className="py-2 text-right text-green-400">{z.reachable_zones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              No connectivity data
            </div>
          )}
        </div>

        {/* Recent violations */}
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Recent Violations</h2>
            <Link to="/violations" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentViolations.length > 0 ? (
            <div className="space-y-2">
              {recentViolations.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 bg-[#161b28] rounded-lg border border-[#2d3748] hover:border-[#374151] transition-colors"
                >
                  <div className="flex-shrink-0">
                    <SeverityBadge severity={v.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 font-medium">
                      {v.source_zone} → {v.destination_zone}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {formatViolationType(v.violation_type)}
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 text-sm gap-2">
              <Network className="w-8 h-8 opacity-30" />
              No open violations — run validation first
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
