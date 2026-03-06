import type { NutritionEntry, NutritionSettings } from '../types/nutrition'
import { DEFAULT_NUTRITION_SETTINGS } from '../types/nutrition'

const KEYS = {
  entries: 'healthspan:nutrition:entries',
  settings: 'healthspan:nutrition:settings',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export interface NutritionFilters {
  from?: string
  to?: string
}

function getAllEntriesRaw(): NutritionEntry[] {
  return readJson<NutritionEntry[]>(KEYS.entries, [])
}

function saveAll(entries: NutritionEntry[]): void {
  localStorage.setItem(KEYS.entries, JSON.stringify(entries))
}

export function getNutritionEntries(filters: NutritionFilters = {}): NutritionEntry[] {
  let list = getAllEntriesRaw()
  if (filters.from) list = list.filter(e => e.date >= filters.from!)
  if (filters.to) list = list.filter(e => e.date <= filters.to!)
  return list
}

export function saveNutritionEntry(entry: NutritionEntry): void {
  const all = getAllEntriesRaw().filter(e => e.id !== entry.id)
  all.push(entry)
  saveAll(all)
}

export function deleteNutritionEntry(id: string): void {
  const all = getAllEntriesRaw().filter(e => e.id !== id)
  saveAll(all)
}

export function getEntriesByDate(date: string): NutritionEntry[] {
  return getAllEntriesRaw().filter(e => e.date === date)
}

export interface DailyTotals {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

export function getDailyTotals(date: string): DailyTotals {
  const meals = getEntriesByDate(date)
  return {
    calories: meals.reduce((s, m) => s + (m.calories ?? 0), 0),
    proteinG: meals.reduce((s, m) => s + (m.proteinG ?? 0), 0),
    carbsG: meals.reduce((s, m) => s + (m.carbsG ?? 0), 0),
    fatG: meals.reduce((s, m) => s + (m.fatG ?? 0), 0),
    fiberG: meals.reduce((s, m) => s + (m.fiberG ?? 0), 0),
  }
}

export function getNutritionSettings(): NutritionSettings {
  return readJson<NutritionSettings>(KEYS.settings, DEFAULT_NUTRITION_SETTINGS)
}

export function saveNutritionSettings(settings: NutritionSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}
