import { saveOuraData } from './oura-storage'
import { saveLabResult } from './lab-storage'
import { saveWorkouts, saveVO2Max } from './exercise-storage'
import { saveSleepNights } from './sleep-storage'
import { saveEmotionalEntry } from './emotional-storage'
import { saveNutritionEntry, saveNutritionSettings } from './nutrition-storage'
import { saveDefinition, saveMoleculeEntry } from './molecules-storage'
import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'
import type { OuraData } from '../types'
import type { LabResult, BloodMarker, MarkerStatus } from '../types/bloodwork'
import type { MarkerDefinition } from '../data/bloodwork-metrics'
import type { ExerciseWorkout, VO2MaxEntry } from '../types/exercise'
import type { SleepNight } from '../types/sleep'
import type { EmotionalEntry } from '../types/emotional'
import type { NutritionEntry, MealType } from '../types/nutrition'
import type { MoleculeDefinition, MoleculeEntry } from '../types/molecules'

export type Sex = 'male' | 'female'

export interface PersonaTraits {
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

export interface DemoPersona {
  id: string
  name: string
  description: string
  age: number
  sex: 'male' | 'female'
  traits: PersonaTraits
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'elite-athlete',
    name: 'Elite Athlete',
    description: '28M, sub-elite runner. Optimal across all panels — low resting HR, high HRV, strong VO2max.',
    age: 28,
    sex: 'male',
    traits: {
      sleepScoreBase: 92,
      readinessBase: 91,
      activityBase: 93,
      restingHr: 44,
      hrv: 110,
      workoutsPerWeek: 6,
      zone2MinPerWeek: 300,
      vo2max: 62,
      totalSleepMin: 480,
      deepMin: 105,
      moodBase: 4.5,
      stressBase: 1.5,
      bodyweightLbs: 165,
      dailyCalorieTarget: 3200,
      proteinPerLb: 1.0,
      supplementCount: 6,
    },
  },
  {
    id: 'hypertension-risk',
    name: 'Hypertension Risk',
    description: '35M, desk worker with early warning signs. Elevated hsCRP, borderline glucose, higher resting HR.',
    age: 35,
    sex: 'male',
    traits: {
      sleepScoreBase: 78,
      readinessBase: 74,
      activityBase: 68,
      restingHr: 62,
      hrv: 55,
      bloodworkFlags: { hscrp: 'attention', fasting_glucose: 'acceptable', triglycerides: 'acceptable', hdl_c: 'acceptable' },
      workoutsPerWeek: 3,
      zone2MinPerWeek: 90,
      vo2max: 42,
      totalSleepMin: 410,
      deepMin: 70,
      moodBase: 3.5,
      stressBase: 3.0,
      bodyweightLbs: 205,
      dailyCalorieTarget: 2400,
      proteinPerLb: 0.7,
      supplementCount: 3,
    },
  },
  {
    id: 'college-athlete',
    name: 'College Athlete',
    description: '22F, D1 soccer player. Great fitness but inconsistent sleep, nutrition, and supplement habits.',
    age: 22,
    sex: 'female',
    traits: {
      sleepScoreBase: 76,
      readinessBase: 82,
      activityBase: 90,
      restingHr: 50,
      hrv: 85,
      workoutsPerWeek: 5,
      zone2MinPerWeek: 200,
      vo2max: 52,
      totalSleepMin: 390,
      deepMin: 80,
      moodBase: 4.0,
      stressBase: 2.5,
      bodyweightLbs: 140,
      dailyCalorieTarget: 2400,
      proteinPerLb: 0.8,
      supplementCount: 2,
    },
  },
  {
    id: 'metabolic-syndrome',
    name: 'Metabolic Syndrome',
    description: '52M, sedentary with elevated glucose, HbA1c, triglycerides, and low HDL. Poor sleep quality.',
    age: 52,
    sex: 'male',
    traits: {
      sleepScoreBase: 68,
      readinessBase: 62,
      activityBase: 55,
      restingHr: 72,
      hrv: 35,
      bloodworkFlags: { fasting_glucose: 'attention', hba1c: 'attention', triglycerides: 'attention', hdl_c: 'attention', fasting_insulin: 'acceptable', alt: 'acceptable' },
      workoutsPerWeek: 1,
      zone2MinPerWeek: 30,
      vo2max: 32,
      totalSleepMin: 370,
      deepMin: 55,
      moodBase: 2.8,
      stressBase: 3.5,
      bodyweightLbs: 240,
      dailyCalorieTarget: 2000,
      proteinPerLb: 0.5,
      supplementCount: 2,
    },
  },
  {
    id: 'postpartum-recovery',
    name: 'Postpartum Recovery',
    description: '34F, 6 months postpartum. Low ferritin and vitamin D, disrupted sleep, building back fitness.',
    age: 34,
    sex: 'female',
    traits: {
      sleepScoreBase: 65,
      readinessBase: 68,
      activityBase: 60,
      restingHr: 65,
      hrv: 45,
      bloodworkFlags: { ferritin: 'attention', vitamin_d: 'attention', hemoglobin: 'acceptable' },
      workoutsPerWeek: 3,
      zone2MinPerWeek: 75,
      vo2max: 38,
      totalSleepMin: 350,
      deepMin: 55,
      moodBase: 3.0,
      stressBase: 3.2,
      bodyweightLbs: 155,
      dailyCalorieTarget: 2200,
      proteinPerLb: 0.8,
      supplementCount: 4,
    },
  },
  {
    id: 'longevity-optimized',
    name: 'Longevity Optimized',
    description: '45F, Attia-protocol follower. All bloodwork optimal, full supplement stack, consistent routines.',
    age: 45,
    sex: 'female',
    traits: {
      sleepScoreBase: 88,
      readinessBase: 86,
      activityBase: 84,
      restingHr: 52,
      hrv: 75,
      workoutsPerWeek: 5,
      zone2MinPerWeek: 210,
      vo2max: 45,
      totalSleepMin: 465,
      deepMin: 90,
      moodBase: 4.2,
      stressBase: 1.8,
      bodyweightLbs: 135,
      dailyCalorieTarget: 2000,
      proteinPerLb: 1.0,
      supplementCount: 6,
    },
  },
]

const DEMO_MODE_KEY = 'healthspan:demoMode'

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) !== null
}

export function getDemoMode(): string | null {
  return localStorage.getItem(DEMO_MODE_KEY)
}

export function getActivePersona(): DemoPersona | null {
  const id = getDemoMode()
  if (!id) return null
  return DEMO_PERSONAS.find(p => p.id === id) ?? null
}

export function clearDemoData(): void {
  const apiKey = localStorage.getItem('healthspan:apiKey')
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('healthspan:')) keysToRemove.push(k)
  }
  for (const k of keysToRemove) localStorage.removeItem(k)
  if (apiKey) localStorage.setItem('healthspan:apiKey', apiKey)
}

// ─── Helpers ───

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

function jitter(base: number, range: number): number {
  return Math.round(base + (Math.random() - 0.5) * 2 * range)
}

function jitterF(base: number, range: number, decimals: number): number {
  const v = base + (Math.random() - 0.5) * 2 * range
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Oura Data ───

function generateOuraData(): OuraData {
  const days = Array.from({ length: 90 }, (_, i) => dateStr(89 - i))

  const ouraWorkoutActivities = ['Running', 'Cycling', 'Walking', 'Yoga']

  return {
    sleep: days.map(day => ({
      day,
      score: clamp(jitter(87, 8), 50, 100),
      deep: clamp(jitter(85, 8), 40, 100),
      rem: clamp(jitter(83, 8), 40, 100),
      efficiency: clamp(jitter(88, 5), 60, 100),
      latency: clamp(jitter(80, 10), 30, 100),
      total: clamp(jitter(88, 6), 50, 100),
      restfulness: clamp(jitter(82, 8), 40, 100),
    })),

    sleepDetail: days.map(day => {
      const total_s = jitter(27000, 1800)
      const deep_s = jitter(5400, 900)
      const rem_s = jitter(6300, 900)
      const awake_s = jitter(1200, 300)
      const light_s = Math.max(0, total_s - deep_s - rem_s - awake_s)
      const lowest_hr = jitter(48, 4)
      return {
        day,
        total_s: Math.max(18000, total_s),
        deep_s: Math.max(1800, deep_s),
        rem_s: Math.max(1800, rem_s),
        light_s,
        efficiency: clamp(jitter(88, 5), 60, 100),
        avg_hrv: clamp(jitter(90, 15), 50, 150),
        lowest_hr: clamp(lowest_hr, 38, 65),
        avg_hr: clamp(lowest_hr + jitter(5, 2), 40, 70),
        avg_breath: clamp(jitterF(13.5, 1.0, 1), 10, 20),
      }
    }),

    activity: days.map(day => {
      const steps = clamp(jitter(11000, 2500), 4000, 20000)
      const active_cal = clamp(jitter(550, 100), 200, 1000)
      return {
        day,
        score: clamp(jitter(85, 10), 40, 100),
        steps,
        active_cal,
        total_cal: active_cal + jitter(1800, 100),
        walking_dist: Math.round(steps * 0.75),
        high_time: clamp(jitter(45, 20), 0, 120),
        med_time: clamp(jitter(120, 30), 30, 240),
        low_time: clamp(jitter(300, 60), 120, 480),
      }
    }),

    readiness: days.map(day => ({
      day,
      score: clamp(jitter(86, 8), 50, 100),
      temp_dev: clamp(jitterF(0.0, 0.3, 2), -1.5, 1.5),
      hrv_balance: clamp(jitter(84, 8), 40, 100),
      recovery: clamp(jitter(85, 8), 40, 100),
      rhr: clamp(jitter(50, 4), 38, 65),
      body_temp: clamp(jitter(88, 5), 50, 100),
      prev_night: clamp(jitter(84, 8), 40, 100),
      activity_bal: clamp(jitter(82, 8), 40, 100),
    })),

    spo2: days.map(day => ({
      day,
      avg: clamp(jitterF(97.5, 1.0, 1), 94, 100),
      bdi: clamp(jitter(4, 3), 0, 15),
    })),

    stress: days.map(day => {
      const r = Math.random()
      return {
        day,
        summary: r < 0.8 ? 'restored' : r < 0.95 ? 'engaged' : 'stressful',
        recovery_high: clamp(jitter(18000, 3600), 7200, 36000),
        stress_high: clamp(jitter(7200, 1800), 1800, 18000),
      }
    }),

    cvAge: days.map(day => ({
      day,
      vascular_age: clamp(jitter(27, 2), 22, 33),
    })),

    workouts: days
      .filter((_, i) => {
        const dayOfWeek = i % 7
        return dayOfWeek < 4 || dayOfWeek === 5
      })
      .map((day, i) => ({
        day,
        activity: ouraWorkoutActivities[i % ouraWorkoutActivities.length],
        intensity: Math.random() > 0.4 ? 'moderate' : 'high',
        calories: jitter(450, 100),
        distance: jitter(8000, 2000),
        start: `${day}T07:00:00`,
        end: `${day}T08:00:00`,
      })),

    resilience: days.map(day => {
      const r = Math.random()
      return {
        day,
        level: r < 0.7 ? 'strong' : r < 0.9 ? 'exceptional' : 'adequate',
        sleep_recovery: clamp(jitter(84, 8), 40, 100),
        daytime_recovery: clamp(jitter(81, 8), 40, 100),
        stress: clamp(jitter(42, 10), 10, 80),
      }
    }),

    sleeptime: days.map(day => ({
      day,
      status: 'optimal',
      recommendation: 'ideal',
    })),
  }
}

// ─── Lab Results ───

function computeMarkerStatus(value: number, marker: MarkerDefinition, sex: Sex): MarkerStatus {
  const { low, high } = marker.attentionThreshold
  if (low !== undefined && value < low) return 'attention'
  if (high !== undefined && value > high) return 'attention'

  const ranges = sex === 'female' && marker.sexVariant?.female
    ? marker.sexVariant.female
    : { optimal: marker.optimal, acceptable: marker.acceptable }

  const [optLow, optHigh] = ranges.optimal
  const [accLow, accHigh] = ranges.acceptable

  const inOptimal =
    (optLow === null || value >= optLow) &&
    (optHigh === null || value <= optHigh)
  if (inOptimal) return 'optimal'

  const inAcceptable =
    (accLow === null || value >= accLow) &&
    (accHigh === null || value <= accHigh)
  if (inAcceptable) return 'acceptable'

  return 'attention'
}

function generateValueInRange(low: number | null, high: number | null): number {
  const lo = low ?? (high != null ? Math.round(high * 0.5) : 1)
  const hi = high ?? (low != null ? Math.round(low * 1.5) : 100)
  const value = lo + Math.random() * (hi - lo)
  // Round to 1 decimal for clean display
  return Math.round(value * 10) / 10
}

function generateLabResults(sex: Sex): LabResult[] {
  const drawDays = [0, 60, 120]

  return drawDays.map((daysAgo, labIndex) => {
    const markers: BloodMarker[] = BLOODWORK_MARKERS
      .filter(m => !m.computed)
      .map(marker => {
        const ranges = sex === 'female' && marker.sexVariant?.female
          ? marker.sexVariant.female
          : { optimal: marker.optimal, acceptable: marker.acceptable }

        // Most recent result: all optimal. Older: allow some acceptable
        let value: number
        if (labIndex === 0) {
          value = generateValueInRange(ranges.optimal[0], ranges.optimal[1])
        } else {
          value = Math.random() > 0.85
            ? generateValueInRange(ranges.acceptable[0], ranges.acceptable[1])
            : generateValueInRange(ranges.optimal[0], ranges.optimal[1])
        }

        return {
          id: marker.id,
          name: marker.name,
          value,
          unit: marker.unit,
          status: computeMarkerStatus(value, marker, sex),
          confidence: 'high' as const,
        }
      })

    // Add computed HOMA-IR
    const glucose = markers.find(m => m.id === 'fasting_glucose')
    const insulin = markers.find(m => m.id === 'fasting_insulin')
    if (glucose && insulin) {
      const homaValue = Math.round(((glucose.value * insulin.value) / 405) * 100) / 100
      const homaMarker = BLOODWORK_MARKERS.find(m => m.id === 'homa_ir')!
      markers.push({
        id: 'homa_ir',
        name: 'HOMA-IR',
        value: homaValue,
        unit: 'index',
        status: computeMarkerStatus(homaValue, homaMarker, sex),
        confidence: 'high',
      })
    }

    return {
      id: `demo-lab-${labIndex}`,
      drawDate: dateStr(daysAgo),
      institution: 'Demo Lab',
      markers,
      createdAt: Date.now(),
    }
  })
}

// ─── Exercise Workouts ───

function generateExerciseWorkouts(): ExerciseWorkout[] {
  const workouts: ExerciseWorkout[] = []
  const strengthExercises = ['Squat', 'Deadlift', 'Bench Press', 'Pull-up', 'Barbell Row', 'Overhead Press']
  const strengthSplits = ['Upper Body', 'Lower Body', 'Full Body']

  for (let i = 89; i >= 0; i--) {
    const day = dateStr(i)
    const dayOfWeek = new Date(day).getDay() // 0=Sun

    // Weekly schedule: Mon=run, Tue=strength, Wed=cycle, Thu=rest, Fri=run, Sat=strength, Sun=long-run
    if (dayOfWeek === 4) continue // Thu rest

    // Skip ~1 random workout per week for realism
    if (dayOfWeek !== 0 && Math.random() < 0.12) continue

    const isStrength = dayOfWeek === 2 || dayOfWeek === 6 // Tue, Sat
    const isLongRun = dayOfWeek === 0 // Sun

    if (isStrength) {
      const splitName = strengthSplits[workouts.filter(w => w.type === 'strength').length % 3]
      const durationMin = jitter(60, 15)
      workouts.push({
        id: `demo-ex-${day}`,
        source: 'manual',
        sourceId: `demo-strength-${day}`,
        date: day,
        type: 'strength',
        activityName: splitName,
        durationMin,
        avgHr: jitter(125, 10),
        maxHr: jitter(155, 10),
        calories: jitter(350, 60),
        zone2Min: 0,
        zone5Min: 0,
        sets: Array.from({ length: jitter(5, 1) }, (_, si) => ({
          exercise: strengthExercises[si % strengthExercises.length],
          setIndex: si,
          reps: jitter(8, 2),
          weightKg: jitter(80, 20),
        })),
        createdAt: Date.now(),
      })
    } else {
      // Cardio
      const durationMin = isLongRun ? jitter(75, 10) : jitter(50, 10)
      const activityName = isLongRun ? 'Long Zone 2 Run' : dayOfWeek === 3 ? 'Cycling' : 'Zone 2 Run'
      const avgHr = jitter(142, 8)
      workouts.push({
        id: `demo-ex-${day}`,
        source: 'manual',
        sourceId: `demo-cardio-${day}`,
        date: day,
        type: 'cardio',
        activityName,
        durationMin,
        distanceKm: jitterF(isLongRun ? 14 : 9, 2, 1),
        avgHr,
        maxHr: avgHr + jitter(15, 5),
        calories: jitter(isLongRun ? 650 : 450, 80),
        zone2Min: Math.round(durationMin * 0.78),
        zone5Min: jitter(3, 2),
        createdAt: Date.now(),
      })
    }
  }

  // Ensure this week has enough zone2 for "On Track" (>=180 min)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  const weekStart = startOfWeek.toISOString().slice(0, 10)
  const thisWeekCardio = workouts.filter(w => w.date >= weekStart && w.type === 'cardio')
  const currentZ2 = thisWeekCardio.reduce((s, w) => s + (w.zone2Min ?? 0), 0)
  if (currentZ2 < 180 && thisWeekCardio.length > 0) {
    // Boost the first cardio workout this week
    const deficit = 180 - currentZ2
    thisWeekCardio[0].zone2Min = (thisWeekCardio[0].zone2Min ?? 0) + deficit
    thisWeekCardio[0].durationMin = (thisWeekCardio[0].durationMin ?? 0) + deficit
  }

  return workouts
}

// ─── VO2 Max ───

function generateVO2MaxEntries(sex: Sex): VO2MaxEntry[] {
  const base = sex === 'male' ? 55 : 50
  return [90, 45, 0].map((daysAgo, i) => ({
    id: `demo-vo2max-${i}`,
    date: dateStr(daysAgo),
    value: base - (2 - i),
    source: 'manual' as const,
    method: 'ramp_test' as const,
    createdAt: Date.now(),
  }))
}

// ─── Sleep Nights ───

function generateSleepNights(): SleepNight[] {
  return Array.from({ length: 90 }, (_, i) => {
    const day = dateStr(89 - i)
    const totalMin = clamp(jitter(455, 25), 380, 540)
    const deepMin = clamp(jitter(90, 15), 45, 150)
    const remMin = clamp(jitter(105, 15), 50, 160)
    const awakeMin = clamp(jitter(20, 8), 5, 45)
    const lightMin = Math.max(0, totalMin - deepMin - remMin - awakeMin)
    const lowestHr = clamp(jitter(47, 4), 38, 60)
    return {
      id: `demo-sleep-${day}`,
      source: 'oura' as const,
      sourceId: `demo-oura-sleep-${day}`,
      date: day,
      bedtime: `${day}T22:30:00`,
      wakeTime: `${day}T06:15:00`,
      totalMin,
      deepMin,
      remMin,
      lightMin,
      awakeMin,
      efficiency: clamp(jitter(88, 5), 70, 98),
      onsetMin: clamp(jitter(12, 5), 2, 30),
      avgHr: clamp(lowestHr + jitter(5, 2), 40, 70),
      lowestHr,
      avgHrv: clamp(jitter(90, 15), 50, 150),
      avgBreath: clamp(jitterF(13.5, 1.0, 1), 10, 20),
      spo2Avg: clamp(jitterF(97.5, 1.0, 1), 94, 100),
      sleepScore: clamp(jitter(87, 8), 50, 100),
      createdAt: Date.now(),
    }
  })
}

// ─── Emotional ───

const JOURNAL_TEMPLATES = [
  'Good training session today.',
  'Feeling recovered and strong.',
  'Slight fatigue but pushed through.',
  'Great energy levels all day.',
  'Rest day — focusing on recovery.',
  'Productive day, low stress.',
]

function generateEmotionalEntries(): EmotionalEntry[] {
  return Array.from({ length: 45 }, (_, i) => {
    const day = dateStr(i * 2)
    return {
      id: `demo-emotional-${day}`,
      source: 'manual' as const,
      date: day,
      mood: clamp(jitter(4, 1), 1, 5),
      stress: clamp(jitter(2, 1), 1, 5),
      anxiety: clamp(jitter(2, 1), 1, 5),
      energy: clamp(jitter(4, 1), 1, 5),
      journalText: Math.random() < 0.3 ? pick(JOURNAL_TEMPLATES) : undefined,
      createdAt: Date.now(),
    }
  })
}

// ─── Nutrition ───

const MEAL_NAMES: Record<MealType, string[]> = {
  breakfast: ['Eggs and oats', 'Greek yogurt bowl', 'Protein smoothie'],
  lunch: ['Chicken and rice', 'Turkey wrap', 'Salmon salad'],
  dinner: ['Steak and vegetables', 'Grilled chicken', 'Fish and quinoa'],
  snack: ['Protein bar', 'Mixed nuts', 'Cottage cheese'],
}

function generateNutritionData(sex: Sex): { entries: NutritionEntry[], settings: { bodyweightLbs: number, dailyCalorieTarget: number } } {
  const bodyweightLbs = sex === 'male' ? 180 : 140
  const dailyCalorieTarget = sex === 'male' ? 2800 : 2200
  const proteinPerDay = bodyweightLbs // 1g per lb

  const mealSplit = {
    breakfast: { calPct: 0.25, protPct: 0.22, carbPct: 0.30, fatPct: 0.25, fiber: 6 },
    lunch:     { calPct: 0.30, protPct: 0.28, carbPct: 0.30, fatPct: 0.28, fiber: 10 },
    dinner:    { calPct: 0.32, protPct: 0.33, carbPct: 0.28, fatPct: 0.35, fiber: 12 },
    snack:     { calPct: 0.13, protPct: 0.17, carbPct: 0.12, fatPct: 0.12, fiber: 4 },
  }

  const totalCarbsG = Math.round(dailyCalorieTarget * 0.40 / 4)
  const totalFatG = Math.round(dailyCalorieTarget * 0.25 / 9)

  const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  const entries: NutritionEntry[] = []

  for (let d = 0; d < 30; d++) {
    const day = dateStr(d)
    for (const mealType of meals) {
      const split = mealSplit[mealType]
      entries.push({
        id: `demo-nutrition-${day}-${mealType}`,
        source: 'manual',
        date: day,
        mealType,
        mealName: pick(MEAL_NAMES[mealType]),
        calories: clamp(jitter(Math.round(dailyCalorieTarget * split.calPct), 80), 100, 1500),
        proteinG: clamp(jitter(Math.round(proteinPerDay * split.protPct), 10), 5, 100),
        carbsG: clamp(jitter(Math.round(totalCarbsG * split.carbPct), 15), 5, 200),
        fatG: clamp(jitter(Math.round(totalFatG * split.fatPct), 8), 3, 80),
        fiberG: clamp(jitter(split.fiber, 3), 1, 25),
        createdAt: Date.now(),
      })
    }
  }

  return { entries, settings: { bodyweightLbs, dailyCalorieTarget } }
}

// ─── Molecules ───

const DEMO_SUPPLEMENTS: Omit<MoleculeDefinition, 'createdAt'>[] = [
  { id: 'demo-creatine', name: 'Creatine Monohydrate', category: 'supplement', dosage: 5, unit: 'g', frequency: 'daily', active: true },
  { id: 'demo-vitd', name: 'Vitamin D3', category: 'vitamin', dosage: 5000, unit: 'IU', frequency: 'daily', active: true },
  { id: 'demo-omega3', name: 'Omega-3 (EPA/DHA)', category: 'supplement', dosage: 2, unit: 'g', frequency: 'daily', active: true },
  { id: 'demo-magnesium', name: 'Magnesium Glycinate', category: 'mineral', dosage: 400, unit: 'mg', frequency: 'daily', active: true },
  { id: 'demo-zinc', name: 'Zinc', category: 'mineral', dosage: 15, unit: 'mg', frequency: 'daily', active: true },
  { id: 'demo-nac', name: 'NAC', category: 'amino_acid', dosage: 600, unit: 'mg', frequency: 'daily', active: true },
]

function generateMoleculeData(): { definitions: MoleculeDefinition[], entries: MoleculeEntry[] } {
  const now = Date.now()
  const definitions: MoleculeDefinition[] = DEMO_SUPPLEMENTS.map(s => ({ ...s, createdAt: now }))

  const entries: MoleculeEntry[] = []
  for (let d = 0; d < 90; d++) {
    const day = dateStr(d)
    for (const def of definitions) {
      // ~90% adherence — only create entries where taken
      if (Math.random() > 0.10) {
        entries.push({
          id: `demo-mol-${def.id}-${day}`,
          source: 'manual',
          date: day,
          moleculeId: def.id,
          taken: true,
          createdAt: now,
        })
      }
    }
  }

  return { definitions, entries }
}

// ─── Orchestrator ───

export function generateAllDemoData(sex: Sex): void {
  saveOuraData(generateOuraData())

  for (const lab of generateLabResults(sex)) saveLabResult(lab)

  saveWorkouts(generateExerciseWorkouts())

  for (const v of generateVO2MaxEntries(sex)) saveVO2Max(v)

  saveSleepNights(generateSleepNights())

  for (const e of generateEmotionalEntries()) saveEmotionalEntry(e)

  const nutrition = generateNutritionData(sex)
  saveNutritionSettings(nutrition.settings)
  for (const e of nutrition.entries) saveNutritionEntry(e)

  const molecules = generateMoleculeData()
  for (const d of molecules.definitions) saveDefinition(d)
  for (const e of molecules.entries) saveMoleculeEntry(e)

  localStorage.setItem('healthspan:userAge', '30')
  localStorage.setItem('healthspan:userSex', sex)
}
