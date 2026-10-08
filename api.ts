import axios from 'axios'
import type {
  Zone,
  FirewallRule,
  Policy,
  Violation,
  ValidationResult,
  GraphData,
  Statistics,
  ReportSummary,
} from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
})

// Zones
export const fetchZones = () => api.get<Zone[]>('/zones').then((r) => r.data)
export const createZone = (data: Partial<Zone>) => api.post<Zone>('/zones', data).then((r) => r.data)
export const updateZone = (id: string, data: Partial<Zone>) => api.put<Zone>(`/zones/${id}`, data).then((r) => r.data)
export const deleteZone = (id: string) => api.delete(`/zones/${id}`).then((r) => r.data)

// Firewall Rules
export const fetchRules = () => api.get<FirewallRule[]>('/rules').then((r) => r.data)
export const createRule = (data: Partial<FirewallRule>) => api.post<FirewallRule>('/rules', data).then((r) => r.data)
export const updateRule = (id: string, data: Partial<FirewallRule>) => api.put<FirewallRule>(`/rules/${id}`, data).then((r) => r.data)
export const deleteRule = (id: string) => api.delete(`/rules/${id}`).then((r) => r.data)

// Policies
export const fetchPolicies = () => api.get<Policy[]>('/policies').then((r) => r.data)
export const createPolicy = (data: Partial<Policy>) => api.post<Policy>('/policies', data).then((r) => r.data)
export const updatePolicy = (id: string, data: Partial<Policy>) => api.put<Policy>(`/policies/${id}`, data).then((r) => r.data)
export const deletePolicy = (id: string) => api.delete(`/policies/${id}`).then((r) => r.data)

// Validation
export const runValidation = () => api.post<ValidationResult>('/validate').then((r) => r.data)

// Violations
export const fetchViolations = () => api.get<Violation[]>('/violations').then((r) => r.data)
export const fetchViolation = (id: string) => api.get<Violation>(`/violations/${id}`).then((r) => r.data)
export const updateViolationStatus = (id: string, status: string) =>
  api.put<Violation>(`/violations/${id}/status`, { status }).then((r) => r.data)

// Graph
export const fetchGraph = () => api.get<GraphData>('/graph').then((r) => r.data)

// Statistics
export const fetchStatistics = () => api.get<Statistics>('/statistics').then((r) => r.data)

// Reports
export const fetchReportSummary = () => api.get<ReportSummary>('/reports/summary').then((r) => r.data)

// Export
export const exportData = () => api.get('/export').then((r) => r.data)

// Import
export const importConfig = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
