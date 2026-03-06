# Emotional Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Emotional health tracking panel with daily mood/stress/anxiety/energy check-ins, text and voice journaling, and Attia longevity targets.

**Architecture:** Mirror Exercise/Sleep pattern — localStorage entries, IndexedDB for audio blobs, 5-tab page, Dashboard card. Manual-only source, no conflict detection. Voice recording via MediaRecorder API, transcription via Web Speech API.

**Tech Stack:** React 18, TypeScript, Vitest, Recharts, MediaRecorder API, Web Speech API, IndexedDB

---

### Task 1: EmotionalEntry Type & Tests

**Files:**
- Create: `src/types/emotional.ts`
- Create: `src/types/emotional.test.ts`

**Step 1: Write the failing test**

Create `src/types/emotional.test.ts`:

```typescript
import type { EmotionalEntry, EmotionalSource } from './emotional'

describe('Emotional types', () => {
  it('EmotionalEntry fields compile correctly', () => {
    const entry: EmotionalEntry = {
      id: 'test',
      source: 'manual',
      date: '2026-03-01',
      mood: 4,
      stress: 2,
      anxiety: 1,
      energy: 5,
      journalText: 'Feeling great today',
      createdAt: Date.now(),
    }
    expect(entry.source).toBe('manual')
    expect(entry.mood).toBe(4)
  })

  it('EmotionalSource only allows manual', () => {
    const source: EmotionalSource = 'manual'
    expect(source).toBe('manual')
  })

  it('optional fields are truly optional', () => {
    const entry: EmotionalEntry = {
      id: 'minimal',
      source: 'manual',
      date: '2026-03-01',
      createdAt: Date.now(),
    }
    expect(entry.mood).toBeUndefined()
    expect(entry.journalText).toBeUndefined()
    expect(entry.audioId).toBeUndefined()
    expect(entry.hasAudio).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/emotional.test.ts`
Expected: FAIL — cannot find module `./emotional`

**Step 3: Write minimal implementation**

Create `src/types/emotional.ts`:

```typescript
export type EmotionalSource = 'manual'

export interface EmotionalEntry {
  id: string
  source: EmotionalSource
  date: string                    // YYYY-MM-DD
  timestamp?: string              // ISO 8601 (time of entry)

  // Core metrics (1-5 scale)
  mood?: number                   // 1=very poor, 5=excellent
  stress?: number                 // 1=minimal, 5=severe (lowerIsBetter)
  anxiety?: number                // 1=calm, 5=severe (lowerIsBetter)
  energy?: number                 // 1=exhausted, 5=energized

  // Journal
  journalText?: string            // text entry or voice transcript
  audioId?: string                // reference to IndexedDB audio blob
  hasAudio?: boolean              // quick check without IndexedDB lookup

  createdAt: number
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/emotional.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/types/emotional.ts src/types/emotional.test.ts
git commit -m "feat(emotional): add EmotionalEntry type and tests"
```

---

### Task 2: Emotional Targets & Status Function

**Files:**
- Create: `src/data/emotional-targets.ts`
- Create: `src/data/emotional-targets.test.ts`

**Reference:** `src/data/sleep-targets.ts` — same interface pattern with `lowerIsBetter` flag.

**Step 1: Write the failing test**

Create `src/data/emotional-targets.test.ts`:

```typescript
import { EMOTIONAL_TARGETS, getEmotionalStatus } from './emotional-targets'

describe('EMOTIONAL_TARGETS', () => {
  it('has entries for mood, stress, anxiety, energy', () => {
    expect(EMOTIONAL_TARGETS).toHaveLength(4)
    const ids = EMOTIONAL_TARGETS.map(t => t.id)
    expect(ids).toContain('mood')
    expect(ids).toContain('stress')
    expect(ids).toContain('anxiety')
    expect(ids).toContain('energy')
  })

  it('mood target green threshold is 4', () => {
    const mood = EMOTIONAL_TARGETS.find(t => t.id === 'mood')!
    expect(mood.greenMin).toBe(4)
    expect(mood.lowerIsBetter).toBe(false)
  })

  it('stress target is lower-is-better', () => {
    const stress = EMOTIONAL_TARGETS.find(t => t.id === 'stress')!
    expect(stress.lowerIsBetter).toBe(true)
  })
})

describe('getEmotionalStatus', () => {
  // Mood: higher is better, green >= 4, amber >= 3
  it('returns green for mood >= 4', () => {
    expect(getEmotionalStatus('mood', 4)).toBe('green')
    expect(getEmotionalStatus('mood', 5)).toBe('green')
  })

  it('returns amber for mood 3', () => {
    expect(getEmotionalStatus('mood', 3)).toBe('amber')
  })

  it('returns red for mood < 3', () => {
    expect(getEmotionalStatus('mood', 2)).toBe('red')
    expect(getEmotionalStatus('mood', 1)).toBe('red')
  })

  // Stress: lower is better, green <= 2, amber <= 3
  it('returns green for stress <= 2', () => {
    expect(getEmotionalStatus('stress', 1)).toBe('green')
    expect(getEmotionalStatus('stress', 2)).toBe('green')
  })

  it('returns amber for stress 3', () => {
    expect(getEmotionalStatus('stress', 3)).toBe('amber')
  })

  it('returns red for stress > 3', () => {
    expect(getEmotionalStatus('stress', 4)).toBe('red')
    expect(getEmotionalStatus('stress', 5)).toBe('red')
  })

  // Anxiety: lower is better, green <= 2, amber <= 3
  it('returns green for anxiety <= 2', () => {
    expect(getEmotionalStatus('anxiety', 1)).toBe('green')
    expect(getEmotionalStatus('anxiety', 2)).toBe('green')
  })

  it('returns red for anxiety > 3', () => {
    expect(getEmotionalStatus('anxiety', 4)).toBe('red')
  })

  // Energy: higher is better, green >= 4, amber >= 3
  it('returns green for energy >= 4', () => {
    expect(getEmotionalStatus('energy', 4)).toBe('green')
    expect(getEmotionalStatus('energy', 5)).toBe('green')
  })

  it('returns amber for energy 3', () => {
    expect(getEmotionalStatus('energy', 3)).toBe('amber')
  })

  it('returns red for energy < 3', () => {
    expect(getEmotionalStatus('energy', 2)).toBe('red')
  })

  it('returns red for unknown metric', () => {
    expect(getEmotionalStatus('unknown', 5)).toBe('red')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/emotional-targets.test.ts`
Expected: FAIL — cannot find module `./emotional-targets`

**Step 3: Write minimal implementation**

Create `src/data/emotional-targets.ts`:

```typescript
export interface EmotionalTarget {
  id: string
  label: string
  unit: string
  greenMin: number
  amberMin: number
  lowerIsBetter: boolean
}

export const EMOTIONAL_TARGETS: readonly EmotionalTarget[] = [
  { id: 'mood',    label: 'Mood',    unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
  { id: 'stress',  label: 'Stress',  unit: '/5', greenMin: 2, amberMin: 3, lowerIsBetter: true },
  { id: 'anxiety', label: 'Anxiety', unit: '/5', greenMin: 2, amberMin: 3, lowerIsBetter: true },
  { id: 'energy',  label: 'Energy',  unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
] as const satisfies readonly EmotionalTarget[]

export type EmotionalStatus = 'green' | 'amber' | 'red'

export function getEmotionalStatus(metricId: string, value: number): EmotionalStatus {
  const target = EMOTIONAL_TARGETS.find(t => t.id === metricId)
  if (!target) return 'red'

  if (target.lowerIsBetter) {
    if (value <= target.greenMin) return 'green'
    if (value <= target.amberMin) return 'amber'
    return 'red'
  }

  if (value >= target.greenMin) return 'green'
  if (value >= target.amberMin) return 'amber'
  return 'red'
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/emotional-targets.test.ts`
Expected: PASS (15 tests)

**Step 5: Commit**

```bash
git add src/data/emotional-targets.ts src/data/emotional-targets.test.ts
git commit -m "feat(emotional): add emotional targets and status function"
```

---

### Task 3: Emotional Storage (localStorage CRUD)

**Files:**
- Create: `src/utils/emotional-storage.ts`
- Create: `src/utils/emotional-storage.test.ts`

**Reference:** `src/utils/sleep-storage.ts` — same `readJson` helper, CRUD pattern. Simplified: no conflict detection, no merge pipeline, no settings. Upsert by date (one entry per day).

**Step 1: Write the failing test**

Create `src/utils/emotional-storage.test.ts`:

```typescript
import {
  getEmotionalEntries,
  saveEmotionalEntry,
  deleteEmotionalEntry,
  getEntryByDate,
  getAllEntriesRaw,
} from './emotional-storage'
import type { EmotionalEntry } from '../types/emotional'

const makeEntry = (overrides: Partial<EmotionalEntry> = {}): EmotionalEntry => ({
  id: 'e1',
  source: 'manual',
  date: '2026-03-01',
  mood: 4,
  stress: 2,
  anxiety: 1,
  energy: 5,
  createdAt: Date.now(),
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe('getEmotionalEntries / getAllEntriesRaw', () => {
  it('returns empty array when nothing stored', () => {
    expect(getEmotionalEntries()).toEqual([])
  })

  it('returns all stored entries', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b', date: '2026-03-02' })]
    localStorage.setItem('healthspan:emotional:entries', JSON.stringify(entries))
    expect(getAllEntriesRaw()).toHaveLength(2)
  })

  it('filters by date range', () => {
    const entries = [
      makeEntry({ id: 'old', date: '2026-01-01' }),
      makeEntry({ id: 'new', date: '2026-03-01' }),
    ]
    localStorage.setItem('healthspan:emotional:entries', JSON.stringify(entries))
    expect(getEmotionalEntries({ from: '2026-02-01', to: '2026-04-01' })).toHaveLength(1)
    expect(getEmotionalEntries({ from: '2026-02-01', to: '2026-04-01' })[0].id).toBe('new')
  })
})

describe('saveEmotionalEntry', () => {
  it('saves a new entry', () => {
    saveEmotionalEntry(makeEntry())
    expect(getEmotionalEntries()).toHaveLength(1)
    expect(getEmotionalEntries()[0].id).toBe('e1')
  })

  it('upserts by date — replaces existing entry for same date', () => {
    saveEmotionalEntry(makeEntry({ id: 'first', date: '2026-03-01', mood: 3 }))
    saveEmotionalEntry(makeEntry({ id: 'second', date: '2026-03-01', mood: 5 }))
    const entries = getEmotionalEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('second')
    expect(entries[0].mood).toBe(5)
  })

  it('allows multiple entries for different dates', () => {
    saveEmotionalEntry(makeEntry({ id: 'a', date: '2026-03-01' }))
    saveEmotionalEntry(makeEntry({ id: 'b', date: '2026-03-02' }))
    expect(getEmotionalEntries()).toHaveLength(2)
  })
})

describe('deleteEmotionalEntry', () => {
  it('removes entry by id', () => {
    saveEmotionalEntry(makeEntry({ id: 'a', date: '2026-03-01' }))
    saveEmotionalEntry(makeEntry({ id: 'b', date: '2026-03-02' }))
    deleteEmotionalEntry('a')
    const entries = getEmotionalEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('b')
  })

  it('is a no-op for non-existent id', () => {
    saveEmotionalEntry(makeEntry())
    deleteEmotionalEntry('nonexistent')
    expect(getEmotionalEntries()).toHaveLength(1)
  })
})

describe('getEntryByDate', () => {
  it('returns entry for given date', () => {
    saveEmotionalEntry(makeEntry({ id: 'a', date: '2026-03-01' }))
    const entry = getEntryByDate('2026-03-01')
    expect(entry).not.toBeNull()
    expect(entry!.id).toBe('a')
  })

  it('returns null when no entry exists for date', () => {
    expect(getEntryByDate('2026-03-01')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/emotional-storage.test.ts`
Expected: FAIL — cannot find module `./emotional-storage`

**Step 3: Write minimal implementation**

Create `src/utils/emotional-storage.ts`:

```typescript
import type { EmotionalEntry } from '../types/emotional'

const KEY = 'healthspan:emotional:entries'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export interface EmotionalFilters {
  from?: string
  to?: string
}

export function getAllEntriesRaw(): EmotionalEntry[] {
  return readJson<EmotionalEntry[]>(KEY, [])
}

function saveAll(entries: EmotionalEntry[]): void {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function getEmotionalEntries(filters: EmotionalFilters = {}): EmotionalEntry[] {
  let list = getAllEntriesRaw()
  if (filters.from) list = list.filter(e => e.date >= filters.from!)
  if (filters.to) list = list.filter(e => e.date <= filters.to!)
  return list
}

export function saveEmotionalEntry(entry: EmotionalEntry): void {
  const all = getAllEntriesRaw().filter(e => e.date !== entry.date)
  all.push(entry)
  saveAll(all)
}

export function deleteEmotionalEntry(id: string): void {
  const all = getAllEntriesRaw().filter(e => e.id !== id)
  saveAll(all)
}

export function getEntryByDate(date: string): EmotionalEntry | null {
  return getAllEntriesRaw().find(e => e.date === date) ?? null
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/emotional-storage.test.ts`
Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add src/utils/emotional-storage.ts src/utils/emotional-storage.test.ts
git commit -m "feat(emotional): add emotional storage with upsert-by-date"
```

---

### Task 4: Audio Storage (IndexedDB)

**Files:**
- Create: `src/utils/audio-storage.ts`
- Create: `src/utils/audio-storage.test.ts`

**Note:** Vitest runs in jsdom which has limited IndexedDB support. Use `fake-indexeddb` for testing, or if not available, mock the IndexedDB API. The implementation uses raw `indexedDB.open()` — no library dependency.

**Step 1: Write the failing test**

Create `src/utils/audio-storage.test.ts`:

```typescript
import 'fake-indexeddb/auto'
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from './audio-storage'

describe('audio-storage', () => {
  it('returns null for non-existent id', async () => {
    const blob = await getAudioBlob('nonexistent')
    expect(blob).toBeNull()
  })

  it('saves and retrieves audio blob', async () => {
    const blob = new Blob(['test audio'], { type: 'audio/webm' })
    await saveAudioBlob('audio-1', blob)
    const result = await getAudioBlob('audio-1')
    expect(result).not.toBeNull()
    expect(result!.size).toBe(blob.size)
    expect(result!.type).toBe('audio/webm')
  })

  it('overwrites existing blob with same id', async () => {
    const blob1 = new Blob(['first'], { type: 'audio/webm' })
    const blob2 = new Blob(['second recording'], { type: 'audio/webm' })
    await saveAudioBlob('audio-1', blob1)
    await saveAudioBlob('audio-1', blob2)
    const result = await getAudioBlob('audio-1')
    expect(result!.size).toBe(blob2.size)
  })

  it('deletes audio blob', async () => {
    const blob = new Blob(['test'], { type: 'audio/webm' })
    await saveAudioBlob('audio-1', blob)
    await deleteAudioBlob('audio-1')
    const result = await getAudioBlob('audio-1')
    expect(result).toBeNull()
  })

  it('delete is a no-op for non-existent id', async () => {
    await expect(deleteAudioBlob('nonexistent')).resolves.not.toThrow()
  })
})
```

**Step 2: Install fake-indexeddb and run test to verify it fails**

Run:
```bash
npm install -D fake-indexeddb
npx vitest run src/utils/audio-storage.test.ts
```
Expected: FAIL — cannot find module `./audio-storage`

**Step 3: Write minimal implementation**

Create `src/utils/audio-storage.ts`:

```typescript
const DB_NAME = 'healthspan-audio'
const STORE_NAME = 'recordings'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/audio-storage.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/utils/audio-storage.ts src/utils/audio-storage.test.ts
git commit -m "feat(emotional): add IndexedDB audio storage"
```

---

### Task 5: Emotional Page (5 Tabs)

**Files:**
- Create: `src/pages/Emotional.tsx`
- Modify: `src/App.tsx` — add import and route
- Modify: `src/components/Layout.tsx` — set `active: true`

**Reference:** `src/pages/Sleep.tsx` for tab structure, chart patterns, styling constants.

**Step 1: Create the Emotional page**

Create `src/pages/Emotional.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react'
import { Brain } from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts'
import {
  getEmotionalEntries, saveEmotionalEntry, deleteEmotionalEntry, getEntryByDate,
} from '../utils/emotional-storage'
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

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'insights', label: 'Insights' },
  { id: 'sources', label: 'Sources' },
]

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function fmt(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const grid = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
const xax = (p?: any) => <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} {...p} />
const yax = (p?: any) => <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 5]} {...p} />

export default function Emotional() {
  const [tab, setTab] = useState<Tab>('overview')
  const [entries, setEntries] = useState<EmotionalEntry[]>([])

  // Manual form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formMood, setFormMood] = useState(3)
  const [formStress, setFormStress] = useState(3)
  const [formAnxiety, setFormAnxiety] = useState(3)
  const [formEnergy, setFormEnergy] = useState(3)
  const [formJournal, setFormJournal] = useState('')
  const [formMode, setFormMode] = useState<'text' | 'voice'>('text')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)

  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function reload() {
    setEntries(getEmotionalEntries())
  }

  useEffect(() => { reload() }, [])

  const todayEntry = getEntryByDate(new Date().toISOString().slice(0, 10))

  // Recent 7 days and 30 days
  const now = new Date()
  const weekCutoff = new Date(now)
  weekCutoff.setDate(now.getDate() - 7)
  const weekCutoffStr = weekCutoff.toISOString().slice(0, 10)
  const recentWeek = entries.filter(e => e.date >= weekCutoffStr)

  const monthCutoff = new Date(now)
  monthCutoff.setDate(now.getDate() - 30)
  const monthCutoffStr = monthCutoff.toISOString().slice(0, 10)
  const recentMonth = entries.filter(e => e.date >= monthCutoffStr)

  function getMetricAvg(list: EmotionalEntry[], field: keyof EmotionalEntry): number {
    const vals = list.map(e => e[field]).filter((v): v is number => typeof v === 'number')
    return vals.length > 0 ? avg(vals) : 0
  }

  // Voice recording handlers
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

      // Start speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        let finalTranscript = ''
        recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' '
            } else {
              interim += event.results[i][0].transcript
            }
          }
          setTranscript(finalTranscript + interim)
        }
        recognition.onerror = () => {}
        recognition.start()
        recognitionRef.current = recognition
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      // Microphone not available
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  function resetForm() {
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormMood(3)
    setFormStress(3)
    setFormAnxiety(3)
    setFormEnergy(3)
    setFormJournal('')
    setTranscript('')
    setRecordedBlob(null)
    setFormMode('text')
    setEditingId(null)
  }

  async function handleSave() {
    const id = editingId ?? uuidv4()
    const journalText = formMode === 'voice' ? transcript : formJournal
    let audioId: string | undefined
    let hasAudio = false

    if (formMode === 'voice' && recordedBlob) {
      audioId = `audio-${id}`
      hasAudio = true
      await saveAudioBlob(audioId, recordedBlob)
    }

    const entry: EmotionalEntry = {
      id,
      source: 'manual',
      date: formDate,
      timestamp: new Date().toISOString(),
      mood: formMood,
      stress: formStress,
      anxiety: formAnxiety,
      energy: formEnergy,
      journalText: journalText || undefined,
      audioId,
      hasAudio,
      createdAt: Date.now(),
    }

    saveEmotionalEntry(entry)
    resetForm()
    reload()
  }

  async function handleDelete(entry: EmotionalEntry) {
    if (entry.audioId) await deleteAudioBlob(entry.audioId)
    deleteEmotionalEntry(entry.id)
    reload()
  }

  function handleEdit(entry: EmotionalEntry) {
    setEditingId(entry.id)
    setFormDate(entry.date)
    setFormMood(entry.mood ?? 3)
    setFormStress(entry.stress ?? 3)
    setFormAnxiety(entry.anxiety ?? 3)
    setFormEnergy(entry.energy ?? 3)
    setFormJournal(entry.journalText ?? '')
    setFormMode('text')
    setTab('sources')
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
    audio.onended = () => {
      setPlayingId(null)
      URL.revokeObjectURL(url)
    }
    audioRef.current = audio
    audio.play()
    setPlayingId(entry.id)
  }

  // Chart data
  const chartData = recentMonth
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => ({
      date: fmt(e.date),
      rawDate: e.date,
      mood: e.mood,
      stress: e.stress,
      anxiety: e.anxiety,
      energy: e.energy,
    }))

  const emptyState = (msg: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <Brain size={32} className="mb-3 text-gray-600" />
      <p className="text-sm">{msg}</p>
    </div>
  )

  // ─── OVERVIEW TAB ───
  const renderOverview = () => {
    if (entries.length === 0) return emptyState('No emotional entries yet. Start logging in the Sources tab.')

    const metrics = [
      { id: 'mood', label: 'Mood', value: getMetricAvg(recentWeek, 'mood') },
      { id: 'stress', label: 'Stress', value: getMetricAvg(recentWeek, 'stress') },
      { id: 'anxiety', label: 'Anxiety', value: getMetricAvg(recentWeek, 'anxiety') },
      { id: 'energy', label: 'Energy', value: getMetricAvg(recentWeek, 'energy') },
    ]

    const daysOnTarget = recentWeek.filter(e => {
      const m = e.mood ?? 0, s = e.stress ?? 5, a = e.anxiety ?? 5, en = e.energy ?? 0
      return m >= 4 && s <= 2 && a <= 2 && en >= 4
    }).length

    return (
      <div className="space-y-5">
        {!todayEntry && (
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-[14px] p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-brand-300">Daily Check-In</div>
              <div className="text-xs text-gray-400 mt-0.5">You haven't logged today. How are you feeling?</div>
            </div>
            <button
              onClick={() => setTab('sources')}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Log Now
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map(m => {
            const status = m.value > 0 ? getEmotionalStatus(m.id, m.value) : 'red'
            return (
              <div key={m.id} className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{m.label}</div>
                <div className="text-xl font-bold font-mono" style={{ color: STATUS_COLORS[status] }}>
                  {m.value > 0 ? m.value.toFixed(1) : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">/ 5 · 7-day avg</div>
              </div>
            )
          })}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-3">Mood Trend — 30 Days</div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                {grid}{xax()}{yax()}
                <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="mood" stroke={BRAND} fill="url(#moodGrad)" strokeWidth={2} dot={false} connectNulls />
                <ReferenceLine y={4} stroke={GREEN} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : emptyState('Not enough data for chart')}
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-1">Weekly Compliance</div>
          <div className="text-xs text-gray-500 mb-3">Days meeting all targets this week</div>
          <div className="text-2xl font-bold font-mono" style={{ color: daysOnTarget >= 5 ? GREEN : daysOnTarget >= 3 ? AMBER : RED }}>
            {daysOnTarget} / 7
          </div>
        </div>
      </div>
    )
  }

  // ─── TRENDS TAB ───
  const renderTrends = () => {
    if (chartData.length === 0) return emptyState('Not enough data for trends')

    return (
      <div className="space-y-5">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-3">Mood & Energy — 30 Days</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              {grid}{xax()}{yax()}
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="mood" stroke={BRAND} strokeWidth={2} dot={false} connectNulls name="Mood" />
              <Line type="monotone" dataKey="energy" stroke={GREEN} strokeWidth={2} dot={false} connectNulls name="Energy" />
              <ReferenceLine y={4} stroke={GREEN} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-3">Stress & Anxiety — 30 Days</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              {grid}{xax()}{yax()}
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="stress" stroke={RED} strokeWidth={2} dot={false} connectNulls name="Stress" />
              <Line type="monotone" dataKey="anxiety" stroke={AMBER} strokeWidth={2} dot={false} connectNulls name="Anxiety" />
              <ReferenceLine y={2} stroke={GREEN} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-3">All Metrics — 30 Days</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              {grid}{xax()}{yax()}
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="mood" stroke={BRAND} strokeWidth={2} dot={false} connectNulls name="Mood" />
              <Line type="monotone" dataKey="energy" stroke={GREEN} strokeWidth={2} dot={false} connectNulls name="Energy" />
              <Line type="monotone" dataKey="stress" stroke={RED} strokeWidth={2} dot={false} connectNulls name="Stress" />
              <Line type="monotone" dataKey="anxiety" stroke={AMBER} strokeWidth={2} dot={false} connectNulls name="Anxiety" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  // ─── ANALYSIS TAB ───
  const renderAnalysis = () => {
    if (recentMonth.length < 3) return emptyState('Need at least 3 entries for analysis')

    // Mood consistency (standard deviation)
    const moodVals = recentMonth.map(e => e.mood).filter((v): v is number => v != null)
    const moodAvg = avg(moodVals)
    const moodVariance = moodVals.length > 1
      ? Math.sqrt(moodVals.reduce((s, v) => s + (v - moodAvg) ** 2, 0) / (moodVals.length - 1))
      : 0

    // Day-of-week patterns
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const byDay: Record<string, number[]> = {}
    dayNames.forEach(d => { byDay[d] = [] })
    recentMonth.forEach(e => {
      const day = dayNames[new Date(e.date + 'T00:00:00').getDay()]
      if (e.mood != null) byDay[day].push(e.mood)
    })
    const dayData = dayNames.map(d => ({
      day: d,
      mood: byDay[d].length > 0 ? Math.round(avg(byDay[d]) * 10) / 10 : null,
    }))

    // Best/worst days
    const sorted = [...recentMonth].filter(e => e.mood != null).sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0))
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]

    // Stress vs Energy correlation text
    const stressVals = recentMonth.map(e => e.stress).filter((v): v is number => v != null)
    const energyVals = recentMonth.map(e => e.energy).filter((v): v is number => v != null)
    const avgStress = avg(stressVals)
    const avgEnergy = avg(energyVals)

    return (
      <div className="space-y-5">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-1">Mood Consistency</div>
          <div className="text-xs text-gray-500 mb-3">Standard deviation over 30 days (lower = more consistent)</div>
          <div className="text-2xl font-bold font-mono" style={{ color: moodVariance <= 0.5 ? GREEN : moodVariance <= 1 ? AMBER : RED }}>
            {moodVariance.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {moodVariance <= 0.5 ? 'Very consistent' : moodVariance <= 1 ? 'Moderate variation' : 'High variation'}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-3">Weekly Patterns</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayData}>
              {grid}
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 5]} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="mood" fill={BRAND} radius={[4, 4, 0, 0]} name="Avg Mood" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Stress vs Energy</div>
            <div className="text-sm text-gray-300 mt-2">
              Avg Stress: <span className="font-mono font-bold" style={{ color: avgStress <= 2 ? GREEN : avgStress <= 3 ? AMBER : RED }}>{avgStress.toFixed(1)}</span>
            </div>
            <div className="text-sm text-gray-300 mt-1">
              Avg Energy: <span className="font-mono font-bold" style={{ color: avgEnergy >= 4 ? GREEN : avgEnergy >= 3 ? AMBER : RED }}>{avgEnergy.toFixed(1)}</span>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Best & Worst Days</div>
            {best && <div className="text-sm text-gray-300 mt-2">Best: <span className="font-mono text-green-400">{fmt(best.date)}</span> ({best.mood}/5)</div>}
            {worst && <div className="text-sm text-gray-300 mt-1">Worst: <span className="font-mono text-red-400">{fmt(worst.date)}</span> ({worst.mood}/5)</div>}
          </div>
        </div>
      </div>
    )
  }

  // ─── INSIGHTS TAB ───
  const renderInsights = () => (
    <div className="space-y-5">
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <div className="text-sm font-medium text-gray-300 mb-3">Attia Emotional Health Targets</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left py-2">Metric</th>
              <th className="text-center py-2">Green</th>
              <th className="text-center py-2">Amber</th>
              <th className="text-center py-2">Direction</th>
              <th className="text-center py-2">Current</th>
            </tr>
          </thead>
          <tbody>
            {EMOTIONAL_TARGETS.map(t => {
              const currentVal = getMetricAvg(recentWeek, t.id as keyof EmotionalEntry)
              const status = currentVal > 0 ? getEmotionalStatus(t.id, currentVal) : null
              return (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="py-2 text-gray-300">{t.label}</td>
                  <td className="py-2 text-center text-green-400">{t.lowerIsBetter ? '≤' : '≥'} {t.greenMin}</td>
                  <td className="py-2 text-center text-amber-400">{t.lowerIsBetter ? '≤' : '≥'} {t.amberMin}</td>
                  <td className="py-2 text-center text-gray-500">{t.lowerIsBetter ? 'Lower ✓' : 'Higher ✓'}</td>
                  <td className="py-2 text-center font-mono font-bold" style={{ color: status ? STATUS_COLORS[status] : '#6b7280' }}>
                    {currentVal > 0 ? currentVal.toFixed(1) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
        <div className="text-sm font-medium text-gray-300 mb-3">Recommendations</div>
        <div className="space-y-3 text-sm text-gray-400">
          {getMetricAvg(recentWeek, 'mood') > 0 && getMetricAvg(recentWeek, 'mood') < 3 && (
            <div className="flex gap-2"><span className="text-red-400">●</span> Low mood detected. Consider daily mindfulness, social connection, or professional support.</div>
          )}
          {getMetricAvg(recentWeek, 'stress') > 3 && (
            <div className="flex gap-2"><span className="text-red-400">●</span> High stress levels. Try breathing exercises, nature walks, or reducing commitments.</div>
          )}
          {getMetricAvg(recentWeek, 'anxiety') > 3 && (
            <div className="flex gap-2"><span className="text-amber-400">●</span> Elevated anxiety. Grounding techniques, regular exercise, and sleep hygiene can help.</div>
          )}
          {getMetricAvg(recentWeek, 'energy') > 0 && getMetricAvg(recentWeek, 'energy') < 3 && (
            <div className="flex gap-2"><span className="text-amber-400">●</span> Low energy. Check sleep quality, hydration, and consider B-vitamin levels.</div>
          )}
          {entries.length === 0 && (
            <div>Start logging daily check-ins to receive personalized recommendations.</div>
          )}
          {entries.length > 0 && getMetricAvg(recentWeek, 'mood') >= 4 && getMetricAvg(recentWeek, 'stress') <= 2 && (
            <div className="flex gap-2"><span className="text-green-400">●</span> Great emotional health! Keep up your current routines.</div>
          )}
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-4">
        <div className="text-xs text-gray-600">
          Disclaimer: This is self-reported data for personal tracking. It is not a clinical tool.
          If you are experiencing persistent low mood, anxiety, or distress, please seek professional help.
        </div>
      </div>
    </div>
  )

  // ─── SOURCES TAB ───
  const renderSources = () => {
    const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date))

    return (
      <div className="space-y-5">
        {/* Entry Form */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-4">
            {editingId ? 'Edit Entry' : 'Daily Check-In'}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Metric sliders */}
            {[
              { key: 'mood', label: 'Mood', value: formMood, set: setFormMood, labels: ['Very Poor', 'Poor', 'Neutral', 'Good', 'Excellent'] },
              { key: 'stress', label: 'Stress', value: formStress, set: setFormStress, labels: ['Minimal', 'Low', 'Moderate', 'High', 'Severe'] },
              { key: 'anxiety', label: 'Anxiety', value: formAnxiety, set: setFormAnxiety, labels: ['Calm', 'Mild', 'Moderate', 'High', 'Severe'] },
              { key: 'energy', label: 'Energy', value: formEnergy, set: setFormEnergy, labels: ['Exhausted', 'Low', 'Moderate', 'High', 'Energized'] },
            ].map(m => (
              <div key={m.key}>
                <label className="text-xs text-gray-500 uppercase tracking-wider">{m.label}: {m.value}/5 — {m.labels[m.value - 1]}</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={m.value}
                  onChange={e => m.set(Number(e.target.value))}
                  className="mt-1 w-full accent-brand-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  {m.labels.map((l, i) => <span key={i}>{i + 1}</span>)}
                </div>
              </div>
            ))}

            {/* Text/Voice toggle */}
            <div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setFormMode('text')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${formMode === 'text' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                >
                  Text
                </button>
                <button
                  onClick={() => setFormMode('voice')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${formMode === 'voice' ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                >
                  Voice
                </button>
              </div>

              {formMode === 'text' ? (
                <textarea
                  value={formJournal}
                  onChange={e => setFormJournal(e.target.value)}
                  placeholder="How are you feeling today? (optional)"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
                />
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isRecording
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}
                  </button>
                  {transcript && (
                    <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Transcript</div>
                      {transcript}
                    </div>
                  )}
                  {recordedBlob && !isRecording && (
                    <div className="text-xs text-green-400">Audio recorded ({(recordedBlob.size / 1024).toFixed(1)} KB)</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium rounded-lg transition-colors border border-white/10"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Entry History */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-[18px] p-5">
          <div className="text-sm font-medium text-gray-300 mb-3">Entry History ({entries.length})</div>
          {sortedEntries.length === 0 ? (
            <div className="text-sm text-gray-500">No entries yet</div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.slice(0, 20).map(e => (
                <div key={e.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-lg p-3">
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 font-mono">{fmt(e.date)}</div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      {e.mood != null && <span>Mood: <span style={{ color: STATUS_COLORS[getEmotionalStatus('mood', e.mood)] }}>{e.mood}</span></span>}
                      {e.stress != null && <span>Stress: <span style={{ color: STATUS_COLORS[getEmotionalStatus('stress', e.stress)] }}>{e.stress}</span></span>}
                      {e.anxiety != null && <span>Anxiety: <span style={{ color: STATUS_COLORS[getEmotionalStatus('anxiety', e.anxiety)] }}>{e.anxiety}</span></span>}
                      {e.energy != null && <span>Energy: <span style={{ color: STATUS_COLORS[getEmotionalStatus('energy', e.energy)] }}>{e.energy}</span></span>}
                    </div>
                    {e.journalText && <div className="text-xs text-gray-400 mt-1 line-clamp-2">{e.journalText}</div>}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {e.hasAudio && (
                      <button
                        onClick={() => handlePlayAudio(e)}
                        className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-400 rounded transition-colors"
                      >
                        {playingId === e.id ? '⏹' : '▶'}
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(e)}
                      className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-400 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(e)}
                      className="px-2 py-1 text-xs bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
          <Brain size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-100">Emotional Health</h1>
          <p className="text-xs text-gray-500">Daily check-ins · Attia longevity framework</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/5 mb-2">
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

      {tab === 'overview' && renderOverview()}
      {tab === 'trends' && renderTrends()}
      {tab === 'analysis' && renderAnalysis()}
      {tab === 'insights' && renderInsights()}
      {tab === 'sources' && renderSources()}
    </div>
  )
}
```

**Step 2: Add route and activate nav**

Modify `src/App.tsx` — add import and route:

```typescript
import Emotional from './pages/Emotional'
```

Add route after sleep:

```tsx
<Route path="/emotional" element={<Emotional />} />
```

Modify `src/components/Layout.tsx` — change emotional nav item:

```typescript
{ to: '/emotional', icon: Brain, label: 'Emotional', active: true },
```

**Step 3: Run TypeScript check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests pass

**Step 4: Commit**

```bash
git add src/pages/Emotional.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(emotional): add Emotional page with 5 tabs, voice recording, route and nav"
```

---

### Task 6: Dashboard Integration

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Reference:** Lines 69-82 (sleep status pattern), lines 245-251 (sleep card).

**Step 1: Add emotional status computation**

After the sleep status block (around line 82), add:

```typescript
import { getEmotionalEntries } from '../utils/emotional-storage'
```

```typescript
// Emotional status
const emotionalEntries = useMemo(() => getEmotionalEntries(), [])
const avgMood = useMemo(() => {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  const cutoff = weekAgo.toISOString().slice(0, 10)
  const recent = emotionalEntries.filter(e => e.date >= cutoff)
  if (recent.length === 0) return 0
  const moods = recent.map(e => e.mood).filter((v): v is number => v != null)
  return moods.length > 0 ? Math.round((moods.reduce((s, v) => s + v, 0) / moods.length) * 10) / 10 : 0
}, [emotionalEntries])
const emotionalLabel = avgMood >= 4 ? 'On Track' : avgMood >= 3 ? 'Building' : avgMood > 0 ? 'Below Target' : 'No Data'
const emotionalColor = avgMood >= 4 ? '#10b981' : avgMood >= 3 ? '#f59e0b' : '#ef4444'
```

**Step 2: Add status card after sleep card (after line 251)**

```tsx
<Link to="/emotional" className="block">
  <div className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] py-[18px] px-5 flex-1 basis-[180px] min-w-[160px] hover:bg-white/[0.06] transition-colors cursor-pointer">
    <div className="text-[11px] text-slate-400 tracking-[0.08em] uppercase mb-1.5">Emotional</div>
    <div className="text-[24px] font-bold font-mono" style={{ color: emotionalColor }}>{emotionalLabel}</div>
    <div className="text-[11px] text-slate-500 mt-1">{avgMood > 0 ? `${avgMood}/5 mood avg` : 'Start logging'} · {emotionalEntries.length} entries</div>
  </div>
</Link>
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(emotional): add Emotional status card to Dashboard"
```

---

### Task 7: Final Verification

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All test files pass, 0 failures

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify file count**

New files created:
- `src/types/emotional.ts`
- `src/types/emotional.test.ts`
- `src/data/emotional-targets.ts`
- `src/data/emotional-targets.test.ts`
- `src/utils/emotional-storage.ts`
- `src/utils/emotional-storage.test.ts`
- `src/utils/audio-storage.ts`
- `src/utils/audio-storage.test.ts`
- `src/pages/Emotional.tsx`

Modified files:
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/pages/Dashboard.tsx`
