import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDemoData } from '../db'
import { HeaderMenu } from './HeaderMenu'

vi.mock('../db', () => ({ resetDemoData: vi.fn() }))
const reset = vi.mocked(resetDemoData)

beforeEach(() => {
  reset.mockReset()
  reset.mockResolvedValue({ astronauts: 4, readings: 5760 })
})

const trigger = () => screen.getByRole('button', { name: 'Menu' })

describe('HeaderMenu', () => {
  it('opens from the button and focuses the first item', async () => {
    const user = userEvent.setup()
    render(<HeaderMenu />)
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    await user.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitem', { name: 'Reset demo data' })).toHaveFocus()
  })

  it('opens with the down arrow key', async () => {
    const user = userEvent.setup()
    render(<HeaderMenu />)
    trigger().focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Reset demo data' })).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the button', async () => {
    const user = userEvent.setup()
    render(<HeaderMenu />)
    await user.click(trigger())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('closes when clicking outside', async () => {
    const user = userEvent.setup()
    render(<HeaderMenu />)
    await user.click(trigger())
    await user.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('asks to confirm, and Cancel (focused by default) resets nothing', async () => {
    const user = userEvent.setup()
    render(<HeaderMenu />)
    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: 'Reset demo data' }))

    expect(screen.getByText('Reset demo data?')).toBeInTheDocument()
    expect(screen.getByText(/60-day simulated mission/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(reset).not.toHaveBeenCalled()
    expect(screen.queryByText('Reset demo data?')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('resets once confirmed, shows progress, announces the result and closes', async () => {
    const user = userEvent.setup()
    let finish!: () => void
    reset.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = () => resolve({ astronauts: 4, readings: 5760 })
      }),
    )
    render(<HeaderMenu />)
    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: 'Reset demo data' }))
    await user.click(screen.getByRole('button', { name: 'Reset data' }))

    expect(reset).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Resetting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

    finish()
    await waitFor(() => expect(screen.queryByText('Reset demo data?')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Demo data reset')
    expect(trigger()).toHaveFocus()
  })

  it('keeps the menu open and shows an error if the reset fails', async () => {
    const user = userEvent.setup()
    reset.mockRejectedValueOnce(new Error('disk full'))
    render(<HeaderMenu />)
    await user.click(trigger())
    await user.click(screen.getByRole('menuitem', { name: 'Reset demo data' }))
    await user.click(screen.getByRole('button', { name: 'Reset data' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reset the data')
    expect(screen.getByRole('button', { name: 'Reset data' })).toBeEnabled()
  })
})
