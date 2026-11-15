import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, seedMission } from '../db'
import { OverviewPage } from './OverviewPage'

describe('OverviewPage', () => {
  beforeEach(async () => {
    await seedMission(3, 100)
  })

  it('renders Overview heading and mission metrics', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Day 3/)).toBeInTheDocument()
      expect(screen.getByText(/4 \/ 4 Reporting/)).toBeInTheDocument()
    })
  })

  it('renders all crew member cards with names and roles', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Mara Voss')).toBeInTheDocument()
      expect(screen.getByText('Kenji Aoyama')).toBeInTheDocument()
      expect(screen.getByText('Lucía Ferreira')).toBeInTheDocument()
      expect(screen.getByText('Dev Raman')).toBeInTheDocument()
    })

    expect(screen.getByText(/Commander/)).toBeInTheDocument()
    expect(screen.getByText(/Flight Engineer/)).toBeInTheDocument()
  })

  it('renders empty alert message when no alerts are active', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('No Active Alerts')).toBeInTheDocument()
  })

  it('renders active alert cards when alerts exist in database', async () => {
    await db.alerts.add({
      id: 'test-alert-1',
      astronautId: 'astro-1',
      timestamp: Date.now(),
      metric: 'heartRate',
      severity: 'warning',
      title: 'Resting heart rate elevated (+8 bpm)',
      explanation: 'Heart rate is 8 bpm higher than personal baseline of 58 bpm.',
      suggestedAction: 'Hydrate and reduce exercise resistance.',
      acknowledged: false,
    })

    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Resting heart rate elevated (+8 bpm)')).toBeInTheDocument()
      expect(screen.getByText(/Hydrate and reduce exercise/)).toBeInTheDocument()
    })
  })

  it('computes the telemetry and radiation tiles from stored data instead of fixed text', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Latest simulated reading \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/)).toBeInTheDocument()
      expect(screen.getByText(/mSv\/day \(simulated\)/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/100% Telemetry Online/)).not.toBeInTheDocument()
    expect(screen.queryByText(/LEO Background Rate/)).not.toBeInTheDocument()
  })
})
