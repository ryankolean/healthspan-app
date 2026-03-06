import type { NutritionSettings } from '../types/nutrition'

export type NutritionStatus = 'green' | 'amber' | 'red'

export function getProteinTarget(settings: NutritionSettings): number {
  return settings.bodyweightLbs
}

export function getCalorieRange(settings: NutritionSettings): {
  greenMin: number; greenMax: number; amberMin: number; amberMax: number
} {
  const target = settings.dailyCalorieTarget
  return {
    greenMin: Math.round(target * 0.9),
    greenMax: Math.round(target * 1.1),
    amberMin: Math.round(target * 0.8),
    amberMax: Math.round(target * 1.2),
  }
}

export function getNutritionStatus(
  metricId: string,
  value: number,
  settings: NutritionSettings,
): NutritionStatus {
  if (metricId === 'protein') {
    const target = getProteinTarget(settings)
    if (value >= target) return 'green'
    if (value >= target * 0.7) return 'amber'
    return 'red'
  }

  if (metricId === 'calories') {
    const range = getCalorieRange(settings)
    if (value >= range.greenMin && value <= range.greenMax) return 'green'
    if (value >= range.amberMin && value <= range.amberMax) return 'amber'
    return 'red'
  }

  if (metricId === 'fiber') {
    if (value >= 30) return 'green'
    if (value >= 20) return 'amber'
    return 'red'
  }

  return 'red'
}
