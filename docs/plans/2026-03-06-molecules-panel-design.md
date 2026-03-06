# Molecules Panel Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** Build a Molecules tracking panel with stack definition, daily checklist logging, and adherence tracking for supplements and compounds.

**Architecture:** Stack + Daily Log pattern — define your supplement stack once (MoleculeDefinition), then check off daily intake (MoleculeEntry). localStorage-backed. 5-tab page. Dashboard card. Manual-only source.

**Tech Stack:** React 18, TypeScript, Recharts, Vitest

---

## Data Model

```typescript
export type MoleculeSource = 'manual'
export type MoleculeCategory = 'supplement' | 'compound' | 'vitamin' | 'mineral' | 'amino_acid'

// Stack definition — what you take
export interface MoleculeDefinition {
  id: string
  name: string                    // e.g. "Creatine Monohydrate"
  category: MoleculeCategory
  dosage: number                  // e.g. 5
  unit: string                    // e.g. "g", "mg", "IU", "mcg"
  frequency: 'daily'             // daily only for now
  active: boolean                // can deactivate without deleting
  createdAt: number
}

// Daily check-off record
export interface MoleculeEntry {
  id: string
  source: MoleculeSource
  date: string                   // YYYY-MM-DD
  moleculeId: string             // references MoleculeDefinition.id
  taken: boolean
  notes?: string
  createdAt: number
}
```

One MoleculeDefinition per supplement in your stack. One MoleculeEntry per molecule per day (created when you check it off). Adherence = entries with taken: true / total active molecules over a period.

No separate settings interface needed — the stack definitions themselves are the user configuration.

## Targets

| Metric | Green | Amber | Direction | Note |
|--------|-------|-------|-----------|------|
| Adherence | >= 90% | >= 70% | higher is better | 7-day rolling average |

Single metric: overall stack adherence percentage. No per-molecule targets.

## Storage

### Definitions (localStorage)
- Key: `healthspan:molecules:definitions`
- Value: `MoleculeDefinition[]`
- Functions: `getDefinitions()`, `saveDefinition(def)`, `deleteDefinition(id)`

### Entries (localStorage)
- Key: `healthspan:molecules:entries`
- Value: `MoleculeEntry[]`
- Functions: `getMoleculeEntries(filters?)`, `saveMoleculeEntry(entry)`, `deleteMoleculeEntry(id)`

### Aggregation
- `getDailyAdherence(date)` returns `{ taken: number, total: number, percentage: number }` by counting entries with `taken: true` vs total active definitions for the date.
- `getAdherenceRange(from, to)` returns daily adherence for a date range.

## Page Structure (5 Tabs)

### Overview
- Today's checklist — list of active molecules with checkboxes, check off what you took today
- Daily adherence percentage (e.g., "6/8 taken — 75%")
- 7-day adherence trend sparkline
- Quick-add button to log a molecule not in your stack

### Trends
- Daily adherence % line chart (30 days) with 90% target reference line
- Per-molecule adherence bar chart (which supplements you're most/least consistent with)
- Streak tracker — current consecutive days at 100% adherence

### Analysis
- Most consistent molecules (top 5 by adherence %)
- Least consistent molecules (bottom 5 — what you keep missing)
- Category breakdown (supplements vs vitamins vs minerals adherence)
- Monthly adherence heatmap or calendar view

### Insights
- Attia longevity protocol reference table (recommended supplements with evidence ratings)
- Per-molecule recommendations when adherence is low
- Disclaimer about consulting healthcare provider

### Sources
- Stack editor — add/edit/deactivate molecules (name, category, dosage, unit)
- Entry history list with date filter, edit/delete
- Future placeholder: import from supplement tracker apps (disabled)

## Dashboard Integration

Status card after Nutrition card on Dashboard Overview:
- Shows 7-day adherence %
- Status label: "On Track" (green >= 90%), "Building" (amber >= 70%), "Below Target" (red)
- Sub-text: "X/Y taken today" + adherence %
- Links to `/molecules`

## File Structure

```
src/
  types/
    molecules.ts                  # MoleculeDefinition, MoleculeEntry, MoleculeCategory
    molecules.test.ts             # Type tests
  data/
    molecules-targets.ts          # MOLECULES_TARGETS, getAdherenceStatus
    molecules-targets.test.ts     # Target tests
  utils/
    molecules-storage.ts          # localStorage CRUD, getDailyAdherence, getAdherenceRange
    molecules-storage.test.ts     # Storage tests
  pages/
    Molecules.tsx                 # Main 5-tab page
  App.tsx                         # Add /molecules route
  components/
    Layout.tsx                    # Set molecules active: true
  pages/
    Dashboard.tsx                 # Add Molecules status card
```

## Future TODOs
- Support non-daily frequencies (MWF, every other day)
- Import from supplement tracker apps
- Interaction warnings between molecules
