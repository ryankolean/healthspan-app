export type MoleculeSource = 'manual'
export type MoleculeCategory = 'supplement' | 'compound' | 'vitamin' | 'mineral' | 'amino_acid'

export interface MoleculeDefinition {
  id: string
  name: string                    // e.g. "Creatine Monohydrate"
  category: MoleculeCategory
  dosage: number                  // e.g. 5
  unit: string                    // e.g. "g", "mg", "IU", "mcg"
  frequency: 'daily'             // daily only for now
  active: boolean                // can deactivate without deleting
  createdAt: number
}

export interface MoleculeEntry {
  id: string
  source: MoleculeSource
  date: string                   // YYYY-MM-DD
  moleculeId: string             // references MoleculeDefinition.id
  taken: boolean
  notes?: string
  createdAt: number
}
