import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { db, seedMission } from './db'

describe('App shell', () => {
  // A tiny mission, so the first-run seeding step has nothing to do.
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await seedMission(1, 1)
  })

  it('shows the brand, the simulated-data badge and the footer disclaimer', () => {
    render(<App />)
    const header = screen.getByRole('banner')
    expect(within(header).getByText('CrewPulse')).toBeInTheDocument()
    expect(within(header).getByText('Simulated Data')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Prototype for NASA Space Apps Challenge. Simulated data. Not a medical device.',
      ),
    ).toBeInTheDocument()
  })

  it('offers all five routes and navigates between them', async () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const names = within(nav)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(names).toEqual([
      'Overview',
      'Crew Member',
      'Alerts',
      'Timeline',
      'About the Data',
    ])

    await userEvent.click(within(nav).getByRole('link', { name: 'Alerts' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Alerts' }),
    ).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Alerts' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('loads the 60-day demo mission on first run when the database is empty', async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    render(<App />)

    // The shell (with the disclaimer) is there straight away; the page waits for data.
    expect(screen.getByText(/Preparing the simulated mission data/)).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Overview' }, { timeout: 10_000 }),
    ).toBeInTheDocument()
    expect(await db.readings.count()).toBe(60 * 24 * 4)
  }, 15_000)
})

