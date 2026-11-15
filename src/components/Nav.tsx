import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  AboutIcon,
  AlertsIcon,
  CrewIcon,
  OverviewIcon,
  TimelineIcon,
} from './icons'

const links: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/', label: 'Overview', icon: <OverviewIcon /> },
  { to: '/crew', label: 'Crew Member', icon: <CrewIcon /> },
  { to: '/alerts', label: 'Alerts', icon: <AlertsIcon /> },
  { to: '/timeline', label: 'Timeline', icon: <TimelineIcon /> },
  { to: '/about', label: 'About the Data', icon: <AboutIcon /> },
]

// One nav, two layouts: a bottom tab bar on phones, a left sidebar from md up.
// The active page is shown with a filled background, bold text and aria-current,
// not by color alone.
export function Nav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:sticky md:top-14 md:bottom-auto md:h-[calc(100dvh-3.5rem)] md:w-60 md:shrink-0 md:self-start md:border-t-0 md:border-r md:pb-0"
    >
      <ul className="flex md:flex-col md:gap-1 md:p-3">
        {links.map(({ to, label, icon }) => (
          <li key={to} className="flex-1 md:flex-none">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-md md:border-l-4 md:px-3 md:text-sm',
                  isActive
                    ? 'bg-raised font-semibold text-fg md:border-signal'
                    : 'text-muted hover:bg-raised hover:text-fg md:border-transparent',
                ].join(' ')
              }
            >
              {icon}
              <span className="text-center leading-tight">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
