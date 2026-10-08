import type { ReactNode } from 'react'
import type { SeverityType, ViolationStatus } from '../types'
import {
  getSeverityClass,
  getStatusClass,
  getZoneTypeBg,
  getActionClass,
} from '../utils/formatters'

interface BadgeProps {
  children: ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: SeverityType | string }) {
  return (
    <Badge className={getSeverityClass(severity)}>
      {severity}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: ViolationStatus | string }) {
  return (
    <Badge className={getStatusClass(status)}>
      {status}
    </Badge>
  )
}

export function ZoneTypeBadge({ zoneType }: { zoneType: string }) {
  return (
    <Badge className={getZoneTypeBg(zoneType)}>
      {zoneType}
    </Badge>
  )
}

export function ActionBadge({ action }: { action: string }) {
  return (
    <Badge className={getActionClass(action)}>
      {action}
    </Badge>
  )
}
