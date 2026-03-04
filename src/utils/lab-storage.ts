import type { LabResult } from '../types/bloodwork'

const KEYS = {
  LAB_RESULTS: 'healthspan:labResults',
  API_KEY: 'healthspan:apiKey',
} as const

// ─── Lab Results ───

export function getLabResults(): LabResult[] {
  try {
    const raw = localStorage.getItem(KEYS.LAB_RESULTS)
    return raw ? (JSON.parse(raw) as LabResult[]) : []
  } catch {
    return []
  }
}

export function getLabResult(id: string): LabResult | null {
  return getLabResults().find(r => r.id === id) ?? null
}

export function saveLabResult(result: LabResult): void {
  try {
    const results = getLabResults().filter(r => r.id !== result.id)
    results.push(result)
    results.sort((a, b) => b.drawDate.localeCompare(a.drawDate))
    localStorage.setItem(KEYS.LAB_RESULTS, JSON.stringify(results))
  } catch (e) {
    throw new Error('Failed to save lab result — browser storage may be full.')
  }
}

export function deleteLabResult(id: string): void {
  try {
    const results = getLabResults().filter(r => r.id !== id)
    localStorage.setItem(KEYS.LAB_RESULTS, JSON.stringify(results))
  } catch (e) {
    throw new Error('Failed to delete lab result — browser storage may be full.')
  }
}

// ─── API Key ───

export function getApiKey(): string | null {
  return localStorage.getItem(KEYS.API_KEY)
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEYS.API_KEY, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(KEYS.API_KEY)
}
