export const fmt = (d: string) => {
  if (!d) return ''
  const p = d.split('-')
  return `${parseInt(p[1])}/${parseInt(p[2])}`
}

export const fmtFull = (d: string) => {
  if (!d) return ''
  const p = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(p[1]) - 1]} ${parseInt(p[2])}, ${p[0]}`
}

export const hrs = (s: number | undefined | null): number | null =>
  s != null ? +(s / 3600).toFixed(2) : null

export const avgArr = (arr: Record<string, any>[], key: string): number | null => {
  const v = arr.map(d => d[key]).filter((x): x is number => x != null)
  return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null
}

export const scoreColor = (s: number | undefined | null): string =>
  s == null ? '#64748b' : s >= 85 ? '#10b981' : s >= 70 ? '#f59e0b' : '#ef4444'

export const filterByRange = <T extends { day: string }>(arr: T[], days: number): T[] => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cs = cutoff.toISOString().split('T')[0]
  return arr.filter(d => d.day >= cs)
}
