export interface VO2MaxTargets {
  aboveAverage: number  // top 50%
  superior: number      // top 25%
  elite: number         // top 2.5%
}

// Source: Attia, Outlive — Cardiorespiratory Fitness Reference Data
const MALE_TARGETS: Array<{ minAge: number; aboveAverage: number; superior: number; elite: number }> = [
  { minAge: 20, aboveAverage: 42, superior: 52, elite: 60 },
  { minAge: 30, aboveAverage: 40, superior: 50, elite: 58 },
  { minAge: 40, aboveAverage: 37, superior: 47, elite: 54 },
  { minAge: 50, aboveAverage: 34, superior: 42, elite: 50 },
  { minAge: 60, aboveAverage: 30, superior: 38, elite: 45 },
  { minAge: 65, aboveAverage: 26, superior: 33, elite: 40 },
]

const FEMALE_TARGETS: Array<{ minAge: number; aboveAverage: number; superior: number; elite: number }> = [
  { minAge: 20, aboveAverage: 36, superior: 45, elite: 53 },
  { minAge: 30, aboveAverage: 34, superior: 43, elite: 50 },
  { minAge: 40, aboveAverage: 32, superior: 41, elite: 47 },
  { minAge: 50, aboveAverage: 28, superior: 37, elite: 44 },
  { minAge: 60, aboveAverage: 25, superior: 32, elite: 40 },
  { minAge: 65, aboveAverage: 22, superior: 28, elite: 35 },
]

export const VO2MAX_TARGETS = { male: MALE_TARGETS, female: FEMALE_TARGETS }

export function getVO2MaxTargets(age: number, sex: 'male' | 'female'): VO2MaxTargets {
  const table = sex === 'male' ? MALE_TARGETS : FEMALE_TARGETS
  // Find the highest bracket whose minAge is <= age
  const bracket = [...table].reverse().find(b => age >= b.minAge) ?? table[table.length - 1]
  return { aboveAverage: bracket.aboveAverage, superior: bracket.superior, elite: bracket.elite }
}
