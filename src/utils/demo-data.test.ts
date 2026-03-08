import { generateAllDemoData, DEMO_PERSONAS, isDemoMode, getDemoMode, clearDemoData } from './demo-data'
import type { DemoPersona } from './demo-data'
import { getOuraData } from './oura-storage'
import { getLabResults } from './lab-storage'
import { getWorkouts, getVO2Max } from './exercise-storage'
import { getSleepNights } from './sleep-storage'
import { getEmotionalEntries } from './emotional-storage'
import { getNutritionEntries, getNutritionSettings } from './nutrition-storage'
import { getDefinitions, getMoleculeEntries } from './molecules-storage'

beforeEach(() => {
  localStorage.clear()
})

describe('generateAllDemoData', () => {
  it('populates oura data with 90 days', () => {
    generateAllDemoData('male')
    const oura = getOuraData()
    expect(oura).not.toBeNull()
    expect(oura!.sleep).toHaveLength(90)
    expect(oura!.sleepDetail).toHaveLength(90)
    expect(oura!.activity).toHaveLength(90)
    expect(oura!.readiness).toHaveLength(90)
    expect(oura!.spo2).toHaveLength(90)
    expect(oura!.stress).toHaveLength(90)
    expect(oura!.cvAge).toHaveLength(90)
    expect(oura!.resilience).toHaveLength(90)
    expect(oura!.sleeptime).toHaveLength(90)
  })

  it('populates 3 lab results with markers', () => {
    generateAllDemoData('male')
    const labs = getLabResults()
    expect(labs).toHaveLength(3)
    expect(labs[0].markers.length).toBeGreaterThanOrEqual(24)
  })

  it('populates exercise workouts', () => {
    generateAllDemoData('male')
    expect(getWorkouts().length).toBeGreaterThanOrEqual(50)
  })

  it('populates 3 vo2max entries', () => {
    generateAllDemoData('male')
    expect(getVO2Max()).toHaveLength(3)
  })

  it('populates 90 sleep nights', () => {
    generateAllDemoData('male')
    expect(getSleepNights()).toHaveLength(90)
  })

  it('populates 45 emotional entries', () => {
    generateAllDemoData('male')
    expect(getEmotionalEntries()).toHaveLength(45)
  })

  it('populates 120 nutrition entries and settings', () => {
    generateAllDemoData('male')
    expect(getNutritionEntries()).toHaveLength(120)
    expect(getNutritionSettings().bodyweightLbs).toBe(180)
    expect(getNutritionSettings().dailyCalorieTarget).toBe(2800)
  })

  it('populates molecule definitions and entries', () => {
    generateAllDemoData('male')
    expect(getDefinitions()).toHaveLength(6)
    expect(getMoleculeEntries().length).toBeGreaterThan(400)
  })

  it('sets userAge and userSex', () => {
    generateAllDemoData('female')
    expect(localStorage.getItem('healthspan:userAge')).toBe('30')
    expect(localStorage.getItem('healthspan:userSex')).toBe('female')
  })

  it('uses today-relative dates — most recent oura day is today or yesterday', () => {
    generateAllDemoData('male')
    const oura = getOuraData()!
    const lastDay = oura.sleep[oura.sleep.length - 1].day
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    expect([today, yesterday]).toContain(lastDay)
  })
})

describe('oura data quality', () => {
  it('sleepDetail total_s values are in seconds (> 3600)', () => {
    generateAllDemoData('male')
    const oura = getOuraData()!
    for (const d of oura.sleepDetail) {
      expect(d.total_s).toBeGreaterThan(3600)
    }
  })

  it('spo2 avg is always >= 94', () => {
    generateAllDemoData('male')
    const oura = getOuraData()!
    for (const d of oura.spo2) {
      expect(d.avg).toBeGreaterThanOrEqual(94)
    }
  })

  it('cvAge vascular_age is in 22-33 range', () => {
    generateAllDemoData('male')
    const oura = getOuraData()!
    for (const d of oura.cvAge) {
      expect(d.vascular_age).toBeGreaterThanOrEqual(22)
      expect(d.vascular_age).toBeLessThanOrEqual(33)
    }
  })

  it('days are in ascending chronological order', () => {
    generateAllDemoData('male')
    const oura = getOuraData()!
    for (let i = 1; i < oura.sleep.length; i++) {
      expect(oura.sleep[i].day > oura.sleep[i - 1].day).toBe(true)
    }
  })
})

describe('lab results quality', () => {
  it('all marker statuses are valid', () => {
    generateAllDemoData('male')
    const labs = getLabResults()
    for (const lab of labs) {
      for (const m of lab.markers) {
        expect(['optimal', 'acceptable', 'attention']).toContain(m.status)
      }
    }
  })

  it('most recent result has mostly optimal markers', () => {
    generateAllDemoData('male')
    const labs = getLabResults()
    const newest = labs[0]
    const optimalCount = newest.markers.filter(m => m.status === 'optimal').length
    expect(optimalCount).toBeGreaterThanOrEqual(newest.markers.length * 0.8)
  })

  it('female results use female ranges for hemoglobin', () => {
    generateAllDemoData('female')
    const labs = getLabResults()
    const hgb = labs[0].markers.find(m => m.id === 'hemoglobin')!
    // Female optimal is [12, 15], so value should be in that range mostly
    expect(hgb.value).toBeGreaterThanOrEqual(10)
    expect(hgb.value).toBeLessThanOrEqual(17)
  })
})

describe('exercise quality', () => {
  it('includes both cardio and strength types', () => {
    generateAllDemoData('male')
    const workouts = getWorkouts()
    expect(workouts.some(w => w.type === 'cardio')).toBe(true)
    expect(workouts.some(w => w.type === 'strength')).toBe(true)
  })

  it('cardio workouts have zone2Min > 0', () => {
    generateAllDemoData('male')
    const cardio = getWorkouts().filter(w => w.type === 'cardio')
    for (const w of cardio) {
      expect(w.zone2Min).toBeGreaterThan(0)
    }
  })

  it('strength workouts have sets', () => {
    generateAllDemoData('male')
    const strength = getWorkouts().filter(w => w.type === 'strength')
    for (const w of strength) {
      expect(w.sets!.length).toBeGreaterThan(0)
    }
  })

  it('all workout ids are unique', () => {
    generateAllDemoData('male')
    const workouts = getWorkouts()
    const ids = workouts.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('vo2max quality', () => {
  it('male value is ~55, female ~50', () => {
    generateAllDemoData('male')
    const entries = getVO2Max()
    expect(entries[entries.length - 1].value).toBeGreaterThanOrEqual(53)
    expect(entries[entries.length - 1].value).toBeLessThanOrEqual(57)

    localStorage.clear()
    generateAllDemoData('female')
    const fEntries = getVO2Max()
    expect(fEntries[fEntries.length - 1].value).toBeGreaterThanOrEqual(48)
    expect(fEntries[fEntries.length - 1].value).toBeLessThanOrEqual(52)
  })

  it('values show improvement over time', () => {
    generateAllDemoData('male')
    const entries = getVO2Max().sort((a, b) => a.date.localeCompare(b.date))
    expect(entries[2].value).toBeGreaterThan(entries[0].value)
  })
})

describe('sleep nights quality', () => {
  it('totalMin is roughly 6-9 hrs (360-540 min)', () => {
    generateAllDemoData('male')
    for (const n of getSleepNights()) {
      expect(n.totalMin).toBeGreaterThanOrEqual(360)
      expect(n.totalMin).toBeLessThanOrEqual(540)
    }
  })

  it('sub-stage minutes sum to approximately totalMin', () => {
    generateAllDemoData('male')
    for (const n of getSleepNights()) {
      const sum = (n.deepMin ?? 0) + (n.remMin ?? 0) + (n.lightMin ?? 0) + (n.awakeMin ?? 0)
      expect(sum).toBeLessThanOrEqual(n.totalMin! + 5)
    }
  })
})

describe('emotional quality', () => {
  it('all mood values are 1-5', () => {
    generateAllDemoData('male')
    for (const e of getEmotionalEntries()) {
      expect(e.mood).toBeGreaterThanOrEqual(1)
      expect(e.mood).toBeLessThanOrEqual(5)
    }
  })

  it('avg mood is >= 3 (athlete positive trend)', () => {
    generateAllDemoData('male')
    const entries = getEmotionalEntries()
    const avg = entries.reduce((s, e) => s + (e.mood ?? 0), 0) / entries.length
    expect(avg).toBeGreaterThanOrEqual(3)
  })
})

describe('nutrition quality', () => {
  it('male daily protein avg is >= 140g', () => {
    generateAllDemoData('male')
    const entries = getNutritionEntries()
    const dates = [...new Set(entries.map(e => e.date))]
    const dailyProtein = dates.map(d =>
      entries.filter(e => e.date === d).reduce((s, e) => s + (e.proteinG ?? 0), 0)
    )
    const avg = dailyProtein.reduce((s, v) => s + v, 0) / dailyProtein.length
    expect(avg).toBeGreaterThanOrEqual(140)
  })

  it('female settings have 140 lbs bodyweight', () => {
    generateAllDemoData('female')
    expect(getNutritionSettings().bodyweightLbs).toBe(140)
    expect(getNutritionSettings().dailyCalorieTarget).toBe(2200)
  })
})

describe('molecules quality', () => {
  it('all definitions are active', () => {
    generateAllDemoData('male')
    for (const d of getDefinitions()) {
      expect(d.active).toBe(true)
    }
  })

  it('all entries have taken: true', () => {
    generateAllDemoData('male')
    for (const e of getMoleculeEntries()) {
      expect(e.taken).toBe(true)
    }
  })

  it('all moleculeId values reference a valid definition', () => {
    generateAllDemoData('male')
    const defIds = new Set(getDefinitions().map(d => d.id))
    for (const e of getMoleculeEntries()) {
      expect(defIds.has(e.moleculeId)).toBe(true)
    }
  })
})

describe('DEMO_PERSONAS', () => {
  it('exports 6 personas', () => {
    expect(DEMO_PERSONAS).toHaveLength(6)
  })

  it('each persona has required fields', () => {
    for (const p of DEMO_PERSONAS) {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(p.age).toBeGreaterThan(0)
      expect(['male', 'female']).toContain(p.sex)
      expect(p.traits).toBeDefined()
    }
  })

  it('all persona ids are unique', () => {
    const ids = DEMO_PERSONAS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes elite-athlete persona', () => {
    expect(DEMO_PERSONAS.find(p => p.id === 'elite-athlete')).toBeDefined()
  })

  it('includes hypertension-risk persona', () => {
    expect(DEMO_PERSONAS.find(p => p.id === 'hypertension-risk')).toBeDefined()
  })

  it('includes metabolic-syndrome persona', () => {
    expect(DEMO_PERSONAS.find(p => p.id === 'metabolic-syndrome')).toBeDefined()
  })
})

describe('isDemoMode / getDemoMode / clearDemoData', () => {
  it('isDemoMode returns false when no demo flag set', () => {
    expect(isDemoMode()).toBe(false)
  })

  it('getDemoMode returns null when no demo flag set', () => {
    expect(getDemoMode()).toBeNull()
  })

  it('isDemoMode returns true after generating demo data', () => {
    generateAllDemoData('male')
    localStorage.setItem('healthspan:demoMode', 'elite-athlete')
    expect(isDemoMode()).toBe(true)
  })

  it('getDemoMode returns persona id after setting flag', () => {
    localStorage.setItem('healthspan:demoMode', 'elite-athlete')
    expect(getDemoMode()).toBe('elite-athlete')
  })

  it('clearDemoData removes all healthspan keys except apiKey', () => {
    localStorage.setItem('healthspan:apiKey', 'test-api-key-12345')
    generateAllDemoData('male')
    localStorage.setItem('healthspan:demoMode', 'elite-athlete')
    clearDemoData()
    expect(isDemoMode()).toBe(false)
    expect(localStorage.getItem('healthspan:ouraData')).toBeNull()
    expect(localStorage.getItem('healthspan:labResults')).toBeNull()
    expect(localStorage.getItem('healthspan:exercise:workouts')).toBeNull()
    expect(localStorage.getItem('healthspan:sleep:nights')).toBeNull()
    expect(localStorage.getItem('healthspan:emotional:entries')).toBeNull()
    expect(localStorage.getItem('healthspan:nutrition:entries')).toBeNull()
    expect(localStorage.getItem('healthspan:molecules:definitions')).toBeNull()
    expect(localStorage.getItem('healthspan:userAge')).toBeNull()
    expect(localStorage.getItem('healthspan:userSex')).toBeNull()
    // apiKey preserved
    expect(localStorage.getItem('healthspan:apiKey')).toBe('test-api-key-12345')
  })
})
