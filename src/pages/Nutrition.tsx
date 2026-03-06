import { useState, useEffect, useMemo } from 'react'
import { Apple } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { getNutritionEntries, saveNutritionEntry, deleteNutritionEntry, getEntriesByDate, getDailyTotals, getNutritionSettings, saveNutritionSettings } from '../utils/nutrition-storage'
import { getNutritionStatus, getProteinTarget, getCalorieRange } from '../data/nutrition-targets'
import type { NutritionEntry, NutritionSettings, MealType } from '../types/nutrition'
import { v4 as uuidv4 } from 'uuid'

const BRAND = '#6366f1'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const RED = '#ef4444'
const STATUS_COLORS: Record<string, string> = { green: GREEN, amber: AMBER, red: RED }

type Tab = 'overview' | 'trends' | 'analysis' | 'insights' | 'sources'

const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
const xax = (p?: any) => <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const yax = (p?: any) => <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const tooltipStyle = { background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0
  const mean = avg(nums)
  const squareDiffs = nums.map(v => (v - mean) ** 2)
  return Math.sqrt(avg(squareDiffs))
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: '#6366f1',
  lunch: '#10b981',
  dinner: '#f59e0b',
  snack: '#8b5cf6',
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'insights', label: 'Insights' },
  { id: 'sources', label: 'Sources' },
]

export default function Nutrition() {
  const [tab, setTab] = useState<Tab>('overview')
  const [entries, setEntries] = useState<NutritionEntry[]>([])
  const [settings, setSettings] = useState<NutritionSettings>(getNutritionSettings())

  // Form state
  const [formDate, setFormDate] = useState(todayStr())
  const [formMealType, setFormMealType] = useState<MealType>('lunch')
  const [formMealName, setFormMealName] = useState('')
  const [formCalories, setFormCalories] = useState('')
  const [formProtein, setFormProtein] = useState('')
  const [formCarbs, setFormCarbs] = useState('')
  const [formFat, setFormFat] = useState('')
  const [formFiber, setFormFiber] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Settings form
  const [settingsWeight, setSettingsWeight] = useState(String(settings.bodyweightLbs))
  const [settingsCalories, setSettingsCalories] = useState(String(settings.dailyCalorieTarget))

  function reload() {
    setEntries(getNutritionEntries())
    setSettings(getNutritionSettings())
  }

  useEffect(() => { reload() }, [])

  function resetForm() {
    setFormDate(todayStr())
    setFormMealType('lunch')
    setFormMealName('')
    setFormCalories('')
    setFormProtein('')
    setFormCarbs('')
    setFormFat('')
    setFormFiber('')
    setEditingId(null)
  }

  function handleSave() {
    const entry: NutritionEntry = {
      id: editingId ?? uuidv4(),
      source: 'manual',
      date: formDate,
      mealType: formMealType,
      mealName: formMealName || undefined,
      calories: formCalories ? Number(formCalories) : undefined,
      proteinG: formProtein ? Number(formProtein) : undefined,
      carbsG: formCarbs ? Number(formCarbs) : undefined,
      fatG: formFat ? Number(formFat) : undefined,
      fiberG: formFiber ? Number(formFiber) : undefined,
      createdAt: editingId ? (entries.find(e => e.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
    }
    saveNutritionEntry(entry)
    resetForm()
    reload()
  }

  function handleDelete(id: string) {
    deleteNutritionEntry(id)
    reload()
  }

  function handleEdit(entry: NutritionEntry) {
    setFormDate(entry.date)
    setFormMealType(entry.mealType)
    setFormMealName(entry.mealName ?? '')
    setFormCalories(entry.calories != null ? String(entry.calories) : '')
    setFormProtein(entry.proteinG != null ? String(entry.proteinG) : '')
    setFormCarbs(entry.carbsG != null ? String(entry.carbsG) : '')
    setFormFat(entry.fatG != null ? String(entry.fatG) : '')
    setFormFiber(entry.fiberG != null ? String(entry.fiberG) : '')
    setEditingId(entry.id)
    setTab('sources')
  }

  function handleSaveSettings() {
    const updated: NutritionSettings = {
      bodyweightLbs: Number(settingsWeight) || 170,
      dailyCalorieTarget: Number(settingsCalories) || 2200,
    }
    saveNutritionSettings(updated)
    reload()
  }

  // Compute 30-day chart data
  const chartData = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dateSet = new Set<string>()
    entries.forEach(e => dateSet.add(e.date))

    // Also fill in missing days
    const allDates: string[] = []
    const cursor = new Date(thirtyDaysAgo)
    while (cursor <= now) {
      allDates.push(cursor.toISOString().slice(0, 10))
      cursor.setDate(cursor.getDate() + 1)
    }

    return allDates
      .filter(d => dateSet.has(d))
      .map(d => {
        const totals = getDailyTotals(d)
        return {
          date: d.slice(5),
          fullDate: d,
          calories: totals.calories,
          proteinG: totals.proteinG,
          carbsG: totals.carbsG,
          fatG: totals.fatG,
          fiberG: totals.fiberG,
        }
      })
  }, [entries])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Apple size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Nutrition</h1>
          <p className="text-xs text-gray-500">Macro tracking &middot; Attia longevity framework</p>
        </div>
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

      {tab === 'overview' && (
        <OverviewTab entries={entries} settings={settings} chartData={chartData} onSwitchToSources={() => setTab('sources')} />
      )}
      {tab === 'trends' && (
        <TrendsTab entries={entries} settings={settings} chartData={chartData} />
      )}
      {tab === 'analysis' && (
        <AnalysisTab entries={entries} settings={settings} chartData={chartData} />
      )}
      {tab === 'insights' && (
        <InsightsTab entries={entries} settings={settings} />
      )}
      {tab === 'sources' && (
        <SourcesTab
          entries={entries}
          settings={settings}
          formDate={formDate} setFormDate={setFormDate}
          formMealType={formMealType} setFormMealType={setFormMealType}
          formMealName={formMealName} setFormMealName={setFormMealName}
          formCalories={formCalories} setFormCalories={setFormCalories}
          formProtein={formProtein} setFormProtein={setFormProtein}
          formCarbs={formCarbs} setFormCarbs={setFormCarbs}
          formFat={formFat} setFormFat={setFormFat}
          formFiber={formFiber} setFormFiber={setFormFiber}
          editingId={editingId}
          settingsWeight={settingsWeight} setSettingsWeight={setSettingsWeight}
          settingsCalories={settingsCalories} setSettingsCalories={setSettingsCalories}
          onSave={handleSave}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onCancel={resetForm}
          onSaveSettings={handleSaveSettings}
        />
      )}
    </div>
  )
}

/* ─── Chart Data Type ─── */

interface ChartDay {
  date: string
  fullDate: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

/* ─── Overview Tab ─── */

function OverviewTab({ entries, settings, chartData, onSwitchToSources }: {
  entries: NutritionEntry[]
  settings: NutritionSettings
  chartData: ChartDay[]
  onSwitchToSources: () => void
}) {
  const today = todayStr()
  const todayMeals = getEntriesByDate(today)
  const todayTotals = getDailyTotals(today)

  const proteinTarget = getProteinTarget(settings)
  const calorieRange = getCalorieRange(settings)
  const calTarget = settings.dailyCalorieTarget

  // Macro progress items
  const macros = [
    { label: 'Calories', current: todayTotals.calories, target: calTarget, unit: 'kcal', metricId: 'calories' },
    { label: 'Protein', current: todayTotals.proteinG, target: proteinTarget, unit: 'g', metricId: 'protein' },
    { label: 'Carbs', current: todayTotals.carbsG, target: Math.round(calTarget * 0.4 / 4), unit: 'g', metricId: '' },
    { label: 'Fat', current: todayTotals.fatG, target: Math.round(calTarget * 0.3 / 9), unit: 'g', metricId: '' },
    { label: 'Fiber', current: todayTotals.fiberG, target: 30, unit: 'g', metricId: 'fiber' },
  ]

  // 7-day protein compliance
  const last7Days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().slice(0, 10))
  }
  const proteinValues = last7Days.map(d => getDailyTotals(d).proteinG).filter(v => v > 0)
  const avgProtein = proteinValues.length > 0 ? avg(proteinValues) : 0
  const proteinStatus = proteinValues.length > 0 ? getNutritionStatus('protein', avgProtein, settings) : null

  return (
    <div className="space-y-6">
      {/* Today's Meals */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Meals</h3>
          <button
            onClick={onSwitchToSources}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30 transition-colors"
          >
            Add Meal
          </button>
        </div>
        {todayMeals.length === 0 ? (
          <p className="text-sm text-gray-500">No meals logged today. Add your first meal to start tracking.</p>
        ) : (
          <div className="space-y-2">
            {todayMeals.map(meal => (
              <div key={meal.id} className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: `${MEAL_TYPE_COLORS[meal.mealType]}20`, color: MEAL_TYPE_COLORS[meal.mealType] }}
                  >
                    {meal.mealType}
                  </span>
                  <span className="text-sm text-gray-300">{meal.mealName || 'Unnamed meal'}</span>
                </div>
                <div className="flex gap-3 text-xs font-mono text-gray-500">
                  {meal.calories != null && <span>{meal.calories} kcal</span>}
                  {meal.proteinG != null && <span>{meal.proteinG}g P</span>}
                  {meal.carbsG != null && <span>{meal.carbsG}g C</span>}
                  {meal.fatG != null && <span>{meal.fatG}g F</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Macro Progress Bars */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Daily Progress</h3>
        <div className="space-y-3">
          {macros.map(m => {
            const pct = m.target > 0 ? Math.min((m.current / m.target) * 100, 100) : 0
            const status = m.metricId ? getNutritionStatus(m.metricId, m.current, settings) : (pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red')
            const barColor = STATUS_COLORS[status] || BRAND

            return (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{m.label}</span>
                  <span className="text-gray-500 font-mono">{m.current} / {m.target} {m.unit}</span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Protein Compliance Card */}
      {proteinValues.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">7-Day Protein Avg</div>
          <div className="text-xl font-bold font-mono" style={{ color: proteinStatus ? STATUS_COLORS[proteinStatus] : '#6b7280' }}>
            {avgProtein.toFixed(0)}g / {proteinTarget}g target
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Target: 1g per lb bodyweight ({settings.bodyweightLbs} lbs)</div>
        </div>
      )}

      {/* Calorie Trend Area Chart */}
      {chartData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Calorie Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              {grid}
              {xax()}
              {yax({ domain: [0, 'auto'] })}
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={calTarget} stroke={GREEN} strokeDasharray="4 4" label={{ value: 'Target', fill: GREEN, fontSize: 10 }} />
              <Area type="monotone" dataKey="calories" stroke={BRAND} fill={`${BRAND}33`} strokeWidth={2} name="Calories" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Apple size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No nutrition data yet. Add meals from the Sources tab.</p>
        </div>
      )}
    </div>
  )
}

/* ─── Trends Tab ─── */

function TrendsTab({ entries, settings, chartData }: {
  entries: NutritionEntry[]
  settings: NutritionSettings
  chartData: ChartDay[]
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Apple size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No nutrition data yet.</p>
      </div>
    )
  }

  const calTarget = settings.dailyCalorieTarget
  const proteinTarget = getProteinTarget(settings)

  return (
    <div className="space-y-6">
      {/* Calorie Line Chart */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Calories (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            {grid}
            {xax()}
            {yax({ domain: [0, 'auto'] })}
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={calTarget} stroke={GREEN} strokeDasharray="4 4" label={{ value: `Target ${calTarget}`, fill: GREEN, fontSize: 10 }} />
            <Line type="monotone" dataKey="calories" stroke={BRAND} strokeWidth={2} dot={false} name="Calories" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Protein Line Chart */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Protein (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            {grid}
            {xax()}
            {yax({ domain: [0, 'auto'] })}
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={proteinTarget} stroke={GREEN} strokeDasharray="4 4" label={{ value: `Target ${proteinTarget}g`, fill: GREEN, fontSize: 10 }} />
            <Line type="monotone" dataKey="proteinG" stroke={BRAND} strokeWidth={2} dot={false} name="Protein (g)" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Macro Stacked Bar Chart */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Macros by Day</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            {grid}
            {xax()}
            {yax({ domain: [0, 'auto'] })}
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="proteinG" stackId="macros" fill={BRAND} name="Protein (g)" />
            <Bar dataKey="carbsG" stackId="macros" fill={AMBER} name="Carbs (g)" />
            <Bar dataKey="fatG" stackId="macros" fill={RED} name="Fat (g)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fiber Line Chart */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Fiber (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            {grid}
            {xax()}
            {yax({ domain: [0, 'auto'] })}
            <Tooltip contentStyle={tooltipStyle} />
            <ReferenceLine y={30} stroke={GREEN} strokeDasharray="4 4" label={{ value: '30g Target', fill: GREEN, fontSize: 10 }} />
            <Line type="monotone" dataKey="fiberG" stroke={GREEN} strokeWidth={2} dot={false} name="Fiber (g)" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ─── Analysis Tab ─── */

function AnalysisTab({ entries, settings, chartData }: {
  entries: NutritionEntry[]
  settings: NutritionSettings
  chartData: ChartDay[]
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Apple size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No nutrition data yet.</p>
      </div>
    )
  }

  // Macro ratio: avg protein%/carbs%/fat% of total calories
  const totalProteinCals = chartData.reduce((s, d) => s + d.proteinG * 4, 0)
  const totalCarbsCals = chartData.reduce((s, d) => s + d.carbsG * 4, 0)
  const totalFatCals = chartData.reduce((s, d) => s + d.fatG * 9, 0)
  const totalMacroCals = totalProteinCals + totalCarbsCals + totalFatCals

  const proteinPct = totalMacroCals > 0 ? (totalProteinCals / totalMacroCals) * 100 : 0
  const carbsPct = totalMacroCals > 0 ? (totalCarbsCals / totalMacroCals) * 100 : 0
  const fatPct = totalMacroCals > 0 ? (totalFatCals / totalMacroCals) * 100 : 0

  // Meal timing: avg calories by mealType
  const mealTypeBuckets: Record<MealType, number[]> = { breakfast: [], lunch: [], dinner: [], snack: [] }
  entries.forEach(e => {
    if (e.calories != null) {
      mealTypeBuckets[e.mealType].push(e.calories)
    }
  })
  const mealTimingData = (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(mt => ({
    mealType: mt.charAt(0).toUpperCase() + mt.slice(1),
    avgCalories: Math.round(avg(mealTypeBuckets[mt])),
  }))

  // Protein consistency (std dev over 30 days)
  const proteinValues = chartData.map(d => d.proteinG).filter(v => v > 0)
  const proteinStdDev = stdDev(proteinValues)
  const proteinConsistencyLabel = proteinStdDev <= 10 ? 'Very Consistent' : proteinStdDev <= 25 ? 'Consistent' : proteinStdDev <= 40 ? 'Variable' : 'Highly Variable'
  const proteinConsistencyColor = proteinStdDev <= 10 ? GREEN : proteinStdDev <= 25 ? GREEN : proteinStdDev <= 40 ? AMBER : RED

  // Best/worst compliance days
  const proteinTarget = getProteinTarget(settings)
  const withProtein = chartData.filter(d => d.proteinG > 0)
  const bestDay = withProtein.length > 0
    ? withProtein.reduce((best, d) => {
        const bestDiff = Math.abs(best.proteinG - proteinTarget)
        const dDiff = Math.abs(d.proteinG - proteinTarget)
        return dDiff < bestDiff ? d : best
      }, withProtein[0])
    : null
  const worstDay = withProtein.length > 0
    ? withProtein.reduce((worst, d) => {
        const worstDiff = Math.abs(worst.proteinG - proteinTarget)
        const dDiff = Math.abs(d.proteinG - proteinTarget)
        return dDiff > worstDiff ? d : worst
      }, withProtein[0])
    : null

  return (
    <div className="space-y-6">
      {/* Macro Ratio */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Macro Ratio (30-Day Average)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Protein</div>
            <div className="text-lg font-bold font-mono" style={{ color: BRAND }}>{proteinPct.toFixed(0)}%</div>
            <div className="text-[10px] text-gray-600">{(totalProteinCals / Math.max(chartData.length, 1) / 4).toFixed(0)}g/day avg</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Carbs</div>
            <div className="text-lg font-bold font-mono" style={{ color: AMBER }}>{carbsPct.toFixed(0)}%</div>
            <div className="text-[10px] text-gray-600">{(totalCarbsCals / Math.max(chartData.length, 1) / 4).toFixed(0)}g/day avg</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Fat</div>
            <div className="text-lg font-bold font-mono" style={{ color: RED }}>{fatPct.toFixed(0)}%</div>
            <div className="text-[10px] text-gray-600">{(totalFatCals / Math.max(chartData.length, 1) / 9).toFixed(0)}g/day avg</div>
          </div>
        </div>
      </div>

      {/* Meal Timing */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Avg Calories by Meal Type</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={mealTimingData}>
            {grid}
            <XAxis dataKey="mealType" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            {yax({ domain: [0, 'auto'] })}
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="avgCalories" fill={BRAND} radius={[4, 4, 0, 0]} name="Avg Calories" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Protein Consistency */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Protein Consistency (Last 30 Days)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Standard Deviation</div>
            <div className="text-lg font-bold font-mono" style={{ color: proteinConsistencyColor }}>
              {proteinValues.length > 0 ? `${proteinStdDev.toFixed(1)}g` : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Rating</div>
            <div className="text-lg font-bold font-mono" style={{ color: proteinConsistencyColor }}>
              {proteinValues.length > 0 ? proteinConsistencyLabel : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Best/Worst Compliance Days */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Best / Worst Compliance Days</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Best Day</div>
            {bestDay ? (
              <>
                <div className="text-sm font-mono text-gray-300">{bestDay.fullDate}</div>
                <div className="text-sm font-bold font-mono" style={{ color: GREEN }}>
                  Protein: {bestDay.proteinG}g / {proteinTarget}g
                </div>
              </>
            ) : <div className="text-sm text-gray-600">--</div>}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Worst Day</div>
            {worstDay ? (
              <>
                <div className="text-sm font-mono text-gray-300">{worstDay.fullDate}</div>
                <div className="text-sm font-bold font-mono" style={{ color: RED }}>
                  Protein: {worstDay.proteinG}g / {proteinTarget}g
                </div>
              </>
            ) : <div className="text-sm text-gray-600">--</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Insights Tab ─── */

function InsightsTab({ entries, settings }: {
  entries: NutritionEntry[]
  settings: NutritionSettings
}) {
  const proteinTarget = getProteinTarget(settings)
  const calorieRange = getCalorieRange(settings)

  // 7-day averages
  const last7Days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    last7Days.push(d.toISOString().slice(0, 10))
  }
  const dailyTotals7 = last7Days.map(d => getDailyTotals(d))
  const daysWithData = dailyTotals7.filter(t => t.calories > 0)

  const avgCalories = daysWithData.length > 0 ? avg(daysWithData.map(t => t.calories)) : 0
  const avgProtein = daysWithData.length > 0 ? avg(daysWithData.map(t => t.proteinG)) : 0
  const avgFiber = daysWithData.length > 0 ? avg(daysWithData.map(t => t.fiberG)) : 0

  const calStatus = daysWithData.length > 0 ? getNutritionStatus('calories', avgCalories, settings) : null
  const proteinStatus = daysWithData.length > 0 ? getNutritionStatus('protein', avgProtein, settings) : null
  const fiberStatus = daysWithData.length > 0 ? getNutritionStatus('fiber', avgFiber, settings) : null

  const targets = [
    {
      label: 'Protein',
      target: `${proteinTarget}g (1g/lb bodyweight)`,
      current: daysWithData.length > 0 ? `${avgProtein.toFixed(0)}g` : '--',
      status: proteinStatus,
      recommendation: 'Protein is below target. Prioritize protein-forward meals: eggs, chicken breast, greek yogurt, whey protein. Aim for 40-50g per meal across 3-4 meals.',
    },
    {
      label: 'Calories',
      target: `${calorieRange.greenMin}-${calorieRange.greenMax} kcal`,
      current: daysWithData.length > 0 ? `${avgCalories.toFixed(0)} kcal` : '--',
      status: calStatus,
      recommendation: 'Calorie intake is outside optimal range. If too low, you risk muscle loss; if too high, excess fat storage. Adjust portion sizes and meal frequency to stay within range.',
    },
    {
      label: 'Fiber',
      target: '30g+',
      current: daysWithData.length > 0 ? `${avgFiber.toFixed(0)}g` : '--',
      status: fiberStatus,
      recommendation: 'Fiber is below the 30g target. Increase vegetables, berries, legumes, and seeds. Fiber supports gut microbiome diversity, a key longevity marker per Attia.',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Target Table */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Nutrition Targets (Attia Framework)</h3>
        <div className="space-y-3">
          {targets.map(t => {
            const color = t.status ? STATUS_COLORS[t.status] : '#6b7280'
            return (
              <div key={t.label} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-300">{t.label}</span>
                  <span className="text-xs text-gray-600 ml-2">(Target: {t.target})</span>
                </div>
                <span className="font-mono font-bold" style={{ color }}>{t.current}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recommendations */}
      {entries.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recommendations</h3>
          <div className="space-y-3">
            {targets.map(t => {
              if (t.status === 'green' || t.status === null) return null
              return (
                <div key={t.label} className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-sm font-medium mb-1" style={{ color: STATUS_COLORS[t.status] }}>{t.label}</div>
                  <div className="text-xs text-gray-400">{t.recommendation}</div>
                </div>
              )
            })}
            {targets.every(t => t.status === 'green' || t.status === null) && (
              <div className="text-sm text-gray-400">All metrics are on track. Keep up the great work!</div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
        <div className="text-xs text-gray-500">
          These targets are based on the Medicine 3.0 framework from Outlive by Dr. Peter Attia. Nutritional needs are highly individual and vary based on age, activity level, health conditions, and goals. Consult a registered dietitian or physician for personalized guidance.
        </div>
      </div>
    </div>
  )
}

/* ─── Sources Tab ─── */

interface SourcesTabProps {
  entries: NutritionEntry[]
  settings: NutritionSettings
  formDate: string; setFormDate: (v: string) => void
  formMealType: MealType; setFormMealType: (v: MealType) => void
  formMealName: string; setFormMealName: (v: string) => void
  formCalories: string; setFormCalories: (v: string) => void
  formProtein: string; setFormProtein: (v: string) => void
  formCarbs: string; setFormCarbs: (v: string) => void
  formFat: string; setFormFat: (v: string) => void
  formFiber: string; setFormFiber: (v: string) => void
  editingId: string | null
  settingsWeight: string; setSettingsWeight: (v: string) => void
  settingsCalories: string; setSettingsCalories: (v: string) => void
  onSave: () => void
  onDelete: (id: string) => void
  onEdit: (entry: NutritionEntry) => void
  onCancel: () => void
  onSaveSettings: () => void
}

function SourcesTab({
  entries,
  formDate, setFormDate,
  formMealType, setFormMealType,
  formMealName, setFormMealName,
  formCalories, setFormCalories,
  formProtein, setFormProtein,
  formCarbs, setFormCarbs,
  formFat, setFormFat,
  formFiber, setFormFiber,
  editingId,
  settingsWeight, setSettingsWeight,
  settingsCalories, setSettingsCalories,
  onSave,
  onDelete,
  onEdit,
  onCancel,
  onSaveSettings,
}: SourcesTabProps) {
  const sortedEntries = [...entries].sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date)
    if (dateComp !== 0) return dateComp
    return b.createdAt - a.createdAt
  }).slice(0, 30)

  return (
    <div className="space-y-6">
      {/* Meal Entry Form */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {editingId ? 'Edit Meal' : 'Log Meal'}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Meal Type</label>
            <select
              value={formMealType}
              onChange={e => setFormMealType(e.target.value as MealType)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Meal Name</label>
          <input
            type="text"
            value={formMealName}
            onChange={e => setFormMealName(e.target.value)}
            placeholder="e.g. Grilled chicken salad"
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Calories</label>
            <input
              type="number"
              value={formCalories}
              onChange={e => setFormCalories(e.target.value)}
              placeholder="kcal"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Protein (g)</label>
            <input
              type="number"
              value={formProtein}
              onChange={e => setFormProtein(e.target.value)}
              placeholder="g"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Carbs (g)</label>
            <input
              type="number"
              value={formCarbs}
              onChange={e => setFormCarbs(e.target.value)}
              placeholder="g"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fat (g)</label>
            <input
              type="number"
              value={formFat}
              onChange={e => setFormFat(e.target.value)}
              placeholder="g"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Fiber (g)</label>
            <input
              type="number"
              value={formFiber}
              onChange={e => setFormFiber(e.target.value)}
              placeholder="g"
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {editingId ? 'Update' : 'Save'}
          </button>
          {editingId && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Meal History */}
      {sortedEntries.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Meal History</h3>
          <div className="space-y-3">
            {sortedEntries.map(entry => (
              <div key={entry.id} className="bg-white/[0.03] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-300">{entry.date}</span>
                    <span
                      className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${MEAL_TYPE_COLORS[entry.mealType]}20`, color: MEAL_TYPE_COLORS[entry.mealType] }}
                    >
                      {entry.mealType}
                    </span>
                    {entry.mealName && <span className="text-sm text-gray-400">{entry.mealName}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(entry)}
                      className="text-xs px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-xs font-mono text-gray-500">
                  {entry.calories != null && <span>{entry.calories} kcal</span>}
                  {entry.proteinG != null && <span>{entry.proteinG}g P</span>}
                  {entry.carbsG != null && <span>{entry.carbsG}g C</span>}
                  {entry.fatG != null && <span>{entry.fatG}g F</span>}
                  {entry.fiberG != null && <span>{entry.fiberG}g fiber</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition Settings */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Nutrition Settings</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bodyweight (lbs)</label>
            <input
              type="number"
              value={settingsWeight}
              onChange={e => setSettingsWeight(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Daily Calorie Target</label>
            <input
              type="number"
              value={settingsCalories}
              onChange={e => setSettingsCalories(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={onSaveSettings}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Save Settings
        </button>
      </div>

      {/* Future placeholder */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
        <div className="text-xs text-gray-600">
          MyFitnessPal / Cronometer import coming soon. For now, log meals manually above.
        </div>
      </div>
    </div>
  )
}
