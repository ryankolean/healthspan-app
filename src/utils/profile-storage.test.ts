import { describe, it, expect, beforeEach } from 'vitest'
import {
  getUserProfile,
  saveUserProfile,
  getEffectiveReferenceRange,
  isOnboardingComplete,
  setOnboardingComplete,
} from './profile-storage'
import type { UserProfile } from '../types/profile'

beforeEach(() => {
  localStorage.clear()
})

describe('getUserProfile', () => {
  it('returns null when no profile saved', () => {
    expect(getUserProfile()).toBeNull()
  })

  it('returns null when profile is incomplete', () => {
    localStorage.setItem('healthspan:userAge', '30')
    localStorage.setItem('healthspan:userBirthSex', 'male')
    // missing height, weight, gender
    expect(getUserProfile()).toBeNull()
  })

  it('round-trips a saved profile', () => {
    const profile: UserProfile = {
      age: 30,
      birthSex: 'male',
      genderIdentity: 'male',
      heightCm: 180,
      weightKg: 80,
    }
    saveUserProfile(profile)
    expect(getUserProfile()).toEqual(profile)
  })
})

describe('saveUserProfile', () => {
  it('stores each field in its own localStorage key', () => {
    const profile: UserProfile = {
      age: 25,
      birthSex: 'female',
      genderIdentity: 'female',
      heightCm: 165,
      weightKg: 60,
    }
    saveUserProfile(profile)

    expect(localStorage.getItem('healthspan:userAge')).toBe('25')
    expect(localStorage.getItem('healthspan:userBirthSex')).toBe('female')
    expect(localStorage.getItem('healthspan:userGender')).toBe('female')
    expect(localStorage.getItem('healthspan:userHeight')).toBe('165')
    expect(localStorage.getItem('healthspan:userWeight')).toBe('60')
  })

  it('saves referenceRange only when birthSex is intersex', () => {
    const profile: UserProfile = {
      age: 30,
      birthSex: 'intersex',
      genderIdentity: 'male',
      heightCm: 175,
      weightKg: 70,
      referenceRange: 'male',
    }
    saveUserProfile(profile)
    expect(localStorage.getItem('healthspan:userReferenceRange')).toBe('male')
  })

  it('does not save referenceRange when birthSex is not intersex', () => {
    const profile: UserProfile = {
      age: 30,
      birthSex: 'male',
      genderIdentity: 'male',
      heightCm: 175,
      weightKg: 70,
      referenceRange: 'male',
    }
    saveUserProfile(profile)
    expect(localStorage.getItem('healthspan:userReferenceRange')).toBeNull()
  })

  it('round-trips an intersex profile with referenceRange', () => {
    const profile: UserProfile = {
      age: 28,
      birthSex: 'intersex',
      genderIdentity: 'intersex',
      heightCm: 170,
      weightKg: 65,
      referenceRange: 'female',
    }
    saveUserProfile(profile)
    const loaded = getUserProfile()
    expect(loaded).toEqual(profile)
  })
})

describe('getEffectiveReferenceRange', () => {
  it('returns "male" for male birthSex', () => {
    localStorage.setItem('healthspan:userBirthSex', 'male')
    expect(getEffectiveReferenceRange()).toBe('male')
  })

  it('returns "female" for female birthSex', () => {
    localStorage.setItem('healthspan:userBirthSex', 'female')
    expect(getEffectiveReferenceRange()).toBe('female')
  })

  it('returns chosen referenceRange for intersex', () => {
    localStorage.setItem('healthspan:userBirthSex', 'intersex')
    localStorage.setItem('healthspan:userReferenceRange', 'female')
    expect(getEffectiveReferenceRange()).toBe('female')
  })

  it('defaults to "male" when no profile exists', () => {
    expect(getEffectiveReferenceRange()).toBe('male')
  })

  it('defaults to "male" when intersex but no referenceRange set', () => {
    localStorage.setItem('healthspan:userBirthSex', 'intersex')
    expect(getEffectiveReferenceRange()).toBe('male')
  })
})

describe('onboarding', () => {
  it('isOnboardingComplete returns false initially', () => {
    expect(isOnboardingComplete()).toBe(false)
  })

  it('setOnboardingComplete makes isOnboardingComplete return true', () => {
    setOnboardingComplete()
    expect(isOnboardingComplete()).toBe(true)
  })

  it('uses the correct localStorage key', () => {
    setOnboardingComplete()
    expect(localStorage.getItem('healthspan:onboardingComplete')).toBe('true')
  })
})
