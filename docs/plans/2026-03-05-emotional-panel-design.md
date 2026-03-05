# Emotional Panel Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** Build an Emotional health tracking panel with daily mood/stress/anxiety/energy check-ins, text and voice journaling with transcription, and Attia longevity targets.

**Architecture:** Mirror Exercise/Sleep pattern — localStorage-backed entries, 5-tab page, Dashboard card. Simplified storage (manual-only, no conflict detection). Audio blobs stored in IndexedDB. Voice transcription via Web Speech API.

**Tech Stack:** React 18, TypeScript, Recharts, MediaRecorder API, Web Speech API, IndexedDB

---

## Data Model

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

No `EmotionalSettings` or `globalPriority` — manual-only source, no conflict detection. One entry per day, last write wins (upsert by date).

## Targets (Attia Longevity Framework)

| Metric | Green | Amber | Direction |
|--------|-------|-------|-----------|
| Mood | >= 4 | >= 3 | higher is better |
| Stress | <= 2 | <= 3 | lower is better |
| Anxiety | <= 2 | <= 3 | lower is better |
| Energy | >= 4 | >= 3 | higher is better |

Same `SleepTarget`-style interface with `lowerIsBetter` flag. Status function returns `green | amber | red`.

## Storage

### Entries (localStorage)
- Key: `healthspan:emotional:entries`
- Value: `EmotionalEntry[]`
- Functions: `getEmotionalEntries(filters?)`, `saveEmotionalEntry(entry)`, `deleteEmotionalEntry(id)`, `getEntryByDate(date)`
- Upsert semantics: saving an entry for a date that already exists replaces the existing entry

### Audio (IndexedDB)
- Database: `healthspan-audio`
- Object store: `recordings`
- Functions: `saveAudioBlob(id, blob)`, `getAudioBlob(id)`, `deleteAudioBlob(id)`
- Simple wrapper around raw IndexedDB API, no library dependency

## Voice Recording & Transcription

**Recording:** MediaRecorder API captures audio as webm/opus. Start/stop toggle button in entry form.

**Transcription:** Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) runs real-time during recording, producing interim + final transcript text. Falls back to text-only input if browser doesn't support Speech API.

**Flow:**
1. User taps record -> MediaRecorder starts + SpeechRecognition starts
2. Real-time transcript appears as user speaks
3. User taps stop -> audio blob saved to IndexedDB, final transcript saved as `journalText`
4. `hasAudio: true` and `audioId` set on entry

**Playback:** Entries with `hasAudio` show a play button. Load blob from IndexedDB, create `Audio` via `URL.createObjectURL()`.

**Future TODO:** Full sentiment analysis on transcripts (voice stress detection, emotion classification).

## Page Structure (5 Tabs)

### Overview
- 4 compliance cards (Mood, Stress, Anxiety, Energy) — 7-day rolling average vs targets, green/amber/red
- Mood trend area chart (last 30 days)
- Weekly compliance percentage (days meeting all targets)
- "Log Today" prompt if no entry exists for today

### Trends
- Mood + Energy line chart (30 days)
- Stress + Anxiety line chart (30 days)
- All 4 metrics stacked view option

### Analysis
- Mood consistency (variance over 30 days)
- Weekly patterns (average mood by day-of-week)
- Stress vs Energy correlation
- Best/worst days summary

### Insights
- Attia target reference table
- Per-metric recommendations (evidence-based tips when amber/red)
- Disclaimer about self-reported data

### Sources
- Daily entry form: date picker, 4 metric sliders (1-5), text journal or voice recording toggle
- Entry history list with edit/delete
- Audio playback for voice entries

## Dashboard Integration

Status card after Sleep card on Dashboard Overview:
- Shows 7-day average mood
- Status label: "On Track" (green, avg >= 4), "Building" (amber, avg >= 3), "Below Target" (red)
- Sub-text: mood score + stress status
- Links to `/emotional`

## File Structure

```
src/
  types/
    emotional.ts                  # EmotionalEntry type
    emotional.test.ts             # Type tests
  data/
    emotional-targets.ts          # EMOTIONAL_TARGETS, getEmotionalStatus
    emotional-targets.test.ts     # Target tests
  utils/
    emotional-storage.ts          # localStorage CRUD (no conflict detection)
    emotional-storage.test.ts     # Storage tests
    audio-storage.ts              # IndexedDB audio blob wrapper
    audio-storage.test.ts         # Audio storage tests
  pages/
    Emotional.tsx                 # Main 5-tab page
  App.tsx                         # Add /emotional route
  components/
    Layout.tsx                    # Set emotional active: true
  pages/
    Dashboard.tsx                 # Add Emotional status card
```

## Routing

- Set `active: true` for emotional in Layout.tsx NAV_ITEMS
- Add `<Route path="/emotional" element={<Emotional />} />` in App.tsx
