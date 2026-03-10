export type BirthSex = 'male' | 'female' | 'intersex'
export type GenderIdentity = 'male' | 'female' | 'trans-male' | 'trans-female' | 'intersex'

export interface UserProfile {
  age: number
  birthSex: BirthSex
  genderIdentity: GenderIdentity
  heightCm: number
  weightKg: number
  referenceRange?: 'male' | 'female'
}
