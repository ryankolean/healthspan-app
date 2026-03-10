# Onboarding Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-step onboarding wizard that guides new users through profile setup, wearable connections, and health record uploads.

**Architecture:** A new `/onboarding` route with a step-based wizard component. App.tsx checks `healthspan:onboardingComplete` on load and redirects if not set. Profile data stored in localStorage with `healthspan:` prefix. Existing import flows reused for wearables/health records. Type system updated from `Sex` to `BirthSex` + `GenderIdentity`.

**Tech Stack:** React 18, TypeScript 5.6, Tailwind CSS 3.4, Vitest + jsdom, react-router-dom 6, localStorage

**Design doc:** `docs/plans/2026-03-09-onboarding-wizard-design.md`

---

### Task 1: Profile Storage Utilities + Type Updates

Update the `Sex` type to `BirthSex` + `GenderIdentity` and create a profile storage module.

**Files:**
- Create: `src/types/profile.ts`
- Create: `src/utils/profile-storage.ts`
- Create: `src/utils/profile-storage.test.ts`
- Modify: `src/utils/demo-data.ts:19,48` (Sex type → BirthSex)
- Modify: `src/pages/Exercise.tsx:394` (userSex → birthSex with reference range logic)
- Modify: `src/pages/Settings.tsx:18,54` (userSex → birthSex)

**Step 1: Write the types file**

Create `src/types/profile.ts`:

```typescript
export type BirthSex = 'male' | 'female' | 'intersex'
export type GenderIdentity = 'male' | 'female' | 'trans-male' | 'trans-female' | 'intersex'

export interface UserProfile {
  age: number
  birthSex: BirthSex
  genderIdentity: GenderIdentity
  heightCm: number
  weightKg: number
  referenceRange?: 'male' | 'female' // only needed when birthSex = 'intersex'
}
```

**Step 2: Write failing tests for profile storage**

Create `src/utils/profile-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getUserProfile,
  saveUserProfile,
  getEffectiveReferenceRange,
  isOnboardingComplete,
  setOnboardingComplete,
} from './profile-storage'
import type { UserProfile } from '../types/profile'

beforeEach(() => localStorage.clear())

describe('profile-storage', () => {
  const fullProfile: UserProfile = {
    age: 35,
    birthSex: 'male',
    genderIdentity: 'male',
    heightCm: 180,
    weightKg: 82,
  }

  it('returns null when no profile saved', () => {
    expect(getUserProfile()).toBeNull()
  })

  it('saves and retrieves a profile', () => {
    saveUserProfile(fullProfile)
    expect(getUserProfile()).toEqual(fullProfile)
  })

  it('stores each field in its own localStorage key', () => {
    saveUserProfile(fullProfile)
    expect(localStorage.getItem('healthspan:userAge')).toBe('35')
    expect(localStorage.getItem('healthspan:userBirthSex')).toBe('male')
    expect(localStorage.getItem('healthspan:userGender')).toBe('male')
    expect(localStorage.getItem('healthspan:userHeight')).toBe('180')
    expect(localStorage.getItem('healthspan:userWeight')).toBe('82')
  })

  it('saves referenceRange only when birthSex is intersex', () => {
    saveUserProfile({ ...fullProfile, birthSex: 'intersex', referenceRange: 'female' })
    expect(localStorage.getItem('healthspan:userReferenceRange')).toBe('female')
  })

  it('does not save referenceRange when birthSex is not intersex', () => {
    saveUserProfile(fullProfile)
    expect(localStorage.getItem('healthspan:userReferenceRange')).toBeNull()
  })

  describe('getEffectiveReferenceRange', () => {
    it('returns "male" for birthSex male', () => {
      saveUserProfile(fullProfile)
      expect(getEffectiveReferenceRange()).toBe('male')
    })

    it('returns "female" for birthSex female', () => {
      saveUserProfile({ ...fullProfile, birthSex: 'female' })
      expect(getEffectiveReferenceRange()).toBe('female')
    })

    it('returns chosen referenceRange for birthSex intersex', () => {
      saveUserProfile({ ...fullProfile, birthSex: 'intersex', referenceRange: 'female' })
      expect(getEffectiveReferenceRange()).toBe('female')
    })

    it('defaults to "male" when no profile exists', () => {
      expect(getEffectiveReferenceRange()).toBe('male')
    })
  })

  describe('onboarding status', () => {
    it('returns false when not complete', () => {
      expect(isOnboardingComplete()).toBe(false)
    })

    it('returns true after setting complete', () => {
      setOnboardingComplete()
      expect(isOnboardingComplete()).toBe(true)
    })
  })
})
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/profile-storage.test.ts`
Expected: FAIL — module not found

**Step 4: Implement profile-storage.ts**

Create `src/utils/profile-storage.ts`:

```typescript
import type { UserProfile, BirthSex, GenderIdentity } from '../types/profile'

const KEYS = {
  age: 'healthspan:userAge',
  birthSex: 'healthspan:userBirthSex',
  gender: 'healthspan:userGender',
  height: 'healthspan:userHeight',
  weight: 'healthspan:userWeight',
  referenceRange: 'healthspan:userReferenceRange',
  onboardingComplete: 'healthspan:onboardingComplete',
} as const

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.age, String(profile.age))
  localStorage.setItem(KEYS.birthSex, profile.birthSex)
  localStorage.setItem(KEYS.gender, profile.genderIdentity)
  localStorage.setItem(KEYS.height, String(profile.heightCm))
  localStorage.setItem(KEYS.weight, String(profile.weightKg))

  if (profile.birthSex === 'intersex' && profile.referenceRange) {
    localStorage.setItem(KEYS.referenceRange, profile.referenceRange)
  } else {
    localStorage.removeItem(KEYS.referenceRange)
  }
}

export function getUserProfile(): UserProfile | null {
  const age = localStorage.getItem(KEYS.age)
  const birthSex = localStorage.getItem(KEYS.birthSex) as BirthSex | null
  const gender = localStorage.getItem(KEYS.gender) as GenderIdentity | null
  const height = localStorage.getItem(KEYS.height)
  const weight = localStorage.getItem(KEYS.weight)

  if (!age || !birthSex || !gender || !height || !weight) return null

  const profile: UserProfile = {
    age: Number(age),
    birthSex,
    genderIdentity: gender,
    heightCm: Number(height),
    weightKg: Number(weight),
  }

  if (birthSex === 'intersex') {
    const ref = localStorage.getItem(KEYS.referenceRange) as 'male' | 'female' | null
    if (ref) profile.referenceRange = ref
  }

  return profile
}

export function getEffectiveReferenceRange(): 'male' | 'female' {
  const birthSex = localStorage.getItem(KEYS.birthSex) as BirthSex | null
  if (!birthSex) return 'male'
  if (birthSex === 'intersex') {
    return (localStorage.getItem(KEYS.referenceRange) as 'male' | 'female') ?? 'male'
  }
  return birthSex
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(KEYS.onboardingComplete) === 'true'
}

export function setOnboardingComplete(): void {
  localStorage.setItem(KEYS.onboardingComplete, 'true')
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/profile-storage.test.ts`
Expected: All tests PASS

**Step 6: Migrate Sex type in demo-data.ts**

In `src/utils/demo-data.ts`:
- Line 19: Change `export type Sex = 'male' | 'female'` → `export type BirthSex = 'male' | 'female' | 'intersex'`
- Line 48: Change `sex: 'male' | 'female'` → `sex: BirthSex`
- All persona definitions keep their existing `sex: 'male'` or `sex: 'female'` values (still valid)
- Line 974: Change `localStorage.setItem('healthspan:userSex', sex)` → `localStorage.setItem('healthspan:userBirthSex', sex)`

Also check `src/utils/demo-data.test.ts` for any references to the `Sex` type and update if needed.

**Step 7: Migrate Exercise.tsx to use new storage**

In `src/pages/Exercise.tsx` line 394:
- Change: `const userSex = (localStorage.getItem('healthspan:userSex') ?? 'male') as 'male' | 'female'`
- To: `const userSex = getEffectiveReferenceRange()` and import `getEffectiveReferenceRange` from `../utils/profile-storage`

**Step 8: Migrate Settings.tsx to use new storage**

In `src/pages/Settings.tsx`:
- Line 18: Change `localStorage.getItem('healthspan:userSex')` → `localStorage.getItem('healthspan:userBirthSex')`
- Line 54: Change `localStorage.setItem('healthspan:userSex', val)` → `localStorage.setItem('healthspan:userBirthSex', val)`
- Rename state variable `userSex` → `userBirthSex` and update all references in the JSX
- Add 'intersex' option to the select dropdown
- Update label "Biological Sex" → "Birth Sex"

**Step 9: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (existing + new profile-storage tests)

**Step 10: Commit**

```bash
git add src/types/profile.ts src/utils/profile-storage.ts src/utils/profile-storage.test.ts \
  src/utils/demo-data.ts src/utils/demo-data.test.ts src/pages/Exercise.tsx src/pages/Settings.tsx
git commit -m "feat(profile): add profile types, storage, and migrate Sex → BirthSex"
```

---

### Task 2: Onboarding Wizard — Profile Step (Step 1 UI)

Build the wizard shell and the profile form step.

**Files:**
- Create: `src/pages/Onboarding.tsx`
- Create: `src/pages/Onboarding.test.tsx`

**Step 1: Write failing tests for the profile step**

Create `src/pages/Onboarding.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Onboarding from './Onboarding'

function renderOnboarding() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>
  )
}

beforeEach(() => localStorage.clear())

describe('Onboarding wizard', () => {
  it('renders step 1 profile form by default', () => {
    renderOnboarding()
    expect(screen.getByText(/profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/age/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/birth sex/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/gender identity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument()
  })

  it('disables Next button when profile fields are empty', () => {
    renderOnboarding()
    const nextBtn = screen.getByRole('button', { name: /next/i })
    expect(nextBtn).toBeDisabled()
  })

  it('shows reference range selector when birth sex is intersex', () => {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'intersex' } })
    expect(screen.getByLabelText(/reference range/i)).toBeInTheDocument()
  })

  it('does not show reference range when birth sex is male', () => {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
    expect(screen.queryByLabelText(/reference range/i)).not.toBeInTheDocument()
  })

  it('saves profile to localStorage and advances to step 2 on Next', () => {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'female' } })
    fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'female' } })
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '165' } })
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(localStorage.getItem('healthspan:userAge')).toBe('30')
    expect(localStorage.getItem('healthspan:userBirthSex')).toBe('female')
    expect(screen.getByText(/wearable/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Onboarding.test.tsx`
Expected: FAIL — module not found

**Step 3: Implement the Onboarding page with profile step**

Create `src/pages/Onboarding.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Watch, FileText } from 'lucide-react'
import { saveUserProfile, setOnboardingComplete } from '../utils/profile-storage'
import type { BirthSex, GenderIdentity } from '../types/profile'

const STEPS = ['Profile', 'Wearables', 'Health Records'] as const

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Profile state
  const [age, setAge] = useState('')
  const [birthSex, setBirthSex] = useState<BirthSex | ''>('')
  const [genderIdentity, setGenderIdentity] = useState<GenderIdentity | ''>('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [referenceRange, setReferenceRange] = useState<'male' | 'female'>('male')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')

  const profileValid = age && birthSex && genderIdentity && height && weight &&
    (birthSex !== 'intersex' || referenceRange)

  function handleProfileNext() {
    if (!profileValid || !birthSex || !genderIdentity) return
    const heightCm = heightUnit === 'ft' ? Number(height) * 2.54 : Number(height)
    const weightKg = weightUnit === 'lbs' ? Number(weight) * 0.453592 : Number(weight)
    saveUserProfile({
      age: Number(age),
      birthSex,
      genderIdentity,
      heightCm: Math.round(heightCm * 10) / 10,
      weightKg: Math.round(weightKg * 10) / 10,
      ...(birthSex === 'intersex' ? { referenceRange } : {}),
    })
    setStep(1)
  }

  function handleFinish() {
    setOnboardingComplete()
    navigate('/dashboard')
  }

  const stepIcons = [User, Watch, FileText]

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const Icon = stepIcons[i]
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === step ? 'bg-brand-500 text-white' :
                  i < step ? 'bg-brand-500/20 text-brand-300' :
                  'bg-white/[0.06] text-gray-600'
                }`}>
                  <Icon size={14} />
                </div>
                <span className={`text-xs ${i === step ? 'text-gray-200' : 'text-gray-600'}`}>{label}</span>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/[0.1]" />}
              </div>
            )
          })}
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6">
          {step === 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-100 mb-1">Your Profile</h2>
              <p className="text-sm text-gray-500 mb-6">Basic info used for health calculations and reference ranges.</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="age" className="text-xs text-gray-500 mb-1 block">Age</label>
                  <input id="age" type="number" min={1} max={120} value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500/50" />
                </div>

                <div>
                  <label htmlFor="birthSex" className="text-xs text-gray-500 mb-1 block">Birth Sex</label>
                  <select id="birthSex" value={birthSex}
                    onChange={e => setBirthSex(e.target.value as BirthSex)}
                    className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500/50">
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="intersex">Intersex</option>
                  </select>
                </div>

                {birthSex === 'intersex' && (
                  <div>
                    <label htmlFor="referenceRange" className="text-xs text-gray-500 mb-1 block">Reference Range</label>
                    <p className="text-xs text-gray-600 mb-2">Which reference ranges should we use for physiological calculations?</p>
                    <select id="referenceRange" value={referenceRange}
                      onChange={e => setReferenceRange(e.target.value as 'male' | 'female')}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500/50">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="genderIdentity" className="text-xs text-gray-500 mb-1 block">Gender Identity</label>
                  <select id="genderIdentity" value={genderIdentity}
                    onChange={e => setGenderIdentity(e.target.value as GenderIdentity)}
                    className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500/50">
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="trans-male">Trans Male</option>
                    <option value="trans-female">Trans Female</option>
                    <option value="intersex">Intersex</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="height" className="text-xs text-gray-500">Height</label>
                      <button onClick={() => setHeightUnit(u => u === 'cm' ? 'ft' : 'cm')}
                        className="text-[10px] text-brand-400 hover:text-brand-300">{heightUnit}</button>
                    </div>
                    <input id="height" type="number" min={1} value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder={heightUnit === 'cm' ? '175' : '69'}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500/50" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="weight" className="text-xs text-gray-500">Weight</label>
                      <button onClick={() => setWeightUnit(u => u === 'kg' ? 'lbs' : 'kg')}
                        className="text-[10px] text-brand-400 hover:text-brand-300">{weightUnit}</button>
                    </div>
                    <input id="weight" type="number" min={1} value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder={weightUnit === 'kg' ? '75' : '165'}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500/50" />
                  </div>
                </div>
              </div>

              <button onClick={handleProfileNext} disabled={!profileValid}
                className="w-full mt-6 py-2.5 rounded-xl text-sm font-semibold transition-colors bg-brand-500 hover:bg-brand-400 text-white disabled:opacity-40 disabled:cursor-not-allowed">
                Next
              </button>
            </>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-gray-100 mb-1">Connect Wearables</h2>
              <p className="text-sm text-gray-500 mb-6">Import data from your health devices. You can always do this later in Settings.</p>
              {/* Wearable cards — implemented in Task 3 */}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-white transition-colors">
                  Next
                </button>
                <button onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-gray-100 mb-1">Health Records</h2>
              <p className="text-sm text-gray-500 mb-6">Upload lab reports or medical records. You can always do this later.</p>
              {/* Upload area — implemented in Task 4 */}
              <div className="flex gap-3 mt-6">
                <button onClick={handleFinish}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-400 text-white transition-colors">
                  Finish
                </button>
                <button onClick={handleFinish}
                  className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/Onboarding.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/pages/Onboarding.tsx src/pages/Onboarding.test.tsx
git commit -m "feat(onboarding): add wizard shell with profile step"
```

---

### Task 3: Wearable Connections Step (Step 2 UI)

Add wearable device cards to step 2 of the wizard, reusing existing import flows.

**Files:**
- Modify: `src/pages/Onboarding.tsx` (replace step 1 placeholder with wearable cards)
- Modify: `src/pages/Onboarding.test.tsx` (add step 2 tests)

**Step 1: Write failing tests for wearable step**

Add to `src/pages/Onboarding.test.tsx`:

```typescript
describe('Step 2: Wearables', () => {
  function advanceToStep2() {
    renderOnboarding()
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
    fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'male' } })
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '180' } })
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
  }

  it('shows wearable device cards', () => {
    advanceToStep2()
    expect(screen.getByText(/oura ring/i)).toBeInTheDocument()
    expect(screen.getByText(/apple watch/i)).toBeInTheDocument()
    expect(screen.getByText(/hevy/i)).toBeInTheDocument()
  })

  it('shows skip button', () => {
    advanceToStep2()
    expect(screen.getByText(/skip for now/i)).toBeInTheDocument()
  })

  it('advances to step 3 when skip clicked', () => {
    advanceToStep2()
    fireEvent.click(screen.getByText(/skip for now/i))
    expect(screen.getByText(/health records/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Onboarding.test.tsx`
Expected: FAIL — device card text not found

**Step 3: Implement wearable cards in step 2**

In `src/pages/Onboarding.tsx`, replace the step 1 wearable placeholder with device cards:

```tsx
const WEARABLES = [
  { name: 'Oura Ring', format: 'JSON', icon: '💍' },
  { name: 'Apple Watch', format: 'XML', icon: '⌚' },
  { name: 'Fitbit', format: 'JSON', icon: '📱' },
  { name: 'WHOOP', format: 'JSON', icon: '🔴' },
  { name: 'Strava', format: 'JSON', icon: '🏃' },
  { name: 'Hevy', format: 'CSV', icon: '🏋️' },
] as const
```

Each card is a button showing the name, format badge, and a file input. On file select, it uses the existing parser for that device. For this task, just show the cards and file inputs — actual parsing is handled by the existing import utils and is out of scope.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/Onboarding.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/pages/Onboarding.tsx src/pages/Onboarding.test.tsx
git commit -m "feat(onboarding): add wearable device cards to step 2"
```

---

### Task 4: Health Records Step (Step 3 UI)

Add file upload for lab reports/health records to step 3, reusing the existing Claude Vision parser.

**Files:**
- Modify: `src/pages/Onboarding.tsx` (replace step 2 placeholder with upload area)
- Modify: `src/pages/Onboarding.test.tsx` (add step 3 tests)

**Step 1: Write failing tests for health records step**

Add to `src/pages/Onboarding.test.tsx`:

```typescript
describe('Step 3: Health Records', () => {
  function advanceToStep3() {
    renderOnboarding()
    // Fill profile
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/birth sex/i), { target: { value: 'male' } })
    fireEvent.change(screen.getByLabelText(/gender identity/i), { target: { value: 'male' } })
    fireEvent.change(screen.getByLabelText(/height/i), { target: { value: '180' } })
    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    // Skip wearables
    fireEvent.click(screen.getByText(/skip for now/i))
  }

  it('shows upload area for health records', () => {
    advanceToStep3()
    expect(screen.getByText(/health records/i)).toBeInTheDocument()
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('shows accepted file types', () => {
    advanceToStep3()
    expect(screen.getByText(/jpg.*png.*pdf/i)).toBeInTheDocument()
  })

  it('sets onboarding complete and shows finish button', () => {
    advanceToStep3()
    const finishBtn = screen.getByRole('button', { name: /finish/i })
    expect(finishBtn).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Onboarding.test.tsx`
Expected: FAIL — upload text not found

**Step 3: Implement health records upload in step 3**

In `src/pages/Onboarding.tsx`, replace step 2 health records placeholder with:
- A drag-and-drop area with `accept=".jpg,.jpeg,.png,.pdf"`
- Text showing accepted formats: "JPG, PNG, PDF"
- A file input that accepts multiple files
- On file select, call existing `parseLabDocument` from `src/utils/claude-parser.ts` for each file
- Show upload progress/status
- Finish button calls `setOnboardingComplete()` and navigates to `/dashboard`

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/Onboarding.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/pages/Onboarding.tsx src/pages/Onboarding.test.tsx
git commit -m "feat(onboarding): add health records upload to step 3"
```

---

### Task 5: Route Integration + Redirect Logic

Wire up the `/onboarding` route and add redirect logic.

**Files:**
- Modify: `src/App.tsx` (add route + redirect)
- Modify: `src/pages/Settings.tsx` (add "Re-run onboarding" button)

**Step 1: Write failing test for redirect logic**

This is tricky to unit test with react-router. Instead, verify manually:
- Load app with empty localStorage → should redirect to `/onboarding`
- Complete onboarding → should go to `/dashboard`
- Load app with `healthspan:onboardingComplete = 'true'` → should stay on `/dashboard`

**Step 2: Add route and redirect in App.tsx**

In `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Bloodwork from './pages/Bloodwork'
import Exercise from './pages/Exercise'
import Sleep from './pages/Sleep'
import Emotional from './pages/Emotional'
import Nutrition from './pages/Nutrition'
import Molecules from './pages/Molecules'
import Onboarding from './pages/Onboarding'
import { isOnboardingComplete } from './utils/profile-storage'

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  if (!isOnboardingComplete()) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<OnboardingGuard><Layout /></OnboardingGuard>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bloodwork" element={<Bloodwork />} />
        <Route path="/exercise" element={<Exercise />} />
        <Route path="/sleep" element={<Sleep />} />
        <Route path="/emotional" element={<Emotional />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/molecules" element={<Molecules />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
```

Key decisions:
- `/onboarding` is outside the `Layout` wrapper (no sidebar/nav during onboarding)
- `OnboardingGuard` wraps the Layout route — if onboarding isn't complete, redirect
- Demo mode should bypass onboarding (check: if `isDemoMode()`, treat as complete)

**Step 3: Add "Re-run onboarding" to Settings**

In `src/pages/Settings.tsx`, add a new section after Demo Mode:

```tsx
{/* ─── Onboarding ─── */}
<section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mt-6">
  <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">Onboarding</h2>
  <p className="text-sm text-gray-400 mb-4">Re-run the setup wizard to update your profile or import new data.</p>
  <button
    onClick={() => {
      localStorage.removeItem('healthspan:onboardingComplete')
      window.location.href = '/onboarding'
    }}
    className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm rounded-xl transition-colors"
  >
    Re-run Setup Wizard
  </button>
</section>
```

**Step 4: Handle demo mode bypass**

In the `OnboardingGuard`, also check `isDemoMode()`:

```tsx
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  if (!isOnboardingComplete() && !isDemoMode()) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}
```

Import `isDemoMode` from `../utils/demo-data`.

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/App.tsx src/pages/Settings.tsx
git commit -m "feat(onboarding): add route, redirect guard, and re-run button"
```

---

### Task 6: Final Integration + Manual Verification

Verify the full flow works end-to-end.

**Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Manual testing checklist**

Run: `npm run dev`

1. Open app with empty localStorage → redirects to `/onboarding`
2. Fill profile form → Next advances to step 2
3. Skip wearables → advances to step 3
4. Click Finish → redirects to `/dashboard`, `healthspan:onboardingComplete` is `'true'`
5. Refresh → stays on `/dashboard` (no redirect loop)
6. Go to Settings → "Re-run Setup Wizard" button visible
7. Click re-run → goes back to `/onboarding`
8. Activate demo mode → skips onboarding
9. Profile step: select intersex birth sex → reference range selector appears
10. Exercise page → VO2 max targets use correct reference range

**Step 3: Run build**

Run: `npm run build`
Expected: No TypeScript errors, build succeeds

**Step 4: Final commit if any fixes needed**

```bash
git add -u
git commit -m "fix(onboarding): integration fixes from manual testing"
```
