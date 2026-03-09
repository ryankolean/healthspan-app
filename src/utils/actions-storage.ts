import type { ActionDefinition, DailyActionEntry, ActionSettings } from '../types/actions'
import { DEFAULT_ACTION_SETTINGS } from '../types/actions'

export const ACTIONS_UPDATED_EVENT = 'healthspan:actions-updated'

export function dispatchActionsUpdated(): void {
  window.dispatchEvent(new Event(ACTIONS_UPDATED_EVENT))
}

const KEYS = {
  definitions: 'healthspan:actions:definitions',
  settings: 'healthspan:actions:settings',
} as const

function entryKey(date: string): string {
  return `healthspan:actions:entries:${date}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// ─── Definitions ───

export function getActionDefinitions(): ActionDefinition[] {
  return readJson<ActionDefinition[]>(KEYS.definitions, [])
}

export function saveActionDefinition(def: ActionDefinition): void {
  const all = getActionDefinitions().filter(d => d.id !== def.id)
  all.push(def)
  all.sort((a, b) => a.sortOrder - b.sortOrder)
  localStorage.setItem(KEYS.definitions, JSON.stringify(all))
}

export function deleteActionDefinition(id: string): void {
  const all = getActionDefinitions().filter(d => d.id !== id)
  localStorage.setItem(KEYS.definitions, JSON.stringify(all))
}

// ─── Daily Entries ───

export function getDailyEntries(date: string): DailyActionEntry[] {
  return readJson<DailyActionEntry[]>(entryKey(date), [])
}

export function saveDailyEntry(entry: DailyActionEntry): void {
  const all = getDailyEntries(entry.date).filter(e => e.actionId !== entry.actionId)
  all.push(entry)
  localStorage.setItem(entryKey(entry.date), JSON.stringify(all))
}

// ─── Settings ───

export function getActionSettings(): ActionSettings {
  return readJson<ActionSettings>(KEYS.settings, DEFAULT_ACTION_SETTINGS)
}

export function saveActionSettings(settings: ActionSettings): void {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings))
}

// ─── Date Utilities ───

export function getEffectiveToday(resetHour: number): string {
  const now = new Date()
  if (now.getHours() < resetHour) {
    now.setDate(now.getDate() - 1)
  }
  return now.toISOString().slice(0, 10)
}

export function isActionDueOnDate(action: ActionDefinition, date: string, completedDaysThisWeek?: number): boolean {
  if (!action.active) return false
  const d = new Date(date + 'T12:00:00')
  const dayOfWeek = d.getDay() // 0=Sun..6=Sat

  switch (action.frequency.type) {
    case 'daily':
      return true
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case 'specific_days':
      return action.frequency.days.includes(dayOfWeek)
    case 'times_per_week':
      return (completedDaysThisWeek ?? 0) < action.frequency.count
  }
}

export function getWeekStart(date: string): string {
  const d = new Date(date + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = start of week
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export function getCompletedDaysThisWeek(actionId: string, today: string): number {
  const weekStart = getWeekStart(today)
  let count = 0
  const d = new Date(weekStart + 'T12:00:00')
  const end = new Date(today + 'T12:00:00')
  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10)
    const entries = getDailyEntries(dateStr)
    if (entries.some(e => e.actionId === actionId && e.completed)) {
      count++
    }
    d.setDate(d.getDate() + 1)
  }
  return count
}

export function getDueActionsForDate(date: string): ActionDefinition[] {
  return getActionDefinitions().filter(a => {
    if (!a.active) return false
    if (a.frequency.type === 'times_per_week') {
      const completed = getCompletedDaysThisWeek(a.id, date)
      return isActionDueOnDate(a, date, completed)
    }
    return isActionDueOnDate(a, date)
  })
}
