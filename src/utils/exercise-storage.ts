// src/utils/exercise-storage.ts
import type { ExerciseWorkout, VO2MaxEntry, ExerciseSettings, ExerciseSource, ExerciseType } from '../types/exercise'
import { DEFAULT_EXERCISE_SETTINGS } from '../types/exercise'

const KEYS = {
  workouts: 'healthspan:exercise:workouts',
  vo2max: 'healthspan:exercise:vo2max',
  settings: 'healthspan:exercise:settings',
} as const

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ─── Workouts ───

export interface WorkoutFilters {
  type?: ExerciseType
  source?: ExerciseSource
  from?: string   // YYYY-MM-DD inclusive
  to?: string     // YYYY-MM-DD inclusive
  includeFlagged?: boolean
}

export function getAllWorkoutsRaw(): ExerciseWorkout[] {
  return readJson<ExerciseWorkout[]>(KEYS.workouts, [])
}

export function saveWorkouts(workouts: ExerciseWorkout[]): void {
  localStorage.setItem(KEYS.workouts, JSON.stringify(workouts))
}

export function getWorkouts(filters: WorkoutFilters = {}): ExerciseWorkout[] {
  let list = getAllWorkoutsRaw()
  if (!filters.includeFlagged) list = list.filter(w => !w.flaggedConflict)
  if (filters.type) list = list.filter(w => w.type === filters.type)
  if (filters.source) list = list.filter(w => w.source === filters.source)
  if (filters.from) list = list.filter(w => w.date >= filters.from!)
  if (filters.to) list = list.filter(w => w.date <= filters.to!)
  return list
}

export function getFlaggedConflicts(): ExerciseWorkout[] {
  return getAllWorkoutsRaw().filter(w => w.flaggedConflict)
}

export function resolveConflict(keepId: string, discardId: string): void {
  const all = getAllWorkoutsRaw()
  const keepExists = all.some(w => w.id === keepId)
  if (!keepExists) return
  const updated = all
    .filter(w => w.id !== discardId)
    .map(w => w.id === keepId ? { ...w, flaggedConflict: false, resolvedBy: 'manual' as const } : w)
  saveWorkouts(updated)
}

// ─── Conflict Detection + Merge ───

function isWithin30Min(a?: string, b?: string): boolean {
  if (!a || !b) return true  // no startTime → assume potential overlap
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return diff <= 30 * 60 * 1000
}

function sourceRank(source: ExerciseSource, priority: ExerciseSource[]): number {
  const idx = priority.indexOf(source)
  return idx === -1 ? 999 : idx
}

export function mergeWorkouts(
  existing: ExerciseWorkout[],
  incoming: ExerciseWorkout[],
  settings: ExerciseSettings,
): ExerciseWorkout[] {
  const result = [...existing]
  const priority = settings.globalPriority

  for (const entry of incoming) {
    // 1. Skip exact duplicates (same source + sourceId)
    const isDuplicate = result.some(e => e.source === entry.source && e.sourceId === entry.sourceId)
    if (isDuplicate) continue

    // 2. Detect conflict: same date + same type + within 30 min window
    // Only cross-source conflicts are flagged — same source can have multiple workouts
    const conflict = result.find(e =>
      e.source !== entry.source &&
      e.date === entry.date &&
      e.type === entry.type &&
      !e.flaggedConflict &&
      isWithin30Min(e.startTime, entry.startTime)
    )

    if (conflict) {
      const existingRank = sourceRank(conflict.source, priority)
      const incomingRank = sourceRank(entry.source, priority)
      if (incomingRank < existingRank) {
        // incoming is higher priority — flag existing
        const idx = result.indexOf(conflict)
        result[idx] = { ...conflict, flaggedConflict: true, resolvedBy: 'priority' }
        result.push(entry)
      } else {
        // existing wins — flag incoming
        result.push({ ...entry, flaggedConflict: true, resolvedBy: 'priority' })
      }
    } else {
      result.push(entry)
    }
  }

  return result
}

export function importWorkouts(incoming: ExerciseWorkout[]): void {
  const existing = getAllWorkoutsRaw()
  const settings = getExerciseSettings()
  const merged = mergeWorkouts(existing, incoming, settings)
  saveWorkouts(merged)
}

// ─── VO2 Max ───

export function getVO2Max(): VO2MaxEntry[] {
  const entries = readJson<VO2MaxEntry[]>(KEYS.vo2max, [])
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))
}

export function saveVO2Max(entry: VO2MaxEntry): void {
  const existing = readJson<VO2MaxEntry[]>(KEYS.vo2max, [])
  const updated = [...existing.filter(e => e.id !== entry.id), entry]
  localStorage.setItem(KEYS.vo2max, JSON.stringify(updated))
}

// ─── Settings ───

export function getExerciseSettings(): ExerciseSettings {
  return readJson<ExerciseSettings>(KEYS.settings, DEFAULT_EXERCISE_SETTINGS)
}

export function saveExerciseSettings(settings: ExerciseSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}
