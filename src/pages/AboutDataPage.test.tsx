import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AboutDataPage } from './AboutDataPage'

describe('AboutDataPage', () => {
  it('renders page heading and prototype disclaimer banner', () => {
    render(<AboutDataPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /About the Data/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/not a medical device/i)).toBeInTheDocument()
  })

  it('renders the core architectural principles', () => {
    render(<AboutDataPage />)

    expect(screen.getByText('1. Offline-First')).toBeInTheDocument()
    expect(screen.getByText('2. Personal Baselines')).toBeInTheDocument()
    expect(screen.getByText('3. Explainable Alerts')).toBeInTheDocument()
  })

  it('renders table of simulated metric assumptions', () => {
    render(<AboutDataPage />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('Resting heart rate')).toBeInTheDocument()
    expect(screen.getByText('Heart rate variability (RMSSD)')).toBeInTheDocument()
    expect(screen.getAllByText(/assumption, verify with NASA/).length).toBeGreaterThan(5)
  })
})
