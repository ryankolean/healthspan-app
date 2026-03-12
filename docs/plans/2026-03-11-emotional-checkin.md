# Emotional Check-In Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 4-slider emotional entry form with a guided 5-question step-through check-in flow, add a new `wellbeing` metric, and integrate it across all tabs, dashboard, and demo data.

**Architecture:** The Sources tab's `SourcesTab` component (currently a 4-slider form) becomes a multi-step check-in with 5 questions shown one at a time, followed by a summary screen with journal/voice input. The new `wellbeing` field is added to `EmotionalEntry`, `EMOTIONAL_TARGETS`, and wired through all 5 tabs (Overview, Trends, Analysis, Insights, Sources), the Dashboard card, and the demo data generator.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS 3.4, Recharts, Vitest + jsdom, localStorage

---

## Background Context

### Design Doc
`docs/plans/2026-03-11-emotional-checkin-design.md` — the approved design.

### Key Existing Files

| File | Purpose |
|------|---------|
| `src/types/emotional.ts` | `EmotionalEntry` interface — mood, stress, anxiety, energy (1-5 scale) |
| `src/data/emotional-targets.ts` | `EMOTIONAL_TARGETS` array (4 items), `getEmotionalStatus()` function |
| `src/data/emotional-targets.test.ts` | 12 tests for targets and status |
| `src/utils/emotional-storage.ts` | localStorage CRUD — `getEmotionalEntries()`, `saveEmotionalEntry()`, etc. |
| `src/utils/emotional-storage.test.ts` | Storage tests |
| `src/utils/audio-storage.ts` | IndexedDB for voice recordings |
| `src/pages/Emotional.tsx` | 938-line page with 5 tabs: Overview, Trends, Analysis, Insights, Sources |
| `src/pages/Dashboard.tsx` | Dashboard card shows 7-day mood avg |
| `src/utils/demo-data.ts` | `generateEmotionalEntries()` — produces 45 entries per persona |

### Check-In Questions (from design doc)

| # | Question | Metric | Direction | Scale Labels |
|---|----------|--------|-----------|--------------|
| 1 | "Over the past day, how would you describe your overall mood?" | `mood` | higher = better | 1=Very Poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent |
| 2 | "How much stress have you felt today?" | `stress` | lower = better | 1=Minimal, 2=Mild, 3=Moderate, 4=High, 5=Severe |
| 3 | "How much anxiety or worry have you experienced?" | `anxiety` | lower = better | 1=Minimal, 2=Mild, 3=Moderate, 4=High, 5=Severe |
| 4 | "How would you rate your energy level right now?" | `energy` | higher = better | 1=Very Poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent |
| 5 | "How would you rate your overall sense of wellbeing?" | `wellbeing` | higher = better | 1=Very Poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent |

### What NOT to Change
- Audio recording functionality (stays on summary screen)
- Entry history list with edit/delete
- One-entry-per-day upsert behavior
- Auto-complete action integration (`any_emotion` rule)
- Journal text and voice input

---

## Task 1: Add `wellbeing` to `EmotionalEntry` type

**Files:**
- Modify: `src/types/emotional.ts:9-13`
- Modify: `src/types/emotional.test.ts` (if type tests exist — check first)

**Step 1: Add wellbeing field to EmotionalEntry**

In `src/types/emotional.ts`, add `wellbeing` after `energy`:

```typescript
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
  wellbeing?: number              // 1=very poor, 5=excellent (WHO-5 adapted)

  // Journal
  journalText?: string            // text entry or voice transcript
  audioId?: string                // reference to IndexedDB audio blob
  hasAudio?: boolean              // quick check without IndexedDB lookup

  createdAt: number
}
```

**Step 2: Run tests to verify nothing breaks**

Run: `npx vitest run --reporter=verbose`
Expected: All existing tests pass (wellbeing is optional, so no existing code breaks).

**Step 3: Commit**

```bash
git add src/types/emotional.ts
git commit -m "feat(emotional): add wellbeing field to EmotionalEntry type"
```

---

## Task 2: Add `wellbeing` to emotional targets

**Files:**
- Modify: `src/data/emotional-targets.ts:10-15`
- Modify: `src/data/emotional-targets.test.ts`

**Step 1: Write the failing tests**

Add these tests to `src/data/emotional-targets.test.ts`:

```typescript
// In the EMOTIONAL_TARGETS describe block:
it('has entries for mood, stress, anxiety, energy, wellbeing', () => {
  expect(EMOTIONAL_TARGETS).toHaveLength(5)
  const ids = EMOTIONAL_TARGETS.map(t => t.id)
  expect(ids).toContain('mood')
  expect(ids).toContain('stress')
  expect(ids).toContain('anxiety')
  expect(ids).toContain('energy')
  expect(ids).toContain('wellbeing')
})

// Replace the existing "has entries for mood, stress, anxiety, energy" test

// In the getEmotionalStatus describe block, add:
it('returns green for wellbeing >= 4', () => {
  expect(getEmotionalStatus('wellbeing', 4)).toBe('green')
  expect(getEmotionalStatus('wellbeing', 5)).toBe('green')
})

it('returns amber for wellbeing 3', () => {
  expect(getEmotionalStatus('wellbeing', 3)).toBe('amber')
})

it('returns red for wellbeing < 3', () => {
  expect(getEmotionalStatus('wellbeing', 2)).toBe('red')
  expect(getEmotionalStatus('wellbeing', 1)).toBe('red')
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/emotional-targets.test.ts --reporter=verbose`
Expected: FAIL — "has entries for mood, stress, anxiety, energy, wellbeing" fails (length is 4, not 5), wellbeing status tests fail.

**Step 3: Add wellbeing target**

In `src/data/emotional-targets.ts`, add to the `EMOTIONAL_TARGETS` array after energy:

```typescript
export const EMOTIONAL_TARGETS: readonly EmotionalTarget[] = [
  { id: 'mood',      label: 'Mood',      unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
  { id: 'stress',    label: 'Stress',    unit: '/5', greenMin: 2, amberMin: 3, lowerIsBetter: true },
  { id: 'anxiety',   label: 'Anxiety',   unit: '/5', greenMin: 2, amberMin: 3, lowerIsBetter: true },
  { id: 'energy',    label: 'Energy',    unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
  { id: 'wellbeing', label: 'Wellbeing', unit: '/5', greenMin: 4, amberMin: 3, lowerIsBetter: false },
] as const satisfies readonly EmotionalTarget[]
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/data/emotional-targets.test.ts --reporter=verbose`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/data/emotional-targets.ts src/data/emotional-targets.test.ts
git commit -m "feat(emotional): add wellbeing target to EMOTIONAL_TARGETS"
```

---

## Task 3: Update demo data generator to include `wellbeing`

**Files:**
- Modify: `src/utils/demo-data.ts` — `generateEmotionalEntries()` function (around line 715-744)

**Step 1: Add wellbeing to generated entries**

In the `generateEmotionalEntries` function in `src/utils/demo-data.ts`, add `wellbeing` to the returned entry object. Wellbeing tracks closely with mood (base it on `moodBase` with independent jitter):

```typescript
function generateEmotionalEntries(traits: PersonaTraits): EmotionalEntry[] {
  const moodBase = traits.moodBase ?? 4
  const stressBase = traits.stressBase ?? 2

  return Array.from({ length: 45 }, (_, i) => {
    const day = dateStr(i * 2)
    return {
      id: `demo-emotional-${day}`,
      source: 'manual' as const,
      date: day,
      mood: clamp(jitter(moodBase, 1), 1, 5),
      stress: clamp(jitter(stressBase, 1), 1, 5),
      anxiety: clamp(jitter(stressBase, 1), 1, 5),
      energy: clamp(jitter(moodBase, 1), 1, 5),
      wellbeing: clamp(jitter(moodBase, 1), 1, 5),
      journalText: Math.random() < 0.3 ? pick(JOURNAL_TEMPLATES) : undefined,
      createdAt: Date.now(),
    }
  })
}
```

**Step 2: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/utils/demo-data.ts
git commit -m "feat(emotional): add wellbeing to demo data generation"
```

---

## Task 4: Add `getMetricValue` support for wellbeing + update `Emotional.tsx` helper functions

**Files:**
- Modify: `src/pages/Emotional.tsx:39-50` (getMetricValue), `52-82` (descriptors)

**Step 1: Add wellbeing to `getMetricValue`**

In `src/pages/Emotional.tsx`, update the `getMetricValue` function to handle `wellbeing`:

```typescript
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
```

**Step 2: Add wellbeing descriptor function**

After the `energyDescriptor` function (around line 82), add:

```typescript
function wellbeingDescriptor(v: number): string {
  if (v <= 1) return 'Very Poor'
  if (v <= 2) return 'Poor'
  if (v <= 3) return 'Fair'
  if (v <= 4) return 'Good'
  return 'Excellent'
}
```

**Step 3: Update page subtitle**

On line 264, update the subtitle to include wellbeing:

```typescript
<p className="text-xs text-gray-500">Track mood, stress, anxiety, energy, and wellbeing</p>
```

**Step 4: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/pages/Emotional.tsx
git commit -m "feat(emotional): add wellbeing to getMetricValue and descriptors"
```

---

## Task 5: Replace Sources tab 4-slider form with 5-question step-through check-in

This is the core UX change. Replace the `SourcesTab` component's slider form with a multi-step check-in flow.

**Files:**
- Modify: `src/pages/Emotional.tsx` — `SourcesTab` component (lines 710-938) and form state in `Emotional` component (lines 86-98, 118-155, 165-176)

**Step 1: Update form state in parent `Emotional` component**

Add `formWellbeing` state and `checkinStep` state. Update `resetForm`, `handleSave`, and `handleEdit`:

In the state declarations (around line 90-98), add:

```typescript
const [formWellbeing, setFormWellbeing] = useState(3)
const [checkinStep, setCheckinStep] = useState(0) // 0-4 = questions, 5 = summary
```

Update `resetForm` (line 118-129):

```typescript
function resetForm() {
  setFormDate(todayStr())
  setFormMood(3)
  setFormStress(2)
  setFormAnxiety(2)
  setFormEnergy(3)
  setFormWellbeing(3)
  setFormJournal('')
  setFormMode('text')
  setEditingId(null)
  setTranscript('')
  setRecordedBlob(null)
  setCheckinStep(0)
}
```

Update `handleSave` (line 131-155) — add `wellbeing: formWellbeing`:

```typescript
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
```

Update `handleEdit` (line 165-176) — add wellbeing and jump to summary:

```typescript
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
  setRecordedBlob(null)
  setTranscript('')
  setCheckinStep(5) // go straight to summary when editing
}
```

**Step 2: Update SourcesTabProps interface**

Update the `SourcesTabProps` interface (line 712-733) to add wellbeing and step props:

```typescript
interface SourcesTabProps {
  entries: EmotionalEntry[]
  formDate: string; setFormDate: (v: string) => void
  formMood: number; setFormMood: (v: number) => void
  formStress: number; setFormStress: (v: number) => void
  formAnxiety: number; setFormAnxiety: (v: number) => void
  formEnergy: number; setFormEnergy: (v: number) => void
  formWellbeing: number; setFormWellbeing: (v: number) => void
  formJournal: string; setFormJournal: (v: string) => void
  formMode: 'text' | 'voice'; setFormMode: (v: 'text' | 'voice') => void
  editingId: string | null
  checkinStep: number; setCheckinStep: (v: number) => void
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
```

**Step 3: Rewrite SourcesTab component with step-through check-in**

Replace the entire `SourcesTab` function body. The check-in has 3 modes:
- Steps 0-4: One question at a time with 5 numbered buttons
- Step 5: Summary screen with all answers, journal, voice, save button
- Entry history: Always visible below

Define the questions array inside SourcesTab:

```typescript
const CHECKIN_QUESTIONS = [
  { metric: 'mood', question: 'Over the past day, how would you describe your overall mood?', labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
  { metric: 'stress', question: 'How much stress have you felt today?', labels: ['Minimal', 'Mild', 'Moderate', 'High', 'Severe'] },
  { metric: 'anxiety', question: 'How much anxiety or worry have you experienced?', labels: ['Minimal', 'Mild', 'Moderate', 'High', 'Severe'] },
  { metric: 'energy', question: 'How would you rate your energy level right now?', labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
  { metric: 'wellbeing', question: 'How would you rate your overall sense of wellbeing?', labels: ['Very Poor', 'Poor', 'Fair', 'Good', 'Excellent'] },
]
```

For each question step (0-4), render:
- Progress dots (5 dots, current one highlighted)
- Question text
- 5 numbered buttons (1-5) with label text below
- Clicking a button sets the metric value and auto-advances to next step (or to summary if step 4)

For the summary step (5), render:
- Date input
- All 5 metrics with their values shown as tappable chips (clicking goes back to that question)
- Journal text area / voice toggle (reuse existing text/voice UI exactly)
- Save/Cancel buttons

The entry history list below remains unchanged.

Here is the complete rewritten SourcesTab body:

```tsx
function SourcesTab({
  entries,
  formDate, setFormDate,
  formMood, setFormMood,
  formStress, setFormStress,
  formAnxiety, setFormAnxiety,
  formEnergy, setFormEnergy,
  formWellbeing, setFormWellbeing,
  formJournal, setFormJournal,
  formMode, setFormMode,
  editingId,
  checkinStep, setCheckinStep,
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
    mood: setFormMood,
    stress: setFormStress,
    anxiety: setFormAnxiety,
    energy: setFormEnergy,
    wellbeing: setFormWellbeing,
  }

  const getters: Record<string, number> = {
    mood: formMood,
    stress: formStress,
    anxiety: formAnxiety,
    energy: formEnergy,
    wellbeing: formWellbeing,
  }

  function handleSelect(metric: string, value: number) {
    setters[metric](value)
    // Auto-advance: if not the last question, go to next; otherwise go to summary
    if (checkinStep < 4) {
      setCheckinStep(checkinStep + 1)
    } else {
      setCheckinStep(5) // summary
    }
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
                <button
                  key={i}
                  onClick={() => setCheckinStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === checkinStep
                      ? 'bg-brand-400'
                      : i < checkinStep
                        ? 'bg-brand-400/40'
                        : 'bg-white/[0.1]'
                  }`}
                />
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
                  <button
                    key={v}
                    onClick={() => handleSelect(CHECKIN_QUESTIONS[checkinStep].metric, v)}
                    className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-colors min-w-[56px] ${
                      isSelected
                        ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-gray-300'
                    }`}
                  >
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
            {/* Date */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
              />
            </div>

            {/* Summary Chips */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {summaryItems.map(item => {
                const status = getEmotionalStatus(item.metric, item.value)
                const color = STATUS_COLORS[status]
                return (
                  <button
                    key={item.metric}
                    onClick={() => setCheckinStep(item.step)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-center hover:bg-white/[0.08] transition-colors"
                  >
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

      {/* Entry History — unchanged except adding W: for wellbeing */}
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
```

**Step 4: Update SourcesTab invocation in parent component**

Update the `<SourcesTab>` JSX in the parent `Emotional` component (around line 288-311) to pass the new props:

```tsx
{tab === 'sources' && (
  <SourcesTab
    entries={entries}
    formDate={formDate} setFormDate={setFormDate}
    formMood={formMood} setFormMood={setFormMood}
    formStress={formStress} setFormStress={setFormStress}
    formAnxiety={formAnxiety} setFormAnxiety={setFormAnxiety}
    formEnergy={formEnergy} setFormEnergy={setFormEnergy}
    formWellbeing={formWellbeing} setFormWellbeing={setFormWellbeing}
    formJournal={formJournal} setFormJournal={setFormJournal}
    formMode={formMode} setFormMode={setFormMode}
    editingId={editingId}
    checkinStep={checkinStep} setCheckinStep={setCheckinStep}
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
```

**Step 5: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All tests pass, no TypeScript errors.

**Step 6: Commit**

```bash
git add src/pages/Emotional.tsx
git commit -m "feat(emotional): replace 4-slider form with 5-question step-through check-in"
```

---

## Task 6: Update Overview tab to include wellbeing

**Files:**
- Modify: `src/pages/Emotional.tsx` — `OverviewTab` component (lines 316-413)

**Step 1: Add wellbeing to overview cards and compliance check**

Update `complianceCards` array (line 322-327):

```typescript
const complianceCards = [
  { id: 'mood', label: 'Mood' },
  { id: 'stress', label: 'Stress' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'energy', label: 'Energy' },
  { id: 'wellbeing', label: 'Wellbeing' },
]
```

Update grid to accommodate 5 cards — change `grid-cols-2 md:grid-cols-4` to `grid-cols-2 md:grid-cols-5`:

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
```

Update compliance check (around line 341-347) to include wellbeing:

```typescript
const compliantCount = thisWeekEntries.filter(e => {
  const moodOk = e.mood != null && getEmotionalStatus('mood', e.mood) === 'green'
  const stressOk = e.stress != null && getEmotionalStatus('stress', e.stress) === 'green'
  const anxietyOk = e.anxiety != null && getEmotionalStatus('anxiety', e.anxiety) === 'green'
  const energyOk = e.energy != null && getEmotionalStatus('energy', e.energy) === 'green'
  const wellbeingOk = e.wellbeing != null && getEmotionalStatus('wellbeing', e.wellbeing) === 'green'
  return moodOk && stressOk && anxietyOk && energyOk && wellbeingOk
}).length
```

**Step 2: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/pages/Emotional.tsx
git commit -m "feat(emotional): add wellbeing to Overview tab cards and compliance"
```

---

## Task 7: Update Trends tab to include wellbeing

**Files:**
- Modify: `src/pages/Emotional.tsx` — `TrendsTab` component (lines 416-503)

**Step 1: Add wellbeing to Mood + Energy chart and All Metrics chart**

In `TrendsTab`, update chart title from "Mood + Energy" to "Mood, Energy + Wellbeing" and add wellbeing line:

Update `moodEnergyData` (around line 430-434):

```typescript
const moodEnergyData = sorted.map(e => ({
  date: e.date.slice(5),
  mood: e.mood ?? null,
  energy: e.energy ?? null,
  wellbeing: e.wellbeing ?? null,
}))
```

Add a `wellbeing` `<Line>` to the Mood + Energy chart (add after the Energy line, around line 462):

```tsx
<Line type="monotone" dataKey="wellbeing" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Wellbeing" connectNulls />
```

Use `#8b5cf6` (violet-500) for wellbeing — distinct from brand indigo, green, amber, red.

Update chart title:

```tsx
<h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Mood, Energy + Wellbeing (Last 30 Days)</h3>
```

Update `allData` (around line 442-448):

```typescript
const allData = sorted.map(e => ({
  date: e.date.slice(5),
  mood: e.mood ?? null,
  stress: e.stress ?? null,
  anxiety: e.anxiety ?? null,
  energy: e.energy ?? null,
  wellbeing: e.wellbeing ?? null,
}))
```

Add wellbeing line to "All Metrics Combined" chart (after line 497):

```tsx
<Line type="monotone" dataKey="wellbeing" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Wellbeing" connectNulls />
```

**Step 2: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/pages/Emotional.tsx
git commit -m "feat(emotional): add wellbeing to Trends tab charts"
```

---

## Task 8: Update Analysis tab to include wellbeing in consistency metrics

**Files:**
- Modify: `src/pages/Emotional.tsx` — `AnalysisTab` component (lines 506-630)

**Step 1: Add wellbeing to Stress vs Energy section**

Rename "Stress vs Energy" section to "Stress vs Energy vs Wellbeing" and add a third column.

After `avgEnergy` calculation (around line 544), add:

```typescript
const wellbeingVals = last30.map(e => e.wellbeing).filter((v): v is number => v != null)
const avgWellbeing = wellbeingVals.length > 0 ? avg(wellbeingVals) : null
```

Update the grid from `grid-cols-2` to `grid-cols-3`:

```tsx
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
```

**Step 2: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/pages/Emotional.tsx
git commit -m "feat(emotional): add wellbeing to Analysis tab metrics"
```

---

## Task 9: Update Insights tab to include wellbeing recommendation

**Files:**
- Modify: `src/pages/Emotional.tsx` — `InsightsTab` component (lines 633-707)

**Step 1: Add wellbeing recommendation**

The `InsightsTab` uses `EMOTIONAL_TARGETS` to loop, so the wellbeing target will automatically appear in the target reference section and recommendations — but it needs a recommendation string.

Update the `recommendations` object (around line 639-644):

```typescript
const recommendations: Record<string, string> = {
  mood: 'Low mood persists. Consider morning sunlight exposure, regular exercise, social connection, and speaking with a mental health professional if ongoing.',
  stress: 'Stress is elevated. Try breathwork exercises (4-7-8 pattern), progressive muscle relaxation, time in nature, and setting boundaries on work hours.',
  anxiety: 'Anxiety is above target. Consider mindfulness meditation, reducing caffeine intake, cold exposure (cold showers), and maintaining a gratitude journal.',
  energy: 'Energy is low. Focus on sleep quality, regular exercise (especially morning), blood glucose stability (protein-forward meals), and hydration.',
  wellbeing: 'Overall wellbeing is below target. Prioritize activities that bring meaning and joy, nurture close relationships, maintain physical health routines, and consider speaking with a therapist.',
}
```

**Step 2: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All pass. The `EMOTIONAL_TARGETS.map()` calls in InsightsTab already iterate over all targets, so wellbeing will show up automatically.

**Step 3: Commit**

```bash
git add src/pages/Emotional.tsx
git commit -m "feat(emotional): add wellbeing recommendation to Insights tab"
```

---

## Task 10: Update Dashboard card to include wellbeing in average

**Files:**
- Modify: `src/pages/Dashboard.tsx` — emotional status section (around lines 763-776)

**Step 1: Add wellbeing to Dashboard emotional average**

Currently the Dashboard only shows mood average. Update to show a composite average of all 5 metrics (normalizing lower-is-better metrics). However per design doc, the dashboard card should "add wellbeing to 7-day average display." The simplest approach: show mood + wellbeing combined average since both are higher-is-better and most meaningful for a quick glance.

Actually, the current dashboard just shows mood avg. Keep it simple — add wellbeing avg alongside mood avg in the subtitle text:

Update the emotional status computation (lines 763-776):

```typescript
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
```

Update the Dashboard card subtitle (around line 973) to show both:

```tsx
<div className="text-[11px] text-slate-500 mt-1">
  {avgMood > 0 ? `${avgMood}/5 mood` : 'Start logging'}
  {avgWellbeing > 0 ? ` · ${avgWellbeing}/5 wellbeing` : ''}
  {' · '}{emotionalEntries.length} entries
</div>
```

**Step 2: Run tests and verify build**

Run: `npx vitest run --reporter=verbose && npx tsc --noEmit`
Expected: All pass.

**Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat(emotional): add wellbeing to Dashboard card display"
```

---

## Task 11: Final integration test and cleanup

**Files:**
- All modified files

**Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass.

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Run build**

Run: `npx vite build`
Expected: Build succeeds with no errors.

**Step 4: Manual verification checklist**

Start the dev server and verify:
- [ ] Sources tab: Step-through check-in shows questions one at a time
- [ ] Sources tab: Selecting a value auto-advances to next question
- [ ] Sources tab: Progress dots show current position and are clickable
- [ ] Sources tab: Summary screen shows all 5 metrics with colored status
- [ ] Sources tab: Clicking a metric chip on summary goes back to that question
- [ ] Sources tab: Journal text and voice recording work on summary screen
- [ ] Sources tab: Save creates entry with all 5 metrics including wellbeing
- [ ] Sources tab: Edit loads entry and goes straight to summary
- [ ] Sources tab: Entry history shows W: column for wellbeing
- [ ] Overview tab: 5 status cards (mood, stress, anxiety, energy, wellbeing)
- [ ] Trends tab: Wellbeing line on Mood/Energy chart and All Metrics chart
- [ ] Analysis tab: Wellbeing column in Stress vs Energy vs Wellbeing section
- [ ] Insights tab: Wellbeing target and recommendation visible
- [ ] Dashboard: Card shows wellbeing avg in subtitle

**Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat(emotional): final cleanup for 5-question check-in"
```
