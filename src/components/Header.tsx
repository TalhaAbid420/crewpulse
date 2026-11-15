import { HeaderMenu } from './HeaderMenu'
import { SimulatedBadge } from './SimulatedBadge'
import { PulseMark } from './icons'

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-line bg-panel px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <PulseMark />
        <span className="text-lg font-semibold tracking-tight">CrewPulse</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <SimulatedBadge />
        <HeaderMenu />
      </div>
    </header>
  )
}
