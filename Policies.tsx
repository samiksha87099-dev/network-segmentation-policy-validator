import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchPolicies, createPolicy, updatePolicy, deletePolicy, fetchZones } from '../services/api'
import type { Policy } from '../types'
import Modal from '../components/Modal'
import { SeverityBadge, ActionBadge } from '../components/Badges'

const PROTOCOLS = ['ANY', 'TCP', 'UDP', 'ICMP']
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const ACTIONS = ['ALLOW', 'DENY']

const emptyForm = {
  source_zone: '',
  destination_zone: '',
  protocol: 'ANY',
  port: 'ANY',
  required_action: 'DENY',
  severity: 'MEDIUM',
  description: '',
}

export default function Policies() {
  const qc = useQueryClient()
  const { data: policies = [], isLoading } = useQuery({ queryKey: ['policies'], queryFn: fetchPolicies })
  const { data: zones = [] } = useQuery({ queryKey: ['zones'], queryFn: fetchZones })

  const [search, setSearch] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Policy | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); qc.invalidateQueries({ queryKey: ['statistics'] }); setShowModal(false); toast.success('Policy created') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create policy'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePolicy(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); setShowModal(false); toast.success('Policy updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update policy'),
  })
  const deleteMutation = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); qc.invalidateQueries({ queryKey: ['statistics'] }); setConfirmDelete(null); toast.success('Policy deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to delete policy'),
  })

  const filtered = policies.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.policy_id.toLowerCase().includes(q) || p.source_zone.toLowerCase().includes(q) || p.destination_zone.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    const matchSeverity = !filterSeverity || p.severity === filterSeverity
    return matchSearch && matchSeverity
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (p: Policy) => { setEditing(p); setForm({ source_zone: p.source_zone, destination_zone: p.destination_zone, protocol: p.protocol, port: p.port, required_action: p.required_action, severity: p.severity, description: p.description }); setShowModal(true) }

  const handleSubmit = () => {
    if (!form.source_zone || !form.destination_zone) { toast.error('Source and destination zones are required'); return }
    if (editing) {
      updateMutation.mutate({ id: editing.policy_id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const zoneNames = zones.map((z) => z.name)

  const severityColors: Record<string, string> = {
    CRITICAL: 'border-l-red-500',
    HIGH: 'border-l-orange-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-blue-500',
    INFO: 'border-l-green-500',
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Security Policies</h1>
          <p className="text-sm text-slate-400">{policies.length} policies — defines required access controls between zones</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Policy
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="form-input pl-9" placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select w-40" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Policy cards */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading policies...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No policies found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.policy_id} className={`card p-4 border-l-4 ${severityColors[p.severity] || 'border-l-slate-600'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono text-xs text-slate-500">{p.policy_id}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <SeverityBadge severity={p.severity} />
                    <ActionBadge action={p.required_action} />
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(p.policy_id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                <span className="text-blue-400">{p.source_zone}</span>
                <span className="text-slate-500">→</span>
                <span className="text-purple-400">{p.destination_zone}</span>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>Protocol: <span className="text-slate-400">{p.protocol}</span> — Port: <span className="text-slate-400">{p.port}</span></div>
                {p.description && <div className="text-slate-600 line-clamp-2">{p.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? `Edit: ${editing.policy_id}` : 'Add Security Policy'}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Source Zone *</label>
            <select className="form-select" value={form.source_zone} onChange={(e) => setForm({ ...form, source_zone: e.target.value })}>
              <option value="">Select zone...</option>
              {zoneNames.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Destination Zone *</label>
            <select className="form-select" value={form.destination_zone} onChange={(e) => setForm({ ...form, destination_zone: e.target.value })}>
              <option value="">Select zone...</option>
              {zoneNames.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Required Action</label>
            <select className="form-select" value={form.required_action} onChange={(e) => setForm({ ...form, required_action: e.target.value })}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Severity</label>
            <select className="form-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Protocol</label>
            <select className="form-select" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
              {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Port</label>
            <input className="form-input" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="ANY or 443" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea className="form-input h-20 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Policy description..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
            {editing ? 'Update Policy' : 'Create Policy'}
          </button>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Policy" size="sm">
        <p className="text-slate-300 text-sm">Delete policy <span className="text-blue-400 font-mono">{confirmDelete}</span>?</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
          <button onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  )
}
