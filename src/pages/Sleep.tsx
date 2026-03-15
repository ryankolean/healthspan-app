import { useState, useEffect } from 'react'
import { Moon, AlertTriangle, Check } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { getSleepNights, getFlaggedSleepConflicts, resolveSleepConflict, getSleepSettings, saveSleepSettings, importSleepNights } from '../utils/sleep-storage'
import { parseOuraSleep } from '../utils/sleep-parsers/oura'
import { parseAppleHealthSleep } from '../utils/sleep-parsers/apple-health'
import { parseWhoopSleep } from '../utils/sleep-parsers/whoop'
import { SLEEP_TARGETS, getSleepStatus } from '../data/sleep-targets'
import { IMPORT_SOURCES } from '../data/import-sources'
import type { SleepNight, SleepSettings, SleepSource } from '../types/sleep'
import { v4 as uuidv4 } from 'uuid'

const BRAND = '#6366f1'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const RED = '#ef4444'

const STATUS_COLORS: Record<string, string> = { green: GREEN, amber: AMBER, red: RED }

type Tab = 'overview' | 'trends' | 'analysis' | 'insights' | 'sources'

interface ManualForm {
  date: string
  bedtime: string
  wakeTime: string
  quality: string
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${m}m`
}

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return `${d.getFullYear()}-W${String(1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)).padStart(2, '0')}`
}

function groupByWeek(nights: SleepNight[]): Record<string, SleepNight[]> {
  const map: Record<string, SleepNight[]> = {}
  nights.forEach(n => {
    const wk = getISOWeek(new Date(n.date))
    ;(map[wk] ??= []).push(n)
  })
  return map
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function getMetricValue(nights: SleepNight[], metricId: string): number | null {
  const vals = nights
    .map(n => {
      if (metricId === 'total') return n.totalMin
      if (metricId === 'deep') return n.deepMin
      if (metricId === 'rem') return n.remMin
      if (metricId === 'efficiency') return n.efficiency
      if (metricId === 'onset') return n.onsetMin
      return undefined
    })
    .filter((v): v is number => v != null)
  return vals.length > 0 ? avg(vals) : null
}

export default function Sleep() {
  const [tab, setTab] = useState<Tab>('overview')
  const [nights, setNights] = useState<SleepNight[]>([])
  const [conflicts, setConflicts] = useState<SleepNight[]>([])
  const [settings, setSettings] = useState<SleepSettings>(getSleepSettings())
  const [importing, setImporting] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [manualForm, setManualForm] = useState<ManualForm>({ date: '', bedtime: '', wakeTime: '', quality: '3' })

  function reload() {
    setNights(getSleepNights())
    setConflicts(getFlaggedSleepConflicts())
    setSettings(getSleepSettings())
  }

  useEffect(() => { reload() }, [])

  async function handleFileImport(source: string, file: File) {
    setImporting(source)
    setImportError(null)
    setImportSuccess(null)
    try {
      let result: { nights: SleepNight[] }
      const text = await file.text()

      if (source === 'apple_health') {
        result = parseAppleHealthSleep(text)
      } else if (source === 'whoop') {
        result = parseWhoopSleep(text)
      } else {
        throw new Error('Unknown source')
      }

      importSleepNights(result.nights)
      setImportSuccess(`Imported ${result.nights.length} sleep nights from ${source.replace('_', ' ')}`)
      reload()
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }

  function handleImportOura() {
    setImportError(null)
    setImportSuccess(null)
    const raw = localStorage.getItem('healthspan:ouraData')
    if (!raw) { setImportError('No Oura data found. Sync Oura data first from the Dashboard.'); return }
    const data = JSON.parse(raw)
    const result = parseOuraSleep(data)
    importSleepNights(result.nights)
    setImportSuccess(`Imported ${result.nights.length} sleep nights from Oura`)
    reload()
  }

  function handleManualSave() {
    if (!manualForm.date || !manualForm.bedtime || !manualForm.wakeTime) return
    const bedISO = `${manualForm.date}T${manualForm.bedtime}:00`
    const wakeISO = `${manualForm.date}T${manualForm.wakeTime}:00`
    const bedDate = new Date(bedISO)
    const wakeDate = new Date(wakeISO)
    let totalMin = Math.round((wakeDate.getTime() - bedDate.getTime()) / 60000)
    if (totalMin <= 0) totalMin += 24 * 60

    const night: SleepNight = {
      id: uuidv4(),
      source: 'manual',
      sourceId: `manual-${Date.now()}`,
      date: manualForm.date,
      bedtime: bedISO,
      wakeTime: wakeISO,
      totalMin,
      qualityRating: parseInt(manualForm.quality, 10),
      createdAt: Date.now(),
    }

    importSleepNights([night])
    setImportSuccess('Manual sleep entry saved')
    setManualForm({ date: '', bedtime: '', wakeTime: '', quality: '3' })
    reload()
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'insights', label: 'Insights' },
    { id: 'sources', label: 'Sources' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Moon size={20} className="text-brand-400" />
        <h1 className="text-xl font-bold text-gray-100">Sleep</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-white/[0.06]">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'text-brand-300 border-brand-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab nights={nights} />}
      {tab === 'trends' && <TrendsTab nights={nights} />}
      {tab === 'analysis' && <AnalysisTab nights={nights} />}
      {tab === 'insights' && <InsightsTab nights={nights} />}
      {tab === 'sources' && (
        <SourcesTab
          nights={nights}
          conflicts={conflicts}
          settings={settings}
          importing={importing}
          importError={importError}
          importSuccess={importSuccess}
          manualForm={manualForm}
          setManualForm={setManualForm}
          onFileImport={handleFileImport}
          onImportOura={handleImportOura}
          onManualSave={handleManualSave}
          onResolveConflict={(keepId, dropId) => { resolveSleepConflict(keepId, dropId); reload() }}
          onSaveSettings={(s) => { saveSleepSettings(s); setSettings(s) }}
        />
      )}
    </div>
  )
}

/* ─── Overview Tab ─── */

function OverviewTab({ nights }: { nights: SleepNight[] }) {
  const sorted = [...nights].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)

  const complianceCards: { id: string; label: string; unit: 'min' | '%' }[] = [
    { id: 'total', label: 'Total Sleep', unit: 'min' },
    { id: 'deep', label: 'Deep Sleep', unit: 'min' },
    { id: 'rem', label: 'REM Sleep', unit: 'min' },
    { id: 'efficiency', label: 'Efficiency', unit: '%' },
  ]

  const byWeek = groupByWeek(nights)
  const weeks = Object.keys(byWeek).sort().slice(-12)
  const weeklyScoreData = weeks.map(wk => {
    const scores = byWeek[wk].map(n => n.sleepScore).filter((v): v is number => v != null)
    return { week: wk.slice(5), score: scores.length > 0 ? Math.round(avg(scores)) : null }
  }).filter(d => d.score != null)

  // Weekly compliance: nights where all 4 targets are green
  const thisWeek = getISOWeek(new Date())
  const thisWeekNights = byWeek[thisWeek] ?? []
  const compliantCount = thisWeekNights.filter(n => {
    const totalOk = n.totalMin != null && getSleepStatus('total', n.totalMin) === 'green'
    const deepOk = n.deepMin != null && getSleepStatus('deep', n.deepMin) === 'green'
    const remOk = n.remMin != null && getSleepStatus('rem', n.remMin) === 'green'
    const effOk = n.efficiency != null && getSleepStatus('efficiency', n.efficiency) === 'green'
    return totalOk && deepOk && remOk && effOk
  }).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {complianceCards.map(card => {
          const val = getMetricValue(last7, card.id)
          const target = SLEEP_TARGETS.find(t => t.id === card.id)
          const status = val != null ? getSleepStatus(card.id, val) : null
          const color = status ? STATUS_COLORS[status] : '#6b7280'
          const displayVal = val != null
            ? card.unit === 'min' ? formatMin(val) : `${Math.round(val)}%`
            : '--'
          const targetLabel = target
            ? card.unit === 'min' ? `Target: ${formatMin(target.greenMin)}` : `Target: ${target.greenMin}%`
            : ''

          return (
            <div key={card.id} className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
              <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color }}>{displayVal}</div>
              <div className="text-xs text-gray-500 mt-0.5">{targetLabel}</div>
            </div>
          )
        })}
      </div>

      {nights.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Moon size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No sleep data yet. Import data from the Sources tab.</p>
        </div>
      )}

      {weeklyScoreData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sleep Score / Week</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weeklyScoreData}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="score" stroke={BRAND} fill={`${BRAND}33`} strokeWidth={2} name="Sleep Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {nights.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Weekly Compliance</div>
          <div className="text-lg font-bold font-mono" style={{ color: compliantCount >= 5 ? GREEN : compliantCount >= 3 ? AMBER : RED }}>
            {compliantCount}/7 nights hit all targets this week
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Trends Tab ─── */

function TrendsTab({ nights }: { nights: SleepNight[] }) {
  const sorted = [...nights].sort((a, b) => a.date.localeCompare(b.date))
  const last30 = sorted.slice(-30)

  const durationData = last30.map(n => ({
    date: n.date.slice(5),
    deep: n.deepMin ?? 0,
    rem: n.remMin ?? 0,
    light: n.lightMin ?? 0,
    awake: n.awakeMin ?? 0,
  }))

  const hrvData = last30
    .filter(n => n.avgHrv != null)
    .map(n => ({ date: n.date.slice(5), hrv: n.avgHrv }))

  const hrData = last30
    .filter(n => n.lowestHr != null || n.avgHr != null)
    .map(n => ({ date: n.date.slice(5), hr: n.lowestHr ?? n.avgHr }))

  const effData = last30
    .filter(n => n.efficiency != null)
    .map(n => ({ date: n.date.slice(5), efficiency: n.efficiency }))

  if (nights.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Moon size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No sleep data yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {durationData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sleep Duration by Stage (last 30 nights)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="deep" stackId="a" fill={BRAND} name="Deep" />
              <Bar dataKey="rem" stackId="a" fill="#8b5cf6" name="REM" />
              <Bar dataKey="light" stackId="a" fill="#94a3b8" name="Light" />
              <Bar dataKey="awake" stackId="a" fill={RED} name="Awake" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hrvData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">HRV During Sleep</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={hrvData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="hrv" stroke={GREEN} strokeWidth={2} dot={false} name="HRV (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hrData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Resting Heart Rate</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={hrData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="hr" stroke={AMBER} strokeWidth={2} dot={false} name="HR (bpm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {effData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sleep Efficiency</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={effData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[60, 100]} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={90} stroke={GREEN} strokeDasharray="4 4" label={{ value: '90%', fill: GREEN, fontSize: 10 }} />
              <Line type="monotone" dataKey="efficiency" stroke={BRAND} strokeWidth={2} dot={false} name="Efficiency %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ─── Analysis Tab ─── */

function AnalysisTab({ nights }: { nights: SleepNight[] }) {
  const sorted = [...nights].sort((a, b) => a.date.localeCompare(b.date))
  const last30 = sorted.slice(-30)

  if (nights.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Moon size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No sleep data yet.</p>
      </div>
    )
  }

  // Sleep consistency
  const bedtimes = last30
    .filter(n => n.bedtime)
    .map(n => {
      const d = new Date(n.bedtime!)
      return d.getHours() * 60 + d.getMinutes()
    })
  const wakeTimes = last30
    .filter(n => n.wakeTime)
    .map(n => {
      const d = new Date(n.wakeTime!)
      return d.getHours() * 60 + d.getMinutes()
    })

  const minBedtime = bedtimes.length > 0 ? Math.min(...bedtimes) : null
  const maxBedtime = bedtimes.length > 0 ? Math.max(...bedtimes) : null
  const minWake = wakeTimes.length > 0 ? Math.min(...wakeTimes) : null
  const maxWake = wakeTimes.length > 0 ? Math.max(...wakeTimes) : null

  const bedtimeVariance = minBedtime != null && maxBedtime != null ? maxBedtime - minBedtime : null
  const varianceLabel = bedtimeVariance != null
    ? bedtimeVariance <= 30 ? 'Excellent' : bedtimeVariance <= 60 ? 'Good' : bedtimeVariance <= 90 ? 'Fair' : 'Poor'
    : '--'

  function minutesToTimeStr(mins: number): string {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  // Sleep debt
  const IDEAL_MIN = 480
  const last7 = sorted.slice(-7)
  const avg7Total = last7.filter(n => n.totalMin != null).map(n => n.totalMin!)
  const avg7Val = avg7Total.length > 0 ? avg(avg7Total) : null
  const debtMin = avg7Val != null ? IDEAL_MIN - avg7Val : null

  // Stage breakdown
  const deepPcts = last30.filter(n => n.deepMin != null && n.totalMin != null && n.totalMin > 0).map(n => (n.deepMin! / n.totalMin!) * 100)
  const remPcts = last30.filter(n => n.remMin != null && n.totalMin != null && n.totalMin > 0).map(n => (n.remMin! / n.totalMin!) * 100)
  const lightPcts = last30.filter(n => n.lightMin != null && n.totalMin != null && n.totalMin > 0).map(n => (n.lightMin! / n.totalMin!) * 100)
  const awakePcts = last30.filter(n => n.awakeMin != null && n.totalMin != null && n.totalMin > 0).map(n => (n.awakeMin! / n.totalMin!) * 100)

  return (
    <div className="space-y-6">
      {/* Sleep Consistency */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sleep Consistency (Last 30 Days)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Bedtime Range</div>
            <div className="text-sm font-mono text-gray-300">
              {minBedtime != null && maxBedtime != null
                ? `${minutesToTimeStr(minBedtime)} - ${minutesToTimeStr(maxBedtime)}`
                : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Wake Time Range</div>
            <div className="text-sm font-mono text-gray-300">
              {minWake != null && maxWake != null
                ? `${minutesToTimeStr(minWake)} - ${minutesToTimeStr(maxWake)}`
                : '--'}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Bedtime Variance</div>
          <div className="text-sm font-mono" style={{ color: varianceLabel === 'Excellent' ? GREEN : varianceLabel === 'Good' ? GREEN : varianceLabel === 'Fair' ? AMBER : RED }}>
            {bedtimeVariance != null ? `${bedtimeVariance} min` : '--'} ({varianceLabel})
          </div>
        </div>
      </div>

      {/* Sleep Debt */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Sleep Debt</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">7-Day Average</div>
            <div className="text-lg font-bold font-mono text-gray-200">
              {avg7Val != null ? formatMin(avg7Val) : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">vs 8h Ideal</div>
            <div className="text-lg font-bold font-mono" style={{ color: debtMin != null ? (debtMin > 0 ? RED : GREEN) : '#6b7280' }}>
              {debtMin != null
                ? debtMin > 0 ? `-${formatMin(debtMin)} deficit` : `+${formatMin(Math.abs(debtMin))} surplus`
                : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Breakdown */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Average Stage Breakdown</h3>
        <div className="space-y-2">
          {[
            { label: 'Deep', pcts: deepPcts, color: BRAND },
            { label: 'REM', pcts: remPcts, color: '#8b5cf6' },
            { label: 'Light', pcts: lightPcts, color: '#94a3b8' },
            { label: 'Awake', pcts: awakePcts, color: RED },
          ].map(stage => (
            <div key={stage.label} className="flex justify-between items-center text-sm">
              <span className="text-gray-400">{stage.label}</span>
              <span className="font-mono font-bold" style={{ color: stage.color }}>
                {stage.pcts.length > 0 ? `${Math.round(avg(stage.pcts))}%` : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Circadian Alignment */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Circadian Alignment</h3>
        <div>
          <div className="text-xs text-gray-500 mb-1">Bedtime Variance (30 Days)</div>
          <div className="text-lg font-bold font-mono" style={{ color: varianceLabel === 'Excellent' || varianceLabel === 'Good' ? GREEN : varianceLabel === 'Fair' ? AMBER : RED }}>
            {bedtimeVariance != null ? `${bedtimeVariance} min spread` : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {varianceLabel === 'Excellent' && 'Great consistency. Your circadian rhythm is well aligned.'}
            {varianceLabel === 'Good' && 'Good consistency. Minor variations are normal.'}
            {varianceLabel === 'Fair' && 'Some irregularity in bedtime. Try to keep a more consistent schedule.'}
            {varianceLabel === 'Poor' && 'High variability. Irregular bedtimes can disrupt circadian rhythm.'}
            {varianceLabel === '--' && 'Not enough data.'}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Insights Tab ─── */

function InsightsTab({ nights }: { nights: SleepNight[] }) {
  const sorted = [...nights].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)

  const recommendations: Record<string, string> = {
    total: 'Deep sleep is crucial for physical recovery. Consider consistent bedtimes and avoiding alcohol before bed.',
    deep: 'Deep sleep is below target. Consider temperature regulation (cool room), avoiding late caffeine, and consistent sleep times.',
    rem: 'REM sleep supports memory and learning. Avoid alcohol and ensure sufficient total sleep to allow more REM cycles.',
    efficiency: 'Sleep efficiency is low. Consider limiting time in bed when awake, reducing screen time before bed, and maintaining a dark room.',
    onset: 'Sleep onset is slow. Try relaxation techniques, limit caffeine after noon, and establish a wind-down routine.',
  }

  return (
    <div className="space-y-6">
      {/* Attia Target Reference */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Attia Sleep Targets</h3>
        <div className="space-y-3">
          {SLEEP_TARGETS.map(target => {
            const val = getMetricValue(last7, target.id)
            const status = val != null ? getSleepStatus(target.id, val) : null
            const color = status ? STATUS_COLORS[status] : '#6b7280'
            const displayVal = val != null
              ? target.unit === 'min' ? formatMin(val) : `${Math.round(val)}%`
              : '--'
            const targetDisplay = target.unit === 'min' ? formatMin(target.greenMin) : `${target.greenMin}%`

            return (
              <div key={target.id} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-300">{target.label}</span>
                  <span className="text-xs text-gray-600 ml-2">
                    (Target: {target.lowerIsBetter ? '<' : '>'} {targetDisplay})
                  </span>
                </div>
                <span className="font-mono font-bold" style={{ color }}>{displayVal}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-metric recommendations */}
      {nights.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recommendations</h3>
          <div className="space-y-3">
            {SLEEP_TARGETS.map(target => {
              const val = getMetricValue(last7, target.id)
              const status = val != null ? getSleepStatus(target.id, val) : null
              if (status === 'green' || status === null) return null
              return (
                <div key={target.id} className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-sm font-medium mb-1" style={{ color: STATUS_COLORS[status] }}>{target.label}</div>
                  <div className="text-xs text-gray-400">{recommendations[target.id]}</div>
                </div>
              )
            })}
            {SLEEP_TARGETS.every(target => {
              const val = getMetricValue(last7, target.id)
              const status = val != null ? getSleepStatus(target.id, val) : null
              return status === 'green' || status === null
            }) && (
              <div className="text-sm text-gray-400">All metrics are on track. Keep up the great work!</div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
        <div className="text-xs text-gray-500">
          These targets are based on population averages from Outlive. Individual needs vary.
        </div>
      </div>
    </div>
  )
}

/* ─── Sources Tab ─── */

interface SourcesTabProps {
  nights: SleepNight[]
  conflicts: SleepNight[]
  settings: SleepSettings
  importing: string | null
  importError: string | null
  importSuccess: string | null
  manualForm: ManualForm
  setManualForm: (f: ManualForm) => void
  onFileImport: (source: string, file: File) => void
  onImportOura: () => void
  onManualSave: () => void
  onResolveConflict: (keepId: string, dropId: string) => void
  onSaveSettings: (s: SleepSettings) => void
}

function SourcesTab({ nights, conflicts, settings, importing, importError, importSuccess, manualForm, setManualForm, onFileImport, onImportOura, onManualSave, onResolveConflict, onSaveSettings }: SourcesTabProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const plannedSleepSources = IMPORT_SOURCES.filter(
    s => s.domains.includes('sleep') && s.parserStatus === 'planned'
  )

  const SOURCES = [
    { id: 'oura' as const, label: 'Oura Ring', desc: 'Import from existing Oura data in local storage', action: 'button' as const },
    { id: 'apple_health' as const, label: 'Apple Health', desc: 'Upload export.xml from iPhone Health app', accept: '.xml', action: 'file' as const },
    { id: 'whoop' as const, label: 'Whoop', desc: 'Upload CSV export from Whoop app', accept: '.csv', action: 'file' as const },
  ]

  const countBySource = (sourceId: string) => nights.filter(n => n.source === sourceId).length

  return (
    <div className="space-y-6">
      {importError && (
        <div className="bg-red-400/[0.07] border border-red-400/20 rounded-[14px] p-4 flex items-center gap-2 text-sm text-red-300">
          <AlertTriangle size={14} /> {importError}
        </div>
      )}
      {importSuccess && (
        <div className="bg-emerald-400/[0.07] border border-emerald-400/20 rounded-[14px] p-4 flex items-center gap-2 text-sm text-emerald-300">
          <Check size={14} /> {importSuccess}
        </div>
      )}

      <div className="grid gap-4">
        {SOURCES.map(src => (
          <div key={src.id} className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5 flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-gray-200 text-sm">{src.label}</div>
              <div className="text-xs text-gray-500 mt-1">{src.desc}</div>
              <div className="text-xs text-gray-600 mt-1">{countBySource(src.id)} nights imported</div>
            </div>
            {src.action === 'button' ? (
              <button onClick={onImportOura} disabled={importing === src.id}
                className="flex-shrink-0 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-40">
                {importing === src.id ? 'Importing...' : 'Import'}
              </button>
            ) : (
              <>
                <input
                  type="file"
                  accept={src.accept}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) onFileImport(src.id, file)
                    e.target.value = ''
                  }}
                  id={`sleep-file-${src.id}`}
                />
                <label htmlFor={`sleep-file-${src.id}`}
                  className="flex-shrink-0 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 text-xs font-medium rounded-lg transition-colors cursor-pointer">
                  {importing === src.id ? 'Importing...' : 'Upload'}
                </label>
              </>
            )}
          </div>
        ))}
      </div>

      {plannedSleepSources.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coming Soon</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plannedSleepSources.map(source => (
              <div key={source.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between opacity-60">
                <div>
                  <div className="text-sm text-gray-400 font-medium">{source.name}</div>
                  <div className="flex gap-1 mt-1">
                    {source.domains.map(d => (
                      <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-600">{d}</span>
                    ))}
                  </div>
                </div>
                <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] text-gray-600 border border-white/[0.06]">Coming Soon</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Entry */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Manual Entry</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input type="date" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Quality (1-5)</label>
            <select value={manualForm.quality} onChange={e => setManualForm({ ...manualForm, quality: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none">
              <option value="1">1 - Poor</option>
              <option value="2">2 - Fair</option>
              <option value="3">3 - Average</option>
              <option value="4">4 - Good</option>
              <option value="5">5 - Excellent</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bedtime</label>
            <input type="time" value={manualForm.bedtime} onChange={e => setManualForm({ ...manualForm, bedtime: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Wake Time</label>
            <input type="time" value={manualForm.wakeTime} onChange={e => setManualForm({ ...manualForm, wakeTime: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" />
          </div>
        </div>
        <button onClick={onManualSave} disabled={!manualForm.date || !manualForm.bedtime || !manualForm.wakeTime}
          className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
          Save Entry
        </button>
      </div>

      {/* Conflict Resolution */}
      {conflicts.length > 0 && (
        <div className="bg-amber-400/[0.07] border border-amber-400/20 rounded-[18px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-300">{conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Need Resolution</h3>
          </div>
          <div className="space-y-3">
            {conflicts.map(c => {
              const competing = nights.find(n => n.date === c.date && !n.flaggedConflict)
              return (
                <div key={c.id} className="bg-white/[0.03] rounded-xl p-3 space-y-2">
                  <div className="text-xs text-gray-400">Date: {c.date}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.04] rounded-lg p-2">
                      <div className="font-medium text-gray-300">{competing?.source ?? '—'}</div>
                      <div className="text-gray-500">{competing?.totalMin != null ? `${competing.totalMin} min` : '?'}</div>
                    </div>
                    <div className="bg-amber-400/[0.05] rounded-lg p-2 border border-amber-400/20">
                      <div className="font-medium text-gray-300">{c.source}</div>
                      <div className="text-gray-500">{c.totalMin != null ? `${c.totalMin} min` : '?'} - flagged</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {competing && (
                      <button onClick={() => onResolveConflict(competing.id, c.id)}
                        className="flex-1 py-1 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg">
                        Keep {competing.source}
                      </button>
                    )}
                    <button onClick={() => onResolveConflict(c.id, competing?.id ?? '')}
                      className="flex-1 py-1 text-xs bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 rounded-lg">
                      Keep {c.source}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Source Priority */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Source Priority</h3>
        <p className="text-xs text-gray-500 mb-3">When two sources have overlapping sleep data, the higher-priority source wins automatically.</p>
        <div className="space-y-1">
          {localSettings.globalPriority.map((src, i) => (
            <div key={src} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-gray-600 font-mono w-4">{i + 1}.</span>
              <span className="flex-1 capitalize">{src.replace('_', ' ')}</span>
              <div className="flex gap-1">
                {i > 0 && (
                  <button onClick={() => {
                    const p = [...localSettings.globalPriority]
                    ;[p[i - 1], p[i]] = [p[i], p[i - 1]]
                    setLocalSettings({ ...localSettings, globalPriority: p })
                  }} className="text-xs px-1.5 py-0.5 bg-white/[0.06] rounded hover:bg-white/[0.1]">up</button>
                )}
                {i < localSettings.globalPriority.length - 1 && (
                  <button onClick={() => {
                    const p = [...localSettings.globalPriority]
                    ;[p[i + 1], p[i]] = [p[i], p[i + 1]]
                    setLocalSettings({ ...localSettings, globalPriority: p })
                  }} className="text-xs px-1.5 py-0.5 bg-white/[0.06] rounded hover:bg-white/[0.1]">down</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => onSaveSettings(localSettings)}
          className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs font-medium rounded-xl transition-colors">
          Save Priority
        </button>
      </div>
    </div>
  )
}
