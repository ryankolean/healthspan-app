import { getNutritionStatus, getProteinTarget, getCalorieRange } from './nutrition-targets'
import type { NutritionSettings } from '../types/nutrition'

const settings: NutritionSettings = { bodyweightLbs: 170, dailyCalorieTarget: 2200 }

describe('getProteinTarget', () => {
  it('returns 1g per lb bodyweight', () => {
    expect(getProteinTarget(settings)).toBe(170)
  })

  it('adjusts for different bodyweight', () => {
    expect(getProteinTarget({ ...settings, bodyweightLbs: 200 })).toBe(200)
  })
})

describe('getCalorieRange', () => {
  it('returns ±10% for green, ±20% for amber', () => {
    const range = getCalorieRange(settings)
    expect(range.greenMin).toBe(1980)
    expect(range.greenMax).toBe(2420)
    expect(range.amberMin).toBe(1760)
    expect(range.amberMax).toBe(2640)
  })
})

describe('getNutritionStatus', () => {
  it('returns green for protein >= 1g/lb', () => {
    expect(getNutritionStatus('protein', 170, settings)).toBe('green')
    expect(getNutritionStatus('protein', 200, settings)).toBe('green')
  })

  it('returns amber for protein >= 0.7g/lb but < 1g/lb', () => {
    expect(getNutritionStatus('protein', 140, settings)).toBe('amber')
    expect(getNutritionStatus('protein', 119, settings)).toBe('amber')
  })

  it('returns red for protein < 0.7g/lb', () => {
    expect(getNutritionStatus('protein', 100, settings)).toBe('red')
  })

  it('returns green for calories within ±10%', () => {
    expect(getNutritionStatus('calories', 2200, settings)).toBe('green')
    expect(getNutritionStatus('calories', 2000, settings)).toBe('green')
    expect(getNutritionStatus('calories', 2400, settings)).toBe('green')
  })

  it('returns amber for calories within ±20% but outside ±10%', () => {
    expect(getNutritionStatus('calories', 1800, settings)).toBe('amber')
    expect(getNutritionStatus('calories', 2600, settings)).toBe('amber')
  })

  it('returns red for calories outside ±20%', () => {
    expect(getNutritionStatus('calories', 1500, settings)).toBe('red')
    expect(getNutritionStatus('calories', 3000, settings)).toBe('red')
  })

  it('returns green for fiber >= 30g', () => {
    expect(getNutritionStatus('fiber', 35, settings)).toBe('green')
    expect(getNutritionStatus('fiber', 30, settings)).toBe('green')
  })

  it('returns amber for fiber >= 20g but < 30g', () => {
    expect(getNutritionStatus('fiber', 25, settings)).toBe('amber')
    expect(getNutritionStatus('fiber', 20, settings)).toBe('amber')
  })

  it('returns red for fiber < 20g', () => {
    expect(getNutritionStatus('fiber', 15, settings)).toBe('red')
  })

  it('returns red for unknown metric', () => {
    expect(getNutritionStatus('unknown', 100, settings)).toBe('red')
  })
})
