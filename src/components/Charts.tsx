import { ReactNode } from 'react'
import { Tooltip as ReTooltip } from 'recharts'

// ─── Stat Card ───
interface StatProps {
  label: string
  value: string | number | null | undefined
  unit?: string
  sub?: string
  color?: string
}

export function Stat({ label, value, unit, sub, color = '#10b981' }: StatProps) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px]">
      <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5 font-sans">{label}</div>
      <div className="flex items-baseline gap-[5px]">
        <span className="text-[32px] font-bold font-mono leading-none" style={{ color }}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-[13px] text-slate-500">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-[5px]">{sub}</div>}
    </div>
  )
}

// ─── Chart Card ───
interface ChartCardProps {
  title: string
  children: ReactNode
  height?: number
}

export function ChartCard({ title, children, height = 210 }: ChartCardProps) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-[14px] py-[18px] px-5 mb-[18px]">
      <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3.5 font-sans">{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  )
}

// ─── Custom Tooltip ───
export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1f2e] border border-white/15 rounded-lg py-2 px-3 text-[11px] font-sans">
      <div className="text-slate-400 mb-[3px]">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}
        </div>
      ))}
    </div>
  )
}

// ─── Trend Card ───
const dirIcons: Record<string, string> = { improving: '▲', stable: '●', declining: '▼' }
const dirColors: Record<string, string> = { improving: '#10b981', stable: '#64748b', declining: '#ef4444' }
const zoneColors: Record<string, string> = { optimal: '#10b981', acceptable: '#f59e0b', attention: '#ef4444' }
const zoneLabels: Record<string, string> = { optimal: 'In Zone', acceptable: 'Near Zone', attention: 'Needs Focus' }

interface TrendCardProps {
  metric: { name: string; unit: string; target: [number, number] }
  trend: {
    current: number
    baseline: number
    pctChange: number
    direction: string
    zone: string
    sparkline: number[]
  }
}

export function TrendCard({ metric, trend }: TrendCardProps) {
  const dir = trend.direction
  const zone = trend.zone
  const spark = trend.sparkline
  const sMin = Math.min(...spark)
  const sMax = Math.max(...spark)
  const sRange = sMax - sMin || 1
  const points = spark
    .map((v, i) => `${(i / (spark.length - 1)) * 100},${100 - ((v - sMin) / sRange) * 100}`)
    .join(' ')

  return (
    <div
      className="bg-white/[0.03] rounded-[14px] py-4 px-5 flex items-center gap-4 transition-all"
      style={{ border: `1px solid ${zone === 'attention' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}` }}
    >
      <div
        className="w-[42px] h-[42px] rounded-xl flex-shrink-0 flex items-center justify-center text-[16px]"
        style={{ background: `${dirColors[dir]}18`, border: `1px solid ${dirColors[dir]}33`, color: dirColors[dir] }}
      >
        {dirIcons[dir]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[13px] font-semibold text-gray-200">{metric.name}</span>
          <span
            className="text-[10px] font-semibold py-[2px] px-2 rounded-md uppercase tracking-[0.05em]"
            style={{ background: `${zoneColors[zone]}18`, color: zoneColors[zone] }}
          >
            {zoneLabels[zone]}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[22px] font-bold font-mono" style={{ color: dirColors[dir] }}>
            {Number.isInteger(trend.current) ? trend.current : trend.current.toFixed(1)}
          </span>
          <span className="text-[11px] text-slate-500">{metric.unit}</span>
          <span className="text-[11px] font-semibold" style={{ color: dirColors[dir] }}>
            {trend.pctChange > 0 ? '+' : ''}{trend.pctChange}%
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          14d avg vs 90d baseline ({Number.isInteger(trend.baseline) ? trend.baseline : trend.baseline.toFixed(1)} {metric.unit}) — Target: {metric.target[0]}–{metric.target[1]} {metric.unit}
        </div>
      </div>

      <div className="w-20 h-9 flex-shrink-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <polyline points={points} fill="none" stroke={dirColors[dir]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export { dirColors, dirIcons, zoneColors, zoneLabels }
