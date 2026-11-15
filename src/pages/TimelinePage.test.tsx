import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedMission } from '../db'
import { TimelinePage } from './TimelinePage'

describe('TimelinePage', () => {
  beforeEach(async () => {
    await seedMission(3, 100)
  })

  it('renders Timeline page heading and mission scenario cards', async () => {
    render(
      <MemoryRouter>
        <TimelinePage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Mission Health Timeline' })).toBeInTheDocument()
    expect(screen.getByText('Solar Particle Event (SPE)')).toBeInTheDocument()
    expect(screen.getByText('Acoustic Sleep Disruption')).toBeInTheDocument()
  })

  it('toggles accessible table alternative for multi-crew timeline', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TimelinePage />
      </MemoryRouter>,
    )

    const tableToggle = screen.getByRole('button', { name: 'Accessible Table' })
    await user.click(tableToggle)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Time / Day')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Chart' })).toBeInTheDocument()
  })
})
