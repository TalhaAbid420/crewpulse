import type { Severity } from '../sim'
import {
  AlertTriangleIcon,
  CheckIcon,
  CriticalAlertIcon,
  InfoIcon,
} from './icons'

interface Props {
  severity: Severity | 'nominal'
  size?: 'sm' | 'md'
}

export function SeverityBadge({ severity, size = 'md' }: Props) {
  const isSm = size === 'sm'

  switch (severity) {
    case 'critical':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-950/50 font-semibold text-rose-300 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <CriticalAlertIcon />
          <span>Critical</span>
        </span>
      )
    case 'warning':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/50 font-medium text-amber-300 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <AlertTriangleIcon />
          <span>Warning</span>
        </span>
      )
    case 'watch':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-950/30 font-medium text-amber-200 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <AlertTriangleIcon />
          <span>Watch</span>
        </span>
      )
    case 'nominal':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 font-medium text-emerald-300 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <CheckIcon />
          <span>Nominal</span>
        </span>
      )
    case 'info':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 font-medium text-cyan-300 ${
            isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
          }`}
        >
          <InfoIcon />
          <span>Info</span>
        </span>
      )
  }
}
