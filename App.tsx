import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import NetworkTopology from './pages/NetworkTopology'
import FirewallRules from './pages/FirewallRules'
import Policies from './pages/Policies'
import Validator from './pages/Validator'
import Violations from './pages/Violations'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#0e121c]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/topology"   element={<NetworkTopology />} />
              <Route path="/rules"      element={<FirewallRules />} />
              <Route path="/policies"   element={<Policies />} />
              <Route path="/validator"  element={<Validator />} />
              <Route path="/violations" element={<Violations />} />
              <Route path="/reports"    element={<Reports />} />
              <Route path="/settings"   element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
