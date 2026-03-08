# Demo Mode Design

## Problem

The app has no way to showcase its full capabilities without real user data. A demo data generator was just added but it only supports a single male/female athlete archetype, has no demo mode indicator, and no way to clear demo data.

## Goal

Build a persona-based demo mode system that lets users load realistic data profiles, see a clear "Demo Mode" indicator, switch between personas, and clear demo data — for both live demos and personal exploration.

## Approach: Persona-Based Demo Mode with localStorage Flag

### Persona System

Each persona is a config object with identity fields and trait modifiers:

```typescript
interface DemoPersona {
  id: string
  name: string
  description: string
  age: number
  sex: 'male' | 'female'
  traits: PersonaTraits
}

interface PersonaTraits {
  sleepScoreBase?: number
  readinessBase?: number
  activityBase?: number
  restingHr?: number
  hrv?: number
  bloodworkFlags?: Record<string, 'optimal' | 'acceptable' | 'attention'>
  workoutsPerWeek?: number
  zone2MinPerWeek?: number
  vo2max?: number
  totalSleepMin?: number
  deepMin?: number
  moodBase?: number
  stressBase?: number
  bodyweightLbs?: number
  dailyCalorieTarget?: number
  proteinPerLb?: number
  supplementCount?: number
}
```

Undefined traits fall back to current hardcoded defaults.

### Starting Personas (6 of 12)

| # | ID | Name | Age | Sex | Key Traits |
|---|-----|------|-----|-----|-----------|
| 1 | elite-athlete | Elite Athlete | 28 | M | RHR 44, HRV 110, VO2max 62, 6 workouts/wk, all bloodwork optimal |
| 2 | hypertension-risk | Hypertension Risk | 35 | M | Elevated hsCRP, borderline glucose/insulin, RHR 62, moderate exercise |
| 3 | college-athlete | College Athlete | 22 | F | Good fitness, inconsistent sleep/nutrition, high energy, 2 supplements |
| 4 | metabolic-syndrome | Metabolic Syndrome | 52 | M | Elevated glucose/HbA1c/triglycerides, low HDL, poor sleep, sedentary |
| 5 | postpartum-recovery | Postpartum Recovery | 34 | F | Low ferritin/vitamin D, fatigue, disrupted sleep, moderate mood |
| 6 | longevity-optimized | Longevity Optimized | 45 | F | All bloodwork optimal, full supplement stack, consistent sleep |

TODO: Expand to 12 personas (candidates: endurance cyclist, CrossFit competitor, shift worker, autoimmune, thyroid disorder, iron overload).

### Data Flow

- **Flag:** `healthspan:demoMode` stores active persona ID or is absent.
- **Load:** Clear all `healthspan:*` keys (except apiKey) -> set flag -> generate data -> reload.
- **Clear:** Clear all `healthspan:*` keys (except apiKey) -> remove flag -> reload.
- **Switch:** Same as load with new persona.

Utility functions in `demo-data.ts`:
- `getDemoMode(): string | null`
- `isDemoMode(): boolean`
- `clearDemoData(): void`

### UI Changes

**Dashboard Empty State:** Replace male/female buttons with persona card grid (2-3 columns). Each card shows name, description, age/sex badge. Click loads persona.

**Layout Banner:** When `isDemoMode()`, show a compact banner above page content:
- Left: "Demo Mode — {persona name}"
- Right: "Switch Persona" link + "Exit Demo" button
- Style: `bg-brand-500/10 border-b border-brand-500/20`, ~36px height

**Settings Page:** New "Demo Mode" section at bottom:
- In demo mode: current persona info, switch persona selector, red "Clear Demo Data" button
- Not in demo mode: "Load Demo Data" button

### Refactoring `demo-data.ts`

`generateAllDemoData(sex)` becomes `generateAllDemoData(persona)`. Each sub-generator receives traits and uses them as the center point for jitter, falling back to current defaults when a trait is undefined. Persona definitions live in `DEMO_PERSONAS` array exported from same file.
