import { useState, useEffect } from 'react'
import { Dumbbell, Heart, BarChart2, Activity, AlertTriangle, Check } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { getWorkouts, getFlaggedConflicts, resolveConflict, getVO2Max, saveVO2Max, getExerciseSettings, saveExerciseSettings, importWorkouts } from '../utils/exercise-storage'
import { parseOuraWorkouts } from '../utils/exercise-parsers/oura'
import { parseHevyCsv } from '../utils/exercise-parsers/hevy'
import { parseStravaActivities } from '../utils/exercise-parsers/strava'
import { parseAppleHealthXml } from '../utils/exercise-parsers/apple-health'
import { getVO2MaxTargets } from '../data/vo2max-targets'
import { getEffectiveReferenceRange } from '../utils/profile-storage'
import type { ExerciseWorkout, VO2MaxEntry, ExerciseSettings } from '../types/exercise'

const ZONE2_GOAL = 180
const STRENGTH_GOAL = 3
const BRAND = '#6366f1'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const RED = '#ef4444'

type Tab = 'overview' | 'cardio' | 'strength' | 'vo2max' | 'sources'

function getISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  return `${d.getFullYear()}-W${String(1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)).padStart(2, '0')}`
}

function groupByWeek(workouts: ExerciseWorkout[]): Record<string, ExerciseWorkout[]> {
  const map: Record<string, ExerciseWorkout[]> = {}
  workouts.forEach(w => {
    const wk = getISOWeek(new Date(w.date))
    ;(map[wk] ??= []).push(w)
  })
  return map
}

function currentWeekZone2(workouts: ExerciseWorkout[]): number {
  const thisWeek = getISOWeek(new Date())
  const byWeek = groupByWeek(workouts)
  return (byWeek[thisWeek] ?? []).reduce((s, w) => s + (w.zone2Min ?? 0), 0)
}

function zone2Color(min: number): string {
  if (min >= ZONE2_GOAL) return GREEN
  if (min >= 90) return AMBER
  return RED
}

function zone2Label(min: number): string {
  if (min >= ZONE2_GOAL) return 'On Track'
  if (min >= 90) return 'Building'
  return 'Below Target'
}

export default function Exercise() {
  const [tab, setTab] = useState<Tab>('overview')
  const [workouts, setWorkouts] = useState<ExerciseWorkout[]>([])
  const [vo2maxEntries, setVo2maxEntries] = useState<VO2MaxEntry[]>([])
  const [conflicts, setConflicts] = useState<ExerciseWorkout[]>([])
  const [settings, setSettings] = useState<ExerciseSettings>(getExerciseSettings())
  const [importing, setImporting] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [vo2Form, setVo2Form] = useState({ date: '', value: '', method: 'clinical', notes: '' })

  function reload() {
    setWorkouts(getWorkouts())
    setVo2maxEntries(getVO2Max())
    setConflicts(getFlaggedConflicts())
    setSettings(getExerciseSettings())
  }

  useEffect(() => { reload() }, [])

  async function handleFileImport(source: string, file: File) {
    setImporting(source)
    setImportError(null)
    setImportSuccess(null)
    try {
      let result: { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] }
      const text = await file.text()

      if (source === 'apple_health') {
        const userAge = parseInt(localStorage.getItem('healthspan:userAge') ?? '35', 10)
        result = parseAppleHealthXml(text, userAge)
      } else if (source === 'strava') {
        result = parseStravaActivities(JSON.parse(text))
      } else if (source === 'hevy') {
        result = parseHevyCsv(text)
      } else {
        throw new Error('Unknown source')
      }

      importWorkouts(result.workouts)
      result.vo2max.forEach(e => saveVO2Max(e))
      setImportSuccess(`Imported ${result.workouts.length} workouts${result.vo2max.length ? ` and ${result.vo2max.length} VO2 max entries` : ''} from ${source}`)
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
    const result = parseOuraWorkouts(data)
    importWorkouts(result.workouts)
    setImportSuccess(`Imported ${result.workouts.length} workouts from Oura`)
    reload()
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'cardio', label: 'Cardio' },
    { id: 'strength', label: 'Strength' },
    { id: 'vo2max', label: 'VO2 Max' },
    { id: 'sources', label: 'Sources' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Dumbbell size={20} className="text-brand-400" />
        <h1 className="text-xl font-bold text-gray-100">Exercise</h1>
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

      {tab === 'overview' && <OverviewTab workouts={workouts} />}
      {tab === 'cardio' && <CardioTab workouts={workouts} />}
      {tab === 'strength' && <StrengthTab workouts={workouts} />}
      {tab === 'vo2max' && (
        <VO2MaxTab
          entries={vo2maxEntries}
          form={vo2Form}
          setForm={setVo2Form}
          onSave={(e) => { saveVO2Max(e); reload() }}
        />
      )}
      {tab === 'sources' && (
        <SourcesTab
          workouts={workouts}
          conflicts={conflicts}
          settings={settings}
          importing={importing}
          importError={importError}
          importSuccess={importSuccess}
          onFileImport={handleFileImport}
          onImportOura={handleImportOura}
          onResolveConflict={(keepId, dropId) => { resolveConflict(keepId, dropId); reload() }}
          onSaveSettings={(s) => { saveExerciseSettings(s); setSettings(s) }}
        />
      )}
    </div>
  )
}

function OverviewTab({ workouts }: { workouts: ExerciseWorkout[] }) {
  const zone2Now = currentWeekZone2(workouts)
  const color = zone2Color(zone2Now)
  const label = zone2Label(zone2Now)

  const byWeek = groupByWeek(workouts)
  const weeks = Object.keys(byWeek).sort().slice(-12)
  const weeklyData = weeks.map(wk => ({
    week: wk.slice(5),
    cardioMin: byWeek[wk].filter(w => w.type === 'cardio').reduce((s, w) => s + (w.durationMin ?? 0), 0),
    strengthSessions: byWeek[wk].filter(w => w.type === 'strength').length,
    zone2Min: byWeek[wk].reduce((s, w) => s + (w.zone2Min ?? 0), 0),
  }))

  const thisWeek = getISOWeek(new Date())
  const thisWeekStrength = (byWeek[thisWeek] ?? []).filter(w => w.type === 'strength').length
  const cardioSessions = workouts.filter(w => w.type === 'cardio').length
  const strengthSessions = workouts.filter(w => w.type === 'strength').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Zone 2 This Week', value: `${zone2Now}/${ZONE2_GOAL} min`, sublabel: label, color },
          { label: 'Strength This Week', value: `${thisWeekStrength}/${STRENGTH_GOAL} sessions`, sublabel: thisWeekStrength >= STRENGTH_GOAL ? 'On Track' : 'Below Target', color: thisWeekStrength >= STRENGTH_GOAL ? GREEN : RED },
          { label: 'Total Workouts', value: workouts.length, sublabel: `${cardioSessions} cardio · ${strengthSessions} strength`, color: BRAND },
        ].map(card => (
          <div key={card.label} className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
            <div className="text-xl font-bold font-mono" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.sublabel}</div>
          </div>
        ))}
      </div>

      {workouts.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Dumbbell size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workout data yet. Import data from the Sources tab.</p>
        </div>
      )}

      {weeklyData.length > 0 && (
        <>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Zone 2 Minutes / Week</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={ZONE2_GOAL} stroke={GREEN} strokeDasharray="4 4" label={{ value: '180 min', fill: GREEN, fontSize: 10 }} />
                <Area type="monotone" dataKey="zone2Min" stroke={BRAND} fill={`${BRAND}33`} strokeWidth={2} name="Zone 2 min" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Weekly Training Load</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="cardioMin" stackId="a" fill={BRAND} name="Cardio min" />
                <Bar dataKey="strengthSessions" stackId="a" fill={AMBER} name="Strength sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

function CardioTab({ workouts }: { workouts: ExerciseWorkout[] }) {
  const cardio = workouts.filter(w => w.type === 'cardio').sort((a, b) => b.date.localeCompare(a.date))

  const chartData = cardio.slice(0, 20).reverse().map(w => ({
    date: w.date.slice(5),
    zone2: w.zone2Min ?? 0,
    zone5: w.zone5Min ?? 0,
  }))

  return (
    <div className="space-y-6">
      {cardio.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Heart size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No cardio workouts yet.</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Zone 2 vs Zone 5 (last 20 workouts)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="zone2" stackId="a" fill={GREEN} name="Zone 2 min" />
              <Bar dataKey="zone5" stackId="a" fill={RED} name="Zone 5 min" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Cardio Workouts</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {cardio.slice(0, 15).map(w => (
            <div key={w.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-300 font-medium">{w.activityName}</div>
                <div className="text-xs text-gray-600">{w.date} · {w.durationMin ? `${w.durationMin} min` : '—'}</div>
              </div>
              {w.distanceKm && <div className="text-xs text-gray-400 font-mono">{w.distanceKm.toFixed(1)} km</div>}
              {w.avgHr && <div className="text-xs text-gray-400 font-mono">{w.avgHr} bpm</div>}
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-gray-500">{w.source}</span>
            </div>
          ))}
          {cardio.length === 0 && <div className="px-5 py-8 text-center text-xs text-gray-600">No cardio workouts</div>}
        </div>
      </div>
    </div>
  )
}

function StrengthTab({ workouts }: { workouts: ExerciseWorkout[] }) {
  const strength = workouts.filter(w => w.type === 'strength').sort((a, b) => b.date.localeCompare(a.date))
  const [expanded, setExpanded] = useState<string | null>(null)

  const byWeek = groupByWeek(strength)
  const weeks = Object.keys(byWeek).sort().slice(-12)
  const weeklyData = weeks.map(wk => ({
    week: wk.slice(5),
    sessions: byWeek[wk].length,
  }))

  return (
    <div className="space-y-6">
      {strength.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No strength workouts yet.</p>
        </div>
      )}

      {weeklyData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Strength Sessions / Week</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={STRENGTH_GOAL} stroke={GREEN} strokeDasharray="4 4" />
              <Bar dataKey="sessions" fill={AMBER} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Strength Workouts</h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {strength.slice(0, 10).map(w => (
            <div key={w.id}>
              <button
                onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] text-left"
              >
                <div className="flex-1">
                  <div className="text-sm text-gray-300 font-medium">{w.activityName}</div>
                  <div className="text-xs text-gray-600">{w.date} · {w.sets?.length ?? 0} sets</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-gray-500">{w.source}</span>
              </button>
              {expanded === w.id && w.sets && w.sets.length > 0 && (
                <div className="px-5 pb-3">
                  <table className="w-full text-xs text-gray-500">
                    <thead><tr className="border-b border-white/[0.06]"><th className="text-left py-1">Exercise</th><th className="text-right">Reps</th><th className="text-right">Weight</th></tr></thead>
                    <tbody>
                      {w.sets.map((s, i) => (
                        <tr key={i} className="border-b border-white/[0.03]">
                          <td className="py-1 text-gray-400">{s.exercise}</td>
                          <td className="text-right">{s.reps ?? '—'}</td>
                          <td className="text-right">{s.weightKg != null ? `${s.weightKg} kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface VO2MaxTabProps {
  entries: VO2MaxEntry[]
  form: { date: string; value: string; method: string; notes: string }
  setForm: (f: { date: string; value: string; method: string; notes: string }) => void
  onSave: (e: VO2MaxEntry) => void
}

function VO2MaxTab({ entries, form, setForm, onSave }: VO2MaxTabProps) {
  const userAge = parseInt(localStorage.getItem('healthspan:userAge') ?? '35', 10)
  const userSex = getEffectiveReferenceRange()
  const targets = getVO2MaxTargets(userAge, userSex)

  const allSorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = allSorted.map(e => ({
    date: e.date.slice(5),
    apple: e.source === 'apple_health' ? e.value : undefined,
    manual: e.source === 'manual' ? e.value : undefined,
  }))

  function handleSave() {
    if (!form.date || !form.value) return
    const v = parseFloat(form.value)
    if (isNaN(v)) return
    onSave({
      id: `vo2-${Date.now()}`,
      date: form.date,
      value: v,
      source: 'manual',
      method: form.method as VO2MaxEntry['method'],
      notes: form.notes || undefined,
      createdAt: Date.now(),
    })
    setForm({ date: '', value: '', method: 'clinical', notes: '' })
  }

  return (
    <div className="space-y-6">
      {chartData.length > 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">VO2 Max Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={targets.aboveAverage} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Above Avg', fill: '#94a3b8', fontSize: 10 }} />
              <ReferenceLine y={targets.superior} stroke={AMBER} label={{ value: 'Superior', fill: AMBER, fontSize: 10 }} />
              <ReferenceLine y={targets.elite} stroke={GREEN} label={{ value: 'Elite', fill: GREEN, fontSize: 10 }} />
              <Line type="monotone" dataKey="apple" stroke={BRAND} strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Apple Watch" connectNulls />
              <Line type="monotone" dataKey="manual" stroke={GREEN} strokeWidth={2} dot={{ r: 4 }} name="Clinical/Field Test" connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-600 mt-2">Apple Watch estimates are approximations. Clinical or field tests are more accurate.</p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Activity size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No VO2 max data yet. Add a test result below or import Apple Health data.</p>
        </div>
      )}

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Add VO2 Max Test Result</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Value (mL/kg/min)</label>
            <input type="number" step="0.1" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" placeholder="e.g. 52.3" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Method</label>
            <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none">
              <option value="clinical">Clinical (gold standard)</option>
              <option value="cooper_test">Cooper Test (12-min run)</option>
              <option value="ramp_test">Ramp Test (bike/treadmill)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
            <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" placeholder="Lab name, conditions..." />
          </div>
        </div>
        <button onClick={handleSave} disabled={!form.date || !form.value}
          className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
          Save Result
        </button>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Attia Longevity Targets (Age {userAge}, {userSex})</h3>
        <div className="space-y-2">
          {[
            { label: 'Above Average (top 50%)', value: targets.aboveAverage, color: '#94a3b8' },
            { label: 'Superior (top 25%)', value: targets.superior, color: AMBER },
            { label: 'Elite (top 2.5%)', value: targets.elite, color: GREEN },
          ].map(t => (
            <div key={t.label} className="flex justify-between items-center text-sm">
              <span className="text-gray-500">{t.label}</span>
              <span className="font-mono font-bold" style={{ color: t.color }}>{t.value} mL/kg/min</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SourcesTabProps {
  workouts: ExerciseWorkout[]
  conflicts: ExerciseWorkout[]
  settings: ExerciseSettings
  importing: string | null
  importError: string | null
  importSuccess: string | null
  onFileImport: (source: string, file: File) => void
  onImportOura: () => void
  onResolveConflict: (keepId: string, dropId: string) => void
  onSaveSettings: (s: ExerciseSettings) => void
}

function SourcesTab({ workouts, conflicts, settings, importing, importError, importSuccess, onFileImport, onImportOura, onResolveConflict, onSaveSettings }: SourcesTabProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const SOURCES = [
    { id: 'oura', label: 'Oura Ring', desc: 'Import from existing Oura data in local storage', action: 'button' as const },
    { id: 'apple_health', label: 'Apple Health', desc: 'Upload export.xml from iPhone Health app > Profile > Export', accept: '.xml', action: 'file' as const },
    { id: 'strava', label: 'Strava', desc: 'Upload activities.json from Strava bulk export (Settings > My Account > Download)', accept: '.json', action: 'file' as const },
    { id: 'hevy', label: 'Hevy', desc: 'Upload CSV export from Hevy app (Profile > Settings > Export Data)', accept: '.csv', action: 'file' as const },
  ]

  const countBySource = (sourceId: string) => workouts.filter(w => w.source === sourceId).length

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
              <div className="text-xs text-gray-600 mt-1">{countBySource(src.id)} workouts imported</div>
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
                  id={`file-${src.id}`}
                />
                <label htmlFor={`file-${src.id}`}
                  className="flex-shrink-0 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 text-xs font-medium rounded-lg transition-colors cursor-pointer">
                  {importing === src.id ? 'Importing...' : 'Upload'}
                </label>
              </>
            )}
          </div>
        ))}
      </div>

      {conflicts.length > 0 && (
        <div className="bg-amber-400/[0.07] border border-amber-400/20 rounded-[18px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-300">{conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Need Resolution</h3>
          </div>
          <div className="space-y-3">
            {conflicts.map(c => {
              const competing = workouts.find(w => w.date === c.date && w.type === c.type && !w.flaggedConflict)
              return (
                <div key={c.id} className="bg-white/[0.03] rounded-xl p-3 space-y-2">
                  <div className="text-xs text-gray-400">Date: {c.date} · Type: {c.type}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.04] rounded-lg p-2">
                      <div className="font-medium text-gray-300">{competing?.activityName ?? '—'} ({competing?.source})</div>
                      <div className="text-gray-500">{competing?.durationMin ?? '?'} min</div>
                    </div>
                    <div className="bg-amber-400/[0.05] rounded-lg p-2 border border-amber-400/20">
                      <div className="font-medium text-gray-300">{c.activityName} ({c.source})</div>
                      <div className="text-gray-500">{c.durationMin ?? '?'} min · flagged</div>
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

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Source Priority</h3>
        <p className="text-xs text-gray-500 mb-3">When two sources have overlapping workouts, the higher-priority source wins automatically.</p>
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
                  }} className="text-xs px-1.5 py-0.5 bg-white/[0.06] rounded hover:bg-white/[0.1]">↑</button>
                )}
                {i < localSettings.globalPriority.length - 1 && (
                  <button onClick={() => {
                    const p = [...localSettings.globalPriority]
                    ;[p[i + 1], p[i]] = [p[i], p[i + 1]]
                    setLocalSettings({ ...localSettings, globalPriority: p })
                  }} className="text-xs px-1.5 py-0.5 bg-white/[0.06] rounded hover:bg-white/[0.1]">↓</button>
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
