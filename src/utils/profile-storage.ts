import type { UserProfile, BirthSex, GenderIdentity } from '../types/profile'

const KEYS = {
  age: 'healthspan:userAge',
  birthSex: 'healthspan:userBirthSex',
  gender: 'healthspan:userGender',
  height: 'healthspan:userHeight',
  weight: 'healthspan:userWeight',
  referenceRange: 'healthspan:userReferenceRange',
  onboardingComplete: 'healthspan:onboardingComplete',
} as const

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.age, String(profile.age))
  localStorage.setItem(KEYS.birthSex, profile.birthSex)
  localStorage.setItem(KEYS.gender, profile.genderIdentity)
  localStorage.setItem(KEYS.height, String(profile.heightCm))
  localStorage.setItem(KEYS.weight, String(profile.weightKg))

  if (profile.birthSex === 'intersex' && profile.referenceRange) {
    localStorage.setItem(KEYS.referenceRange, profile.referenceRange)
  } else {
    localStorage.removeItem(KEYS.referenceRange)
  }
}

export function getUserProfile(): UserProfile | null {
  const age = localStorage.getItem(KEYS.age)
  const birthSex = localStorage.getItem(KEYS.birthSex)
  const gender = localStorage.getItem(KEYS.gender)
  const height = localStorage.getItem(KEYS.height)
  const weight = localStorage.getItem(KEYS.weight)

  if (!age || !birthSex || !gender || !height || !weight) return null

  const profile: UserProfile = {
    age: parseInt(age, 10),
    birthSex: birthSex as BirthSex,
    genderIdentity: gender as GenderIdentity,
    heightCm: parseFloat(height),
    weightKg: parseFloat(weight),
  }

  if (birthSex === 'intersex') {
    const ref = localStorage.getItem(KEYS.referenceRange)
    if (ref) profile.referenceRange = ref as 'male' | 'female'
  }

  return profile
}

export function getEffectiveReferenceRange(): 'male' | 'female' {
  const birthSex = localStorage.getItem(KEYS.birthSex)
  if (!birthSex) return 'male'
  if (birthSex === 'female') return 'female'
  if (birthSex === 'male') return 'male'
  // intersex — use chosen reference range, default to male
  const ref = localStorage.getItem(KEYS.referenceRange)
  return (ref as 'male' | 'female') ?? 'male'
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(KEYS.onboardingComplete) === 'true'
}

export function setOnboardingComplete(): void {
  localStorage.setItem(KEYS.onboardingComplete, 'true')
}
