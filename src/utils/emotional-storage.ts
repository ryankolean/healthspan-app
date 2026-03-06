import type { EmotionalEntry } from '../types/emotional'

const KEY = 'healthspan:emotional:entries'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export interface EmotionalFilters {
  from?: string
  to?: string
}

export function getAllEntriesRaw(): EmotionalEntry[] {
  return readJson<EmotionalEntry[]>(KEY, [])
}

function saveAll(entries: EmotionalEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function getEmotionalEntries(filters: EmotionalFilters = {}): EmotionalEntry[] {
  let list = getAllEntriesRaw()
  if (filters.from) list = list.filter(e => e.date >= filters.from!)
  if (filters.to) list = list.filter(e => e.date <= filters.to!)
  return list
}

export function saveEmotionalEntry(entry: EmotionalEntry): void {
  const all = getAllEntriesRaw().filter(e => e.date !== entry.date)
  all.push(entry)
  saveAll(all)
}

export function deleteEmotionalEntry(id: string): void {
  const all = getAllEntriesRaw().filter(e => e.id !== id)
  saveAll(all)
}

export function getEntryByDate(date: string): EmotionalEntry | null {
  return getAllEntriesRaw().find(e => e.date === date) ?? null
}
