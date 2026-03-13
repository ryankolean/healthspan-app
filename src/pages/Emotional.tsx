import { useState, useEffect, useRef } from 'react'
import { Brain } from 'lucide-react'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { getEmotionalEntries, saveEmotionalEntry, deleteEmotionalEntry, getEntryByDate } from '../utils/emotional-storage'
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from '../utils/audio-storage'
import { EMOTIONAL_TARGETS, getEmotionalStatus } from '../data/emotional-targets'
import type { EmotionalEntry } from '../types/emotional'
import { v4 as uuidv4 } from 'uuid'

const BRAND = '#6366f1'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const RED = '#ef4444'
const STATUS_COLORS: Record<string, string> = { green: GREEN, amber: AMBER, red: RED }

type Tab = 'overview' | 'trends' | 'analysis' | 'insights' | 'sources'

const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
const xax = (p?: any) => <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const yax = (p?: any) => <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 5]} {...p} />
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

function getMetricValue(entries: EmotionalEntry[], metricId: string): number | null {
  const vals = entries
    .map(e => {
      if (metricId === 'mood') return e.mood
      if (metricId === 'stress') return e.stress
      if (metricId === 'anxiety') return e.anxiety
      if (metricId === 'energy') return e.energy
      if (metricId === 'wellbeing') return e.wellbeing
      return undefined
    })
    .filter((v): v is number => v != null)
  return vals.length > 0 ? avg(vals) : null
}

function moodDescriptor(v: number): string {
  if (v <= 1) return 'Very Poor'
  if (v <= 2) return 'Poor'
  if (v <= 3) return 'Okay'
  if (v <= 4) return 'Good'
  return 'Excellent'
}

function stressDescriptor(v: number): string {
  if (v <= 1) return 'Minimal'
  if (v <= 2) return 'Low'
  if (v <= 3) return 'Moderate'
  if (v <= 4) return 'High'
  return 'Severe'
}

function anxietyDescriptor(v: number): string {
  if (v <= 1) return 'Calm'
  if (v <= 2) return 'Mild'
  if (v <= 3) return 'Moderate'
  if (v <= 4) return 'High'
  return 'Severe'
}

function energyDescriptor(v: number): string {
  if (v <= 1) return 'Exhausted'
  if (v <= 2) return 'Low'
  if (v <= 3) return 'Moderate'
  if (v <= 4) return 'Good'
  return 'Energized'
}

function wellbeingDescriptor(v: number): string {
  if (v <= 1) return 'Very Poor'
  if (v <= 2) return 'Poor'
  if (v <= 3) return 'Fair'
  if (v <= 4) return 'Good'
  return 'Excellent'
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Emotional() {
  const [tab, setTab] = useState<Tab>('overview')
  const [entries, setEntries] = useState<EmotionalEntry[]>([])

  // Manual form state
  const [formDate, setFormDate] = useState(todayStr())
  const [formMood, setFormMood] = useState(3)
  const [formStress, setFormStress] = useState(2)
  const [formAnxiety, setFormAnxiety] = useState(2)
  const [formEnergy, setFormEnergy] = useState(3)
  const [formWellbeing, setFormWellbeing] = useState(3)
  const [checkinStep, setCheckinStep] = useState(0) // 0-4 = questions, 5 = summary
  const [formJournal, setFormJournal] = useState('')
  const [formMode, setFormMode] = useState<'text' | 'voice'>('text')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  // Playback state
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function reload() {
    setEntries(getEmotionalEntries())
  }

  useEffect(() => { reload() }, [])

  function resetForm() {
    setFormDate(todayStr())
    setFormMood(3)
    setFormStress(2)
    setFormAnxiety(2)
    setFormEnergy(3)
    setFormWellbeing(3)
    setCheckinStep(0)
    setFormJournal('')
    setFormMode('text')
    setEditingId(null)
    setTranscript('')
    setRecordedBlob(null)
  }

  async function handleSave() {
    const audioId = uuidv4()
    const entry: EmotionalEntry = {
      id: editingId ?? uuidv4(),
      source: 'manual',
      date: formDate,
      timestamp: new Date().toISOString(),
      mood: formMood,
      stress: formStress,
      anxiety: formAnxiety,
      energy: formEnergy,
      wellbeing: formWellbeing,
      journalText: formMode === 'voice' ? transcript : formJournal,
      audioId: recordedBlob ? audioId : undefined,
      hasAudio: !!recordedBlob,
      createdAt: editingId ? (entries.find(e => e.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
    }

    if (recordedBlob) {
      await saveAudioBlob(audioId, recordedBlob)
    }

    saveEmotionalEntry(entry)
    resetForm()
    reload()
  }

  async function handleDelete(entry: EmotionalEntry) {
    if (entry.audioId) {
      await deleteAudioBlob(entry.audioId)
    }
    deleteEmotionalEntry(entry.id)
    reload()
  }

  function handleEdit(entry: EmotionalEntry) {
    setFormDate(entry.date)
    setFormMood(entry.mood ?? 3)
    setFormStress(entry.stress ?? 2)
    setFormAnxiety(entry.anxiety ?? 2)
    setFormEnergy(entry.energy ?? 3)
    setFormWellbeing(entry.wellbeing ?? 3)
    setFormJournal(entry.journalText ?? '')
    setFormMode('text')
    setEditingId(entry.id)
    setCheckinStep(5)
    setRecordedBlob(null)
    setTranscript('')
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()

      // Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.onresult = (event: any) => {
          let finalTranscript = ''
          for (let i = 0; i < event.results.length; i++) {
            finalTranscript += event.results[i][0].transcript
          }
          setTranscript(finalTranscript)
        }
        recognition.start()
        recognitionRef.current = recognition
      }

      setIsRecording(true)
    } catch (err) {
      console.error('Failed to start recording:', err)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  async function handlePlayAudio(entry: EmotionalEntry) {
    if (!entry.audioId) return

    if (playingId === entry.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    const blob = await getAudioBlob(entry.audioId)
    if (!blob) return

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => {
      setPlayingId(null)
      URL.revokeObjectURL(url)
    }
    audio.play()
    setPlayingId(entry.id)
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
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Brain size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Emotional Health</h1>
          <p className="text-xs text-gray-500">Track mood, stress, anxiety, energy, and wellbeing</p>
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

      {tab === 'overview' && <OverviewTab entries={entries} />}
      {tab === 'trends' && <TrendsTab entries={entries} />}
      {tab === 'analysis' && <AnalysisTab entries={entries} />}
      {tab === 'insights' && <InsightsTab entries={entries} />}
      {tab === 'sources' && (
        <SourcesTab
          entries={entries}
          formDate={formDate} setFormDate={setFormDate}
          formMood={formMood} setFormMood={setFormMood}
          formStress={formStress} setFormStress={setFormStress}
          formAnxiety={formAnxiety} setFormAnxiety={setFormAnxiety}
          formEnergy={formEnergy} setFormEnergy={setFormEnergy}
          formWellbeing={formWellbeing} setFormWellbeing={setFormWellbeing}
          checkinStep={checkinStep} setCheckinStep={setCheckinStep}
          formJournal={formJournal} setFormJournal={setFormJournal}
          formMode={formMode} setFormMode={setFormMode}
          editingId={editingId}
          isRecording={isRecording}
          transcript={transcript}
          recordedBlob={recordedBlob}
          playingId={playingId}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onSave={handleSave}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onCancel={resetForm}
          onPlay={handlePlayAudio}
        />
      )}
    </div>
  )
}

/* ─── Overview Tab ─── */

function OverviewTab({ entries }: { entries: EmotionalEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)

  const complianceCards = [
    { id: 'mood', label: 'Mood' },
    { id: 'stress', label: 'Stress' },
    { id: 'anxiety', label: 'Anxiety' },
    { id: 'energy', label: 'Energy' },
    { id: 'wellbeing', label: 'Wellbeing' },
  ]

  // Mood trend area chart (last 30 days)
  const last30 = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
  const moodTrendData = last30
    .filter(e => e.mood != null)
    .map(e => ({ date: e.date.slice(5), mood: e.mood }))

  // Weekly compliance: entries where all 4 metrics are green
  const today = todayStr()
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const thisWeekEntries = entries.filter(e => e.date >= weekStartStr && e.date <= today)
  const compliantCount = thisWeekEntries.filter(e => {
    const moodOk = e.mood != null && getEmotionalStatus('mood', e.mood) === 'green'
    const stressOk = e.stress != null && getEmotionalStatus('stress', e.stress) === 'green'
    const anxietyOk = e.anxiety != null && getEmotionalStatus('anxiety', e.anxiety) === 'green'
    const energyOk = e.energy != null && getEmotionalStatus('energy', e.energy) === 'green'
    const wellbeingOk = e.wellbeing != null && getEmotionalStatus('wellbeing', e.wellbeing) === 'green'
    return moodOk && stressOk && anxietyOk && energyOk && wellbeingOk
  }).length

  // Log today prompt
  const hasToday = entries.some(e => e.date === today)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {complianceCards.map(card => {
          const val = getMetricValue(last7, card.id)
          const target = EMOTIONAL_TARGETS.find(t => t.id === card.id)
          const status = val != null ? getEmotionalStatus(card.id, val) : null
          const color = status ? STATUS_COLORS[status] : '#6b7280'
          const displayVal = val != null ? `${val.toFixed(1)}/5` : '--'
          const targetLabel = target
            ? `Target: ${target.lowerIsBetter ? '<' : '>'} ${target.greenMin}/5`
            : ''

          return (
            <div key={card.id} className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
              <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color }}>{displayVal}</div>
              <div className="text-xs text-gray-500 mt-0.5">7-day avg {targetLabel}</div>
            </div>
          )
        })}
      </div>

      {!hasToday && entries.length > 0 && (
        <div className="bg-brand-500/[0.07] border border-brand-500/20 rounded-[14px] p-4 text-center">
          <p className="text-sm text-brand-300">You haven't logged today yet. Head to the Sources tab to add an entry.</p>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Brain size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No emotional data yet. Add entries from the Sources tab.</p>
        </div>
      )}

      {moodTrendData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Mood Trend (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={moodTrendData}>
              {grid}
              {xax()}
              {yax()}
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={4} stroke={GREEN} strokeDasharray="4 4" label={{ value: 'Target', fill: GREEN, fontSize: 10 }} />
              <Area type="monotone" dataKey="mood" stroke={BRAND} fill={`${BRAND}33`} strokeWidth={2} name="Mood" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {entries.length > 0 && (
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Weekly Compliance</div>
          <div className="text-lg font-bold font-mono" style={{ color: compliantCount >= 5 ? GREEN : compliantCount >= 3 ? AMBER : RED }}>
            {compliantCount}/7 days hit all targets this week
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Trends Tab ─── */

function TrendsTab({ entries }: { entries: EmotionalEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Brain size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No emotional data yet.</p>
      </div>
    )
  }

  const moodEnergyData = sorted.map(e => ({
    date: e.date.slice(5),
    mood: e.mood ?? null,
    energy: e.energy ?? null,
    wellbeing: e.wellbeing ?? null,
  }))

  const stressAnxietyData = sorted.map(e => ({
    date: e.date.slice(5),
    stress: e.stress ?? null,
    anxiety: e.anxiety ?? null,
  }))

  const allData = sorted.map(e => ({
    date: e.date.slice(5),
    mood: e.mood ?? null,
    stress: e.stress ?? null,
    anxiety: e.anxiety ?? null,
    energy: e.energy ?? null,
    wellbeing: e.wellbeing ?? null,
  }))

  return (
    <div className="space-y-6">
      {moodEnergyData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Mood, Energy + Wellbeing (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={moodEnergyData}>
              {grid}
              {xax()}
              {yax()}
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="mood" stroke={BRAND} strokeWidth={2} dot={false} name="Mood" connectNulls />
              <Line type="monotone" dataKey="energy" stroke={GREEN} strokeWidth={2} dot={false} name="Energy" connectNulls />
              <Line type="monotone" dataKey="wellbeing" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Wellbeing" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {stressAnxietyData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Stress + Anxiety (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stressAnxietyData}>
              {grid}
              {xax()}
              {yax()}
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={2} stroke={GREEN} strokeDasharray="4 4" label={{ value: 'Target', fill: GREEN, fontSize: 10 }} />
              <Line type="monotone" dataKey="stress" stroke={AMBER} strokeWidth={2} dot={false} name="Stress" connectNulls />
              <Line type="monotone" dataKey="anxiety" stroke={RED} strokeWidth={2} dot={false} name="Anxiety" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {allData.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Metrics Combined</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={allData}>
              {grid}
              {xax()}
              {yax()}
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="mood" stroke={BRAND} strokeWidth={2} dot={false} name="Mood" connectNulls />
              <Line type="monotone" dataKey="energy" stroke={GREEN} strokeWidth={2} dot={false} name="Energy" connectNulls />
              <Line type="monotone" dataKey="stress" stroke={AMBER} strokeWidth={2} dot={false} name="Stress" connectNulls />
              <Line type="monotone" dataKey="anxiety" stroke={RED} strokeWidth={2} dot={false} name="Anxiety" connectNulls />
              <Line type="monotone" dataKey="wellbeing" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Wellbeing" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ─── Analysis Tab ─── */

function AnalysisTab({ entries }: { entries: EmotionalEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const last30 = sorted.slice(-30)

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Brain size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No emotional data yet.</p>
      </div>
    )
  }

  // Mood consistency (std dev)
  const moods = last30.map(e => e.mood).filter((v): v is number => v != null)
  const moodStdDev = stdDev(moods)
  const moodConsistencyLabel = moodStdDev <= 0.5 ? 'Very Consistent' : moodStdDev <= 1.0 ? 'Consistent' : moodStdDev <= 1.5 ? 'Variable' : 'Highly Variable'
  const moodConsistencyColor = moodStdDev <= 0.5 ? GREEN : moodStdDev <= 1.0 ? GREEN : moodStdDev <= 1.5 ? AMBER : RED

  // Weekly patterns: mood by day-of-week
  const dayBuckets: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  last30.forEach(e => {
    if (e.mood != null) {
      const day = new Date(e.date + 'T12:00:00').getDay()
      dayBuckets[day].push(e.mood)
    }
  })
  const weeklyPatternData = DAY_NAMES.map((name, i) => ({
    day: name,
    mood: dayBuckets[i].length > 0 ? Math.round(avg(dayBuckets[i]) * 10) / 10 : 0,
  }))

  // Stress vs Energy summary
  const stressVals = last30.map(e => e.stress).filter((v): v is number => v != null)
  const energyVals = last30.map(e => e.energy).filter((v): v is number => v != null)
  const avgStress = stressVals.length > 0 ? avg(stressVals) : null
  const avgEnergy = energyVals.length > 0 ? avg(energyVals) : null

  const wellbeingVals = last30.map(e => e.wellbeing).filter((v): v is number => v != null)
  const avgWellbeing = wellbeingVals.length > 0 ? avg(wellbeingVals) : null

  // Best and worst days
  const withMood = last30.filter(e => e.mood != null)
  const bestDay = withMood.length > 0 ? withMood.reduce((best, e) => (e.mood! > (best.mood ?? 0) ? e : best), withMood[0]) : null
  const worstDay = withMood.length > 0 ? withMood.reduce((worst, e) => (e.mood! < (worst.mood ?? 6) ? e : worst), withMood[0]) : null

  return (
    <div className="space-y-6">
      {/* Mood Consistency */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Mood Consistency (Last 30 Days)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Standard Deviation</div>
            <div className="text-lg font-bold font-mono" style={{ color: moodConsistencyColor }}>
              {moods.length > 0 ? moodStdDev.toFixed(2) : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Rating</div>
            <div className="text-lg font-bold font-mono" style={{ color: moodConsistencyColor }}>
              {moods.length > 0 ? moodConsistencyLabel : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Pattern */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Mood by Day of Week</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyPatternData}>
            {grid}
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            {yax()}
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="mood" fill={BRAND} radius={[4, 4, 0, 0]} name="Avg Mood" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stress vs Energy */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Stress vs Energy vs Wellbeing (30-Day Average)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Avg Stress</div>
            <div className="text-lg font-bold font-mono" style={{ color: avgStress != null ? STATUS_COLORS[getEmotionalStatus('stress', avgStress)] : '#6b7280' }}>
              {avgStress != null ? `${avgStress.toFixed(1)}/5` : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Avg Energy</div>
            <div className="text-lg font-bold font-mono" style={{ color: avgEnergy != null ? STATUS_COLORS[getEmotionalStatus('energy', avgEnergy)] : '#6b7280' }}>
              {avgEnergy != null ? `${avgEnergy.toFixed(1)}/5` : '--'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Avg Wellbeing</div>
            <div className="text-lg font-bold font-mono" style={{ color: avgWellbeing != null ? STATUS_COLORS[getEmotionalStatus('wellbeing', avgWellbeing)] : '#6b7280' }}>
              {avgWellbeing != null ? `${avgWellbeing.toFixed(1)}/5` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Best / Worst Days */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Best / Worst Days</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Best Day</div>
            {bestDay ? (
              <>
                <div className="text-sm font-mono text-gray-300">{bestDay.date}</div>
                <div className="text-sm font-bold font-mono" style={{ color: GREEN }}>Mood: {bestDay.mood}/5</div>
              </>
            ) : <div className="text-sm text-gray-600">--</div>}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Worst Day</div>
            {worstDay ? (
              <>
                <div className="text-sm font-mono text-gray-300">{worstDay.date}</div>
                <div className="text-sm font-bold font-mono" style={{ color: RED }}>Mood: {worstDay.mood}/5</div>
              </>
            ) : <div className="text-sm text-gray-600">--</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Insights Tab ─── */

function InsightsTab({ entries }: { entries: EmotionalEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7)

  const recommendations: Record<string, string> = {
    mood: 'Low mood persists. Consider morning sunlight exposure, regular exercise, social connection, and speaking with a mental health professional if ongoing.',
    stress: 'Stress is elevated. Try breathwork exercises (4-7-8 pattern), progressive muscle relaxation, time in nature, and setting boundaries on work hours.',
    anxiety: 'Anxiety is above target. Consider mindfulness meditation, reducing caffeine intake, cold exposure (cold showers), and maintaining a gratitude journal.',
    energy: 'Energy is low. Focus on sleep quality, regular exercise (especially morning), blood glucose stability (protein-forward meals), and hydration.',
    wellbeing: 'Overall wellbeing is below target. Prioritize activities that bring meaning and joy, nurture close relationships, maintain physical health routines, and consider speaking with a therapist.',
  }

  return (
    <div className="space-y-6">
      {/* Attia Target Reference */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Emotional Health Targets (Attia Framework)</h3>
        <div className="space-y-3">
          {EMOTIONAL_TARGETS.map(target => {
            const val = getMetricValue(last7, target.id)
            const status = val != null ? getEmotionalStatus(target.id, val) : null
            const color = status ? STATUS_COLORS[status] : '#6b7280'
            const displayVal = val != null ? `${val.toFixed(1)}/5` : '--'

            return (
              <div key={target.id} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-300">{target.label}</span>
                  <span className="text-xs text-gray-600 ml-2">
                    (Target: {target.lowerIsBetter ? '<=' : '>='} {target.greenMin}/5)
                  </span>
                </div>
                <span className="font-mono font-bold" style={{ color }}>{displayVal}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-metric recommendations */}
      {entries.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recommendations</h3>
          <div className="space-y-3">
            {EMOTIONAL_TARGETS.map(target => {
              const val = getMetricValue(last7, target.id)
              const status = val != null ? getEmotionalStatus(target.id, val) : null
              if (status === 'green' || status === null) return null
              return (
                <div key={target.id} className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-sm font-medium mb-1" style={{ color: STATUS_COLORS[status] }}>{target.label}</div>
                  <div className="text-xs text-gray-400">{recommendations[target.id]}</div>
                </div>
              )
            })}
            {EMOTIONAL_TARGETS.every(target => {
              const val = getMetricValue(last7, target.id)
              const status = val != null ? getEmotionalStatus(target.id, val) : null
              return status === 'green' || status === null
            }) && (
              <div className="text-sm text-gray-400">All metrics are on track. Keep up the great work!</div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
        <div className="text-xs text-gray-500">
          These targets are based on the Medicine 3.0 framework from Outlive. Emotional health is deeply personal -- individual needs vary. If you are experiencing persistent mental health challenges, please consult a qualified professional.
        </div>
      </div>
    </div>
  )
}

/* ─── Sources Tab ─── */

interface SourcesTabProps {
  entries: EmotionalEntry[]
  formDate: string; setFormDate: (v: string) => void
  formMood: number; setFormMood: (v: number) => void
  formStress: number; setFormStress: (v: number) => void
  formAnxiety: number; setFormAnxiety: (v: number) => void
  formEnergy: number; setFormEnergy: (v: number) => void
  formWellbeing: number; setFormWellbeing: (v: number) => void
  checkinStep: number; setCheckinStep: (v: number) => void
  formJournal: string; setFormJournal: (v: string) => void
  formMode: 'text' | 'voice'; setFormMode: (v: 'text' | 'voice') => void
  editingId: string | null
  isRecording: boolean
  transcript: string
  recordedBlob: Blob | null
  playingId: string | null
  onStartRecording: () => void
  onStopRecording: () => void
  onSave: () => void
  onDelete: (entry: EmotionalEntry) => void
  onEdit: (entry: EmotionalEntry) => void
  onCancel: () => void
  onPlay: (entry: EmotionalEntry) => void
}

function SourcesTab({
  entries,
  formDate, setFormDate,
  formMood, setFormMood,
  formStress, setFormStress,
  formAnxiety, setFormAnxiety,
  formEnergy, setFormEnergy,
  formWellbeing, setFormWellbeing,
  checkinStep, setCheckinStep,
  formJournal, setFormJournal,
  formMode, setFormMode,
  editingId,
  isRecording,
  transcript,
  recordedBlob,
  playingId,
  onStartRecording,
  onStopRecording,
  onSave,
  onDelete,
  onEdit,
  onCancel,
  onPlay,
}: SourcesTabProps) {
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)

  const CHECKIN_QUESTIONS = [
    { metric: 'mood', question: 'Over the past day, how would you describe your overall mood?', labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
    { metric: 'stress', question: 'How much stress have you felt today?', labels: ['Minimal', 'Mild', 'Moderate', 'High', 'Severe'] },
    { metric: 'anxiety', question: 'How much anxiety or worry have you experienced?', labels: ['Minimal', 'Mild', 'Moderate', 'High', 'Severe'] },
    { metric: 'energy', question: 'How would you rate your energy level right now?', labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
    { metric: 'wellbeing', question: 'How would you rate your overall sense of wellbeing?', labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
  ]

  const setters: Record<string, (v: number) => void> = {
    mood: setFormMood, stress: setFormStress, anxiety: setFormAnxiety,
    energy: setFormEnergy, wellbeing: setFormWellbeing,
  }
  const getters: Record<string, number> = {
    mood: formMood, stress: formStress, anxiety: formAnxiety,
    energy: formEnergy, wellbeing: formWellbeing,
  }

  function handleSelect(metric: string, value: number) {
    setters[metric](value)
    if (checkinStep < 4) setCheckinStep(checkinStep + 1)
    else setCheckinStep(5) // summary
  }

  const summaryItems = [
    { metric: 'mood', label: 'Mood', value: formMood, descriptor: moodDescriptor(formMood), step: 0 },
    { metric: 'stress', label: 'Stress', value: formStress, descriptor: stressDescriptor(formStress), step: 1 },
    { metric: 'anxiety', label: 'Anxiety', value: formAnxiety, descriptor: anxietyDescriptor(formAnxiety), step: 2 },
    { metric: 'energy', label: 'Energy', value: formEnergy, descriptor: energyDescriptor(formEnergy), step: 3 },
    { metric: 'wellbeing', label: 'Wellbeing', value: formWellbeing, descriptor: wellbeingDescriptor(formWellbeing), step: 4 },
  ]

  return (
    <div className="space-y-6">
      {/* Check-In Form */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {editingId ? 'Edit Entry' : 'Daily Check-In'}
        </h3>

        {/* Question Steps (0-4) */}
        {checkinStep >= 0 && checkinStep <= 4 && (
          <div>
            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4].map(i => (
                <button key={i} onClick={() => setCheckinStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === checkinStep ? 'bg-brand-400'
                      : i < checkinStep ? 'bg-brand-400/40' : 'bg-white/[0.1]'
                  }`} />
              ))}
            </div>

            {/* Question */}
            <p className="text-sm text-gray-200 text-center mb-6">
              {CHECKIN_QUESTIONS[checkinStep].question}
            </p>

            {/* 1-5 Buttons */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(v => {
                const current = getters[CHECKIN_QUESTIONS[checkinStep].metric]
                const isSelected = current === v
                return (
                  <button key={v}
                    onClick={() => handleSelect(CHECKIN_QUESTIONS[checkinStep].metric, v)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-colors min-w-[56px] ${
                      isSelected
                        ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300'
                    }`}>
                    <span className="text-lg font-bold font-mono">{v}</span>
                    <span className="text-[10px] leading-tight">{CHECKIN_QUESTIONS[checkinStep].labels[v - 1]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Summary Step (5) */}
        {checkinStep === 5 && (
          <div>
            {/* Date input */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none" />
            </div>

            {/* Summary Chips - clicking goes back to that question */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {summaryItems.map(item => {
                const status = getEmotionalStatus(item.metric, item.value)
                const color = STATUS_COLORS[status]
                return (
                  <button key={item.metric} onClick={() => setCheckinStep(item.step)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-center hover:bg-white/[0.08] transition-colors">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</div>
                    <div className="text-lg font-bold font-mono" style={{ color }}>{item.value}</div>
                    <div className="text-[10px] text-gray-500">{item.descriptor}</div>
                  </button>
                )
              })}
            </div>

            {/* Text / Voice Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFormMode('text')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  formMode === 'text'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-white/[0.06] text-gray-400 border border-white/[0.1] hover:text-gray-300'
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setFormMode('voice')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  formMode === 'voice'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'bg-white/[0.06] text-gray-400 border border-white/[0.1] hover:text-gray-300'
                }`}
              >
                Voice
              </button>
            </div>

            {/* Text Mode */}
            {formMode === 'text' && (
              <textarea
                value={formJournal}
                onChange={e => setFormJournal(e.target.value)}
                placeholder="How are you feeling today?"
                rows={3}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none resize-none mb-4"
              />
            )}

            {/* Voice Mode */}
            {formMode === 'voice' && (
              <div className="mb-4 space-y-3">
                <button
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    isRecording
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                      : 'bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30'
                  }`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                {transcript && (
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Transcript</div>
                    <div className="text-sm text-gray-300">{transcript}</div>
                  </div>
                )}
                {recordedBlob && (
                  <div className="text-xs text-gray-500">
                    Recorded: {(recordedBlob.size / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
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
        )}
      </div>

      {/* Entry History */}
      {sortedEntries.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Entries</h3>
          <div className="space-y-3">
            {sortedEntries.map(entry => {
              const moodColor = entry.mood != null ? STATUS_COLORS[getEmotionalStatus('mood', entry.mood)] : '#6b7280'
              const stressColor = entry.stress != null ? STATUS_COLORS[getEmotionalStatus('stress', entry.stress)] : '#6b7280'
              const anxietyColor = entry.anxiety != null ? STATUS_COLORS[getEmotionalStatus('anxiety', entry.anxiety)] : '#6b7280'
              const energyColor = entry.energy != null ? STATUS_COLORS[getEmotionalStatus('energy', entry.energy)] : '#6b7280'
              const wellbeingColor = entry.wellbeing != null ? STATUS_COLORS[getEmotionalStatus('wellbeing', entry.wellbeing)] : '#6b7280'

              return (
                <div key={entry.id} className="bg-white/[0.03] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-gray-300">{entry.date}</span>
                    <div className="flex gap-2">
                      {entry.hasAudio && (
                        <button
                          onClick={() => onPlay(entry)}
                          className="text-xs px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 rounded-lg transition-colors"
                        >
                          {playingId === entry.id ? 'Stop' : 'Play'}
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(entry)}
                        className="text-xs px-2 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(entry)}
                        className="text-xs px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs font-mono mb-1">
                    <span style={{ color: moodColor }}>M:{entry.mood ?? '-'}</span>
                    <span style={{ color: stressColor }}>S:{entry.stress ?? '-'}</span>
                    <span style={{ color: anxietyColor }}>A:{entry.anxiety ?? '-'}</span>
                    <span style={{ color: energyColor }}>E:{entry.energy ?? '-'}</span>
                    <span style={{ color: wellbeingColor }}>W:{entry.wellbeing ?? '-'}</span>
                  </div>
                  {entry.journalText && (
                    <div className="text-xs text-gray-500 line-clamp-2">{entry.journalText}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
