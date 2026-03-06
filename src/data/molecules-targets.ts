export interface MoleculeTarget {
  id: string
  label: string
  unit: string
  greenMin: number
  amberMin: number
}

export const MOLECULES_TARGETS: readonly MoleculeTarget[] = [
  { id: 'adherence', label: 'Adherence', unit: '%', greenMin: 90, amberMin: 70 },
] as const satisfies readonly MoleculeTarget[]

export type AdherenceStatus = 'green' | 'amber' | 'red'

export function getAdherenceStatus(percentage: number): AdherenceStatus {
  if (percentage >= 90) return 'green'
  if (percentage >= 70) return 'amber'
  return 'red'
}
