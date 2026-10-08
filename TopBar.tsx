import { ShieldCheck, Wifi } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="h-14 bg-[#161b28] border-b border-[#2d3748] flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-white leading-tight">
          Network Segmentation Policy Validator
        </h1>
        <p className="text-xs text-slate-500 leading-tight">
          Analyze network zones and firewall rules to detect unintended communication paths
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1f2e] border border-[#2d3748] rounded-full text-xs text-slate-400">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
          API Online
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-900/20 border border-blue-800/30 rounded text-xs text-blue-400">
          <ShieldCheck className="w-3 h-3" />
          Cybersecurity
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-purple-900/20 border border-purple-800/30 rounded text-xs text-purple-400">
          <Wifi className="w-3 h-3" />
          Network Security
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-green-900/20 border border-green-800/30 rounded text-xs text-green-400">
          Graph Analysis
        </div>
      </div>
    </header>
  )
}
