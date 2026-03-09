# Demo Actions Data — Design

**Goal:** Generate realistic, persona-specific daily action demo data so users can experience the actions feature with partially completed tasks, historical adherence patterns, and a mid-day "today" view.

**Architecture:** Extend the existing persona-trait system with `actionAdherence` and `extraActions` fields. The `generateDemoActions()` function uses these traits to create persona-specific action definitions and 90 days of completion entries. Domain-linked actions auto-complete via the existing engine; custom actions use probabilistic generation based on adherence rate.

---

## New Persona Traits

```typescript
actionAdherence: number           // 0-1, completion probability for custom actions
extraActions: DemoExtraAction[]   // persona-specific actions beyond core 6
```

```typescript
type DemoExtraAction = {
  label: string
  frequency: ActionFrequency
  domain?: ActionDefinition['domain']
  autoCompleteRule?: AutoCompleteRule
}
```

## Adherence Rates

| Persona | Rate | Rationale |
|---|---|---|
| elite-athlete | 0.95 | Near-perfect consistency |
| longevity-optimized | 0.92 | Protocol follower, occasional miss |
| college-athlete | 0.70 | Inconsistent, skips weekends |
| postpartum-recovery | 0.75 | Solid effort, disrupted by sleep deprivation |
| hypertension-risk | 0.55 | Desk worker, struggles with habits |
| metabolic-syndrome | 0.45 | Low follow-through, frequent gaps |

## Extra Actions by Persona

- **elite-athlete**: "Zone 2 cardio session" (3x/week), "Stretch/mobility" (daily)
- **longevity-optimized**: "Rapamycin protocol" (specific_days: Monday), "Sauna session" (3x/week)
- **college-athlete**: "Team practice" (weekdays), "Recovery ice bath" (2x/week)
- **postpartum-recovery**: "Pelvic floor exercises" (daily), "Walk with baby" (daily)
- **hypertension-risk**: "Walk 10,000 steps" (daily), "Blood pressure check" (weekdays)
- **metabolic-syndrome**: "Walk after meals" (daily), "Blood glucose check" (daily)

## Completion Entry Generation

For 90 days of history:

1. **Domain-linked actions** (workout, meals, sleep, mood, supplements): No entries generated — the auto-complete engine creates these on-the-fly from existing demo data.
2. **Custom actions** (hydrate + persona extras): Generate `DailyActionEntry` records where completion probability = `actionAdherence`, with modifiers:
   - College athlete: adherence drops ~20% on weekends
   - All personas: slight upward trend over 90 days (habit formation)
3. **`times_per_week` custom actions**: Track weekly completion count and stop generating completions once the weekly target is met.

## Today's Partial Completion

For "today" specifically, generate entries that simulate a mid-day snapshot:

- **Completed** (morning actions): sleep log, supplements, mood check-in
- **Incomplete** (afternoon/evening): workout, meals, hydrate, persona extras

This gives users an immediate sense of progress when they land on the dashboard.

## Integration

All changes are in `src/utils/demo-data.ts`:
- Add traits to `PersonaTraits` type and each persona definition
- Extend `generateDemoActions()` to use new traits
- No changes to actions-storage.ts, auto-complete engine, or UI components
