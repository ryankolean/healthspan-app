# Daily Actions Dashboard Design

**Date:** 2026-03-08
**Goal:** Drive daily engagement by surfacing configurable actions on the Dashboard with a notification badge showing incomplete count.

## Summary

Add a "Today" tab as the default Dashboard tab showing user-configured daily actions. Actions can be domain-linked (auto-complete from existing data) or custom (manual checkoff). A notification badge on the Dashboard sidebar nav item shows the count of incomplete actions due today. Users configure their own actions with flexible frequency schedules and a configurable day reset hour.

## Data Model

### Action Definition

```ts
type ActionFrequency =
  | { type: 'daily' }
  | { type: 'weekdays' }                       // Mon-Fri
  | { type: 'specific_days'; days: number[] }   // 0=Sun..6=Sat
  | { type: 'times_per_week'; count: number };   // e.g., 3x/week

type ActionDomain = 'exercise' | 'nutrition' | 'sleep' | 'emotional' | 'molecules';

interface ActionDefinition {
  id: string;
  label: string;
  frequency: ActionFrequency;
  domain?: ActionDomain;
  autoCompleteRule?: string;
  createdAt: string;
  active: boolean;
  sortOrder: number;
}
```

### Daily Completion Record

```ts
interface DailyActionEntry {
  actionId: string;
  date: string;            // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;    // ISO timestamp
  autoCompleted: boolean;
}
```

### User Settings

```ts
interface ActionSettings {
  dayResetHour: number;  // 0-23, default 0 (midnight)
}
```

### Storage Keys

- `healthspan-actions` — array of ActionDefinition
- `healthspan-action-entries-YYYY-MM-DD` — array of DailyActionEntry for that date
- `healthspan-action-settings` — ActionSettings object

## UI Components

### "Today" Tab

- Default tab at position 0 on Dashboard (before Trends, Overview, etc.)
- Header: "Today" + current date + progress indicator ("4 of 7 complete")
- Body: list of action cards

### Action Card

- **Left:** Checkbox (toggle complete/incomplete)
- **Center:** Label + contextual info for domain-linked actions (e.g., "Zone 2: 32 min today")
- **Right:** Domain icon (lucide icons) or generic circle-check for custom actions
- **Completed state:** Dimmed card, strikethrough label, green filled checkbox
- **Auto-completed:** Small "auto" pill badge

### Add Action (Inline)

- "+" button at bottom of action list
- Opens inline form/modal: label, optional domain, auto-complete rule (domain-dependent), frequency selector
- Save / Cancel buttons

### Action Management

- "..." menu on each card for Edit / Delete
- Edit opens same form as Add, pre-filled

### Empty State

Friendly prompt: "Set up your daily actions to stay on track" with "Add your first action" button.

## Auto-Complete Logic

### Rules by Domain

| Domain | Rule Key | Condition |
|--------|----------|-----------|
| Exercise | `any_workout` | Any workout logged today |
| Exercise | `cardio_workout` | Cardio workout today |
| Exercise | `strength_workout` | Strength workout today |
| Nutrition | `any_meal` | At least 1 meal today |
| Nutrition | `all_meals` | 3+ meals today |
| Nutrition | `breakfast` / `lunch` / `dinner` | Specific meal type today |
| Sleep | `any_sleep` | Sleep entry for last night |
| Emotional | `any_emotion` | Mood check-in today |
| Molecules | `any_supplement` | At least 1 supplement taken today |
| Molecules | `all_supplements` | All active supplements taken today |

### Timing

- Checks run on Today tab mount and on navigation back to Dashboard
- No background polling — localStorage reads are cheap
- Once auto-completed, entry is persisted to avoid re-querying

### Manual Override

- Users can manually uncheck auto-completed actions
- Users can manually check domain-linked actions without data existing

### "Times Per Week" Handling

Count completed days this week (Mon-Sun). If count >= target, action is not due today.

## Notification Badge

### Placement

- Top-right of Dashboard nav item in left sidebar (Layout.tsx)
- Red/brand circular badge with white text count
- Disappears when count = 0 or no actions configured

### Count Calculation

Count = actions due today (respecting frequency + reset hour) minus completed actions.

### Reset Hour

- `dayResetHour` setting (default: 0 = midnight)
- If current hour < resetHour, "today" = yesterday's date
- Applies to both badge count and Today tab content

### Data Flow

Layout.tsx computes badge count by:
1. Reading action definitions
2. Filtering to actions due today
3. Reading today's completion entries
4. Running auto-complete checks
5. Rendering count = due - completed

Auto-complete check logic is a shared utility used by both Layout.tsx and the Today tab.

## Key Files to Create/Modify

- `src/types/actions.ts` — new types
- `src/utils/actions-storage.ts` — CRUD + completion persistence
- `src/utils/actions-auto-complete.ts` — shared auto-complete check logic
- `src/pages/Dashboard.tsx` — add Today tab as default
- `src/components/Layout.tsx` — add notification badge to Dashboard nav
- `src/data/actions-targets.ts` — auto-complete rule definitions

## Demo Mode Support

Demo data generation (`src/utils/demo-data.ts`) should create default actions for each persona with appropriate completion patterns matching their traits.
