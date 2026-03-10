# Onboarding Wizard Design

## Goal

Guide new users through setting up their profile and importing health data via a multi-step wizard at `/onboarding`.

## Architecture

A dedicated `/onboarding` route with a multi-step wizard component. On app load, if `healthspan:onboardingComplete` is not `'true'`, redirect to `/onboarding`. The wizard uses localStorage for persistence, consistent with the rest of the app.

## Steps

### Step 1: Profile (Required)

**Fields:**

- **Age** — number input (years)
- **Birth Sex** — select: male / female / intersex
- **Gender Identity** — select: male / female / trans-male / trans-female / intersex
- **Height** — number input with unit toggle (cm / ft+in)
- **Weight** — number input with unit toggle (kg / lbs)

**Conditional field:**

- When birth sex = intersex, show **Reference Range** selector: "Which reference ranges should we use for physiological calculations?" with options: Male / Female

**Validation:** All fields required before proceeding.

**Storage keys:**

- `healthspan:userAge` — number
- `healthspan:userBirthSex` — `'male' | 'female' | 'intersex'`
- `healthspan:userGender` — `'male' | 'female' | 'trans-male' | 'trans-female' | 'intersex'`
- `healthspan:userHeight` — number (stored in cm)
- `healthspan:userWeight` — number (stored in kg)
- `healthspan:userReferenceRange` — `'male' | 'female'` (only stored when birth sex = intersex; otherwise derived from birth sex)

### Step 2: Wearable Connections (Skippable)

Card-based selection for supported devices:

- Oura Ring (JSON)
- Apple Watch (XML)
- Fitbit (JSON)
- WHOOP (JSON)
- Strava (JSON)
- Hevy (CSV)

Each card shows device name, icon, and import format. Tapping a card opens the existing import flow. "Skip for now" button at bottom.

### Step 3: Health Records (Skippable)

Upload area accepting images (JPG/PNG) and PDFs of lab reports, blood panels, or medical records. Uses existing `parseLabDocument` Claude Vision parser. Drag-and-drop or file picker. "Skip for now" button at bottom.

## Navigation & Routing

- New route: `/onboarding`
- On app load, if `healthspan:onboardingComplete` is not `'true'`, redirect to `/onboarding`
- After completing or skipping all steps, set `healthspan:onboardingComplete` to `'true'` and redirect to `/dashboard`
- Settings page gets "Re-run onboarding" option

## Type Updates

The existing `Sex` type (`'male' | 'female'`) will be replaced with:

```typescript
export type BirthSex = 'male' | 'female' | 'intersex';
export type GenderIdentity = 'male' | 'female' | 'trans-male' | 'trans-female' | 'intersex';
```

All existing references to `Sex` will be migrated to `BirthSex`.

## Tech Stack

- React 18 + TypeScript 5.6
- Tailwind CSS 3.4
- localStorage with `healthspan:` key prefix
- Existing Claude Vision parser for health records
- Existing import flows for wearable data
