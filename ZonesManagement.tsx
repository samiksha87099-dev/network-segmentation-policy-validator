import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchZones, createZone, updateZone, deleteZone } from '../services/api'
import type { Zone } from '../types'
import Modal from '../components/Modal'
import { ZoneTypeBadge } from '../components/Badges'
import { formatDate } from '../utils/formatters'

const ZONE_TYPES = ['External', 'DMZ', 'Internal', 'Restricted', 'Management', 'Guest']

const emptyForm = {
  name: '',
  description: '',
  trust_level: 0,
  network_cidr: '',
  zone_type: 'Internal',
}

// This page is used in Settings
export default function ZonesManagement() {
  const qc = useQueryClient()
  const { data: zones = [], isLoading } = useQuery({ queryKey: ['zones'], queryFn: fetchZones })

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Zone | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: createZone,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); qc.invalidateQueries({ queryKey: ['statistics'] }); setShowModal(false); toast.success('Zone created') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to create zone'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateZone(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setShowModal(false); toast.success('Zone updated') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to update zone'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteZone,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); qc.invalidateQueries({ queryKey: ['statistics'] }); setConfirmDelete(null); toast.success('Zone deleted') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed to delete zone'),
  })

  const filtered = zones.filter((z) => {
    const q = search.toLowerCase()
    const matchSearch = !q || z.name.toLowerCase().includes(q) || z.description.toLowerCase().includes(q) || z.network_cidr.toLowerCase().includes(q)
    const matchType = !filterType || z.zone_type === filterType
    return matchSearch && matchType
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (z: Zone) => { setEditing(z); setForm({ name: z.name, description: z.description, trust_level: z.trust_level, network_cidr: z.network_cidr, zone_type: z.zone_type }); setShowModal(true) }

  const handleSubmit = () => {
    if (!form.name) { toast.error('Zone name is required'); return }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Network Zones</h2>
          <p className="text-sm text-slate-400">{zones.length} zones defined</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Zone
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="form-input pl-9" placeholder="Search zones..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select w-40" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {ZONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Zone Name</th>
              <th>Type</th>
              <th>Trust Level</th>
              <th>CIDR</th>
              <th>Description</th>
              <th>Created</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No zones found</td></tr>
            ) : (
              filtered.map((z) => (
                <tr key={z.id}>
                  <td className="font-medium text-white flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    {z.name}
                  </td>
                  <td><ZoneTypeBadge zoneType={z.zone_type} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-sm ${i < z.trust_level ? 'bg-blue-500' : 'bg-[#2d3748]'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">{z.trust_level}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-400">{z.network_cidr || '—'}</td>
                  <td className="text-slate-500 text-xs max-w-[200px] truncate">{z.description || '—'}</td>
                  <td className="text-slate-500 text-xs">{formatDate(z.created_at).split(',')[0]}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(z)} className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDelete(z.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? `Edit Zone: ${editing.name}` : 'Add Network Zone'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Zone Name *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. DMZ, Application..." />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Zone Type</label>
            <select className="form-select" value={form.zone_type} onChange={(e) => setForm({ ...form, zone_type: e.target.value })}>
              {ZONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Trust Level (0–10)</label>
            <input className="form-input" type="number" min={0} max={10} value={form.trust_level} onChange={(e) => setForm({ ...form, trust_level: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Network CIDR</label>
            <input className="form-input" value={form.network_cidr} onChange={(e) => setForm({ ...form, network_cidr: e.target.value })} placeholder="e.g. 10.10.20.0/24" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea className="form-input h-20 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Zone description..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
            {editing ? 'Update Zone' : 'Create Zone'}
          </button>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Zone" size="sm">
        <p className="text-slate-300 text-sm">Delete zone <span className="text-blue-400">{zones.find(z => z.id === confirmDelete)?.name}</span>? This may affect firewall rules and policies.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
          <button onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete)} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  )
}
