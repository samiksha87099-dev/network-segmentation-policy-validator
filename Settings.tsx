import ZonesManagement from './ZonesManagement'
import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-5 h-5 text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">Manage network zones and application configuration</p>
        </div>
      </div>

      {/* App info */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Application Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Application</div>
            <div className="text-slate-300">Network Segmentation Policy Validator</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Version</div>
            <div className="text-slate-300">1.0.0</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Backend API</div>
            <div className="text-blue-400 font-mono">http://localhost:8000</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Graph Engine</div>
            <div className="text-slate-300">NetworkX + BFS/DFS</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Database</div>
            <div className="text-slate-300">SQLite (local)</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">API Docs</div>
            <a href="http://localhost:8000/api/docs" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              /api/docs (Swagger UI)
            </a>
          </div>
        </div>
      </div>

      {/* Zone management */}
      <ZonesManagement />
    </div>
  )
}
