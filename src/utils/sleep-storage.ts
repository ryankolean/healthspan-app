import type { SleepNight, SleepSettings, SleepSource } from '../types/sleep'
import { DEFAULT_SLEEP_SETTINGS } from '../types/sleep'

const KEYS = {
  nights: 'healthspan:sleep:nights',
  settings: 'healthspan:sleep:settings',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export interface SleepFilters {
  source?: SleepSource
  from?: string
  to?: string
  includeFlagged?: boolean
}

export function getAllNightsRaw(): SleepNight[] {
  return readJson<SleepNight[]>(KEYS.nights, [])
}

export function saveSleepNights(nights: SleepNight[]): void {
  localStorage.setItem(KEYS.nights, JSON.stringify(nights))
}

export function getSleepNights(filters: SleepFilters = {}): SleepNight[] {
  let list = getAllNightsRaw()
  if (!filters.includeFlagged) list = list.filter(n => !n.flaggedConflict)
  if (filters.source) list = list.filter(n => n.source === filters.source)
  if (filters.from) list = list.filter(n => n.date >= filters.from!)
  if (filters.to) list = list.filter(n => n.date <= filters.to!)
  return list
}

export function getFlaggedSleepConflicts(): SleepNight[] {
  return getAllNightsRaw().filter(n => n.flaggedConflict)
}

export function resolveSleepConflict(keepId: string, discardId: string): void {
  const all = getAllNightsRaw()
  const keepExists = all.some(n => n.id === keepId)
  if (!keepExists) return
  const updated = all
    .filter(n => n.id !== discardId)
    .map(n => n.id === keepId ? { ...n, flaggedConflict: false, resolvedBy: 'manual' as const } : n)
  saveSleepNights(updated)
}

function sourceRank(source: SleepSource, priority: readonly SleepSource[]): number {
  const idx = priority.indexOf(source)
  return idx === -1 ? 999 : idx
}

export function mergeNights(
  existing: SleepNight[],
  incoming: SleepNight[],
  settings: SleepSettings,
): SleepNight[] {
  const result = [...existing]
  const priority = settings.globalPriority

  for (const entry of incoming) {
    const isDuplicate = result.some(n => n.source === entry.source && n.sourceId === entry.sourceId)
    if (isDuplicate) continue

    const conflict = result.find(n =>
      n.source !== entry.source &&
      n.date === entry.date &&
      !n.flaggedConflict
    )

    if (conflict) {
      const existingRank = sourceRank(conflict.source, priority)
      const incomingRank = sourceRank(entry.source, priority)
      if (incomingRank < existingRank) {
        const idx = result.indexOf(conflict)
        result[idx] = { ...conflict, flaggedConflict: true, resolvedBy: 'priority' }
        result.push(entry)
      } else {
        result.push({ ...entry, flaggedConflict: true, resolvedBy: 'priority' })
      }
    } else {
      result.push(entry)
    }
  }

  return result
}

export function importSleepNights(incoming: SleepNight[]): void {
  const existing = getAllNightsRaw()
  const settings = getSleepSettings()
  const merged = mergeNights(existing, incoming, settings)
  saveSleepNights(merged)
}

export function getSleepSettings(): SleepSettings {
  return readJson<SleepSettings>(KEYS.settings, DEFAULT_SLEEP_SETTINGS)
}

export function saveSleepSettings(settings: SleepSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}
