import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ReferenceLine,
} from 'recharts'
import type { MoleculeDefinition, MoleculeEntry, MoleculeCategory } from '../types/molecules'
import {
  getDefinitions, saveDefinition, deleteDefinition,
  getMoleculeEntries, saveMoleculeEntry, deleteMoleculeEntry,
  getDailyAdherence, getAdherenceRange,
} from '../utils/molecules-storage'
import { getAdherenceStatus } from '../data/molecules-targets'

const TABS = ['Overview', 'Trends', 'Analysis', 'Insights', 'Sources']

const ATTIA_PROTOCOLS = [
  { name: 'Creatine Monohydrate', dosage: '5g/day', benefit: 'muscle, brain, longevity' },
  { name: 'Omega-3 (EPA/DHA)', dosage: '2-4g/day', benefit: 'cardiovascular, brain' },
  { name: 'Vitamin D3', dosage: '5000 IU/day', benefit: 'immune, bone, mood' },
  { name: 'Magnesium', dosage: '400-600mg/day', benefit: 'sleep, muscle, stress' },
  { name: 'Vitamin K2 (MK-7)', dosage: '100-200mcg/day', benefit: 'bone, cardiovascular' },
  { name: 'AG1/Greens', dosage: '1 serving/day', benefit: 'micronutrient coverage' },
]

// Recharts primitives
const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
const xax = (p?: any) => <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const yax = (p?: any) => <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />

const statusColors: Record<string, string> = { green: '#10b981', amber: '#f59e0b', red: '#ef4444' }

export default function Molecules() {
  const [tab, setTab] = useState('Overview')
  const [refreshKey, setRefreshKey] = useState(0)
  // Stack editor form
  const [defName, setDefName] = useState('')
  const [defCategory, setDefCategory] = useState<MoleculeCategory>('supplement')
  const [defDosage, setDefDosage] = useState('')
  const [defUnit, setDefUnit] = useState('mg')
  const [editingDefId, setEditingDefId] = useState<string | null>(null)

  const definitions = useMemo(() => getDefinitions(), [refreshKey])
  const activeDefs = useMemo(() => definitions.filter(d => d.active), [definitions])
  const allEntries = useMemo(() => getMoleculeEntries(), [refreshKey])
  const today = new Date().toISOString().slice(0, 10)
  const todayAdherence = useMemo(() => getDailyAdherence(today), [refreshKey, today])

  const toggleMolecule = (defId: string, currentlyTaken: boolean) => {
    const entryId = `${today}-${defId}`
    saveMoleculeEntry({
      id: entryId,
      source: 'manual',
      date: today,
      moleculeId: defId,
      taken: !currentlyTaken,
      createdAt: Date.now(),
    })
    setRefreshKey(k => k + 1)
  }

  // ─── 7-day average adherence ───
  const sevenDayAvg = useMemo(() => {
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().slice(0, 10))
    }
    if (activeDefs.length === 0) return 0
    const adherences = dates.map(date => getDailyAdherence(date).percentage)
    return Math.round(adherences.reduce((s, v) => s + v, 0) / adherences.length)
  }, [refreshKey, activeDefs.length, today])

  // ─── 30-day range data ───
  const thirtyDayFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  }, [today])
  const adherenceRange = useMemo(() => getAdherenceRange(thirtyDayFrom, today), [refreshKey, thirtyDayFrom, today])

  // ─── Per-molecule adherence (last 30 days) ───
  const perMoleculeAdherence = useMemo(() => {
    if (activeDefs.length === 0) return []
    const totalDays = 30
    const from = thirtyDayFrom
    const entries = allEntries.filter(e => e.date >= from && e.date <= today && e.taken)
    return activeDefs.map(def => {
      const takenDays = new Set(entries.filter(e => e.moleculeId === def.id).map(e => e.date)).size
      return {
        name: def.name.length > 20 ? def.name.slice(0, 18) + '..' : def.name,
        fullName: def.name,
        adherence: Math.round((takenDays / totalDays) * 100),
      }
    })
  }, [activeDefs, allEntries, thirtyDayFrom, today])

  // ─── Current streak ───
  const currentStreak = useMemo(() => {
    if (activeDefs.length === 0) return 0
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().slice(0, 10)
      const adh = getDailyAdherence(date)
      if (adh.percentage === 100) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [refreshKey, activeDefs.length, today])

  // ─── Category breakdown ───
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { total: number; adherence: number }> = {}
    activeDefs.forEach(def => {
      if (!cats[def.category]) cats[def.category] = { total: 0, adherence: 0 }
      cats[def.category].total++
      const mol = perMoleculeAdherence.find(m => m.fullName === def.name)
      cats[def.category].adherence += mol?.adherence ?? 0
    })
    return Object.entries(cats).map(([category, data]) => ({
      category,
      count: data.total,
      avgAdherence: data.total > 0 ? Math.round(data.adherence / data.total) : 0,
    }))
  }, [activeDefs, perMoleculeAdherence])

  // ─── Sorted molecules for Analysis ───
  const sortedByAdherenceDesc = useMemo(() =>
    [...perMoleculeAdherence].sort((a, b) => b.adherence - a.adherence), [perMoleculeAdherence])
  const sortedByAdherenceAsc = useMemo(() =>
    [...perMoleculeAdherence].sort((a, b) => a.adherence - b.adherence), [perMoleculeAdherence])

  // ─── Entry history (last 30 days) ───
  const recentEntries = useMemo(() => {
    return allEntries
      .filter(e => e.date >= thirtyDayFrom && e.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  }, [allEntries, thirtyDayFrom, today])

  // ─── Form handlers ───
  const handleSaveDefinition = () => {
    if (!defName.trim() || !defDosage.trim()) return
    const dosageNum = parseFloat(defDosage)
    if (isNaN(dosageNum) || dosageNum <= 0) return

    saveDefinition({
      id: editingDefId ?? crypto.randomUUID(),
      name: defName.trim(),
      category: defCategory,
      dosage: dosageNum,
      unit: defUnit,
      frequency: 'daily',
      active: true,
      createdAt: Date.now(),
    })
    setDefName('')
    setDefCategory('supplement')
    setDefDosage('')
    setDefUnit('mg')
    setEditingDefId(null)
    setRefreshKey(k => k + 1)
  }

  const handleEditDefinition = (def: MoleculeDefinition) => {
    setDefName(def.name)
    setDefCategory(def.category)
    setDefDosage(String(def.dosage))
    setDefUnit(def.unit)
    setEditingDefId(def.id)
  }

  const handleDeleteDefinition = (id: string) => {
    deleteDefinition(id)
    setRefreshKey(k => k + 1)
  }

  const handleToggleActive = (def: MoleculeDefinition) => {
    saveDefinition({ ...def, active: !def.active })
    setRefreshKey(k => k + 1)
  }

  // ─── OVERVIEW TAB ───
  const renderOverview = () => {
    const adherenceStatus = getAdherenceStatus(todayAdherence.percentage)
    const avgStatus = getAdherenceStatus(sevenDayAvg)
    return (
      <>
        {/* Today's date header */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
          <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Today — {today}</div>

          {activeDefs.length === 0 ? (
            <div className="text-sm text-slate-500 py-4">No active molecules. Go to Sources tab to add your stack.</div>
          ) : (
            <div className="space-y-2">
              {activeDefs.map(def => {
                const taken = allEntries.some(e => e.date === today && e.moleculeId === def.id && e.taken)
                return (
                  <label key={def.id} className="flex items-center gap-3 py-2 border-b border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taken}
                      onChange={() => toggleMolecule(def.id, taken)}
                      className="w-4 h-4 rounded accent-brand-500"
                    />
                    <span className={`text-sm ${taken ? 'text-gray-200 line-through opacity-60' : 'text-gray-200'}`}>
                      {def.name}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-auto">{def.dosage} {def.unit}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Daily adherence bar */}
        <div className="flex flex-wrap gap-3.5 mb-5">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px]">
            <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Today's Adherence</div>
            <div className="text-[24px] font-bold font-mono" style={{ color: statusColors[adherenceStatus] }}>
              {todayAdherence.percentage}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{todayAdherence.taken}/{todayAdherence.total} taken</div>
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${todayAdherence.percentage}%`, backgroundColor: statusColors[adherenceStatus] }}
              />
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px]">
            <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">7-Day Average</div>
            <div className="text-[24px] font-bold font-mono" style={{ color: statusColors[avgStatus] }}>
              {sevenDayAvg}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Target: 90%+</div>
          </div>
        </div>
      </>
    )
  }

  // ─── TRENDS TAB ───
  const renderTrends = () => {
    const chartData = adherenceRange.map(d => ({
      date: d.date.slice(5),
      adherence: d.percentage,
    }))

    const barData = perMoleculeAdherence.sort((a, b) => b.adherence - a.adherence)

    return (
      <>
        {/* Daily adherence line chart */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
          <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Daily Adherence % (30 days)</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                {grid}{xax()}{yax({ domain: [0, 100] })}
                <Tooltip contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={90} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: '90%', fill: '#10b981', fontSize: 10, position: 'right' }} />
                <Line type="monotone" dataKey="adherence" stroke="#6366f1" strokeWidth={2} dot={false} name="Adherence %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-molecule bar chart */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
          <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Per-Molecule Adherence (30 days)</div>
          {barData.length === 0 ? (
            <div className="text-sm text-slate-500 py-4">No active molecules to display.</div>
          ) : (
            <div style={{ height: Math.max(180, barData.length * 36) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                  {grid}
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine x={90} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.5} />
                  <Bar dataKey="adherence" fill="#6366f1" name="Adherence %" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Current streak */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5">
          <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Current Streak</div>
          <div className="text-[34px] font-bold font-mono text-brand-400">{currentStreak}</div>
          <div className="text-[11px] text-slate-500 mt-1">consecutive days at 100% adherence</div>
        </div>
      </>
    )
  }

  // ─── ANALYSIS TAB ───
  const renderAnalysis = () => (
    <>
      {/* Most consistent */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Most Consistent (Top 5)</div>
        {sortedByAdherenceDesc.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">No data yet.</div>
        ) : (
          sortedByAdherenceDesc.slice(0, 5).map((m, i) => {
            const status = getAdherenceStatus(m.adherence)
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-gray-200">{m.fullName}</span>
                <span className="text-sm font-mono font-semibold" style={{ color: statusColors[status] }}>{m.adherence}%</span>
              </div>
            )
          })
        )}
      </div>

      {/* Least consistent */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Least Consistent (Bottom 5)</div>
        {sortedByAdherenceAsc.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">No data yet.</div>
        ) : (
          sortedByAdherenceAsc.slice(0, 5).map((m, i) => {
            const status = getAdherenceStatus(m.adherence)
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-gray-200">{m.fullName}</span>
                <span className="text-sm font-mono font-semibold" style={{ color: statusColors[status] }}>{m.adherence}%</span>
              </div>
            )
          })
        )}
      </div>

      {/* Category breakdown */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Category Breakdown</div>
        {categoryBreakdown.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">No data yet.</div>
        ) : (
          categoryBreakdown.map((cat, i) => {
            const status = getAdherenceStatus(cat.avgAdherence)
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-gray-200 capitalize">{cat.category.replace('_', ' ')}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-slate-500">{cat.count} molecule{cat.count !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-mono font-semibold" style={{ color: statusColors[status] }}>{cat.avgAdherence}%</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )

  // ─── INSIGHTS TAB ───
  const renderInsights = () => (
    <>
      {/* Attia protocol reference */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Attia Longevity Protocol Reference</div>
        {ATTIA_PROTOCOLS.map((p, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5 border-b border-white/5">
            <div className="flex-1">
              <div className="text-sm text-gray-200 font-semibold">{p.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{p.benefit}</div>
            </div>
            <span className="text-sm font-mono text-brand-400">{p.dosage}</span>
          </div>
        ))}
      </div>

      {/* Adherence recommendations */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Recommendations</div>
        {(() => {
          const belowTarget = perMoleculeAdherence.filter(m => m.adherence < 90)
          if (belowTarget.length === 0) {
            return <div className="text-sm text-emerald-400 py-2">All molecules are at or above the 90% adherence target.</div>
          }
          return belowTarget.map((m, i) => (
            <div key={i} className="py-2 border-b border-white/5">
              <div className="text-sm text-gray-200">{m.fullName} — <span className="text-amber-400 font-mono">{m.adherence}%</span></div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Below 90% target. Consider setting a daily reminder or pairing with an existing habit.
              </div>
            </div>
          ))
        })()}
      </div>

      {/* Healthcare disclaimer */}
      <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-[14px] py-[18px] px-5">
        <div className="text-[12px] text-amber-400 tracking-[0.06em] uppercase mb-2 font-bold">Healthcare Disclaimer</div>
        <div className="text-[12px] text-slate-400 leading-relaxed">
          This information is for educational purposes only and is not intended as medical advice.
          Always consult with a qualified healthcare provider before starting any supplement regimen.
          The protocols referenced are based on publicly available information and may not be appropriate
          for your individual health needs.
        </div>
      </div>
    </>
  )

  // ─── SOURCES TAB ───
  const renderSources = () => (
    <>
      {/* Stack editor form */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">
          {editingDefId ? 'Edit Molecule' : 'Add Molecule'}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] text-slate-500 block mb-1">Name</label>
            <input
              type="text"
              value={defName}
              onChange={e => setDefName(e.target.value)}
              placeholder="e.g. Creatine Monohydrate"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-slate-600 outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="text-[11px] text-slate-500 block mb-1">Category</label>
            <select
              value={defCategory}
              onChange={e => setDefCategory(e.target.value as MoleculeCategory)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500/50"
            >
              <option value="supplement">Supplement</option>
              <option value="compound">Compound</option>
              <option value="vitamin">Vitamin</option>
              <option value="mineral">Mineral</option>
              <option value="amino_acid">Amino Acid</option>
            </select>
          </div>
          <div className="w-[90px]">
            <label className="text-[11px] text-slate-500 block mb-1">Dosage</label>
            <input
              type="number"
              value={defDosage}
              onChange={e => setDefDosage(e.target.value)}
              placeholder="5"
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-slate-600 outline-none focus:border-brand-500/50"
            />
          </div>
          <div className="w-[80px]">
            <label className="text-[11px] text-slate-500 block mb-1">Unit</label>
            <select
              value={defUnit}
              onChange={e => setDefUnit(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-brand-500/50"
            >
              <option value="mg">mg</option>
              <option value="g">g</option>
              <option value="IU">IU</option>
              <option value="mcg">mcg</option>
            </select>
          </div>
          <button
            onClick={handleSaveDefinition}
            className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {editingDefId ? 'Update' : 'Add'}
          </button>
          {editingDefId && (
            <button
              onClick={() => { setEditingDefId(null); setDefName(''); setDefDosage(''); setDefUnit('mg'); setDefCategory('supplement') }}
              className="border border-white/10 text-slate-400 hover:text-slate-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Definition list */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 mb-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Your Stack</div>
        {definitions.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">No molecules defined. Add your first molecule above.</div>
        ) : (
          definitions.map(def => (
            <div key={def.id} className="flex items-center gap-3 py-2.5 border-b border-white/5">
              <div className="flex-1">
                <div className={`text-sm font-semibold ${def.active ? 'text-gray-200' : 'text-slate-500'}`}>{def.name}</div>
                <div className="text-[11px] text-slate-500">{def.dosage} {def.unit} · <span className="capitalize">{def.category.replace('_', ' ')}</span></div>
              </div>
              <button
                onClick={() => handleToggleActive(def)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
                  def.active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : 'bg-white/5 text-slate-500 border border-white/10'
                }`}
              >
                {def.active ? 'Active' : 'Inactive'}
              </button>
              <button
                onClick={() => handleEditDefinition(def)}
                className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md border border-white/10 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteDefinition(def.id)}
                className="text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded-md border border-red-500/20 transition-colors"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* Entry history */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5">
        <div className="text-[12px] text-slate-400 tracking-[0.06em] uppercase mb-3 font-bold">Entry History (Last 30 Days)</div>
        {recentEntries.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">No entries recorded yet.</div>
        ) : (
          recentEntries.slice(0, 50).map((entry, i) => {
            const def = definitions.find(d => d.id === entry.moleculeId)
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${entry.taken ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-gray-200">{def?.name ?? 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">{entry.date}</span>
                  <span className={`text-[11px] font-medium ${entry.taken ? 'text-emerald-400' : 'text-red-400'}`}>
                    {entry.taken ? 'Taken' : 'Missed'}
                  </span>
                  <button
                    onClick={() => { deleteMoleculeEntry(entry.id); setRefreshKey(k => k + 1) }}
                    className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )

  return (
    <div className="max-w-[1100px] mx-auto py-7 px-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3.5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-200">Molecules</h1>
          <div className="text-[10px] text-slate-500 tracking-[0.1em] uppercase mt-0.5">
            Supplement & Compound Tracking
          </div>
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
      {tab === 'Overview' && renderOverview()}
      {tab === 'Trends' && renderTrends()}
      {tab === 'Analysis' && renderAnalysis()}
      {tab === 'Insights' && renderInsights()}
      {tab === 'Sources' && renderSources()}

      <div className="text-center mt-9 pt-4 border-t border-white/5 text-[10px] text-slate-600">
        PHARMA Health Intelligence — Molecule Tracking — Medicine 3.0 Framework — Summit Software Solutions LLC
      </div>
    </div>
  )
}
