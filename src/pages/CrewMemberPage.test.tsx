import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedMission } from '../db'
import { CrewMemberPage } from './CrewMemberPage'

describe('CrewMemberPage', () => {
  beforeEach(async () => {
    await seedMission(3, 100)
  })

  it('renders crew selection buttons for all astronauts', async () => {
    render(
      <MemoryRouter initialEntries={['/crew?id=astro-1']}>
        <CrewMemberPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mara Voss/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Kenji Aoyama/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Lucía Ferreira/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Dev Raman/ })).toBeInTheDocument()
    })
  })

  it('displays the active astronaut profile and baseline metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/crew?id=astro-1']}>
        <CrewMemberPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Mara Voss/ })).toBeInTheDocument()
      expect(screen.getAllByText(/Commander/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Personal Baseline:/).length).toBeGreaterThan(0)
    })
  })

  it('toggles accessible data table alternative for the chart', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/crew?id=astro-1']}>
        <CrewMemberPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Accessible Table' })).toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole('button', { name: 'Accessible Table' })
    await user.click(toggleBtn)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Time / Day')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Chart' })).toBeInTheDocument()
  })
})
