# Emotional Check-In Redesign

## Goal

Replace the current 4-slider emotional entry form with a guided 5-question check-in flow using clinically-informed questions, and add a new `wellbeing` metric.

## 5-Question Check-In

Each question maps to a stored metric on a 1-5 scale:

| # | Question | Clinical Source | Metric | Direction |
|---|----------|----------------|--------|-----------|
| 1 | "Over the past day, how would you describe your overall mood?" | PHQ-2 (mood/interest) | `mood` | higher = better |
| 2 | "How much stress have you felt today?" | PSS (Perceived Stress Scale) | `stress` | lower = better |
| 3 | "How much anxiety or worry have you experienced?" | GAD-2 (nervousness/worry) | `anxiety` | lower = better |
| 4 | "How would you rate your energy level right now?" | PROMIS fatigue (inverted) | `energy` | higher = better |
| 5 | "How would you rate your overall sense of wellbeing?" | WHO-5 (general wellbeing) | `wellbeing` | higher = better |

### Scale Labels

**Higher-is-better (mood, energy, wellbeing):** 1=Very Poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent

**Lower-is-better (stress, anxiety):** 1=Minimal, 2=Mild, 3=Moderate, 4=High, 5=Severe

## UX Flow

One question at a time, step-through style. User taps a numbered button (1-5) to answer. Selecting a value automatically advances to the next question. Progress dots at the top show current position.

After question 5, show a summary screen with all 5 answers displayed. The summary includes:
- All 5 metrics with their labels and selected values
- Ability to tap any answer to go back and change it
- Optional journal text area
- Optional voice recording (existing audio functionality)
- Save button

## Data Model

Add `wellbeing` to `EmotionalEntry` in `src/types/emotional.ts`:

```typescript
wellbeing?: number  // 1=very poor, 5=excellent (WHO-5 adapted)
```

No other type changes. Existing `mood`, `stress`, `anxiety`, `energy` fields unchanged.

## Targets

Add wellbeing to `src/data/emotional-targets.ts`:
- Green (on-target): >= 4/5
- Amber (acceptable): >= 3/5
- Red (below target): < 3/5
- Higher is better (same as mood and energy)

## Integration Points

- **Sources tab** (Emotional page): Replace 4-slider form with 5-question stepper
- **Overview tab**: Add 5th status card for wellbeing
- **Trends tab**: Add wellbeing line to mood+energy chart
- **Analysis tab**: Include wellbeing in consistency metrics
- **Insights tab**: Add wellbeing target with recommendation text
- **Dashboard card**: Add wellbeing to 7-day average display

## Demo Data

Update `generateEmotionalEntries` to include `wellbeing` values. Base on `moodBase` with slight independent variation (wellbeing tracks closely with overall mood).

## What's NOT Changing

- Audio recording functionality (stays on summary screen)
- Entry history list with edit/delete
- One-entry-per-day upsert behavior
- Auto-complete action integration (`any_emotion` rule)
- Journal text and voice input

## Tech Stack

- React 18, TypeScript 5.6, Tailwind CSS 3.4
- localStorage with `healthspan:` key prefix
- Web Speech API for voice recording
- Vitest + jsdom for testing
