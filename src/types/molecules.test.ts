import type { MoleculeDefinition, MoleculeEntry, MoleculeSource, MoleculeCategory } from './molecules'

describe('Molecule types', () => {
  it('MoleculeDefinition fields compile correctly', () => {
    const def: MoleculeDefinition = {
      id: 'creatine',
      name: 'Creatine Monohydrate',
      category: 'supplement',
      dosage: 5,
      unit: 'g',
      frequency: 'daily',
      active: true,
      createdAt: Date.now(),
    }
    expect(def.name).toBe('Creatine Monohydrate')
    expect(def.active).toBe(true)
  })

  it('MoleculeEntry fields compile correctly', () => {
    const entry: MoleculeEntry = {
      id: 'entry1',
      source: 'manual',
      date: '2026-03-01',
      moleculeId: 'creatine',
      taken: true,
      createdAt: Date.now(),
    }
    expect(entry.taken).toBe(true)
    expect(entry.source).toBe('manual')
  })

  it('MoleculeCategory covers all categories', () => {
    const categories: MoleculeCategory[] = ['supplement', 'compound', 'vitamin', 'mineral', 'amino_acid']
    expect(categories).toHaveLength(5)
  })

  it('optional fields are truly optional', () => {
    const entry: MoleculeEntry = {
      id: 'entry1',
      source: 'manual',
      date: '2026-03-01',
      moleculeId: 'creatine',
      taken: false,
      createdAt: Date.now(),
    }
    expect(entry.notes).toBeUndefined()
  })
})
