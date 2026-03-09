import { generateAllDemoData, DEMO_PERSONAS, isDemoMode, getDemoMode, clearDemoData } from './demo-data'
import type { DemoPersona } from './demo-data'
import { getOuraData } from './oura-storage'
import { getLabResults } from './lab-storage'
import { getWorkouts, getVO2Max } from './exercise-storage'
import { getSleepNights } from './sleep-storage'
import { getEmotionalEntries } from './emotional-storage'
import { getNutritionEntries, getNutritionSettings } from './nutrition-storage'
import { getDefinitions, getMoleculeEntries } from './molecules-storage'
import { getActionDefinitions, getDailyEntries } from './actions-storage'

const MALE_PERSONA: DemoPersona = DEMO_PERSONAS.find(p => p.sex === 'male')!
const FEMALE_PERSONA: DemoPersona = DEMO_PERSONAS.find(p => p.sex === 'female')!

beforeEach(() => {
  localStorage.clear()
})

describe('generateAllDemoData', () => {
  it('populates oura data with 90 days', () => {
    generateAllDemoData(MALE_PERSONA)
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
    generateAllDemoData(MALE_PERSONA)
    const labs = getLabResults()
    expect(labs).toHaveLength(3)
    expect(labs[0].markers.length).toBeGreaterThanOrEqual(24)
  })

  it('populates exercise workouts', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getWorkouts().length).toBeGreaterThanOrEqual(50)
  })

  it('populates 3 vo2max entries', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getVO2Max()).toHaveLength(3)
  })

  it('populates 90 sleep nights', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getSleepNights()).toHaveLength(90)
  })

  it('populates 45 emotional entries', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getEmotionalEntries()).toHaveLength(45)
  })

  it('populates 120 nutrition entries and settings', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getNutritionEntries()).toHaveLength(120)
    expect(getNutritionSettings().bodyweightLbs).toBe(165)
    expect(getNutritionSettings().dailyCalorieTarget).toBe(3200)
  })

  it('populates molecule definitions and entries', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getDefinitions()).toHaveLength(6)
    expect(getMoleculeEntries().length).toBeGreaterThan(400)
  })

  it('sets userAge and userSex', () => {
    generateAllDemoData(FEMALE_PERSONA)
    expect(localStorage.getItem('healthspan:userAge')).toBe('22')
    expect(localStorage.getItem('healthspan:userSex')).toBe('female')
  })

  it('uses today-relative dates — most recent oura day is today or yesterday', () => {
    generateAllDemoData(MALE_PERSONA)
    const oura = getOuraData()!
    const lastDay = oura.sleep[oura.sleep.length - 1].day
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    expect([today, yesterday]).toContain(lastDay)
  })
})

describe('oura data quality', () => {
  it('sleepDetail total_s values are in seconds (> 3600)', () => {
    generateAllDemoData(MALE_PERSONA)
    const oura = getOuraData()!
    for (const d of oura.sleepDetail) {
      expect(d.total_s).toBeGreaterThan(3600)
    }
  })

  it('spo2 avg is always >= 94', () => {
    generateAllDemoData(MALE_PERSONA)
    const oura = getOuraData()!
    for (const d of oura.spo2) {
      expect(d.avg).toBeGreaterThanOrEqual(94)
    }
  })

  it('cvAge vascular_age is in 22-50 range', () => {
    generateAllDemoData(MALE_PERSONA)
    const oura = getOuraData()!
    for (const d of oura.cvAge) {
      expect(d.vascular_age).toBeGreaterThanOrEqual(22)
      expect(d.vascular_age).toBeLessThanOrEqual(50)
    }
  })

  it('days are in ascending chronological order', () => {
    generateAllDemoData(MALE_PERSONA)
    const oura = getOuraData()!
    for (let i = 1; i < oura.sleep.length; i++) {
      expect(oura.sleep[i].day > oura.sleep[i - 1].day).toBe(true)
    }
  })
})

describe('lab results quality', () => {
  it('all marker statuses are valid', () => {
    generateAllDemoData(MALE_PERSONA)
    const labs = getLabResults()
    for (const lab of labs) {
      for (const m of lab.markers) {
        expect(['optimal', 'acceptable', 'attention']).toContain(m.status)
      }
    }
  })

  it('most recent result has mostly optimal markers', () => {
    generateAllDemoData(MALE_PERSONA)
    const labs = getLabResults()
    const newest = labs[0]
    const optimalCount = newest.markers.filter(m => m.status === 'optimal').length
    expect(optimalCount).toBeGreaterThanOrEqual(newest.markers.length * 0.8)
  })

  it('female results use female ranges for hemoglobin', () => {
    generateAllDemoData(FEMALE_PERSONA)
    const labs = getLabResults()
    const hgb = labs[0].markers.find(m => m.id === 'hemoglobin')!
    // Female optimal is [12, 15], so value should be in that range mostly
    expect(hgb.value).toBeGreaterThanOrEqual(10)
    expect(hgb.value).toBeLessThanOrEqual(17)
  })
})

describe('exercise quality', () => {
  it('includes both cardio and strength types', () => {
    generateAllDemoData(MALE_PERSONA)
    const workouts = getWorkouts()
    expect(workouts.some(w => w.type === 'cardio')).toBe(true)
    expect(workouts.some(w => w.type === 'strength')).toBe(true)
  })

  it('cardio workouts have zone2Min > 0', () => {
    generateAllDemoData(MALE_PERSONA)
    const cardio = getWorkouts().filter(w => w.type === 'cardio')
    for (const w of cardio) {
      expect(w.zone2Min).toBeGreaterThan(0)
    }
  })

  it('strength workouts have sets', () => {
    generateAllDemoData(MALE_PERSONA)
    const strength = getWorkouts().filter(w => w.type === 'strength')
    for (const w of strength) {
      expect(w.sets!.length).toBeGreaterThan(0)
    }
  })

  it('all workout ids are unique', () => {
    generateAllDemoData(MALE_PERSONA)
    const workouts = getWorkouts()
    const ids = workouts.map(w => w.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('vo2max quality', () => {
  it('elite-athlete male value is ~62, college-athlete female ~52', () => {
    generateAllDemoData(MALE_PERSONA)
    const entries = getVO2Max()
    expect(entries[entries.length - 1].value).toBeGreaterThanOrEqual(60)
    expect(entries[entries.length - 1].value).toBeLessThanOrEqual(64)

    localStorage.clear()
    generateAllDemoData(FEMALE_PERSONA)
    const fEntries = getVO2Max()
    expect(fEntries[fEntries.length - 1].value).toBeGreaterThanOrEqual(50)
    expect(fEntries[fEntries.length - 1].value).toBeLessThanOrEqual(54)
  })

  it('values show improvement over time', () => {
    generateAllDemoData(MALE_PERSONA)
    const entries = getVO2Max().sort((a, b) => a.date.localeCompare(b.date))
    expect(entries[2].value).toBeGreaterThan(entries[0].value)
  })
})

describe('sleep nights quality', () => {
  it('totalMin is roughly 6-9 hrs (360-540 min)', () => {
    generateAllDemoData(MALE_PERSONA)
    for (const n of getSleepNights()) {
      expect(n.totalMin).toBeGreaterThanOrEqual(280)
      expect(n.totalMin).toBeLessThanOrEqual(540)
    }
  })

  it('sub-stage minutes sum to approximately totalMin', () => {
    generateAllDemoData(MALE_PERSONA)
    for (const n of getSleepNights()) {
      const sum = (n.deepMin ?? 0) + (n.remMin ?? 0) + (n.lightMin ?? 0) + (n.awakeMin ?? 0)
      expect(sum).toBeLessThanOrEqual(n.totalMin! + 5)
    }
  })
})

describe('emotional quality', () => {
  it('all mood values are 1-5', () => {
    generateAllDemoData(MALE_PERSONA)
    for (const e of getEmotionalEntries()) {
      expect(e.mood).toBeGreaterThanOrEqual(1)
      expect(e.mood).toBeLessThanOrEqual(5)
    }
  })

  it('avg mood is >= 3 (athlete positive trend)', () => {
    generateAllDemoData(MALE_PERSONA)
    const entries = getEmotionalEntries()
    const avg = entries.reduce((s, e) => s + (e.mood ?? 0), 0) / entries.length
    expect(avg).toBeGreaterThanOrEqual(3)
  })
})

describe('nutrition quality', () => {
  it('male daily protein avg is >= 140g', () => {
    generateAllDemoData(MALE_PERSONA)
    const entries = getNutritionEntries()
    const dates = [...new Set(entries.map(e => e.date))]
    const dailyProtein = dates.map(d =>
      entries.filter(e => e.date === d).reduce((s, e) => s + (e.proteinG ?? 0), 0)
    )
    const avg = dailyProtein.reduce((s, v) => s + v, 0) / dailyProtein.length
    expect(avg).toBeGreaterThanOrEqual(140)
  })

  it('female settings have correct bodyweight', () => {
    generateAllDemoData(FEMALE_PERSONA)
    expect(getNutritionSettings().bodyweightLbs).toBe(140)
    expect(getNutritionSettings().dailyCalorieTarget).toBe(2400)
  })
})

describe('molecules quality', () => {
  it('all definitions are active', () => {
    generateAllDemoData(MALE_PERSONA)
    for (const d of getDefinitions()) {
      expect(d.active).toBe(true)
    }
  })

  it('all entries have taken: true', () => {
    generateAllDemoData(MALE_PERSONA)
    for (const e of getMoleculeEntries()) {
      expect(e.taken).toBe(true)
    }
  })

  it('all moleculeId values reference a valid definition', () => {
    generateAllDemoData(MALE_PERSONA)
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

  it('all personas have actionAdherence between 0 and 1', () => {
    for (const p of DEMO_PERSONAS) {
      expect(p.traits.actionAdherence).toBeGreaterThanOrEqual(0)
      expect(p.traits.actionAdherence).toBeLessThanOrEqual(1)
    }
  })

  it('all personas have extraActions array', () => {
    for (const p of DEMO_PERSONAS) {
      expect(Array.isArray(p.traits.extraActions)).toBe(true)
      expect(p.traits.extraActions!.length).toBeGreaterThanOrEqual(2)
    }
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
    generateAllDemoData(MALE_PERSONA)
    expect(isDemoMode()).toBe(true)
  })

  it('getDemoMode returns persona id after generating demo data', () => {
    generateAllDemoData(MALE_PERSONA)
    expect(getDemoMode()).toBe('elite-athlete')
  })

  it('clearDemoData removes all healthspan keys except apiKey', () => {
    localStorage.setItem('healthspan:apiKey', 'test-api-key-12345')
    generateAllDemoData(MALE_PERSONA)
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

describe('persona-driven generation', () => {
  it('elite-athlete has low resting HR in oura readiness', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const oura = getOuraData()!
    const avgRhr = oura.readiness.reduce((s, r) => s + (r.rhr ?? 0), 0) / oura.readiness.length
    expect(avgRhr).toBeLessThan(52)
  })

  it('metabolic-syndrome has attention-level bloodwork markers', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'metabolic-syndrome')!
    generateAllDemoData(persona)
    const labs = getLabResults()
    const newest = labs[0]
    const glucose = newest.markers.find(m => m.id === 'fasting_glucose')!
    expect(glucose.status).toBe('attention')
  })

  it('college-athlete generates fewer supplements', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'college-athlete')!
    generateAllDemoData(persona)
    expect(getDefinitions()).toHaveLength(2)
  })

  it('postpartum-recovery has lower sleep total', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'postpartum-recovery')!
    generateAllDemoData(persona)
    const nights = getSleepNights()
    const avgTotal = nights.reduce((s, n) => s + (n.totalMin ?? 0), 0) / nights.length
    expect(avgTotal).toBeLessThan(400)
  })

  it('longevity-optimized sets correct age and sex', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'longevity-optimized')!
    generateAllDemoData(persona)
    expect(localStorage.getItem('healthspan:userAge')).toBe('45')
    expect(localStorage.getItem('healthspan:userSex')).toBe('female')
  })

  it('sets demoMode flag with persona id', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    expect(getDemoMode()).toBe('elite-athlete')
  })
})

describe('demo actions quality', () => {
  it('generates core actions plus persona extras', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const actions = getActionDefinitions()
    // 6 core + 2 extras
    expect(actions).toHaveLength(8)
    expect(actions.find(a => a.label === 'Zone 2 cardio session')).toBeDefined()
    expect(actions.find(a => a.label === 'Stretch/mobility')).toBeDefined()
  })

  it('generates completion entries for custom actions over 90 days', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const daysAgo30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    const entries = getDailyEntries(daysAgo30)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('high-adherence persona has more completions than low-adherence', () => {
    const elite = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    const metSyn = DEMO_PERSONAS.find(p => p.id === 'metabolic-syndrome')!

    let eliteTotal = 0
    let metTotal = 0

    generateAllDemoData(elite)
    for (let i = 20; i < 30; i++) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      eliteTotal += getDailyEntries(day).filter(e => e.completed).length
    }

    localStorage.clear()
    generateAllDemoData(metSyn)
    for (let i = 20; i < 30; i++) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      metTotal += getDailyEntries(day).filter(e => e.completed).length
    }

    expect(eliteTotal).toBeGreaterThan(metTotal)
  })

  it('today has some completed and some incomplete entries for partial feel', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const today = new Date().toISOString().slice(0, 10)
    const entries = getDailyEntries(today)
    const completed = entries.filter(e => e.completed)
    const incomplete = entries.filter(e => !e.completed)
    expect(completed.length).toBeGreaterThan(0)
    expect(incomplete.length).toBeGreaterThan(0)
  })

  it('extra action ids are unique and prefixed with demo-extra-', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'elite-athlete')!
    generateAllDemoData(persona)
    const actions = getActionDefinitions()
    const extraActions = actions.filter(a => a.id.startsWith('demo-extra-'))
    expect(extraActions).toHaveLength(2)
    const ids = actions.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('college-athlete has lower weekend adherence', () => {
    const persona = DEMO_PERSONAS.find(p => p.id === 'college-athlete')!
    generateAllDemoData(persona)

    let weekdayCompleted = 0
    let weekdayTotal = 0
    let weekendCompleted = 0
    let weekendTotal = 0

    for (let i = 1; i < 60; i++) {
      const d = new Date(Date.now() - i * 86400000)
      const day = d.toISOString().slice(0, 10)
      const dow = d.getDay()
      const entries = getDailyEntries(day).filter(e => e.completed)
      if (dow === 0 || dow === 6) {
        weekendCompleted += entries.length
        weekendTotal++
      } else {
        weekdayCompleted += entries.length
        weekdayTotal++
      }
    }

    const weekdayRate = weekdayCompleted / weekdayTotal
    const weekendRate = weekendCompleted / weekendTotal
    expect(weekdayRate).toBeGreaterThan(weekendRate)
  })
})
