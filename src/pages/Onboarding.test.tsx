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

  describe('Step 2: Wearables', () => {
    function advanceToStep2() {
      renderOnboarding()
      fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
      fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
      fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'male' } })
      fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '180' } })
      fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '80' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
    }

    it('shows wearable device cards', () => {
      advanceToStep2()
      expect(screen.getByText(/oura ring/i)).toBeInTheDocument()
      expect(screen.getByText(/apple watch/i)).toBeInTheDocument()
      expect(screen.getByText(/hevy/i)).toBeInTheDocument()
    })

    it('shows skip button', () => {
      advanceToStep2()
      expect(screen.getByText(/skip for now/i)).toBeInTheDocument()
    })

    it('advances to step 3 when skip clicked', () => {
      advanceToStep2()
      fireEvent.click(screen.getByText(/skip for now/i))
      expect(screen.getByText(/health records/i)).toBeInTheDocument()
    })
  })

  describe('Step 3: Health Records', () => {
    function advanceToStep3() {
      renderOnboarding()
      // Fill profile
      fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
      fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
      fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'male' } })
      fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '180' } })
      fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '80' } })
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      // Skip wearables
      fireEvent.click(screen.getByText(/skip for now/i))
    }

    it('shows upload area for health records', () => {
      advanceToStep3()
      expect(screen.getByText(/health records/i)).toBeInTheDocument()
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    })

    it('shows accepted file types', () => {
      advanceToStep3()
      expect(screen.getByText(/jpg.*png.*pdf/i)).toBeInTheDocument()
    })

    it('has finish button', () => {
      advanceToStep3()
      const finishBtn = screen.getByRole('button', { name: /finish/i })
      expect(finishBtn).toBeInTheDocument()
    })

    it('sets onboarding complete when finish is clicked', () => {
      advanceToStep3()
      fireEvent.click(screen.getByRole('button', { name: /finish/i }))
      expect(localStorage.getItem('healthspan:onboardingComplete')).toBe('true')
    })
  })
})
