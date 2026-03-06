export interface EmotionalTarget {
  id: string
  label: string
  unit: string
  greenMin: number
  amberMin: number
  lowerIsBetter: boolean
}

export const EMOTIONAL_TARGETS: readonly EmotionalTarget[] = [
  { id: 'mood',    label: 'Mood',    unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
  { id: 'stress',  label: 'Stress',  unit: '/5', greenMin: 2, amberMin: 3, lowerIsBetter: true },
  { id: 'anxiety', label: 'Anxiety', unit: '/5', greenMin: 2, amberMin: 3, lowerIsBetter: true },
  { id: 'energy',  label: 'Energy',  unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
] as const satisfies readonly EmotionalTarget[]

export type EmotionalStatus = 'green' | 'amber' | 'red'

export function getEmotionalStatus(metricId: string, value: number): EmotionalStatus {
  const target = EMOTIONAL_TARGETS.find(t => t.id === metricId)
  if (!target) return 'red'

  if (target.lowerIsBetter) {
    if (value <= target.greenMin) return 'green'
    if (value <= target.amberMin) return 'amber'
    return 'red'
  }

  if (value >= target.greenMin) return 'green'
  if (value >= target.amberMin) return 'amber'
  return 'red'
}
