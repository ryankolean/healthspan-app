import type { ImportDomain } from '../data/import-sources'

const KEY = 'healthspan:imports'

export interface ImportRecord {
  id: string
  sourceId: string
  importedAt: string // ISO 8601
  recordCount: number
  domains: ImportDomain[]
  dateRange: { from: string; to: string }
}

export function getImportHistory(): ImportRecord[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  const records: ImportRecord[] = JSON.parse(raw)
  return records.sort((a, b) => b.importedAt.localeCompare(a.importedAt))
}

export function addImportRecord(record: ImportRecord): void {
  const existing = getImportHistory()
  existing.push(record)
  localStorage.setItem(KEY, JSON.stringify(existing))
}

export function getLastImportForSource(sourceId: string): ImportRecord | null {
  const history = getImportHistory()
  return history.find((r) => r.sourceId === sourceId) ?? null
}

export function clearImportHistory(): void {
  localStorage.removeItem(KEY)
}
