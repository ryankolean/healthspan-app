import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { getOuraData } from '../utils/oura-storage'
import { getLabResults } from '../utils/lab-storage'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { METRICS, METRIC_CATEGORIES } from '../utils/metrics'
import { computeTrend, computeOverallScore } from '../utils/trends'
import { fmt, fmtFull, hrs, avgArr, scoreColor, filterByRange } from '../utils/helpers'
import { Stat, ChartCard, ChartTooltip, TrendCard, dirColors, dirIcons, zoneColors } from '../components/Charts'
import type { OuraData } from '../types'

const TABS = ['Trends', 'Overview', 'Sleep', 'Activity', 'Heart', 'Readiness', 'Resilience']

// Recharts primitives
const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
const xax = (p?: any) => <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const yax = (p?: any) => <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const grd = (id: string, c: string) => (
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.3} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
)

export default function Dashboard() {
  const [tab, setTab] = useState('Trends')
  const [range, setRange] = useState(90)

  const ouraData = useMemo(() => getOuraData(), [])

  const labResults = useMemo(() => getLabResults(), [])
  const latestLab = labResults[0] ?? null
  const labStatus = useMemo(() => {
    if (!latestLab) return null
    const attention = latestLab.markers.filter(m => m.status === 'attention').length
    const acceptable = latestLab.markers.filter(m => m.status === 'acceptable').length
    if (attention > 0) return { label: 'Needs Attention', color: '#ef4444', count: attention }
    if (acceptable > 2) return { label: 'Acceptable', color: '#f59e0b', count: acceptable }
    return { label: 'Good', color: '#10b981', count: 0 }
  }, [latestLab])

  if (!ouraData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-gray-200">No Oura data loaded</p>
          <p className="text-sm text-gray-500">
            Go to{' '}
            <a href="#/settings" className="text-brand-400 underline hover:text-brand-300">
              Settings
            </a>{' '}
            to import your Oura Ring export.
          </p>
        </div>
      </div>
    )
  }

  // Prepared datasets
  const datasets = useMemo((): OuraData => ({
    ...ouraData,
    sleepDetail: ouraData.sleepDetail.map(d => ({
      ...d, deep_h: hrs(d.deep_s), rem_h: hrs(d.rem_s), light_h: hrs(d.light_s), total_h: hrs(d.total_s),
    })),
  }), [])

  // Trends
  const trends = useMemo(() => {
    const t: Record<string, ReturnType<typeof computeTrend>> = {}
    METRICS.forEach(m => { t[m.id] = computeTrend(datasets, m) })
    return t
  }, [datasets])

  const overallScore = useMemo(() => computeOverallScore(trends, METRICS), [trends])

  // Filtered + formatted data
  const sleep = useMemo(() => filterByRange(ouraData.sleep, range).map(d => ({ ...d, date: fmt(d.day) })), [range])
  const activity = useMemo(() => filterByRange(ouraData.activity, range).map(d => ({ ...d, date: fmt(d.day) })), [range])
  const readiness = useMemo(() => filterByRange(ouraData.readiness, range).map(d => ({ ...d, date: fmt(d.day) })), [range])
  const spo2 = useMemo(() => filterByRange(ouraData.spo2, range).map(d => ({ ...d, date: fmt(d.day) })), [range])
  const stress = useMemo(() => filterByRange(ouraData.stress, range).map(d => ({
    ...d, date: fmt(d.day),
    recovery_min: d.recovery_high ? Math.round(d.recovery_high / 60) : null,
    stress_min: d.stress_high ? Math.round(d.stress_high / 60) : null,
  })), [range])
  const cvAge = useMemo(() => filterByRange(ouraData.cvAge, range).map(d => ({ ...d, date: fmt(d.day) })), [range])
  const resilience = useMemo(() => filterByRange(ouraData.resilience, range).map(d => ({ ...d, date: fmt(d.day) })), [range])
  const sleepDetail = useMemo(() => filterByRange(datasets.sleepDetail, range).map(d => ({ ...d, date: fmt(d.day) })), [range, datasets])
  const workouts = useMemo(() => filterByRange(ouraData.workouts, range), [range])

  const last = <T,>(arr: T[]) => arr[arr.length - 1] || ({} as any)

  // ─── TRENDS TAB ───
  const renderTrends = () => {
    const improving = Object.values(trends).filter(t => t?.direction === 'improving').length
    const declining = Object.values(trends).filter(t => t?.direction === 'declining').length
    const attention = Object.values(trends).filter(t => t?.zone === 'attention').length
    const oc = (overallScore ?? 0) >= 80 ? '#10b981' : (overallScore ?? 0) >= 60 ? '#f59e0b' : '#ef4444'

    return (
      <>
        {/* Overall Score */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] py-7 px-8 mb-6 flex items-center gap-8 flex-wrap">
          <div className="relative w-[110px] h-[110px] flex-shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={oc} strokeWidth="8"
                strokeDasharray={`${((overallScore ?? 0) / 100) * 327} 327`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[34px] font-bold font-mono leading-none" style={{ color: oc }}>{overallScore}</span>
              <span className="text-[9px] text-slate-500 tracking-[0.1em] uppercase mt-1">Health Score</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-200 mb-2">
              {(overallScore ?? 0) >= 80 ? 'On Track' : (overallScore ?? 0) >= 60 ? 'Room to Improve' : 'Course Correction Needed'}
            </h2>
            <div className="text-[13px] text-slate-400 leading-relaxed">
              {improving > 0 && <span className="text-emerald-400 font-semibold">{improving} improving</span>}
              {improving > 0 && ' · '}
              {declining > 0 && <span className="text-red-400 font-semibold">{declining} declining</span>}
              {declining > 0 && ' · '}
              {attention > 0 && <span className="text-amber-400 font-semibold">{attention} need focus</span>}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              Comparing your last 14 days against your 90-day baseline. Targets based on Medicine 3.0 longevity framework.
            </div>
          </div>
        </div>

        {/* Course Corrections */}
        {(() => {
          const items = METRICS
            .map(m => ({ metric: m, trend: trends[m.id] }))
            .filter(({ trend }) => trend && (trend.zone === 'attention' || trend.direction === 'declining'))
            .sort((a, b) => {
              const zo: Record<string, number> = { attention: 0, acceptable: 1, optimal: 2 }
              return (zo[a.trend!.zone] ?? 2) - (zo[b.trend!.zone] ?? 2)
            })
          if (!items.length) return null
          return (
            <div className="bg-red-500/5 border border-red-500/15 rounded-[14px] py-[18px] px-5 mb-6">
              <div className="text-[12px] text-red-400 tracking-[0.06em] uppercase mb-3 font-bold">Course Corrections</div>
              {items.map(({ metric, trend }, i) => (
                <div key={i} className="flex items-center gap-2.5 py-2" style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span className="text-[12px]" style={{ color: dirColors[trend!.direction] }}>{dirIcons[trend!.direction]}</span>
                  <span className="text-[13px] text-gray-200 font-semibold min-w-[140px]">{metric.name}</span>
                  <span className="text-[12px] text-slate-400">Current: {trend!.current.toFixed(1)} {metric.unit}</span>
                  <span className="text-[12px] text-slate-500">→</span>
                  <span className="text-[12px] text-amber-400">Target: {metric.target[0]}–{metric.target[1]} {metric.unit}</span>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Metric Cards */}
        {METRIC_CATEGORIES.map(cat => {
          const items = METRICS.filter(m => m.category === cat)
          return (
            <div key={cat} className="mb-6">
              <div className="text-[13px] text-slate-400 tracking-[0.08em] uppercase mb-3 font-semibold">{cat}</div>
              <div className="flex flex-col gap-2.5">
                {items.map(m => trends[m.id] ? <TrendCard key={m.id} metric={m} trend={trends[m.id]!} /> : null)}
              </div>
            </div>
          )
        })}
      </>
    )
  }

  // ─── OVERVIEW TAB ───
  const renderOverview = () => {
    const ls = last(sleep), la = last(activity), lr = last(readiness), lsd = last(sleepDetail), lcv = last(cvAge)
    return (
      <>
        <div className="flex flex-wrap gap-3.5 mb-5">
          <Stat label="Sleep Score" value={ls.score} unit="/100" color={scoreColor(ls.score)} sub={`${range}d avg: ${avgArr(sleep, 'score')}`} />
          <Stat label="Activity Score" value={la.score} unit="/100" color={scoreColor(la.score)} sub={`Steps: ${la.steps?.toLocaleString() ?? '—'}`} />
          <Stat label="Readiness" value={lr.score} unit="/100" color={scoreColor(lr.score)} sub={`${range}d avg: ${avgArr(readiness, 'score')}`} />
          <Stat label="Resting HR" value={lsd.lowest_hr} unit="bpm" color="#6366f1" sub={`HRV: ${lsd.avg_hrv ?? '—'} ms`} />
          <Stat label="Vascular Age" value={lcv.vascular_age} unit="yrs" color="#22d3ee" sub={`Avg: ${avgArr(cvAge, 'vascular_age')} yrs`} />
          {latestLab && labStatus && (
            <Link to="/bloodwork">
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
                <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Lab Status</div>
                <div className="text-[24px] font-bold font-mono" style={{ color: labStatus.color }}>
                  {labStatus.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{latestLab.drawDate} · {latestLab.markers.length} markers</div>
              </div>
            </Link>
          )}
        </div>
        <ChartCard title={`Score Trends — ${range === 9999 ? 'All' : range + 'd'}`} height={250}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              {grid}{xax({ dataKey: 'day', allowDuplicatedCategory: false })}{yax({ domain: [40, 100] })}
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Line data={sleep} dataKey="score" stroke="#6366f1" strokeWidth={2} name="Sleep" dot={false} connectNulls />
              <Line data={activity.map(d => ({ ...d, day: fmt(d.day) }))} dataKey="score" stroke="#10b981" strokeWidth={2} name="Activity" dot={false} connectNulls />
              <Line data={readiness} dataKey="score" stroke="#f59e0b" strokeWidth={2} name="Readiness" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Cardiovascular Age">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cvAge}>{grd('cvG', '#22d3ee')}{grid}{xax()}{yax({ domain: [20, 50] })}<Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="vascular_age" stroke="#22d3ee" fill="url(#cvG)" strokeWidth={2} name="Vascular Age" dot={false} /></AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Daily Steps">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={10000} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.4} /><Bar dataKey="steps" fill="#10b981" name="Steps" radius={[3, 3, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </>
    )
  }

  // ─── SLEEP TAB ───
  const renderSleep = () => (
    <>
      <div className="flex flex-wrap gap-3.5 mb-5">
        <Stat label="Avg Total Sleep" value={avgArr(sleepDetail, 'total_h')} unit="hrs" color="#6366f1" />
        <Stat label="Avg Deep Sleep" value={avgArr(sleepDetail, 'deep_h')} unit="hrs" color="#8b5cf6" />
        <Stat label="Avg REM" value={avgArr(sleepDetail, 'rem_h')} unit="hrs" color="#a78bfa" />
        <Stat label="Avg Efficiency" value={avgArr(sleepDetail, 'efficiency')} unit="%" color="#10b981" />
      </div>
      <ChartCard title="Sleep Score" height={220}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sleep}>{grd('slG', '#6366f1')}{grid}{xax()}{yax({ domain: [40, 100] })}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={85} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.5} /><Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#slG)" strokeWidth={2} name="Sleep Score" dot={false} /></AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Sleep Duration (hrs)" height={240}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sleepDetail}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="deep_h" stackId="a" fill="#6366f1" name="Deep" /><Bar dataKey="rem_h" stackId="a" fill="#8b5cf6" name="REM" /><Bar dataKey="light_h" stackId="a" fill="#c4b5fd" name="Light" radius={[3, 3, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="HRV During Sleep (ms)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sleepDetail}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.4} /><Line type="monotone" dataKey="avg_hrv" stroke="#10b981" strokeWidth={2} name="HRV" dot={false} /></LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Lowest Resting HR (bpm)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sleepDetail}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.4} /><Line type="monotone" dataKey="lowest_hr" stroke="#ef4444" strokeWidth={2} name="Resting HR" dot={false} /></LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Sleep Contributors">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sleep}>{grid}{xax()}{yax({ domain: [0, 100] })}<Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="deep" stroke="#6366f1" strokeWidth={1.5} name="Deep" dot={false} /><Line type="monotone" dataKey="rem" stroke="#8b5cf6" strokeWidth={1.5} name="REM" dot={false} /><Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={1.5} name="Efficiency" dot={false} /><Line type="monotone" dataKey="restfulness" stroke="#f59e0b" strokeWidth={1.5} name="Restfulness" dot={false} /></LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  )

  // ─── ACTIVITY TAB ───
  const renderActivity = () => {
    const la = last(activity)
    return (
      <>
        <div className="flex flex-wrap gap-3.5 mb-5">
          <Stat label="Latest Steps" value={la.steps?.toLocaleString()} color="#10b981" sub={`Avg: ${Math.round(avgArr(activity, 'steps') || 0).toLocaleString()}`} />
          <Stat label="Active Calories" value={la.active_cal} unit="cal" color="#f59e0b" sub={`Avg: ${Math.round(avgArr(activity, 'active_cal') || 0)}`} />
          <Stat label="Activity Score" value={la.score} unit="/100" color={scoreColor(la.score)} />
          <Stat label="Walking Equiv." value={la.walking_dist ? (la.walking_dist / 1000).toFixed(1) : '—'} unit="km" color="#6366f1" />
        </div>
        <ChartCard title="Activity Score">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={activity}>{grd('acG', '#10b981')}{grid}{xax()}{yax({ domain: [0, 100] })}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={85} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.4} /><Area type="monotone" dataKey="score" stroke="#10b981" fill="url(#acG)" strokeWidth={2} name="Activity" dot={false} /></AreaChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Daily Steps" height={240}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={activity}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={10000} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.4} /><Bar dataKey="steps" fill="#10b981" name="Steps" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Active Calories">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={activity}>{grd('clG', '#f59e0b')}{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={400} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.4} /><Area type="monotone" dataKey="active_cal" stroke="#f59e0b" fill="url(#clG)" strokeWidth={2} name="Active Cal" dot={false} /></AreaChart></ResponsiveContainer>
        </ChartCard>
        {workouts.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-[14px] py-[18px] px-5 mb-[18px]">
            <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3.5">Recent Workouts</div>
            {workouts.slice(-10).reverse().map((w, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/5 text-[13px]">
                <span className="text-gray-200">{w.activity}</span>
                <span className="text-slate-400">{fmtFull(w.day)} — {w.intensity} — {Math.round(w.calories || 0)} cal</span>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  // ─── HEART TAB ───
  const renderHeart = () => {
    const lsd = last(sleepDetail), ls2 = last(spo2)
    return (
      <>
        <div className="flex flex-wrap gap-3.5 mb-5">
          <Stat label="Resting HR" value={lsd.lowest_hr} unit="bpm" color="#ef4444" sub={`Avg: ${avgArr(sleepDetail, 'lowest_hr')} bpm`} />
          <Stat label="Avg Sleep HR" value={lsd.avg_hr ? Math.round(lsd.avg_hr) : '—'} unit="bpm" color="#f59e0b" />
          <Stat label="HRV" value={lsd.avg_hrv ? Math.round(lsd.avg_hrv) : '—'} unit="ms" color="#10b981" sub={`Avg: ${avgArr(sleepDetail, 'avg_hrv')} ms`} />
          <Stat label="SpO2" value={ls2.avg ? ls2.avg.toFixed(1) : '—'} unit="%" color="#6366f1" />
        </div>
        <ChartCard title="HRV Trend (ms)" height={240}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={sleepDetail}>{grd('hvG', '#10b981')}{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.4} /><Area type="monotone" dataKey="avg_hrv" stroke="#10b981" fill="url(#hvG)" strokeWidth={2} name="HRV" dot={false} /></AreaChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Resting HR (bpm)">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={sleepDetail}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="6 4" strokeOpacity={0.4} /><Line type="monotone" dataKey="lowest_hr" stroke="#ef4444" strokeWidth={2} name="Resting HR" dot={false} /><Line type="monotone" dataKey="avg_hr" stroke="#f59e0b" strokeWidth={1.5} name="Avg Sleep HR" dot={false} strokeDasharray="4 4" /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="SpO2 (%)">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={spo2}>{grid}{xax()}{yax({ domain: [90, 100] })}<Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} name="SpO2" dot={false} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Breathing Disturbance Index">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={spo2}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={10} stroke="#ef4444" strokeDasharray="6 4" strokeOpacity={0.4} /><Bar dataKey="bdi" fill="#8b5cf6" name="BDI" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        {stress.length > 0 && (
          <ChartCard title="Stress vs Recovery (min)">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={stress}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="stress_min" fill="#ef4444" name="Stress" radius={[3, 3, 0, 0]} /><Bar dataKey="recovery_min" fill="#10b981" name="Recovery" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </ChartCard>
        )}
      </>
    )
  }

  // ─── READINESS TAB ───
  const renderReadiness = () => {
    const lr = last(readiness)
    return (
      <>
        <div className="flex flex-wrap gap-3.5 mb-5">
          <Stat label="Readiness" value={lr.score} unit="/100" color={scoreColor(lr.score)} />
          <Stat label="HRV Balance" value={lr.hrv_balance} unit="/100" color="#6366f1" />
          <Stat label="Recovery" value={lr.recovery} unit="/100" color="#10b981" />
          <Stat label="Body Temp" value={lr.body_temp} unit="/100" color="#f59e0b" />
          <Stat label="Temp Dev" value={lr.temp_dev != null ? (lr.temp_dev > 0 ? '+' : '') + lr.temp_dev.toFixed(2) : '—'} unit="°C" color={lr.temp_dev > 0.5 ? '#ef4444' : '#10b981'} />
        </div>
        <ChartCard title="Readiness Score" height={240}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={readiness}>{grd('rdG', '#f59e0b')}{grid}{xax()}{yax({ domain: [40, 100] })}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={85} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.4} /><Area type="monotone" dataKey="score" stroke="#f59e0b" fill="url(#rdG)" strokeWidth={2} name="Readiness" dot={false} /></AreaChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Readiness Contributors">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={readiness}>{grid}{xax()}{yax({ domain: [0, 100] })}<Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="hrv_balance" stroke="#6366f1" strokeWidth={1.5} name="HRV Balance" dot={false} /><Line type="monotone" dataKey="recovery" stroke="#10b981" strokeWidth={1.5} name="Recovery" dot={false} /><Line type="monotone" dataKey="rhr" stroke="#ef4444" strokeWidth={1.5} name="Resting HR" dot={false} /><Line type="monotone" dataKey="body_temp" stroke="#f59e0b" strokeWidth={1.5} name="Body Temp" dot={false} /><Line type="monotone" dataKey="prev_night" stroke="#8b5cf6" strokeWidth={1.5} name="Prev Night" dot={false} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Temperature Deviation (°C)">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={readiness}>{grid}{xax()}{yax()}<Tooltip content={<ChartTooltip />} /><ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" strokeOpacity={0.3} /><Line type="monotone" dataKey="temp_dev" stroke="#22d3ee" strokeWidth={2} name="Temp Dev" dot={false} /></LineChart></ResponsiveContainer>
        </ChartCard>
      </>
    )
  }

  // ─── RESILIENCE TAB ───
  const renderResilience = () => (
    <>
      <div className="flex flex-wrap gap-3.5 mb-5">
        <Stat label="Level" value={last(resilience).level ?? '—'} color="#22d3ee" />
        <Stat label="Sleep Recovery" value={last(resilience).sleep_recovery} unit="/100" color="#6366f1" />
        <Stat label="Daytime Recovery" value={last(resilience).daytime_recovery} unit="/100" color="#10b981" />
        <Stat label="Stress" value={last(resilience).stress} unit="/100" color="#f59e0b" />
      </div>
      <ChartCard title="Resilience Contributors" height={250}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={resilience}>{grid}{xax()}{yax({ domain: [0, 100] })}<Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Line type="monotone" dataKey="sleep_recovery" stroke="#6366f1" strokeWidth={2} name="Sleep Recovery" dot={false} /><Line type="monotone" dataKey="daytime_recovery" stroke="#10b981" strokeWidth={2} name="Daytime Recovery" dot={false} /><Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={2} name="Stress" dot={false} /></LineChart></ResponsiveContainer>
      </ChartCard>
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[14px] py-[18px] px-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3.5">Level History</div>
        <div className="flex flex-wrap gap-2">
          {resilience.map((r: any, i: number) => {
            const c = r.level === 'exceptional' ? '#10b981' : r.level === 'strong' ? '#6366f1' : r.level === 'adequate' ? '#f59e0b' : '#ef4444'
            return (
              <div key={i} className="rounded-lg py-1.5 px-3 text-[12px]" style={{ background: `${c}22`, border: `1px solid ${c}44` }}>
                <span className="text-slate-400">{fmt(r.day)}</span>{' '}
                <span className="font-semibold capitalize" style={{ color: c }}>{r.level}</span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  return (
    <div>
      {latestLab && labStatus && labStatus.count > 0 && (
        <div className="mx-6 mt-6 flex items-center gap-3 bg-red-400/[0.08] border border-red-400/20 rounded-[14px] px-5 py-3">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 flex-1">
            {labStatus.count} lab marker{labStatus.count > 1 ? 's' : ''} need{labStatus.count === 1 ? 's' : ''} attention
          </p>
          <Link to="/bloodwork" className="text-xs text-red-400 hover:text-red-300 underline">View labs →</Link>
        </div>
      )}
    <div className="max-w-[1100px] mx-auto py-7 px-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3.5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-200">Pharma Dashboard</h1>
          <div className="text-[10px] text-slate-500 tracking-[0.1em] uppercase mt-0.5">
            {ouraData.sleep[0]?.day} to {ouraData.sleep[ouraData.sleep.length - 1]?.day}
          </div>
        </div>
        <div className="flex gap-1.5">
          {[30, 90, 180, 365, 9999].map(r => (
            <button key={r} onClick={() => setRange(r)} className={`py-1 px-3 rounded-lg border text-[11px] font-semibold transition-colors ${
              range === r ? 'border-brand-500 bg-brand-500/15 text-brand-300' : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}>{r === 9999 ? 'All' : `${r}d`}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-[3px] mb-6 border-b border-white/[0.06] overflow-x-auto tabs-scroll">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`py-2.5 px-4 border-none bg-transparent whitespace-nowrap text-[12px] font-semibold transition-colors ${
            tab === t ? 'text-gray-200 border-b-2 border-brand-500 -mb-px' : 'text-slate-500 hover:text-slate-300'
          }`}>{t}</button>
        ))}
      </div>

      {/* Content */}
      {tab === 'Trends' && renderTrends()}
      {tab === 'Overview' && renderOverview()}
      {tab === 'Sleep' && renderSleep()}
      {tab === 'Activity' && renderActivity()}
      {tab === 'Heart' && renderHeart()}
      {tab === 'Readiness' && renderReadiness()}
      {tab === 'Resilience' && renderResilience()}

      <div className="text-center mt-9 pt-4 border-t border-white/5 text-[10px] text-slate-600">
        PHARMA Health Intelligence — Oura Ring Data — Medicine 3.0 Framework — Summit Software Solutions LLC
      </div>
    </div>
    </div>
  )
}
