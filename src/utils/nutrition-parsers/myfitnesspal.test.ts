import { parseMyFitnessPalCsv } from './myfitnesspal'

describe('parseMyFitnessPalCsv', () => {
  it('returns empty for empty input', () => {
    expect(parseMyFitnessPalCsv('')).toEqual([])
  })

  it('parses a single meal entry', () => {
    const csv = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-03-01,Breakfast,450,15,,,,,,,,45,3,,35,,,,`
    const result = parseMyFitnessPalCsv(csv)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].mealType).toBe('breakfast')
    expect(result[0].calories).toBe(450)
    expect(result[0].fatG).toBe(15)
    expect(result[0].carbsG).toBe(45)
    expect(result[0].proteinG).toBe(35)
    expect(result[0].fiberG).toBe(3)
    expect(result[0].source).toBe('myfitnesspal')
  })

  it('maps meal names to mealType', () => {
    const csv = `Date,Meal,Calories,Fat (g),Saturated Fat,Polyunsaturated Fat,Monounsaturated Fat,Trans Fat,Cholesterol,Sodium (mg),Potassium,Carbohydrates (g),Fiber,Sugar,Protein (g),Vitamin A,Vitamin C,Calcium,Iron,Note
2026-03-01,Lunch,600,20,,,,,,,,60,5,,40,,,,
2026-03-01,Dinner,700,25,,,,,,,,55,4,,45,,,,
2026-03-01,Snacks,200,8,,,,,,,,20,2,,10,,,,`
    const result = parseMyFitnessPalCsv(csv)
    expect(result[0].mealType).toBe('lunch')
    expect(result[1].mealType).toBe('dinner')
    expect(result[2].mealType).toBe('snack')
  })
})
