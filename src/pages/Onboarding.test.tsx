import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Onboarding from './Onboarding'

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>
  )
}

describe('Onboarding wizard', () => {
  it('renders step 1 profile form by default', () => {
    renderOnboarding()
    expect(screen.getByText(/your profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/birth sex/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gender identity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument()
  })

  it('disables Next button when profile fields are empty', () => {
    renderOnboarding()
    const nextBtn = screen.getByRole('button', { name: /next/i })
    expect(nextBtn).toBeDisabled()
  })

  it('shows reference range selector when birth sex is intersex', () => {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'intersex' } })
    expect(screen.getByLabelText(/reference range/i)).toBeInTheDocument()
  })

  it('does not show reference range when birth sex is male', () => {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
    expect(screen.queryByLabelText(/reference range/i)).not.toBeInTheDocument()
  })

  it('saves profile to localStorage and advances to step 2 on Next', () => {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'female' } })
    fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'female' } })
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '165' } })
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(localStorage.getItem('healthspan:userAge')).toBe('30')
    expect(localStorage.getItem('healthspan:userBirthSex')).toBe('female')
    expect(screen.getByText(/wearable/i)).toBeInTheDocument()
  })

  it('step 2 has skip button that advances to step 3', () => {
    renderOnboarding()
    // Fill and advance
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
    fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'male' } })
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '180' } })
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    // Now on step 2
    fireEvent.click(screen.getByText(/skip for now/i))
    expect(screen.getByText(/health records/i)).toBeInTheDocument()
  })
})
