import type { OuraData } from '../types'

const KEY = 'healthspan:ouraData'

export function getOuraData(): OuraData | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as OuraData) : null
  } catch {
    return null
  }
}

export function saveOuraData(data: OuraData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    throw new Error('Failed to save Oura data — browser storage may be full.')
  }
}

export function hasOuraData(): boolean {
  return localStorage.getItem(KEY) !== null
}
