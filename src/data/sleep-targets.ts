export interface SleepTarget {
  id: string
  label: string
  unit: string
  greenMin: number
  amberMin: number
  lowerIsBetter: boolean
}

export const SLEEP_TARGETS: readonly SleepTarget[] = [
  { id: 'total',      label: 'Total Sleep',      unit: 'min', greenMin: 420, amberMin: 360, lowerIsBetter: false },
  { id: 'deep',       label: 'Deep Sleep',        unit: 'min', greenMin: 90,  amberMin: 60,  lowerIsBetter: false },
  { id: 'rem',        label: 'REM Sleep',          unit: 'min', greenMin: 105, amberMin: 75,  lowerIsBetter: false },
  { id: 'efficiency', label: 'Sleep Efficiency',   unit: '%',   greenMin: 90,  amberMin: 80,  lowerIsBetter: false },
  { id: 'onset',      label: 'Sleep Onset',        unit: 'min', greenMin: 20,  amberMin: 40,  lowerIsBetter: true },
] as const satisfies readonly SleepTarget[]

export type SleepStatus = 'green' | 'amber' | 'red'

export function getSleepStatus(metricId: string, value: number): SleepStatus {
  const target = SLEEP_TARGETS.find(t => t.id === metricId)
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
