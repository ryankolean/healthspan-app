import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, CartesianGrid, Legend, ReferenceLine,
} from 'recharts'
import { getOuraData } from '../utils/oura-storage'
import { generateAllDemoData, DEMO_PERSONAS } from '../utils/demo-data'
import { getLabResults } from '../utils/lab-storage'
import { getWorkouts } from '../utils/exercise-storage'
import { getSleepNights } from '../utils/sleep-storage'
import { getEmotionalEntries } from '../utils/emotional-storage'
import { getNutritionEntries, getNutritionSettings, getDailyTotals } from '../utils/nutrition-storage'
import { getProteinTarget, getNutritionStatus } from '../data/nutrition-targets'
import { getMoleculeEntries, getDefinitions, getDailyAdherence } from '../utils/molecules-storage'
import { getAdherenceStatus } from '../data/molecules-targets'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Plus, Check, MoreVertical, CircleCheck, Dumbbell, Apple, Moon, Brain, Pill, X, Pencil, Trash2, Scale,
} from 'lucide-react'
import {
  getActionDefinitions, getActionSettings, getEffectiveToday,
  getDueActionsForDate, dispatchActionsUpdated, ACTIONS_UPDATED_EVENT,
  saveActionDefinition, deleteActionDefinition, saveDailyEntry,
  saveActionSettings,
} from '../utils/actions-storage'
import { runAutoCompleteChecks, type ActionStatus } from '../utils/actions-auto-complete'
import { DOMAIN_RULES, DOMAIN_LABELS } from '../data/actions-rules'
import type { ActionDefinition, ActionDomain, AutoCompleteRule, ActionFrequency } from '../types/actions'
import { v4 as uuid } from 'uuid'
import { METRICS, METRIC_CATEGORIES } from '../utils/metrics'
import { getBodyCompEntries, getLatestEntry, getCurrentWeightKg, calculateBMI, saveBodyCompEntry } from '../utils/body-composition-storage'
import { getBMIStatus, getBodyFatStatus } from '../data/body-composition-targets'
import { getEffectiveReferenceRange } from '../utils/profile-storage'
import type { BodyCompEntry } from '../types/body-composition'
import { computeTrend, computeOverallScore } from '../utils/trends'
import { fmt, fmtFull, hrs, avgArr, scoreColor, filterByRange } from '../utils/helpers'
import { Stat, ChartCard, ChartTooltip, TrendCard, dirColors, dirIcons, zoneColors } from '../components/Charts'
import type { OuraData } from '../types'

const TABS = ['Today', 'Trends', 'Overview', 'Sleep', 'Activity', 'Heart', 'Readiness', 'Resilience']

const DOMAIN_ICONS: Record<ActionDomain, typeof Dumbbell> = {
  exercise: Dumbbell,
  nutrition: Apple,
  sleep: Moon,
  emotional: Brain,
  molecules: Pill,
}

// Recharts primitives
const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
const xax = (p?: any) => <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const yax = (p?: any) => <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const grd = (id: string, c: string) => (
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity={0.3} /><stop offset="100%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
)

function DemoEmptyState() {
  const [loading, setLoading] = useState<string | null>(null)

  function handleLoad(persona: typeof DEMO_PERSONAS[number]) {
    setLoading(persona.id)
    generateAllDemoData(persona)
    window.location.reload()
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <p className="text-lg font-medium text-gray-200">No data loaded</p>
        <p className="text-sm text-gray-500">
          Go to{' '}
          <a href="#/settings" className="text-brand-400 underline hover:text-brand-300">
            Settings
          </a>{' '}
          to import your Oura Ring export, or select a demo profile below.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left">
          {DEMO_PERSONAS.map(persona => (
            <button
              key={persona.id}
              onClick={() => handleLoad(persona)}
              disabled={loading !== null}
              className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4 hover:bg-white/[0.07] hover:border-brand-500/30 transition-colors text-left disabled:opacity-40"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-200">{persona.name}</span>
                <span className="text-[10px] text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded">
                  {persona.age}{persona.sex === 'male' ? 'M' : 'F'}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{persona.description}</p>
              {loading === persona.id && (
                <p className="text-xs text-brand-400 mt-2">Generating...</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ActionFormProps {
  initial: ActionDefinition | null
  nextSortOrder: number
  onSave: (def: ActionDefinition) => void
  onCancel: () => void
}

function ActionForm({ initial, nextSortOrder, onSave, onCancel }: ActionFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [domain, setDomain] = useState<ActionDomain | ''>(initial?.domain ?? '')
  const [rule, setRule] = useState<AutoCompleteRule | ''>(initial?.autoCompleteRule ?? '')
  const [freqType, setFreqType] = useState<ActionFrequency['type']>(initial?.frequency.type ?? 'daily')
  const [specificDays, setSpecificDays] = useState<number[]>(
    initial?.frequency.type === 'specific_days' ? initial.frequency.days : []
  )
  const [timesPerWeek, setTimesPerWeek] = useState(
    initial?.frequency.type === 'times_per_week' ? initial.frequency.count : 3
  )

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const buildFrequency = (): ActionFrequency => {
    switch (freqType) {
      case 'daily': return { type: 'daily' }
      case 'weekdays': return { type: 'weekdays' }
      case 'specific_days': return { type: 'specific_days', days: specificDays }
      case 'times_per_week': return { type: 'times_per_week', count: timesPerWeek }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) return

    onSave({
      id: initial?.id ?? uuid(),
      label: label.trim(),
      frequency: buildFrequency(),
      domain: domain || undefined,
      autoCompleteRule: (domain && rule) ? rule as AutoCompleteRule : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      active: true,
      sortOrder: initial?.sortOrder ?? nextSortOrder,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{initial ? 'Edit Action' : 'New Action'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Label</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g., Log a workout, Meditate 10 min"
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
          autoFocus
        />
      </div>

      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Link to domain (optional)</label>
        <select
          value={domain}
          onChange={e => { setDomain(e.target.value as ActionDomain | ''); setRule('') }}
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        >
          <option value="">None (manual checkoff)</option>
          {(Object.keys(DOMAIN_LABELS) as ActionDomain[]).map(d => (
            <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
          ))}
        </select>
      </div>

      {domain && (
        <div>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider">Auto-complete when</label>
          <select
            value={rule}
            onChange={e => setRule(e.target.value as AutoCompleteRule)}
            className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
          >
            <option value="">Manual checkoff only</option>
            {DOMAIN_RULES[domain as ActionDomain]?.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Frequency</label>
        <select
          value={freqType}
          onChange={e => setFreqType(e.target.value as ActionFrequency['type'])}
          className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300"
        >
          <option value="daily">Every day</option>
          <option value="weekdays">Weekdays (Mon-Fri)</option>
          <option value="specific_days">Specific days</option>
          <option value="times_per_week">X times per week</option>
        </select>
      </div>

      {freqType === 'specific_days' && (
        <div className="flex gap-1.5">
          {dayNames.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSpecificDays(prev =>
                prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort()
              )}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                specificDays.includes(i)
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {freqType === 'times_per_week' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={7}
            value={timesPerWeek}
            onChange={e => setTimesPerWeek(Number(e.target.value))}
            className="w-16 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200"
          />
          <span className="text-sm text-slate-400">times per week</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!label.trim()}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 transition-colors"
        >
          {initial ? 'Save Changes' : 'Add Action'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 text-sm hover:text-slate-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

const STATUS_COLORS: Record<string, string> = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }

function BodySection() {
  const [entries, setEntries] = useState<BodyCompEntry[]>(() => getBodyCompEntries())
  const [showForm, setShowForm] = useState(false)
  const [weightLbs, setWeightLbs] = useState('')
  const [bodyFatPct, setBodyFatPct] = useState('')
  const [waistIn, setWaistIn] = useState('')
  const [note, setNote] = useState('')

  const latest = useMemo(() => entries.length > 0 ? entries[0] : null, [entries])
  const heightCm = useMemo(() => {
    const h = localStorage.getItem('healthspan:userHeight')
    return h ? Number(h) : null
  }, [])

  const weightDisplay = useMemo(() => {
    if (latest) return (latest.weightKg * 2.20462).toFixed(1)
    const profileKg = getCurrentWeightKg()
    if (profileKg) return (profileKg * 2.20462).toFixed(1)
    return null
  }, [latest])

  const weightTrend = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoff = sevenDaysAgo.toISOString().split('T')[0]
    const recent = entries.filter(e => e.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date))
    if (recent.length < 2) return null
    const deltaKg = recent[recent.length - 1].weightKg - recent[0].weightKg
    const deltaLbs = deltaKg * 2.20462
    return deltaLbs
  }, [entries])

  const bmiData = useMemo(() => {
    const wKg = latest?.weightKg ?? getCurrentWeightKg()
    if (!wKg || !heightCm) return null
    const bmi = calculateBMI(wKg, heightCm)
    if (!bmi) return null
    return getBMIStatus(bmi)
  }, [latest, heightCm])

  const bodyFatData = useMemo(() => {
    if (!latest?.bodyFatPct) return null
    const refRange = getEffectiveReferenceRange()
    return getBodyFatStatus(latest.bodyFatPct, refRange)
  }, [latest])

  const leanMassLbs = useMemo(() => {
    if (!latest?.leanMassKg) return null
    return (latest.leanMassKg * 2.20462).toFixed(1)
  }, [latest])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const wLbs = parseFloat(weightLbs)
    if (!wLbs || wLbs <= 0) return
    const entry: BodyCompEntry = {
      id: uuid(),
      date: new Date().toISOString().split('T')[0],
      weightKg: wLbs / 2.20462,
      ...(bodyFatPct ? { bodyFatPct: parseFloat(bodyFatPct) } : {}),
      ...(waistIn ? { waistCm: parseFloat(waistIn) * 2.54 } : {}),
      ...(note ? { note } : {}),
    }
    saveBodyCompEntry(entry)
    setEntries(getBodyCompEntries())
    setWeightLbs('')
    setBodyFatPct('')
    setWaistIn('')
    setNote('')
    setShowForm(false)
  }

  const trendColor = weightTrend === null ? '#9ca3af'
    : Math.abs(weightTrend) < 0.5 ? '#9ca3af'
    : weightTrend < 0 ? '#10b981' : '#ef4444'
  const trendArrow = weightTrend === null ? ''
    : Math.abs(weightTrend) < 0.5 ? ''
    : weightTrend < 0 ? '↓' : '↑'

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-200">Body</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          {showForm ? '− Cancel' : '+ Log'}
        </button>
      </div>

      {/* Inline log form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider">Weight *</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="lbs"
                value={weightLbs}
                onChange={e => setWeightLbs(e.target.value)}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                placeholder="%"
                value={bodyFatPct}
                onChange={e => setBodyFatPct(e.target.value)}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider">Waist</label>
              <input
                type="number"
                step="0.1"
                placeholder="in"
                value={waistIn}
                onChange={e => setWaistIn(e.target.value)}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 uppercase tracking-wider">Note</label>
              <input
                type="text"
                placeholder="Optional"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="mt-1 w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {/* Metric cards 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Weight</div>
          <div className="text-xl font-bold text-gray-100">
            {weightDisplay ? `${weightDisplay} lbs` : '—'}
          </div>
          {weightTrend !== null && Math.abs(weightTrend) >= 0.5 && (
            <div className="text-[11px] mt-1" style={{ color: trendColor }}>
              {trendArrow} {Math.abs(weightTrend).toFixed(1)} lbs (7d)
            </div>
          )}
          {!latest && weightDisplay && (
            <div className="text-[11px] text-gray-600 mt-1">from profile</div>
          )}
        </div>

        {/* BMI */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">BMI</div>
          {bmiData ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold text-gray-100">{bmiData.value.toFixed(1)}</div>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[bmiData.color] }} />
              </div>
              <div className="text-[11px] text-gray-500 mt-1 capitalize">
                {bmiData.standard}
                {bmiData.longevityOptimal && (
                  <span className="ml-1.5 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                    Longevity ✓
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-gray-100">—</div>
          )}
        </div>

        {/* Body Fat % */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Body Fat</div>
          {bodyFatData ? (
            <>
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold text-gray-100">{bodyFatData.value.toFixed(1)}%</div>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[bodyFatData.color] }} />
              </div>
              <div className="text-[11px] text-gray-500 mt-1 capitalize">
                {bodyFatData.standard}
                {bodyFatData.longevityOptimal && (
                  <span className="ml-1.5 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                    Longevity ✓
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-gray-100">—</div>
          )}
        </div>

        {/* Lean Mass */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Lean Mass</div>
          <div className="text-xl font-bold text-gray-100">
            {leanMassLbs ? `${leanMassLbs} lbs` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function TodayTab() {
  const [actionStatuses, setActionStatuses] = useState<ActionStatus[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAction, setEditingAction] = useState<ActionDefinition | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const settings = getActionSettings()
  const today = getEffectiveToday(settings.dayResetHour)

  const refreshActions = useCallback(() => {
    setActionStatuses(runAutoCompleteChecks(getDueActionsForDate(today), today))
  }, [today])

  useEffect(() => {
    refreshActions()
    window.addEventListener('focus', refreshActions)
    return () => window.removeEventListener('focus', refreshActions)
  }, [refreshActions])

  const handleToggle = (actionId: string, currentCompleted: boolean) => {
    saveDailyEntry({
      actionId,
      date: today,
      completed: !currentCompleted,
      completedAt: !currentCompleted ? new Date().toISOString() : undefined,
      autoCompleted: false,
    })
    refreshActions()
    dispatchActionsUpdated()
  }

  const handleSave = (def: ActionDefinition) => {
    saveActionDefinition(def)
    setShowForm(false)
    setEditingAction(null)
    refreshActions()
    dispatchActionsUpdated()
  }

  const handleDelete = (id: string) => {
    deleteActionDefinition(id)
    setMenuOpen(null)
    refreshActions()
    dispatchActionsUpdated()
  }

  const completed = actionStatuses.filter(s => s.completed).length
  const total = actionStatuses.length
  const hasAnyActions = actionStatuses.length > 0 || getActionDefinitions().length > 0

  const todayDate = new Date(today + 'T12:00:00')
  const dateStr = todayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Empty state
  if (!hasAnyActions && !showForm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
          <CircleCheck size={28} className="text-brand-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Set up your daily actions</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Create a daily checklist to stay on track. Actions can auto-complete when you log data in other sections.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Add your first action
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[13px] text-slate-400">{dateStr}</div>
          {total > 0 && (
            <div className="text-sm text-slate-500 mt-0.5">
              <span className="text-emerald-400 font-semibold">{completed}</span> of {total} complete
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-500">Day resets at:</label>
          <select
            value={settings.dayResetHour}
            onChange={e => {
              saveActionSettings({ ...settings, dayResetHour: Number(e.target.value) })
              refreshActions()
              dispatchActionsUpdated()
            }}
            className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-xs text-gray-300"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}

      {/* Action cards */}
      <div className="space-y-2">
        {actionStatuses.map(({ action, completed: isDone, autoCompleted }) => {
          const DomainIcon = action.domain ? DOMAIN_ICONS[action.domain] : CircleCheck
          return (
            <div
              key={action.id}
              className={`flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-[14px] px-4 py-3.5 transition-all ${
                isDone ? 'opacity-50' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(action.id, isDone)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-600 hover:border-slate-400'
                }`}
              >
                {isDone && <Check size={14} className="text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isDone ? 'text-slate-500 line-through' : 'text-gray-200'}`}>
                  {action.label}
                </div>
                {autoCompleted && isDone && (
                  <span className="inline-block mt-0.5 text-[9px] tracking-wider uppercase text-emerald-400/70 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    auto
                  </span>
                )}
              </div>

              <DomainIcon size={16} className="text-slate-600 flex-shrink-0" />

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === action.id ? null : action.id)}
                  className="p-1 rounded hover:bg-white/10 text-slate-600 hover:text-slate-400"
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen === action.id && (
                  <div className="absolute right-0 top-8 z-10 bg-[#1a1d2e] border border-white/10 rounded-lg shadow-xl py-1 min-w-[120px]">
                    <button
                      onClick={() => { setEditingAction(action); setShowForm(true); setMenuOpen(null) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(action.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => { setEditingAction(null); setShowForm(true) }}
          className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-lg border border-dashed border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 text-sm transition-colors w-full justify-center"
        >
          <Plus size={16} />
          Add action
        </button>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <ActionForm
          initial={editingAction}
          nextSortOrder={getActionDefinitions().length}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingAction(null) }}
        />
      )}

      <BodySection />
    </>
  )
}

export default function Dashboard() {
  const [tab, setTab] = useState('Today')
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

  // Exercise status
  const exerciseWorkouts = useMemo(() => getWorkouts(), [])
  const zone2Now = useMemo(() => {
    function getISOWeek(d: Date) {
      const dt = new Date(d)
      dt.setHours(0,0,0,0)
      dt.setDate(dt.getDate() + 3 - (dt.getDay() + 6) % 7)
      const w1 = new Date(dt.getFullYear(), 0, 4)
      return `${dt.getFullYear()}-W${String(1 + Math.round(((dt.getTime() - w1.getTime()) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7)).padStart(2,'0')}`
    }
    const thisWeek = getISOWeek(new Date())
    return exerciseWorkouts.filter(w => getISOWeek(new Date(w.date)) === thisWeek)
      .reduce((s, w) => s + (w.zone2Min ?? 0), 0)
  }, [exerciseWorkouts])
  const exerciseLabel = zone2Now >= 180 ? 'On Track' : zone2Now >= 90 ? 'Building' : 'Below Target'
  const exerciseColor = zone2Now >= 180 ? '#10b981' : zone2Now >= 90 ? '#f59e0b' : '#ef4444'
  const thisWeekWorkoutCount = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0,0,0,0)
    return exerciseWorkouts.filter(w => new Date(w.date) >= startOfWeek).length
  }, [exerciseWorkouts])

  // Sleep status
  const sleepNights = useMemo(() => getSleepNights(), [])
  const avgTotalSleepMin = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const cutoff = weekAgo.toISOString().slice(0, 10)
    const recent = sleepNights.filter(n => n.date >= cutoff)
    if (recent.length === 0) return 0
    return Math.round(recent.reduce((s, n) => s + (n.totalMin ?? 0), 0) / recent.length)
  }, [sleepNights])
  const sleepHrs = (avgTotalSleepMin / 60).toFixed(1)
  const sleepLabel = avgTotalSleepMin >= 420 ? 'On Track' : avgTotalSleepMin >= 360 ? 'Building' : 'Below Target'
  const sleepColor = avgTotalSleepMin >= 420 ? '#10b981' : avgTotalSleepMin >= 360 ? '#f59e0b' : '#ef4444'

  // Emotional status
  const emotionalEntries = useMemo(() => getEmotionalEntries(), [])
  const { avgMood, avgWellbeing } = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const cutoff = weekAgo.toISOString().slice(0, 10)
    const recent = emotionalEntries.filter(e => e.date >= cutoff)
    if (recent.length === 0) return { avgMood: 0, avgWellbeing: 0 }
    const moods = recent.map(e => e.mood).filter((v): v is number => v != null)
    const wellbeings = recent.map(e => e.wellbeing).filter((v): v is number => v != null)
    return {
      avgMood: moods.length > 0 ? Math.round((moods.reduce((s, v) => s + v, 0) / moods.length) * 10) / 10 : 0,
      avgWellbeing: wellbeings.length > 0 ? Math.round((wellbeings.reduce((s, v) => s + v, 0) / wellbeings.length) * 10) / 10 : 0,
    }
  }, [emotionalEntries])
  const emotionalLabel = avgMood >= 4 ? 'On Track' : avgMood >= 3 ? 'Building' : avgMood > 0 ? 'Below Target' : 'No Data'
  const emotionalColor = avgMood >= 4 ? '#10b981' : avgMood >= 3 ? '#f59e0b' : '#ef4444'

  // Nutrition status
  const nutritionSettings = useMemo(() => getNutritionSettings(), [])
  const nutritionEntries = useMemo(() => getNutritionEntries(), [])
  const avgProtein = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const cutoff = weekAgo.toISOString().slice(0, 10)
    const dates = [...new Set(nutritionEntries.filter(e => e.date >= cutoff).map(e => e.date))]
    if (dates.length === 0) return 0
    const totals = dates.map(d => getDailyTotals(d).proteinG)
    return Math.round(totals.reduce((s, v) => s + v, 0) / totals.length)
  }, [nutritionEntries])
  const proteinTarget = useMemo(() => getProteinTarget(nutritionSettings), [nutritionSettings])
  const nutritionStatus = useMemo(() => getNutritionStatus('protein', avgProtein, nutritionSettings), [avgProtein, nutritionSettings])
  const nutritionLabel = nutritionStatus === 'green' ? 'On Track' : nutritionStatus === 'amber' ? 'Building' : avgProtein > 0 ? 'Below Target' : 'No Data'
  const nutritionColor = nutritionStatus === 'green' ? '#10b981' : nutritionStatus === 'amber' ? '#f59e0b' : '#ef4444'

  // Molecules status
  const moleculeDefinitions = useMemo(() => getDefinitions(), [])
  const moleculeEntries = useMemo(() => getMoleculeEntries(), [])
  const avgAdherence = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    const cutoff = weekAgo.toISOString().slice(0, 10)
    const dates = [...new Set(moleculeEntries.filter(e => e.date >= cutoff).map(e => e.date))]
    if (dates.length === 0 || moleculeDefinitions.filter(d => d.active).length === 0) return 0
    const adherences = dates.map(d => getDailyAdherence(d).percentage)
    return Math.round(adherences.reduce((s, v) => s + v, 0) / adherences.length)
  }, [moleculeEntries, moleculeDefinitions])
  const moleculesStatus = useMemo(() => getAdherenceStatus(avgAdherence), [avgAdherence])
  const moleculesLabel = moleculesStatus === 'green' ? 'On Track' : moleculesStatus === 'amber' ? 'Building' : avgAdherence > 0 ? 'Below Target' : 'No Data'
  const moleculesColor = moleculesStatus === 'green' ? '#10b981' : moleculesStatus === 'amber' ? '#f59e0b' : '#ef4444'
  const todayAdherence = useMemo(() => getDailyAdherence(new Date().toISOString().slice(0, 10)), [moleculeEntries])

  if (!ouraData) {
    return <DemoEmptyState />
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
          <Link to="/exercise" className="block">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
              <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Exercise</div>
              <div className="text-[24px] font-bold font-mono" style={{ color: exerciseColor }}>{exerciseLabel}</div>
              <div className="text-[11px] text-slate-500 mt-1">{zone2Now}/180 min Zone 2 this week · {thisWeekWorkoutCount} workouts</div>
            </div>
          </Link>
          <Link to="/sleep" className="block">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
              <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Sleep</div>
              <div className="text-[24px] font-bold font-mono" style={{ color: sleepColor }}>{sleepLabel}</div>
              <div className="text-[11px] text-slate-500 mt-1">{sleepHrs}/7 hrs avg this week · {sleepNights.length} nights</div>
            </div>
          </Link>
          <Link to="/emotional" className="block">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
              <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Emotional</div>
              <div className="text-[24px] font-bold font-mono" style={{ color: emotionalColor }}>{emotionalLabel}</div>
              <div className="text-[11px] text-slate-500 mt-1">{avgMood > 0 ? `${avgMood}/5 mood` : 'Start logging'}{avgWellbeing > 0 ? ` · ${avgWellbeing}/5 wellbeing` : ''} · {emotionalEntries.length} entries</div>
            </div>
          </Link>
          <Link to="/nutrition" className="block">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
              <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Nutrition</div>
              <div className="text-[24px] font-bold font-mono" style={{ color: nutritionColor }}>{nutritionLabel}</div>
              <div className="text-[11px] text-slate-500 mt-1">{avgProtein > 0 ? `${avgProtein}/${proteinTarget}g protein avg` : 'Start logging'} · {nutritionEntries.length} meals</div>
            </div>
          </Link>
          <Link to="/molecules" className="block">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
              <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Molecules</div>
              <div className="text-[24px] font-bold font-mono" style={{ color: moleculesColor }}>{moleculesLabel}</div>
              <div className="text-[11px] text-slate-500 mt-1">{avgAdherence > 0 ? `${avgAdherence}% adherence` : 'Start logging'} · {todayAdherence.taken}/{todayAdherence.total} today</div>
            </div>
          </Link>
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
      {tab === 'Today' && <TodayTab />}
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
