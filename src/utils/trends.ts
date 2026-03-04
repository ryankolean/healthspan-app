import type { MetricDefinition, TrendResult, OuraData } from '../types'

export function computeTrend(datasets: OuraData, metric: MetricDefinition): TrendResult | null {
  const src = datasets[metric.src] as Record<string, any>[]
  if (!src?.length) return null

  const vals = src
    .map(d => ({ day: d.day as string, val: d[metric.key] as number }))
    .filter(d => d.val != null)

  if (vals.length < 3) return null

  const now = new Date()
  const cutoff = (days: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  const c14 = cutoff(14)
  const c30 = cutoff(30)
  const c90 = cutoff(90)

  const mean = (arr: { val: number }[]) =>
    arr.length ? +(arr.reduce((a, b) => a + b.val, 0) / arr.length).toFixed(2) : null

  const recent = vals.filter(v => v.day >= c14)
  const mid = vals.filter(v => v.day >= c30)
  const long = vals.filter(v => v.day >= c90)

  const recentAvg = mean(recent)
  const midAvg = mean(mid)
  const longAvg = mean(long)
  const allAvg = mean(vals)
  const latest = vals[vals.length - 1]?.val ?? null

  const baseline = longAvg ?? midAvg ?? allAvg
  const current = recentAvg ?? midAvg

  if (current == null || baseline == null) return null

  const delta = current - baseline
  const pctChange = baseline !== 0 ? +((delta / Math.abs(baseline)) * 100).toFixed(1) : 0

  const threshold = metric.higherBetter === null ? 2 : 3
  let direction: TrendResult['direction']

  if (Math.abs(pctChange) < threshold) {
    direction = 'stable'
  } else if (metric.higherBetter === null) {
    direction = Math.abs(current) < Math.abs(baseline) ? 'improving' : 'declining'
  } else if (metric.higherBetter) {
    direction = pctChange > 0 ? 'improving' : 'declining'
  } else {
    direction = pctChange < 0 ? 'improving' : 'declining'
  }

  const [lo, hi] = metric.target
  let zone: TrendResult['zone']

  if (metric.higherBetter === null) {
    zone = Math.abs(current) <= Math.max(Math.abs(lo), Math.abs(hi)) ? 'optimal' : 'attention'
  } else if (current >= lo && current <= hi) {
    zone = 'optimal'
  } else if (metric.higherBetter && current >= lo * 0.85) {
    zone = 'acceptable'
  } else if (!metric.higherBetter && current <= hi * 1.15) {
    zone = 'acceptable'
  } else {
    zone = 'attention'
  }

  return {
    latest,
    current,
    baseline,
    delta: +delta.toFixed(2),
    pctChange,
    direction,
    zone,
    recentAvg,
    midAvg,
    longAvg,
    allAvg,
    sparkline: vals.slice(-30).map(v => v.val),
  }
}

export function computeOverallScore(trends: Record<string, TrendResult | null>, metrics: MetricDefinition[]): number | null {
  let totalWeight = 0
  let weightedScore = 0

  for (const m of metrics) {
    const trend = trends[m.id]
    if (!trend) continue

    const base = trend.zone === 'optimal' ? 90 : trend.zone === 'acceptable' ? 65 : 35
    const adj = trend.direction === 'improving' ? 10 : trend.direction === 'stable' ? 0 : -10

    weightedScore += (base + adj) * m.weight
    totalWeight += m.weight
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : null
}
