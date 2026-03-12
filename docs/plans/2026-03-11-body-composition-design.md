# Body Composition & BMI Tracking Design

## Goal

Track weight and body composition over time with BMI calculations, displayed as dashboard cards with both standard medical and longevity-focused health ranges. Unify weight as a single source of truth across the app.

## Data Model

```typescript
interface BodyCompEntry {
  id: string
  date: string           // YYYY-MM-DD
  weightKg: number       // required
  bodyFatPct?: number    // optional
  leanMassKg?: number    // auto-calculated from weightKg * (1 - bodyFatPct/100)
  waistCm?: number       // optional
  note?: string          // optional free-text
}
```

**Computed values** (derived, not stored):
- BMI = weightKg / (heightCm / 100)^2
- Lean mass = weightKg * (1 - bodyFatPct / 100)

**Storage:** `healthspan:bodycomp:entries` — JSON array in localStorage.

## Weight Unification

The latest `BodyCompEntry.weightKg` is the single source of truth for weight across the app.

- `getCurrentWeightKg()` checks body comp entries first (latest by date), falls back to profile `weightKg`
- Nutrition page reads from this instead of its own `bodyweightLbs` setting
- Profile weight from onboarding seeds the system if no body comp entries exist

## Health Ranges & Targets

### BMI (sex-independent)

| Category | Standard (WHO) | Longevity Optimal |
|----------|---------------|-------------------|
| Underweight | < 18.5 | — |
| Normal | 18.5–24.9 | 20–23 |
| Overweight | 25–29.9 | — |
| Obese | 30+ | — |

### Body Fat % (sex-dependent, uses reference range)

| Category | Male (Standard) | Male (Longevity) | Female (Standard) | Female (Longevity) |
|----------|----------------|-------------------|--------------------|--------------------|
| Essential | 2–5% | — | 10–13% | — |
| Athletic | 6–13% | — | 14–20% | — |
| Fitness | 14–17% | 10–15% | 21–24% | 18–23% |
| Acceptable | 18–24% | — | 25–31% | — |
| Excess | 25%+ | — | 32%+ | — |

Status colors: green (optimal/longevity), yellow (acceptable), red (attention).

## Dashboard Cards

Add a "Body" section to the Dashboard with:

- **Weight** — latest value, 7-day trend arrow, unit toggle lbs/kg
- **BMI** — computed from latest weight + profile height, color-coded with standard category label + longevity zone indicator
- **Body Fat %** — latest value if available, color-coded by range, "—" if no data
- **Lean Mass** — calculated from weight + body fat, shown in lbs/kg, "—" if no body fat data

## Entry Logging

Expandable inline form in the Dashboard body section:

- Weight (required) — number input with unit toggle
- Body Fat % (optional) — number input
- Waist (optional) — number input with unit toggle (cm/in)
- Note (optional) — text input
- Save button logs entry with today's date

## Demo Data

Each persona gets ~90 days of body comp entries with persona-appropriate values:

- Elite athlete: stable ~165 lbs, 8% body fat
- Hypertension risk: gradual upward trend ~220 lbs, 28% body fat
- College athlete: ~185 lbs with small fluctuations, 14% body fat
- Metabolic syndrome: ~245 lbs, 32% body fat
- Postpartum recovery: gradual downward trend ~155 lbs, 26% body fat
- Longevity optimized: stable ~170 lbs, 15% body fat

## Out of Scope (Future)

- Weight trend charts/graphs
- Goal setting (target weight, target body fat)
- Import from smart scales or wearables
- Waist-to-hip ratio or other derived body comp metrics

## Tech Stack

- React 18, TypeScript 5.6, Tailwind CSS 3.4
- localStorage with `healthspan:` key prefix
- Vitest + jsdom for testing
