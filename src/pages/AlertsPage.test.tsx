import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, seedMission } from '../db'
import { AlertsPage } from './AlertsPage'

describe('AlertsPage', () => {
  beforeEach(async () => {
    await seedMission(3, 100)
    await db.alerts.clear()
    await db.alerts.bulkAdd([
      {
        id: 'alert-1',
        astronautId: 'astro-1',
        timestamp: Date.now() - 1000,
        metric: 'heartRate',
        severity: 'critical',
        title: 'Resting heart rate critically elevated (85 bpm)',
        explanation: 'Heart rate is 27 bpm above personal baseline of 58 bpm.',
        suggestedAction: 'Sit and rest immediately; verify ECG telemetry.',
        acknowledged: false,
      },
      {
        id: 'alert-2',
        astronautId: 'astro-2',
        timestamp: Date.now() - 2000,
        metric: 'hrv',
        severity: 'warning',
        title: 'Reduced HRV recovery (38 ms)',
        explanation: 'HRV is 42% lower than personal baseline of 66 ms.',
        suggestedAction: 'Schedule 30m guided relaxation protocol.',
        acknowledged: false,
      },
      {
        id: 'alert-3',
        astronautId: 'astro-1',
        timestamp: Date.now() - 3000,
        metric: 'sleepHours',
        severity: 'watch',
        title: 'Short sleep duration (5.1h)',
        explanation: 'Recorded sleep is 1.7h below personal baseline of 6.8h.',
        suggestedAction: 'Review bedtime lighting protocol.',
        acknowledged: true,
      },
    ])
  })

  it('renders page heading and unacknowledged alerts by default', async () => {
    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Alerts' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Resting heart rate critically elevated (85 bpm)')).toBeInTheDocument()
      expect(screen.getByText('Reduced HRV recovery (38 ms)')).toBeInTheDocument()
      // alert-3 is acknowledged, so by default under "unack" filter it shouldn't show
      expect(screen.queryByText('Short sleep duration (5.1h)')).not.toBeInTheDocument()
    })
  })

  it('filters alerts by severity when clicking severity summary pill', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Resting heart rate critically elevated (85 bpm)')).toBeInTheDocument()
    })

    const criticalBtn = screen.getByRole('button', { name: /Critical/ })
    await user.click(criticalBtn)

    expect(screen.getByText('Resting heart rate critically elevated (85 bpm)')).toBeInTheDocument()
    expect(screen.queryByText('Reduced HRV recovery (38 ms)')).not.toBeInTheDocument()
  })

  it('acknowledges an alert when the acknowledge button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Resting heart rate critically elevated (85 bpm)')).toBeInTheDocument()
    })

    const ackButtons = screen.getAllByRole('button', { name: 'Acknowledge Alert' })
    await user.click(ackButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Resting heart rate critically elevated (85 bpm)')).not.toBeInTheDocument()
    })
  })
})
