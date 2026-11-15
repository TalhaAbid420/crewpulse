import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, seedMission } from '../db'
import { DataGate } from './DataGate'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await seedMission(1, 1)
})

describe('DataGate', () => {
  it('shows a loading message, then the page', async () => {
    render(
      <DataGate>
        <p>Page content</p>
      </DataGate>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Preparing the simulated mission data')
    expect(screen.queryByText('Page content')).not.toBeInTheDocument()
    expect(await screen.findByText('Page content')).toBeInTheDocument()
  })

  it('explains when local storage is blocked, and recovers on retry', async () => {
    const user = userEvent.setup()
    const spy = vi.spyOn(db.astronauts, 'count').mockRejectedValueOnce(new Error('blocked'))
    render(
      <DataGate>
        <p>Page content</p>
      </DataGate>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not open the local data store')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Page content')).toBeInTheDocument()
    spy.mockRestore()
  })
})
