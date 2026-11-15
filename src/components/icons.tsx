import type { SVGProps } from 'react'

// Small stroke icons. Decorative: the text label next to each one carries the meaning.
function Icon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  )
}

export const OverviewIcon = () => (
  <Icon>
    <rect x="3" y="3" width="7" height="8" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="15" width="7" height="6" rx="1.5" />
  </Icon>
)

export const CrewIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </Icon>
)

export const AlertsIcon = () => (
  <Icon>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.5v.01" />
  </Icon>
)

export const TimelineIcon = () => (
  <Icon>
    <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
  </Icon>
)

export const AboutIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.5v.01" />
  </Icon>
)

export const FlaskIcon = () => (
  <Icon width="16" height="16">
    <path d="M9 3h6" />
    <path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3" />
    <path d="M7.5 15h9" />
  </Icon>
)

export const MenuIcon = () => (
  <Icon>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Icon>
)

export const PulseMark = () => (
  <svg
    viewBox="0 0 64 64"
    width="28"
    height="28"
    aria-hidden="true"
    focusable="false"
  >
    <rect width="64" height="64" rx="12" fill="#0b1220" stroke="#2a3a57" strokeWidth="2" />
    <path
      d="M8 34h13l6-16 10 30 7-22 4 8h8"
      fill="none"
      stroke="#52d6c8"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const CheckIcon = () => (
  <Icon className="text-emerald-400">
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)

export const AlertTriangleIcon = () => (
  <Icon className="text-amber-400">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
)

export const CriticalAlertIcon = () => (
  <Icon className="text-rose-400">
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </Icon>
)

export const InfoIcon = () => (
  <Icon className="text-cyan-400">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Icon>
)

export const HeartIcon = () => (
  <Icon>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </Icon>
)

export const MoonIcon = () => (
  <Icon>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Icon>
)

export const ShieldIcon = () => (
  <Icon>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
  </Icon>
)

export const ArrowRightIcon = () => (
  <Icon width="16" height="16">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
)

