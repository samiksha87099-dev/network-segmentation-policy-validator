import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  Shield,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react'

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/topology',   icon: Network,          label: 'Network Topology' },
  { to: '/rules',      icon: Shield,           label: 'Firewall Rules' },
  { to: '/policies',   icon: FileText,         label: 'Policies' },
  { to: '/validator',  icon: PlayCircle,       label: 'Validator' },
  { to: '/violations', icon: AlertTriangle,    label: 'Violations' },
  { to: '/reports',    icon: BarChart3,        label: 'Reports' },
  { to: '/settings',   icon: Settings,         label: 'Settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 flex-shrink-0 bg-[#161b28] border-r border-[#2d3748] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#2d3748]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">NetSeg</div>
            <div className="text-xs text-slate-500 leading-tight">Policy Validator</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                  : 'text-slate-400 hover:bg-[#1e2433] hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2d3748]">
        <div className="text-xs text-slate-600 text-center">
          Cybersecurity · Graph Analysis
        </div>
      </div>
    </aside>
  )
}
