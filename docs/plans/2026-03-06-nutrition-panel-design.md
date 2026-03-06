# Nutrition Panel Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** Build a Nutrition tracking panel with per-meal macro logging, Attia longevity protein targets, and daily macro compliance tracking.

**Architecture:** Mirror Exercise/Sleep/Emotional pattern — localStorage-backed flat meal entries, 5-tab page, Dashboard card. Manual-only source. Per-meal logging with computed daily totals. User-configurable protein and calorie targets.

**Tech Stack:** React 18, TypeScript, Recharts, Vitest

---

## Data Model

```typescript
export type NutritionSource = 'manual'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface NutritionEntry {
  id: string
  source: NutritionSource
  date: string                    // YYYY-MM-DD
  mealType: MealType
  mealName?: string               // e.g. "Grilled chicken salad"

  // Macros
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  fiberG?: number

  createdAt: number
}

export interface NutritionSettings {
  bodyweightLbs: number           // for protein target: 1g/lb
  dailyCalorieTarget: number      // user-set goal
}

export const DEFAULT_NUTRITION_SETTINGS: NutritionSettings = {
  bodyweightLbs: 170,
  dailyCalorieTarget: 2200,
}
```

Multiple entries per day (one per meal). Daily totals computed by aggregating all meals for a date.

## Targets (Attia Longevity Framework)

| Metric | Green | Amber | Direction | Note |
|--------|-------|-------|-----------|------|
| Protein | >= 1g/lb bodyweight | >= 0.7g/lb | higher is better | Dynamic based on settings |
| Calories | within ±10% of target | within ±20% | closer is better | Dynamic based on settings |
| Fiber | >= 30g | >= 20g | higher is better | Fixed target |

Protein and calorie targets are user-configurable via NutritionSettings. The status function needs to accept the settings to compute dynamic thresholds.

## Storage

### Entries (localStorage)
- Key: `healthspan:nutrition:entries`
- Value: `NutritionEntry[]` (flat array of meals)
- Functions: `getNutritionEntries(filters?)`, `saveNutritionEntry(entry)`, `deleteNutritionEntry(id)`, `getEntriesByDate(date)`, `getDailyTotals(date)`
- No upsert-by-date (multiple meals per day allowed)

### Settings (localStorage)
- Key: `healthspan:nutrition:settings`
- Value: `NutritionSettings`
- Functions: `getNutritionSettings()`, `saveNutritionSettings(settings)`

### Aggregation
`getDailyTotals(date)` returns `{ calories, proteinG, carbsG, fatG, fiberG }` by summing all meals for the date.

## Page Structure (5 Tabs)

### Overview
- Today's meal log — list of logged meals with macros per meal, add meal button
- Daily macro summary with progress bars (calories/protein/carbs/fat/fiber vs targets)
- Protein compliance card (7-day avg vs 1g/lb target, green/amber/red)
- Calorie trend area chart (last 30 days with target reference line)

### Trends
- Daily calorie line chart (30 days) with target reference
- Protein intake line chart (30 days) with target reference
- Macro breakdown stacked bar chart (protein/carbs/fat by day)
- Fiber trend line (30 days) with 30g target reference

### Analysis
- Macro ratio pie/donut (avg protein/carbs/fat percentage split)
- Meal timing patterns (which meal type contributes most calories)
- Protein consistency (standard deviation over 30 days)
- Best/worst compliance days

### Insights
- Attia nutrition target table (protein per bodyweight, calories, fiber)
- Per-metric recommendations when amber/red
- Disclaimer about individual variation

### Sources
- Meal entry form: date, meal type dropdown, meal name, calories, protein, carbs, fat, fiber inputs
- Meal history list with edit/delete
- Nutrition settings: bodyweight (lbs) and daily calorie target inputs
- Future placeholder: MFP/Cronometer CSV import (disabled)

## Dashboard Integration

Status card after Emotional card on Dashboard Overview:
- Shows 7-day avg protein compliance (g vs target)
- Status label: "On Track" (green), "Building" (amber), "Below Target" (red)
- Sub-text: protein avg and calorie avg
- Links to `/nutrition`

## File Structure

```
src/
  types/
    nutrition.ts                  # NutritionEntry, NutritionSettings, MealType
    nutrition.test.ts             # Type tests
  data/
    nutrition-targets.ts          # NUTRITION_TARGETS, getNutritionStatus
    nutrition-targets.test.ts     # Target tests
  utils/
    nutrition-storage.ts          # localStorage CRUD, getDailyTotals, settings
    nutrition-storage.test.ts     # Storage tests
  pages/
    Nutrition.tsx                 # Main 5-tab page
  App.tsx                         # Add /nutrition route
  components/
    Layout.tsx                    # Set nutrition active: true
  pages/
    Dashboard.tsx                 # Add Nutrition status card
```

## Future TODOs
- MyFitnessPal CSV import parser
- Cronometer CSV import parser
