import type { SeverityType, ViolationStatus, ZoneType, ActionType } from '../types'

export function getSeverityClass(severity: SeverityType | string): string {
  switch (severity) {
    case 'CRITICAL': return 'badge-critical'
    case 'HIGH':     return 'badge-high'
    case 'MEDIUM':   return 'badge-medium'
    case 'LOW':      return 'badge-low'
    case 'INFO':     return 'badge-info'
    default:         return 'badge-info'
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '#ef4444'
    case 'HIGH':     return '#f97316'
    case 'MEDIUM':   return '#eab308'
    case 'LOW':      return '#3b82f6'
    case 'INFO':     return '#10b981'
    default:         return '#6b7280'
  }
}

export function getStatusClass(status: ViolationStatus | string): string {
  switch (status) {
    case 'OPEN':         return 'badge-open'
    case 'ACKNOWLEDGED': return 'badge-acknowledged'
    case 'RESOLVED':     return 'badge-resolved'
    default:             return 'badge-open'
  }
}

export function getZoneTypeColor(zoneType: ZoneType | string): string {
  switch (zoneType) {
    case 'External':   return '#ef4444'
    case 'DMZ':        return '#f97316'
    case 'Internal':   return '#3b82f6'
    case 'Restricted': return '#8b5cf6'
    case 'Management': return '#eab308'
    case 'Guest':      return '#6b7280'
    default:           return '#6b7280'
  }
}

export function getZoneTypeBg(zoneType: ZoneType | string): string {
  switch (zoneType) {
    case 'External':   return 'bg-red-900/30 text-red-400 border border-red-800/40'
    case 'DMZ':        return 'bg-orange-900/30 text-orange-400 border border-orange-800/40'
    case 'Internal':   return 'bg-blue-900/30 text-blue-400 border border-blue-800/40'
    case 'Restricted': return 'bg-purple-900/30 text-purple-400 border border-purple-800/40'
    case 'Management': return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40'
    case 'Guest':      return 'bg-gray-800/50 text-gray-400 border border-gray-700/40'
    default:           return 'bg-gray-800/50 text-gray-400 border border-gray-700/40'
  }
}

export function getActionClass(action: ActionType | string): string {
  return action === 'ALLOW'
    ? 'bg-green-900/30 text-green-400 border border-green-800/40'
    : 'bg-red-900/30 text-red-400 border border-red-800/40'
}

export function formatViolationType(type: string): string {
  return type.replace(/_/g, ' ')
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}
