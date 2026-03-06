import type { NutritionEntry, NutritionSource, MealType, NutritionSettings } from './nutrition'
import { DEFAULT_NUTRITION_SETTINGS } from './nutrition'

describe('Nutrition types', () => {
  it('NutritionEntry fields compile correctly', () => {
    const entry: NutritionEntry = {
      id: 'test',
      source: 'manual',
      date: '2026-03-01',
      mealType: 'lunch',
      mealName: 'Grilled chicken salad',
      calories: 550,
      proteinG: 45,
      carbsG: 30,
      fatG: 20,
      fiberG: 8,
      createdAt: Date.now(),
    }
    expect(entry.source).toBe('manual')
    expect(entry.mealType).toBe('lunch')
    expect(entry.proteinG).toBe(45)
  })

  it('MealType covers all meal types', () => {
    const types: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
    expect(types).toHaveLength(4)
  })

  it('optional fields are truly optional', () => {
    const entry: NutritionEntry = {
      id: 'minimal',
      source: 'manual',
      date: '2026-03-01',
      mealType: 'snack',
      createdAt: Date.now(),
    }
    expect(entry.calories).toBeUndefined()
    expect(entry.mealName).toBeUndefined()
    expect(entry.proteinG).toBeUndefined()
  })

  it('DEFAULT_NUTRITION_SETTINGS has correct defaults', () => {
    expect(DEFAULT_NUTRITION_SETTINGS.bodyweightLbs).toBe(170)
    expect(DEFAULT_NUTRITION_SETTINGS.dailyCalorieTarget).toBe(2200)
  })
})
