# Bloodwork Panel Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full bloodwork panel — document upload → Claude Vision parsing → user verification → local storage → dedicated page with marker breakdown → dashboard alerts.

**Architecture:** All data lives in `localStorage`. No backend. Claude Vision API is called directly from the browser using a user-provided API key stored in `localStorage` under `healthspan:apiKey`. Oura data is migrated from the static TypeScript import to `localStorage` as well, so no medical or personal data is ever committed to the codebase.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, React Router (HashRouter), Anthropic SDK (browser-compatible via `@anthropic-ai/sdk`), Vitest + React Testing Library for tests.

---

## Task 1: Install dependencies & set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Install packages**

```bash
cd /Users/ryankolean/healthspan-app
npm install @anthropic-ai/sdk
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 2: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
```

**Step 3: Create test setup file**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

**Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 5: Verify tests run**

```bash
npm test
```
Expected: "No test files found" (passes with 0 tests — setup is working)

**Step 6: Commit**

```bash
git add package.json vitest.config.ts src/test/setup.ts
git commit -m "feat: add Vitest + Testing Library test setup"
```

---

## Task 2: TypeScript types for bloodwork

**Files:**
- Create: `src/types/bloodwork.ts`
- Create: `src/test/types/bloodwork.test.ts`

**Step 1: Write the failing test**

Create `src/test/types/bloodwork.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { BloodMarker, LabResult, ParsedLabDoc } from '@/types/bloodwork'

describe('bloodwork types', () => {
  it('BloodMarker has required fields', () => {
    const marker: BloodMarker = {
      id: 'apob',
      name: 'ApoB',
      value: 85,
      unit: 'mg/dL',
      status: 'optimal',
      drawDate: '2026-03-01',
    }
    expect(marker.id).toBe('apob')
    expect(marker.status).toBe('optimal')
  })

  it('LabResult has markers array and drawDate', () => {
    const result: LabResult = {
      id: 'lab-2026-03-01',
      drawDate: '2026-03-01',
      institution: 'LabCorp',
      markers: [],
      createdAt: Date.now(),
    }
    expect(result.markers).toHaveLength(0)
  })

  it('ParsedLabDoc has confidence field per marker', () => {
    const doc: ParsedLabDoc = {
      markers: [{ name: 'ApoB', value: 85, unit: 'mg/dL', rawText: 'ApoB 85 mg/dL', confidence: 'high' }],
      drawDate: '2026-03-01',
      institution: 'LabCorp',
    }
    expect(doc.markers[0].confidence).toBe('high')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/types/bloodwork'"

**Step 3: Create the types file**

Create `src/types/bloodwork.ts`:
```ts
export type MarkerStatus = 'optimal' | 'acceptable' | 'attention'
export type Confidence = 'high' | 'low'

export interface BloodMarker {
  id: string
  name: string
  value: number
  unit: string
  status: MarkerStatus
  drawDate: string
  flagged?: boolean        // validation flag
  flagReason?: string      // why it was flagged
  confidence?: Confidence  // from Claude parse
  rawText?: string         // original text from document
}

export interface LabResult {
  id: string               // "lab-YYYY-MM-DD"
  drawDate: string
  institution: string
  markers: BloodMarker[]
  createdAt: number        // Date.now()
}

export interface ParsedMarker {
  name: string
  value: number
  unit: string
  rawText: string
  confidence: Confidence
}

export interface ParsedLabDoc {
  markers: ParsedMarker[]
  drawDate: string
  institution: string
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS — 3 tests

**Step 5: Commit**

```bash
git add src/types/bloodwork.ts src/test/types/bloodwork.test.ts
git commit -m "feat: add bloodwork TypeScript types"
```

---

## Task 3: Bloodwork marker definitions (no user data)

**Files:**
- Create: `src/data/bloodwork-metrics.ts`
- Create: `src/test/data/bloodwork-metrics.test.ts`

**Step 1: Write the failing test**

Create `src/test/data/bloodwork-metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { BLOODWORK_MARKERS, BLOODWORK_PANELS } from '@/data/bloodwork-metrics'

describe('bloodwork-metrics', () => {
  it('exports at least 20 core markers', () => {
    expect(BLOODWORK_MARKERS.length).toBeGreaterThanOrEqual(20)
  })

  it('every marker has id, name, unit, optimal, acceptable, panel', () => {
    BLOODWORK_MARKERS.forEach(m => {
      expect(m.id).toBeTruthy()
      expect(m.name).toBeTruthy()
      expect(m.unit).toBeTruthy()
      expect(m.optimal).toBeDefined()
      expect(m.acceptable).toBeDefined()
      expect(m.panel).toBeTruthy()
    })
  })

  it('HOMA-IR is marked as computed', () => {
    const homaIr = BLOODWORK_MARKERS.find(m => m.id === 'homa_ir')
    expect(homaIr?.computed).toBe(true)
  })

  it('panels list matches marker panels', () => {
    const markerPanels = new Set(BLOODWORK_MARKERS.map(m => m.panel))
    BLOODWORK_PANELS.forEach(p => expect(markerPanels.has(p)).toBe(true))
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/data/bloodwork-metrics'"

**Step 3: Create the marker definitions file**

Create `src/data/bloodwork-metrics.ts`:
```ts
export type BloodworkPanel = 'Lipids' | 'Metabolic' | 'CBC' | 'Hormones' | 'Micronutrients'

export interface MarkerDefinition {
  id: string
  name: string
  unit: string
  // [min, max] — null means no bound on that side
  optimal: [number | null, number | null]
  acceptable: [number | null, number | null]
  // Values outside these bounds trigger dashboard alert
  attentionThreshold: { low?: number; high?: number }
  panel: BloodworkPanel
  higherBetter: boolean | null  // null = within-range is best
  weight: number                // for lab score (1-10)
  computed?: boolean            // derived from other markers (e.g. HOMA-IR)
  alternateUnits?: string[]     // e.g. ['mmol/L']
  notes?: string
}

export const BLOODWORK_PANELS: BloodworkPanel[] = [
  'Lipids', 'Metabolic', 'CBC', 'Hormones', 'Micronutrients',
]

export const BLOODWORK_MARKERS: MarkerDefinition[] = [
  // ─── Lipids & Cardiovascular ───
  {
    id: 'apob', name: 'ApoB', unit: 'mg/dL',
    optimal: [null, 90], acceptable: [null, 110],
    attentionThreshold: { high: 120 },
    panel: 'Lipids', higherBetter: false, weight: 10,
    notes: 'Primary driver of atherosclerosis. Attia target <90 mg/dL.',
  },
  {
    id: 'ldl_c', name: 'LDL-C', unit: 'mg/dL',
    optimal: [null, 100], acceptable: [null, 130],
    attentionThreshold: { high: 160 },
    panel: 'Lipids', higherBetter: false, weight: 7,
  },
  {
    id: 'hdl_c', name: 'HDL-C', unit: 'mg/dL',
    optimal: [60, null], acceptable: [40, null],
    attentionThreshold: { low: 40 },
    panel: 'Lipids', higherBetter: true, weight: 6,
  },
  {
    id: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL',
    optimal: [null, 100], acceptable: [null, 150],
    attentionThreshold: { high: 200 },
    panel: 'Lipids', higherBetter: false, weight: 7,
  },
  {
    id: 'lpa', name: 'Lp(a)', unit: 'nmol/L',
    optimal: [null, 75], acceptable: [null, 100],
    attentionThreshold: { high: 125 },
    panel: 'Lipids', higherBetter: false, weight: 8,
    notes: 'Genetically determined. Elevated Lp(a) significantly increases cardiovascular risk.',
  },
  {
    id: 'hscrp', name: 'hsCRP', unit: 'mg/L',
    optimal: [null, 1.0], acceptable: [null, 3.0],
    attentionThreshold: { high: 3.0 },
    panel: 'Lipids', higherBetter: false, weight: 7,
  },

  // ─── Metabolic ───
  {
    id: 'fasting_glucose', name: 'Fasting Glucose', unit: 'mg/dL',
    optimal: [72, 85], acceptable: [70, 99],
    attentionThreshold: { high: 100, low: 60 },
    panel: 'Metabolic', higherBetter: null, weight: 9,
    alternateUnits: ['mmol/L'],
  },
  {
    id: 'fasting_insulin', name: 'Fasting Insulin', unit: 'µIU/mL',
    optimal: [2, 6], acceptable: [2, 10],
    attentionThreshold: { high: 10 },
    panel: 'Metabolic', higherBetter: false, weight: 8,
  },
  {
    id: 'hba1c', name: 'HbA1c', unit: '%',
    optimal: [null, 5.4], acceptable: [null, 5.6],
    attentionThreshold: { high: 5.7 },
    panel: 'Metabolic', higherBetter: false, weight: 9,
  },
  {
    id: 'homa_ir', name: 'HOMA-IR', unit: 'index',
    optimal: [null, 1.0], acceptable: [null, 1.9],
    attentionThreshold: { high: 2.0 },
    panel: 'Metabolic', higherBetter: false, weight: 8,
    computed: true,
    notes: 'Computed: (Fasting Glucose × Fasting Insulin) / 405',
  },
  {
    id: 'alt', name: 'ALT', unit: 'U/L',
    optimal: [null, 30], acceptable: [null, 40],
    attentionThreshold: { high: 40 },
    panel: 'Metabolic', higherBetter: false, weight: 5,
  },
  {
    id: 'ast', name: 'AST', unit: 'U/L',
    optimal: [null, 30], acceptable: [null, 40],
    attentionThreshold: { high: 40 },
    panel: 'Metabolic', higherBetter: false, weight: 5,
  },
  {
    id: 'ggt', name: 'GGT', unit: 'U/L',
    optimal: [null, 25], acceptable: [null, 40],
    attentionThreshold: { high: 40 },
    panel: 'Metabolic', higherBetter: false, weight: 4,
  },

  // ─── CBC ───
  {
    id: 'wbc', name: 'WBC', unit: 'K/µL',
    optimal: [4.0, 7.0], acceptable: [3.5, 10.5],
    attentionThreshold: { low: 3.5, high: 10.5 },
    panel: 'CBC', higherBetter: null, weight: 4,
  },
  {
    id: 'rbc', name: 'RBC', unit: 'M/µL',
    optimal: [4.5, 5.5], acceptable: [4.2, 5.8],
    attentionThreshold: { low: 4.0, high: 6.0 },
    panel: 'CBC', higherBetter: null, weight: 3,
  },
  {
    id: 'hemoglobin', name: 'Hemoglobin', unit: 'g/dL',
    optimal: [14, 17], acceptable: [13, 17.5],
    attentionThreshold: { low: 12, high: 18 },
    panel: 'CBC', higherBetter: null, weight: 4,
    notes: 'Ranges differ by sex. These are male defaults — adjust for female (12–15 optimal).',
  },
  {
    id: 'hematocrit', name: 'Hematocrit', unit: '%',
    optimal: [41, 52], acceptable: [38, 54],
    attentionThreshold: { low: 36, high: 56 },
    panel: 'CBC', higherBetter: null, weight: 3,
  },
  {
    id: 'platelets', name: 'Platelets', unit: 'K/µL',
    optimal: [150, 350], acceptable: [140, 400],
    attentionThreshold: { low: 100, high: 450 },
    panel: 'CBC', higherBetter: null, weight: 3,
  },

  // ─── Hormones ───
  {
    id: 'testosterone_total', name: 'Testosterone (Total)', unit: 'ng/dL',
    optimal: [600, 900], acceptable: [400, 1000],
    attentionThreshold: { low: 300 },
    panel: 'Hormones', higherBetter: true, weight: 6,
  },
  {
    id: 'testosterone_free', name: 'Free Testosterone', unit: 'pg/mL',
    optimal: [15, 25], acceptable: [9, 30],
    attentionThreshold: { low: 8 },
    panel: 'Hormones', higherBetter: true, weight: 5,
  },
  {
    id: 'dhea_s', name: 'DHEA-S', unit: 'µg/dL',
    optimal: [200, 400], acceptable: [100, 500],
    attentionThreshold: { low: 80 },
    panel: 'Hormones', higherBetter: null, weight: 4,
  },
  {
    id: 'cortisol', name: 'Cortisol (AM)', unit: 'µg/dL',
    optimal: [10, 18], acceptable: [6, 23],
    attentionThreshold: { low: 5, high: 25 },
    panel: 'Hormones', higherBetter: null, weight: 4,
  },
  {
    id: 'tsh', name: 'TSH', unit: 'mIU/L',
    optimal: [1.0, 2.5], acceptable: [0.5, 4.5],
    attentionThreshold: { low: 0.4, high: 5.0 },
    panel: 'Hormones', higherBetter: null, weight: 5,
  },

  // ─── Micronutrients & Other ───
  {
    id: 'vitamin_d', name: 'Vitamin D (25-OH)', unit: 'ng/mL',
    optimal: [60, 80], acceptable: [40, 100],
    attentionThreshold: { low: 30 },
    panel: 'Micronutrients', higherBetter: true, weight: 7,
  },
  {
    id: 'ferritin', name: 'Ferritin', unit: 'ng/mL',
    optimal: [50, 150], acceptable: [30, 250],
    attentionThreshold: { low: 20, high: 300 },
    panel: 'Micronutrients', higherBetter: null, weight: 5,
  },
  {
    id: 'homocysteine', name: 'Homocysteine', unit: 'µmol/L',
    optimal: [null, 8], acceptable: [null, 12],
    attentionThreshold: { high: 12 },
    panel: 'Micronutrients', higherBetter: false, weight: 6,
  },
  {
    id: 'uric_acid', name: 'Uric Acid', unit: 'mg/dL',
    optimal: [3.5, 5.5], acceptable: [2.5, 7.0],
    attentionThreshold: { high: 7.0 },
    panel: 'Micronutrients', higherBetter: null, weight: 4,
  },
]
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS — 4 tests

**Step 5: Commit**

```bash
git add src/data/bloodwork-metrics.ts src/test/data/bloodwork-metrics.test.ts
git commit -m "feat: add core bloodwork marker definitions (25 markers)"
```

---

## Task 4: localStorage utilities for bloodwork

**Files:**
- Create: `src/utils/lab-storage.ts`
- Create: `src/test/utils/lab-storage.test.ts`

**Step 1: Write the failing tests**

Create `src/test/utils/lab-storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveLabResult, getLabResults, getLabResult, deleteLabResult,
  getApiKey, setApiKey, clearApiKey,
} from '@/utils/lab-storage'
import type { LabResult } from '@/types/bloodwork'

const mockResult: LabResult = {
  id: 'lab-2026-03-01',
  drawDate: '2026-03-01',
  institution: 'LabCorp',
  markers: [],
  createdAt: 1234567890,
}

beforeEach(() => localStorage.clear())

describe('lab results', () => {
  it('saves and retrieves a lab result', () => {
    saveLabResult(mockResult)
    const results = getLabResults()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('lab-2026-03-01')
  })

  it('getLabResult returns single result by id', () => {
    saveLabResult(mockResult)
    const r = getLabResult('lab-2026-03-01')
    expect(r?.drawDate).toBe('2026-03-01')
  })

  it('returns null for missing id', () => {
    expect(getLabResult('missing')).toBeNull()
  })

  it('deletes a result', () => {
    saveLabResult(mockResult)
    deleteLabResult('lab-2026-03-01')
    expect(getLabResults()).toHaveLength(0)
  })

  it('does not overwrite existing results on save', () => {
    saveLabResult(mockResult)
    const second = { ...mockResult, id: 'lab-2026-02-01', drawDate: '2026-02-01' }
    saveLabResult(second)
    expect(getLabResults()).toHaveLength(2)
  })
})

describe('api key', () => {
  it('saves and retrieves api key', () => {
    setApiKey('sk-ant-test')
    expect(getApiKey()).toBe('sk-ant-test')
  })

  it('clears api key', () => {
    setApiKey('sk-ant-test')
    clearApiKey()
    expect(getApiKey()).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/utils/lab-storage'"

**Step 3: Create the storage utility**

Create `src/utils/lab-storage.ts`:
```ts
import type { LabResult } from '../types/bloodwork'

const KEYS = {
  LAB_RESULTS: 'healthspan:labResults',
  API_KEY: 'healthspan:apiKey',
} as const

// ─── Lab Results ───

export function getLabResults(): LabResult[] {
  try {
    const raw = localStorage.getItem(KEYS.LAB_RESULTS)
    return raw ? (JSON.parse(raw) as LabResult[]) : []
  } catch {
    return []
  }
}

export function getLabResult(id: string): LabResult | null {
  return getLabResults().find(r => r.id === id) ?? null
}

export function saveLabResult(result: LabResult): void {
  const results = getLabResults().filter(r => r.id !== result.id)
  results.push(result)
  // Sort by draw date descending
  results.sort((a, b) => b.drawDate.localeCompare(a.drawDate))
  localStorage.setItem(KEYS.LAB_RESULTS, JSON.stringify(results))
}

export function deleteLabResult(id: string): void {
  const results = getLabResults().filter(r => r.id !== id)
  localStorage.setItem(KEYS.LAB_RESULTS, JSON.stringify(results))
}

// ─── API Key ───

export function getApiKey(): string | null {
  return localStorage.getItem(KEYS.API_KEY)
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEYS.API_KEY, key)
}

export function clearApiKey(): void {
  localStorage.removeItem(KEYS.API_KEY)
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS — 7 tests

**Step 5: Commit**

```bash
git add src/utils/lab-storage.ts src/test/utils/lab-storage.test.ts
git commit -m "feat: add localStorage utilities for lab results and API key"
```

---

## Task 5: Lab validation utility

**Files:**
- Create: `src/utils/lab-validation.ts`
- Create: `src/test/utils/lab-validation.test.ts`

**Step 1: Write the failing tests**

Create `src/test/utils/lab-validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validateMarkerValue, computeMarkerStatus, computeHomaIr } from '@/utils/lab-validation'

describe('validateMarkerValue', () => {
  it('flags physiologically impossible glucose', () => {
    const result = validateMarkerValue('fasting_glucose', 4, 'mg/dL')
    expect(result.flagged).toBe(true)
    expect(result.flagReason).toContain('impossible')
  })

  it('flags impossibly high HbA1c', () => {
    const result = validateMarkerValue('hba1c', 45, '%')
    expect(result.flagged).toBe(true)
  })

  it('does not flag a normal ApoB', () => {
    const result = validateMarkerValue('apob', 85, 'mg/dL')
    expect(result.flagged).toBe(false)
  })

  it('flags a unit mismatch hint when value suggests wrong unit', () => {
    // ApoB in mmol/L would be ~0.5–2.5, not 85
    const result = validateMarkerValue('apob', 0.8, 'mg/dL')
    expect(result.flagged).toBe(true)
    expect(result.flagReason).toContain('unit')
  })
})

describe('computeMarkerStatus', () => {
  it('returns optimal when value is in optimal range', () => {
    expect(computeMarkerStatus('apob', 75)).toBe('optimal')
  })

  it('returns acceptable when value is outside optimal but inside acceptable', () => {
    expect(computeMarkerStatus('apob', 100)).toBe('acceptable')
  })

  it('returns attention when value exceeds attention threshold', () => {
    expect(computeMarkerStatus('apob', 130)).toBe('attention')
  })

  it('returns optimal for in-range glucose', () => {
    expect(computeMarkerStatus('fasting_glucose', 80)).toBe('optimal')
  })
})

describe('computeHomaIr', () => {
  it('computes HOMA-IR from glucose and insulin', () => {
    // (85 * 5) / 405 = 1.049...
    const result = computeHomaIr(85, 5)
    expect(result).toBeCloseTo(1.049, 2)
  })

  it('returns null if either value is missing', () => {
    expect(computeHomaIr(null, 5)).toBeNull()
    expect(computeHomaIr(85, null)).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/utils/lab-validation'"

**Step 3: Create the validation utility**

Create `src/utils/lab-validation.ts`:
```ts
import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'
import type { MarkerStatus } from '../types/bloodwork'

// Physiologically impossible bounds — values outside these are clearly errors
const IMPOSSIBLE_BOUNDS: Record<string, { min?: number; max?: number }> = {
  fasting_glucose: { min: 20, max: 600 },
  hba1c: { min: 2, max: 20 },
  apob: { min: 10, max: 400 },
  ldl_c: { min: 10, max: 500 },
  hdl_c: { min: 5, max: 200 },
  triglycerides: { min: 20, max: 2000 },
  fasting_insulin: { min: 0.5, max: 300 },
  alt: { min: 0, max: 5000 },
  ast: { min: 0, max: 5000 },
  tsh: { min: 0.01, max: 100 },
  vitamin_d: { min: 5, max: 250 },
  testosterone_total: { min: 5, max: 3000 },
}

// Values that strongly suggest a unit mismatch
// e.g. ApoB entered as mmol/L value but unit says mg/dL
const UNIT_MISMATCH_HINTS: Record<string, { suspectBelow?: number; suspectAbove?: number }> = {
  apob: { suspectBelow: 5 },          // real mg/dL values are 40-200+; <5 suggests mmol/L
  ldl_c: { suspectBelow: 10 },
  fasting_glucose: { suspectBelow: 15 }, // mmol/L values are 3.9-7; mg/dL are 70-120
  triglycerides: { suspectBelow: 10 },
  testosterone_total: { suspectBelow: 5 }, // ng/dL values are 300-900; nmol/L are ~10-30
}

interface ValidationResult {
  flagged: boolean
  flagReason?: string
}

export function validateMarkerValue(
  markerId: string,
  value: number,
  _unit: string
): ValidationResult {
  const impossible = IMPOSSIBLE_BOUNDS[markerId]
  if (impossible) {
    if (impossible.min !== undefined && value < impossible.min) {
      return { flagged: true, flagReason: `Value ${value} is physiologically impossible (below minimum ${impossible.min})` }
    }
    if (impossible.max !== undefined && value > impossible.max) {
      return { flagged: true, flagReason: `Value ${value} is physiologically impossible (above maximum ${impossible.max})` }
    }
  }

  const unitHint = UNIT_MISMATCH_HINTS[markerId]
  if (unitHint) {
    if (unitHint.suspectBelow !== undefined && value < unitHint.suspectBelow) {
      return { flagged: true, flagReason: `Value ${value} may indicate a unit mismatch — check units` }
    }
    if (unitHint.suspectAbove !== undefined && value > unitHint.suspectAbove) {
      return { flagged: true, flagReason: `Value ${value} may indicate a unit mismatch — check units` }
    }
  }

  return { flagged: false }
}

export function computeMarkerStatus(markerId: string, value: number): MarkerStatus {
  const def = BLOODWORK_MARKERS.find(m => m.id === markerId)
  if (!def) return 'acceptable'

  const [optLow, optHigh] = def.optimal
  const [accLow, accHigh] = def.acceptable
  const thresh = def.attentionThreshold

  // Check attention threshold first
  if (thresh.low !== undefined && value < thresh.low) return 'attention'
  if (thresh.high !== undefined && value > thresh.high) return 'attention'

  // Check optimal
  const inOptLow = optLow === null || value >= optLow
  const inOptHigh = optHigh === null || value <= optHigh
  if (inOptLow && inOptHigh) return 'optimal'

  // Check acceptable
  const inAccLow = accLow === null || value >= accLow
  const inAccHigh = accHigh === null || value <= accHigh
  if (inAccLow && inAccHigh) return 'acceptable'

  return 'attention'
}

export function computeHomaIr(
  glucose: number | null,
  insulin: number | null
): number | null {
  if (glucose === null || insulin === null) return null
  return (glucose * insulin) / 405
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS — all tests

**Step 5: Commit**

```bash
git add src/utils/lab-validation.ts src/test/utils/lab-validation.test.ts
git commit -m "feat: add lab validation utility (bounds checking, status computation)"
```

---

## Task 6: Claude Vision parser utility

**Files:**
- Create: `src/utils/claude-parser.ts`
- Create: `src/test/utils/claude-parser.test.ts`

**Step 1: Write the failing tests**

Create `src/test/utils/claude-parser.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { buildLabParserPrompt, parseClaudeResponse } from '@/utils/claude-parser'

describe('buildLabParserPrompt', () => {
  it('returns a non-empty system prompt', () => {
    const prompt = buildLabParserPrompt()
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt).toContain('JSON')
  })

  it('includes all known marker names', () => {
    const prompt = buildLabParserPrompt()
    expect(prompt).toContain('ApoB')
    expect(prompt).toContain('HbA1c')
    expect(prompt).toContain('Vitamin D')
  })
})

describe('parseClaudeResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      markers: [{ name: 'ApoB', value: 85, unit: 'mg/dL', rawText: 'ApoB 85', confidence: 'high' }],
      drawDate: '2026-03-01',
      institution: 'LabCorp',
    })
    const result = parseClaudeResponse(json)
    expect(result).not.toBeNull()
    expect(result!.markers).toHaveLength(1)
    expect(result!.markers[0].name).toBe('ApoB')
  })

  it('returns null for invalid JSON', () => {
    expect(parseClaudeResponse('not json')).toBeNull()
  })

  it('returns null if markers field is missing', () => {
    expect(parseClaudeResponse(JSON.stringify({ drawDate: '2026-03-01' }))).toBeNull()
  })

  it('extracts JSON from markdown code block if present', () => {
    const wrapped = '```json\n{"markers":[],"drawDate":"2026-03-01","institution":"Quest"}\n```'
    const result = parseClaudeResponse(wrapped)
    expect(result).not.toBeNull()
    expect(result!.drawDate).toBe('2026-03-01')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/utils/claude-parser'"

**Step 3: Create the parser utility**

Create `src/utils/claude-parser.ts`:
```ts
import Anthropic from '@anthropic-ai/sdk'
import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'
import type { ParsedLabDoc } from '../types/bloodwork'

export function buildLabParserPrompt(): string {
  const markerList = BLOODWORK_MARKERS
    .filter(m => !m.computed)
    .map(m => `- ${m.name} (${m.unit})`)
    .join('\n')

  return `You are a medical lab report parser. Extract bloodwork marker values from the provided lab document image.

MARKERS TO EXTRACT (only these):
${markerList}

RESPONSE FORMAT — return ONLY valid JSON, no other text:
{
  "markers": [
    {
      "name": "exact marker name from list above",
      "value": <number>,
      "unit": "unit string as shown on document",
      "rawText": "exact text as it appears on the document",
      "confidence": "high" or "low"
    }
  ],
  "drawDate": "YYYY-MM-DD or empty string if not found",
  "institution": "lab name or empty string if not found"
}

RULES:
- Only include markers you can clearly identify. Do NOT guess.
- Set confidence "low" if the value is hard to read or you are uncertain.
- Do NOT include computed markers (HOMA-IR — this is calculated from other values).
- If a marker appears multiple times, use the most recent or clearly labeled value.
- Do not include reference ranges — only the patient's actual value.
- If you cannot find any markers, return { "markers": [], "drawDate": "", "institution": "" }`
}

export function parseClaudeResponse(text: string): ParsedLabDoc | null {
  try {
    // Strip markdown code block if present
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed.markers)) return null
    return parsed as ParsedLabDoc
  } catch {
    return null
  }
}

export async function parseLabDocument(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  apiKey: string
): Promise<ParsedLabDoc> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: buildLabParserPrompt(),
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const parsed = parseClaudeResponse(textBlock.text)
  if (!parsed) {
    throw new Error('Claude returned invalid JSON')
  }

  return parsed
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS — all tests

**Step 5: Commit**

```bash
git add src/utils/claude-parser.ts src/test/utils/claude-parser.test.ts
git commit -m "feat: add Claude Vision lab parser utility"
```

---

## Task 7: Oura data migration to localStorage

**Files:**
- Create: `src/utils/oura-storage.ts`
- Modify: `src/pages/Dashboard.tsx` (replace static import with localStorage read)
- Create: `src/test/utils/oura-storage.test.ts`

**Step 1: Write the failing tests**

Create `src/test/utils/oura-storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { getOuraData, saveOuraData, hasOuraData } from '@/utils/oura-storage'

beforeEach(() => localStorage.clear())

describe('oura-storage', () => {
  it('returns null when no data is stored', () => {
    expect(getOuraData()).toBeNull()
  })

  it('hasOuraData returns false when empty', () => {
    expect(hasOuraData()).toBe(false)
  })

  it('saves and retrieves oura data', () => {
    const mockData = { sleep: [{ day: '2026-03-01', score: 85 }] }
    saveOuraData(mockData as any)
    const result = getOuraData()
    expect(result).not.toBeNull()
    expect(result!.sleep[0].day).toBe('2026-03-01')
  })

  it('hasOuraData returns true after save', () => {
    saveOuraData({ sleep: [], sleepDetail: [], activity: [], readiness: [], spo2: [], stress: [], cvAge: [], workouts: [], resilience: [], sleeptime: [] })
    expect(hasOuraData()).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test
```
Expected: FAIL

**Step 3: Create the Oura storage utility**

Create `src/utils/oura-storage.ts`:
```ts
import type { OuraData } from '../types'

const KEY = 'healthspan:ouraData'

export function getOuraData(): OuraData | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as OuraData) : null
  } catch {
    return null
  }
}

export function saveOuraData(data: OuraData): void {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function hasOuraData(): boolean {
  return localStorage.getItem(KEY) !== null
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```
Expected: PASS

**Step 5: Update Dashboard.tsx to use localStorage**

In `src/pages/Dashboard.tsx`, replace:
```ts
import ouraData from '../data/oura-data'
```
With:
```ts
import { getOuraData } from '../utils/oura-storage'
```

At the top of the `Dashboard` component, replace the direct use of `ouraData` with:
```ts
const ouraData = useMemo(() => getOuraData(), [])
```

Then add a guard — if `ouraData` is null, show an import prompt:
```tsx
if (!ouraData) {
  return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      <div className="text-center space-y-3">
        <p className="text-lg font-medium text-gray-200">No Oura data found</p>
        <p className="text-sm">Go to <a href="#/settings" className="text-brand-400 underline">Settings</a> to import your Oura export.</p>
      </div>
    </div>
  )
}
```

**Step 6: Run the app to verify it still works**

```bash
npm run dev
```
Open browser — you should see the "No Oura data found" message (data isn't in localStorage yet). This is correct — we'll add the import UI in Settings.

**Step 7: Commit**

```bash
git add src/utils/oura-storage.ts src/test/utils/oura-storage.test.ts src/pages/Dashboard.tsx
git commit -m "feat: migrate Oura data from static import to localStorage"
```

---

## Task 8: Settings page

**Files:**
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx` (add `/settings` route)
- Modify: `src/components/Layout.tsx` (add Settings nav item)

**Step 1: Create Settings.tsx**

Create `src/pages/Settings.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Key, Upload, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { getApiKey, setApiKey, clearApiKey } from '../utils/lab-storage'
import { saveOuraData, hasOuraData } from '../utils/oura-storage'
import type { OuraData } from '../types'

export default function Settings() {
  const [apiKey, setApiKeyState] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [ouraImported, setOuraImported] = useState(false)
  const [ouraError, setOuraError] = useState('')

  useEffect(() => {
    const existing = getApiKey()
    if (existing) setApiKeyState(existing)
    setOuraImported(hasOuraData())
  }, [])

  function handleSaveKey() {
    if (!apiKey.startsWith('sk-ant-')) {
      alert('Key should start with sk-ant- — double-check you copied it correctly.')
      return
    }
    setApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClearKey() {
    clearApiKey()
    setApiKeyState('')
  }

  function handleOuraImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOuraError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string) as OuraData
        if (!json.sleep || !json.activity) throw new Error('Invalid Oura export format')
        saveOuraData(json)
        setOuraImported(true)
      } catch {
        setOuraError('Invalid file — make sure you export from Oura and use the JSON format.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon size={22} className="text-brand-400" />
        <h1 className="text-xl font-bold text-gray-100">Settings</h1>
      </div>

      {/* ─── API Key Section ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Anthropic API Key</h2>
        </div>

        <p className="text-sm text-gray-400 mb-5">
          Required for parsing lab documents with Claude Vision. Your key is stored only in your browser and never sent anywhere except Anthropic's API.
        </p>

        {/* Step-by-step instructions */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">How to get your API key</p>
          {[
            'Go to console.anthropic.com and sign in (or create a free account)',
            'Click "API Keys" in the left sidebar',
            'Click "Create Key" and give it a name like "Healthspan App"',
            'Copy the key — it starts with sk-ant-...',
            'Paste it below and click Save',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKeyState(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/50 pr-10"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleSaveKey}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          {apiKey && (
            <button
              onClick={handleClearKey}
              className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 text-sm rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* ─── Oura Data Import Section ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Oura Ring Data</h2>
          {ouraImported && <CheckCircle size={14} className="text-emerald-400 ml-auto" />}
        </div>

        <p className="text-sm text-gray-400 mb-5">
          Import your Oura Ring data export. This data is stored locally in your browser only.
        </p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">How to export Oura data</p>
          {[
            'Go to membership.ouraring.com/data-export',
            'Select JSON format and your date range',
            'Download the export file',
            'Upload it below',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {ouraImported && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 mb-4">
            <CheckCircle size={14} />
            Oura data imported successfully
          </div>
        )}

        {ouraError && (
          <div className="flex items-center gap-2 text-sm text-red-400 mb-4">
            <AlertCircle size={14} />
            {ouraError}
          </div>
        )}

        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm rounded-xl cursor-pointer transition-colors">
          <Upload size={14} />
          {ouraImported ? 'Replace Oura Data' : 'Import Oura JSON'}
          <input type="file" accept=".json" onChange={handleOuraImport} className="hidden" />
        </label>
      </section>
    </div>
  )
}
```

**Step 2: Add route to App.tsx**

In `src/App.tsx`, add import and route:
```tsx
import Settings from './pages/Settings'
// ...
<Route path="/settings" element={<Settings />} />
```

**Step 3: Add Settings to Layout nav**

In `src/components/Layout.tsx`, import `Settings` icon from lucide-react and add to `NAV_ITEMS`:
```ts
import { ..., Settings } from 'lucide-react'

// Add to NAV_ITEMS, at the bottom:
{ to: '/settings', icon: Settings, label: 'Settings', active: true },
```

**Step 4: Run the app and verify**

```bash
npm run dev
```
- Settings page loads at `/#/settings`
- API key input shows/hides
- Save confirms with "✓ Saved"
- Oura import accepts `.json` file

**Step 5: Commit**

```bash
git add src/pages/Settings.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat: add Settings page with API key setup and Oura data import"
```

---

## Task 9: UploadZone component

**Files:**
- Create: `src/components/UploadZone.tsx`

**Step 1: Create UploadZone.tsx**

Create `src/components/UploadZone.tsx`:
```tsx
import { useState, useRef } from 'react'
import { Upload, FileImage, Loader2, ShieldCheck } from 'lucide-react'

interface UploadZoneProps {
  onFile: (base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') => void
  loading?: boolean
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function UploadZone({ onFile, loading = false }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function processFile(file: File) {
    setError('')
    if (!ACCEPTED.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image of your lab document.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // Strip data URL prefix: "data:image/jpeg;base64,..."
      const base64 = result.split(',')[1]
      onFile(base64, file.type as 'image/jpeg' | 'image/png' | 'image/webp')
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-[18px] p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          dragging
            ? 'border-brand-400 bg-brand-500/10'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
        } ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {loading ? (
          <>
            <Loader2 size={32} className="text-brand-400 animate-spin" />
            <p className="text-sm text-gray-400">Parsing with Claude Vision…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <FileImage size={22} className="text-brand-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300">Drop your lab document here</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse — JPG, PNG, WebP</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
              <Upload size={11} />
              PDF support coming soon
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 text-xs text-gray-600 px-1">
        <ShieldCheck size={12} className="flex-shrink-0 mt-0.5 text-gray-500" />
        <span>
          Your document is sent only to Anthropic's API for parsing. It is never stored on any server.
        </span>
      </div>

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat: add UploadZone component with drag/drop and privacy notice"
```

---

## Task 10: VerificationTable component

**Files:**
- Create: `src/components/VerificationTable.tsx`

**Step 1: Create VerificationTable.tsx**

Create `src/components/VerificationTable.tsx`:
```tsx
import { useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import type { ParsedMarker } from '../types/bloodwork'
import { validateMarkerValue } from '../utils/lab-validation'
import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'

interface VerificationRow {
  parsed: ParsedMarker
  editedValue: string
  editedUnit: string
  validation: { flagged: boolean; flagReason?: string }
}

interface VerificationTableProps {
  markers: ParsedMarker[]
  drawDate: string
  institution: string
  onConfirm: (rows: VerificationRow[]) => void
  onCancel: () => void
}

export default function VerificationTable({
  markers, drawDate, institution, onConfirm, onCancel
}: VerificationTableProps) {
  const [rows, setRows] = useState<VerificationRow[]>(() =>
    markers.map(m => {
      const markerId = BLOODWORK_MARKERS.find(
        def => def.name.toLowerCase() === m.name.toLowerCase()
      )?.id ?? m.name.toLowerCase().replace(/\s+/g, '_')
      return {
        parsed: m,
        editedValue: String(m.value),
        editedUnit: m.unit,
        validation: validateMarkerValue(markerId, m.value, m.unit),
      }
    })
  )

  function updateRow(index: number, value: string, unit: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r
      const markerId = BLOODWORK_MARKERS.find(
        def => def.name.toLowerCase() === r.parsed.name.toLowerCase()
      )?.id ?? r.parsed.name.toLowerCase().replace(/\s+/g, '_')
      const numVal = parseFloat(value)
      return {
        ...r,
        editedValue: value,
        editedUnit: unit,
        validation: isNaN(numVal)
          ? { flagged: true, flagReason: 'Enter a valid number' }
          : validateMarkerValue(markerId, numVal, unit),
      }
    }))
  }

  const flaggedCount = rows.filter(r => r.validation.flagged || r.parsed.confidence === 'low').length
  const notFound = BLOODWORK_MARKERS.filter(def =>
    !def.computed && !markers.some(m => m.name.toLowerCase() === def.name.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-100">Review Parsed Results</h2>
          <p className="text-xs text-gray-500 mt-0.5">{institution} · {drawDate}</p>
        </div>
        {flaggedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-1.5">
            <AlertTriangle size={12} />
            {flaggedCount} item{flaggedCount > 1 ? 's' : ''} need review
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.03]">
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Marker</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Value</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Unit</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Raw Text</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, i) => {
              const needsReview = row.validation.flagged || row.parsed.confidence === 'low'
              return (
                <tr key={i} className={needsReview ? 'bg-amber-400/5' : ''}>
                  <td className="px-4 py-3 text-gray-300 font-medium">{row.parsed.name}</td>
                  <td className="px-4 py-3">
                    <input
                      value={row.editedValue}
                      onChange={e => updateRow(i, e.target.value, row.editedUnit)}
                      className="w-24 bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-gray-200 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.editedUnit}
                      onChange={e => updateRow(i, row.editedValue, e.target.value)}
                      className="w-20 bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-gray-400 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={row.parsed.rawText}>
                    {row.parsed.rawText}
                  </td>
                  <td className="px-4 py-3">
                    {needsReview ? (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <AlertTriangle size={11} />
                        {row.parsed.confidence === 'low' ? 'Low confidence' : 'Check value'}
                      </div>
                    ) : (
                      <CheckCircle size={14} className="text-emerald-500" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Not found markers */}
      {notFound.length > 0 && (
        <div className="text-xs text-gray-600 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <p className="text-gray-500 font-medium mb-1">Not found in document ({notFound.length}):</p>
          <p className="text-gray-600">{notFound.map(m => m.name).join(', ')}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onConfirm(rows)}
          className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Confirm & Save
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 text-sm rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/VerificationTable.tsx
git commit -m "feat: add VerificationTable component for lab result review"
```

---

## Task 11: Bloodwork page

**Files:**
- Create: `src/pages/Bloodwork.tsx`
- Modify: `src/App.tsx` (activate `/bloodwork` route)
- Modify: `src/components/Layout.tsx` (activate Bloodwork nav item)

**Step 1: Create Bloodwork.tsx**

Create `src/pages/Bloodwork.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { TestTube, Plus, AlertTriangle, CheckCircle, Minus } from 'lucide-react'
import UploadZone from '../components/UploadZone'
import VerificationTable from '../components/VerificationTable'
import { parseLabDocument } from '../utils/claude-parser'
import { validateMarkerValue, computeMarkerStatus, computeHomaIr } from '../utils/lab-validation'
import { saveLabResult, getLabResults, getApiKey } from '../utils/lab-storage'
import { BLOODWORK_MARKERS, BLOODWORK_PANELS } from '../data/bloodwork-metrics'
import type { LabResult, BloodMarker, ParsedLabDoc } from '../types/bloodwork'
import { Link } from 'react-router-dom'

type View = 'list' | 'upload' | 'verify' | 'detail'

export default function Bloodwork() {
  const [view, setView] = useState<View>('list')
  const [results, setResults] = useState<LabResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsedDoc, setParsedDoc] = useState<ParsedLabDoc | null>(null)
  const apiKey = getApiKey()

  useEffect(() => {
    setResults(getLabResults())
  }, [])

  const selected = results.find(r => r.id === selectedId) ?? results[0] ?? null

  async function handleFile(base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') {
    if (!apiKey) {
      setParseError('No API key set. Go to Settings first.')
      return
    }
    setParsing(true)
    setParseError('')
    try {
      const doc = await parseLabDocument(base64, mimeType, apiKey)
      setParsedDoc(doc)
      setView('verify')
    } catch (e: any) {
      setParseError(e.message ?? 'Parsing failed. Try again.')
    } finally {
      setParsing(false)
    }
  }

  function handleConfirm(rows: any[]) {
    if (!parsedDoc) return
    const drawDate = parsedDoc.drawDate || new Date().toISOString().split('T')[0]
    const id = `lab-${drawDate}`

    // Build markers with status + validation
    const glucoseRow = rows.find(r => r.parsed.name.toLowerCase().includes('glucose'))
    const insulinRow = rows.find(r => r.parsed.name.toLowerCase().includes('insulin'))
    const homaIrValue = computeHomaIr(
      glucoseRow ? parseFloat(glucoseRow.editedValue) : null,
      insulinRow ? parseFloat(insulinRow.editedValue) : null,
    )

    const markers: BloodMarker[] = rows
      .filter(r => !isNaN(parseFloat(r.editedValue)))
      .map(r => {
        const def = BLOODWORK_MARKERS.find(d => d.name.toLowerCase() === r.parsed.name.toLowerCase())
        const markerId = def?.id ?? r.parsed.name.toLowerCase().replace(/\s+/g, '_')
        const value = parseFloat(r.editedValue)
        const validation = validateMarkerValue(markerId, value, r.editedUnit)
        return {
          id: markerId,
          name: r.parsed.name,
          value,
          unit: r.editedUnit,
          status: computeMarkerStatus(markerId, value),
          drawDate,
          flagged: validation.flagged,
          flagReason: validation.flagReason,
          rawText: r.parsed.rawText,
          confidence: r.parsed.confidence,
        }
      })

    // Add computed HOMA-IR if we have the inputs
    if (homaIrValue !== null) {
      markers.push({
        id: 'homa_ir',
        name: 'HOMA-IR',
        value: parseFloat(homaIrValue.toFixed(2)),
        unit: 'index',
        status: computeMarkerStatus('homa_ir', homaIrValue),
        drawDate,
      })
    }

    const result: LabResult = {
      id,
      drawDate,
      institution: parsedDoc.institution || 'Unknown',
      markers,
      createdAt: Date.now(),
    }

    saveLabResult(result)
    setResults(getLabResults())
    setSelectedId(id)
    setView('detail')
    setParsedDoc(null)
  }

  // ─── Lab Score ───
  function labScore(result: LabResult): number {
    if (!result.markers.length) return 0
    let weighted = 0, totalWeight = 0
    result.markers.forEach(m => {
      const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
      const w = def?.weight ?? 3
      const score = m.status === 'optimal' ? 100 : m.status === 'acceptable' ? 65 : 20
      weighted += score * w
      totalWeight += w
    })
    return Math.round(weighted / totalWeight)
  }

  // ─── No API Key Banner ───
  if (!apiKey && view === 'upload') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-[18px] p-6 text-center space-y-3">
          <AlertTriangle size={22} className="text-amber-400 mx-auto" />
          <p className="text-sm text-amber-300 font-medium">API key required to parse lab documents</p>
          <Link to="/settings" className="inline-block text-xs text-brand-400 underline">Go to Settings to add your key →</Link>
        </div>
      </div>
    )
  }

  // ─── Upload View ───
  if (view === 'upload') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-gray-100">Upload Lab Results</h1>
          <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-300">← Back</button>
        </div>
        <UploadZone onFile={handleFile} loading={parsing} />
        {parseError && (
          <p className="text-xs text-red-400 mt-3">{parseError}</p>
        )}
      </div>
    )
  }

  // ─── Verify View ───
  if (view === 'verify' && parsedDoc) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <VerificationTable
          markers={parsedDoc.markers}
          drawDate={parsedDoc.drawDate}
          institution={parsedDoc.institution}
          onConfirm={handleConfirm}
          onCancel={() => setView('upload')}
        />
      </div>
    )
  }

  // ─── Detail / List View ───
  const displayResult = results.find(r => r.id === selectedId) ?? results[0]
  const score = displayResult ? labScore(displayResult) : null
  const scoreColor = score === null ? '#64748b' : score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  const statusCounts = displayResult ? {
    optimal: displayResult.markers.filter(m => m.status === 'optimal').length,
    acceptable: displayResult.markers.filter(m => m.status === 'acceptable').length,
    attention: displayResult.markers.filter(m => m.status === 'attention').length,
  } : null

  const attentionMarkers = displayResult?.markers.filter(m => m.status === 'attention') ?? []

  const statusBadge = (status: string) => {
    const styles = {
      optimal: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
      acceptable: 'bg-amber-400/15 text-amber-400 border-amber-400/20',
      attention: 'bg-red-400/15 text-red-400 border-red-400/20',
    }[status] ?? 'bg-white/10 text-gray-400 border-white/10'
    return `text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${styles}`
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TestTube size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-gray-100">Lab Results</h1>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 1 && (
            <select
              value={selectedId ?? ''}
              onChange={e => setSelectedId(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              {results.map(r => (
                <option key={r.id} value={r.id}>{r.drawDate} — {r.institution}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setView('upload')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={14} />
            Upload Labs
          </button>
        </div>
      </div>

      {!displayResult ? (
        <div className="text-center py-20 text-gray-500 space-y-2">
          <TestTube size={32} className="mx-auto opacity-30" />
          <p className="text-sm">No lab results yet</p>
          <button onClick={() => setView('upload')} className="text-xs text-brand-400 underline">Upload your first lab document →</button>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Lab Score', value: score, color: scoreColor, unit: '/100' },
              { label: 'Optimal', value: statusCounts?.optimal, color: '#10b981', unit: 'markers' },
              { label: 'Acceptable', value: statusCounts?.acceptable, color: '#f59e0b', unit: 'markers' },
              { label: 'Attention', value: statusCounts?.attention, color: '#ef4444', unit: 'markers' },
            ].map(card => (
              <div key={card.label} className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono" style={{ color: card.color }}>{card.value ?? '—'}</span>
                  <span className="text-xs text-gray-600">{card.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action items */}
          {attentionMarkers.length > 0 && (
            <div className="bg-red-400/[0.07] border border-red-400/20 rounded-[18px] p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-red-400" />
                <h2 className="text-sm font-semibold text-red-300">Action Items</h2>
              </div>
              <div className="space-y-2">
                {attentionMarkers.map(m => {
                  const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
                  return (
                    <div key={m.id} className="text-xs text-red-300/80">
                      <span className="font-medium">{m.name}</span> ({m.value} {m.unit})
                      {def?.attentionThreshold.high && m.value > def.attentionThreshold.high
                        ? ` is above the attention threshold of ${def.attentionThreshold.high} ${m.unit}`
                        : def?.attentionThreshold.low && m.value < def.attentionThreshold.low
                        ? ` is below the attention threshold of ${def.attentionThreshold.low} ${m.unit}`
                        : ' is outside optimal range'}
                      {' '}— consider discussing with your clinician.
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-red-400/50 mt-3">This is not medical advice. Always consult a qualified clinician.</p>
            </div>
          )}

          {/* Panel breakdown */}
          {BLOODWORK_PANELS.map(panel => {
            const panelMarkers = displayResult.markers.filter(m => {
              const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
              return def?.panel === panel
            })
            if (!panelMarkers.length) return null
            const sorted = [...panelMarkers].sort((a, b) =>
              a.status === 'attention' ? -1 : b.status === 'attention' ? 1 : 0
            )
            return (
              <div key={panel} className="mb-4 bg-white/[0.03] border border-white/[0.07] rounded-[18px] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{panel}</h3>
                  <span className="text-xs text-gray-600">{panelMarkers.length} markers</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {sorted.map(m => {
                    const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
                    const [optLow, optHigh] = def?.optimal ?? [null, null]
                    const rangeStr = optLow !== null && optHigh !== null
                      ? `${optLow}–${optHigh} ${m.unit}`
                      : optHigh !== null ? `<${optHigh} ${m.unit}`
                      : optLow !== null ? `>${optLow} ${m.unit}` : '—'
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-300 font-medium">{m.name}</div>
                          <div className="text-xs text-gray-600 mt-0.5">Optimal: {rangeStr}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-gray-200">{m.value} <span className="text-xs text-gray-500 font-sans">{m.unit}</span></div>
                        </div>
                        <span className={statusBadge(m.status)}>{m.status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
```

**Step 2: Activate route in App.tsx**

In `src/App.tsx`:
```tsx
import Bloodwork from './pages/Bloodwork'
// ...
<Route path="/bloodwork" element={<Bloodwork />} />
```

**Step 3: Activate Bloodwork nav in Layout.tsx**

In `src/components/Layout.tsx`, find the Bloodwork nav item and set `active: true`:
```ts
{ to: '/bloodwork', icon: TestTube, label: 'Bloodwork', active: true },
```

**Step 4: Run the app and verify**

```bash
npm run dev
```
- Bloodwork page loads at `/#/bloodwork`
- "Upload Labs" button opens the upload view
- Uploading a lab image triggers Claude Vision (if API key set)
- Verification table shows parsed markers
- Confirming saves to localStorage and shows the detail view

**Step 5: Commit**

```bash
git add src/pages/Bloodwork.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat: add Bloodwork page with upload, verify, and panel breakdown"
```

---

## Task 12: Dashboard integration — Lab Status card + alert banner

**Files:**
- Modify: `src/pages/Dashboard.tsx`

**Step 1: Add lab status to the Overview tab**

In `src/pages/Dashboard.tsx`, at the top add:
```tsx
import { getLabResults } from '../utils/lab-storage'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
```

At the top of the `Dashboard` component body, add:
```tsx
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
```

In the **Overview tab** render function, find the stat cards section and add a Lab Status card:
```tsx
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
```

At the **very top of the Dashboard return** (before the tab bar), add the alert banner:
```tsx
{latestLab && labStatus && labStatus.count > 0 && (
  <div className="mx-6 mt-6 flex items-center gap-3 bg-red-400/[0.08] border border-red-400/20 rounded-[14px] px-5 py-3">
    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
    <p className="text-sm text-red-300 flex-1">
      {labStatus.count} lab marker{labStatus.count > 1 ? 's' : ''} need{labStatus.count === 1 ? 's' : ''} attention
    </p>
    <Link to="/bloodwork" className="text-xs text-red-400 hover:text-red-300 underline">View labs →</Link>
  </div>
)}
```

**Step 2: Run and verify**

```bash
npm run dev
```
- If lab results exist in localStorage with attention markers, red banner appears on dashboard
- Overview tab shows Lab Status card
- Clicking either links to `/bloodwork`

**Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add lab status card and alert banner to dashboard"
```

---

## Task 13: Final check and push

**Step 1: Run all tests**

```bash
npm test
```
Expected: All tests pass

**Step 2: Build to verify no TypeScript errors**

```bash
npm run build
```
Expected: Build succeeds with no errors

**Step 3: Push to GitHub**

```bash
git push origin main
```

**Step 4: Smoke test the full flow**

1. Open `npm run dev`
2. Go to Settings → add an Anthropic API key → verify it saves
3. Go to Settings → import an Oura JSON export → verify dashboard loads data
4. Go to Bloodwork → upload a lab document photo → verify parsing runs
5. Review the verification table → confirm → verify markers appear in panel breakdown
6. Go to Dashboard → verify Lab Status card appears and alert banner shows if any attention markers

---

## Summary

| Task | What it builds |
|---|---|
| 1 | Vitest + Testing Library setup |
| 2 | TypeScript types (`BloodMarker`, `LabResult`, `ParsedLabDoc`) |
| 3 | 25 core marker definitions with longevity-calibrated ranges |
| 4 | localStorage utilities (lab results + API key) |
| 5 | Validation utility (bounds checking, status computation, HOMA-IR) |
| 6 | Claude Vision parser (prompt builder, response parser, API call) |
| 7 | Oura data migration to localStorage |
| 8 | Settings page (API key setup + Oura import with step-by-step instructions) |
| 9 | UploadZone component (drag/drop, privacy notice) |
| 10 | VerificationTable component (editable, flagging, not-found list) |
| 11 | Bloodwork page (upload → verify → detail, panel breakdown, action items) |
| 12 | Dashboard integration (Lab Status card + attention alert banner) |
| 13 | Final tests, build, push |
