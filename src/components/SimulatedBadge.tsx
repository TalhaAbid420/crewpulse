import { FlaskIcon } from './icons'

// Always visible in the header: crew data is simulated (CLAUDE.md principle 4).
// Uses an icon + words + a dashed border, so it never relies on color alone.
export function SimulatedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-caution px-2.5 py-1 text-xs font-medium text-caution sm:px-3 sm:text-sm"
      title="All crew data in this app is simulated."
    >
      <FlaskIcon />
      Simulated Data
    </span>
  )
}
