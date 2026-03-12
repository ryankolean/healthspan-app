import type { BodyCompEntry } from '../types/body-composition'

const STORAGE_KEY = 'healthspan:bodycomp:entries'

function readEntries(): BodyCompEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeEntries(entries: BodyCompEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function getBodyCompEntries(): BodyCompEntry[] {
  return readEntries().sort((a, b) => b.date.localeCompare(a.date))
}

export function saveBodyCompEntry(entry: BodyCompEntry): void {
  const enriched = { ...entry }
  if (enriched.bodyFatPct != null) {
    enriched.leanMassKg =
      Math.round(enriched.weightKg * (1 - enriched.bodyFatPct / 100) * 100) / 100
  }
  const all = readEntries().filter(e => e.id !== enriched.id)
  all.push(enriched)
  writeEntries(all)
}

export function deleteBodyCompEntry(id: string): void {
  writeEntries(readEntries().filter(e => e.id !== id))
}

export function getLatestEntry(): BodyCompEntry | null {
  const entries = getBodyCompEntries()
  return entries.length > 0 ? entries[0] : null
}

export function getCurrentWeightKg(): number | null {
  const latest = getLatestEntry()
  if (latest) return latest.weightKg
  const profileWeight = localStorage.getItem('healthspan:userWeight')
  if (profileWeight) return Number(profileWeight)
  return null
}

export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm) return null
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100
}
