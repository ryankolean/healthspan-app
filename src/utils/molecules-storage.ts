import type { MoleculeDefinition, MoleculeEntry } from '../types/molecules'

const KEYS = {
  definitions: 'healthspan:molecules:definitions',
  entries: 'healthspan:molecules:entries',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ─── Definitions ───

function getAllDefinitionsRaw(): MoleculeDefinition[] {
  return readJson<MoleculeDefinition[]>(KEYS.definitions, [])
}

function saveAllDefinitions(defs: MoleculeDefinition[]): void {
  localStorage.setItem(KEYS.definitions, JSON.stringify(defs))
}

export function getDefinitions(): MoleculeDefinition[] {
  return getAllDefinitionsRaw()
}

export function saveDefinition(def: MoleculeDefinition): void {
  const all = getAllDefinitionsRaw().filter(d => d.id !== def.id)
  all.push(def)
  saveAllDefinitions(all)
}

export function deleteDefinition(id: string): void {
  const all = getAllDefinitionsRaw().filter(d => d.id !== id)
  saveAllDefinitions(all)
}

// ─── Entries ───

export interface MoleculeFilters {
  from?: string
  to?: string
}

function getAllEntriesRaw(): MoleculeEntry[] {
  return readJson<MoleculeEntry[]>(KEYS.entries, [])
}

function saveAllEntries(entries: MoleculeEntry[]): void {
  localStorage.setItem(KEYS.entries, JSON.stringify(entries))
}

export function getMoleculeEntries(filters: MoleculeFilters = {}): MoleculeEntry[] {
  let list = getAllEntriesRaw()
  if (filters.from) list = list.filter(e => e.date >= filters.from!)
  if (filters.to) list = list.filter(e => e.date <= filters.to!)
  return list
}

export function saveMoleculeEntry(entry: MoleculeEntry): void {
  const all = getAllEntriesRaw().filter(e => e.id !== entry.id)
  all.push(entry)
  saveAllEntries(all)
}

export function deleteMoleculeEntry(id: string): void {
  const all = getAllEntriesRaw().filter(e => e.id !== id)
  saveAllEntries(all)
}

// ─── Aggregation ───

export interface DailyAdherence {
  date: string
  taken: number
  total: number
  percentage: number
}

export function getDailyAdherence(date: string): DailyAdherence {
  const activeDefs = getAllDefinitionsRaw().filter(d => d.active)
  const total = activeDefs.length
  if (total === 0) return { date, taken: 0, total: 0, percentage: 0 }

  const dayEntries = getAllEntriesRaw().filter(e => e.date === date && e.taken)
  const taken = activeDefs.filter(d => dayEntries.some(e => e.moleculeId === d.id)).length

  return { date, taken, total, percentage: Math.round((taken / total) * 100) }
}

export function getAdherenceRange(from: string, to: string): DailyAdherence[] {
  const activeDefs = getAllDefinitionsRaw().filter(d => d.active)
  if (activeDefs.length === 0) return []

  const allEntries = getAllEntriesRaw().filter(e => e.date >= from && e.date <= to)
  const dates = [...new Set(allEntries.map(e => e.date))].sort()

  return dates.map(date => {
    const dayEntries = allEntries.filter(e => e.date === date && e.taken)
    const taken = activeDefs.filter(d => dayEntries.some(e => e.moleculeId === d.id)).length
    return {
      date,
      taken,
      total: activeDefs.length,
      percentage: Math.round((taken / activeDefs.length) * 100),
    }
  })
}
