import { useState, type ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Upload, Download, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchRules, createRule, updateRule, deleteRule, importConfig, fetchZones } from '../services/api'
import type { FirewallRule } from '../types'
import Modal from '../components/Modal'
import { ActionBadge } from '../components/Badges'

const PROTOCOLS = ['ANY', 'TCP', 'UDP', 'ICMP']
const ACTIONS = ['ALLOW', 'DENY']

const emptyForm = {
  source_zone: '',
  destination_zone: '',
  protocol: 'TCP',
  source_port: 'ANY',
  destination_port: 'ANY',
  action: 'ALLOW',
  direction: 'INBOUND',
  priority: 100,
  description: '',
  enabled: true,
}

export default function FirewallRules() {
  const qc = useQueryClient()
  const { data: rules = [], isLoading } = useQuery({ queryKey: ['rules'], queryFn: fetchRules })
  const { data: zones = [] } = useQuery({ queryKey: ['zones'], queryFn: fetchZones })

  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<FirewallRule | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); qc.invalidateQueries({ queryKey: ['statistics'] }); setShowModal(false); toast.success('Rule created') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create rule'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateRule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); setShowModal(false); toast.success('Rule updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update rule'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rules'] }); qc.invalidateQueries({ queryKey: ['statistics'] }); setConfirmDelete(null); toast.success('Rule deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to delete rule'),
  })
  const importMutation = useMutation({
    mutationFn: importConfig,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      toast.success(`Imported ${d.imported} rules${d.errors?.length ? ` (${d.errors.length} errors)` : ''}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Import failed'),
  })

  const filtered = rules.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.rule_id.toLowerCase().includes(q) || r.source_zone.toLowerCase().includes(q) || r.destination_zone.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    const matchAction = !filterAction || r.action === filterAction
    const matchZone = !filterZone || r.source_zone === filterZone || r.destination_zone === filterZone
    return matchSearch && matchAction && matchZone
  })

  const openCreate = () => { setEditingRule(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (r: FirewallRule) => { setEditingRule(r); setForm({ ...r }); setShowModal(true) }
  const handleSubmit = () => {
    if (!form.source_zone || !form.destination_zone) { toast.error('Source and destination zones are required'); return }
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.rule_id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  const handleExport = () => {
    const json = JSON.stringify({ rules }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'firewall_rules.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const zoneNames = zones.map((z) => z.name)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Firewall Rules</h1>
          <p className="text-sm text-slate-400">{rules.length} rules total — {rules.filter(r => r.action === 'ALLOW').length} ALLOW, {rules.filter(r => r.action === 'DENY').length} DENY</p>
        </div>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".json,.csv" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="form-input pl-9"
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select w-36" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="">All Actions</option>
          <option value="ALLOW">ALLOW</option>
          <option value="DENY">DENY</option>
        </select>
        <select className="form-select w-44" value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
          <option value="">All Zones</option>
          {zoneNames.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        {(search || filterAction || filterZone) && (
          <button onClick={() => { setSearch(''); setFilterAction(''); setFilterZone('') }} className="text-xs text-slate-400 hover:text-white px-2">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Source Zone</th>
              <th>Destination Zone</th>
              <th>Protocol</th>
              <th>Dst Port</th>
              <th>Action</th>
              <th>Priority</th>
              <th>Enabled</th>
              <th>Description</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-slate-500">No rules found</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.rule_id} className={!r.enabled ? 'opacity-40' : ''}>
                  <td className="font-mono text-xs text-blue-400">{r.rule_id}</td>
                  <td className="text-slate-300">{r.source_zone}</td>
                  <td className="text-slate-300">{r.destination_zone}</td>
                  <td className="text-slate-400 text-xs">{r.protocol}</td>
                  <td className="text-slate-400 text-xs font-mono">{r.destination_port}</td>
                  <td><ActionBadge action={r.action} /></td>
                  <td className="text-slate-400 text-xs">{r.priority}</td>
                  <td>
                    {r.enabled
                      ? <ToggleRight className="w-4 h-4 text-green-400" />
                      : <ToggleLeft className="w-4 h-4 text-slate-600" />
                    }
                  </td>
                  <td className="text-slate-500 text-xs max-w-[200px] truncate">{r.description}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(r.rule_id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRule ? `Edit Rule: ${editingRule.rule_id}` : 'Add Firewall Rule'}
      >
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
            <label className="block text-xs text-slate-400 mb-1">Protocol</label>
            <select className="form-select" value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
              {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Action</label>
            <select className="form-select" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Source Port</label>
            <input className="form-input" value={form.source_port} onChange={(e) => setForm({ ...form, source_port: e.target.value })} placeholder="ANY" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Destination Port</label>
            <input className="form-input" value={form.destination_port} onChange={(e) => setForm({ ...form, destination_port: e.target.value })} placeholder="ANY or 443" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Priority</label>
            <input className="form-input" type="number" min={1} max={1000} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Direction</label>
            <select className="form-select" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="INBOUND">INBOUND</option>
              <option value="OUTBOUND">OUTBOUND</option>
              <option value="BOTH">BOTH</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Rule description..." />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="enabled" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
            <label htmlFor="enabled" className="text-sm text-slate-300">Rule Enabled</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn-primary"
          >
            {editingRule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Rule" size="sm">
        <p className="text-slate-300 text-sm">
          Are you sure you want to delete rule <span className="text-blue-400 font-mono">{confirmDelete}</span>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
          <button onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)} className="btn-danger">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
