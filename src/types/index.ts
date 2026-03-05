// ─── Oura Data Types ───

export interface DailySleep {
  day: string
  score?: number
  deep?: number
  rem?: number
  efficiency?: number
  latency?: number
  total?: number
  restfulness?: number
}

export interface SleepDetail {
  day: string
  avg_hr?: number
  avg_hrv?: number
  lowest_hr?: number
  deep_s?: number
  rem_s?: number
  light_s?: number
  total_s?: number
  efficiency?: number
  avg_breath?: number
  // Computed
  deep_h?: number | null
  rem_h?: number | null
  light_h?: number | null
  total_h?: number | null
}

export interface DailyActivity {
  day: string
  score?: number
  steps?: number
  active_cal?: number
  total_cal?: number
  walking_dist?: number
  high_time?: number
  med_time?: number
  low_time?: number
}

export interface DailyReadiness {
  day: string
  score?: number
  temp_dev?: number
  hrv_balance?: number
  recovery?: number
  rhr?: number
  body_temp?: number
  prev_night?: number
  activity_bal?: number
}

export interface DailySpo2 {
  day: string
  avg?: number
  bdi?: number
}

export interface DailyStress {
  day: string
  summary?: string
  recovery_high?: number
  stress_high?: number
}

export interface CvAge {
  day: string
  vascular_age?: number
}

export interface Workout {
  day: string
  activity?: string
  calories?: number
  intensity?: string
  distance?: number
  start?: string
  end?: string
}

export interface DailyResilience {
  day: string
  level?: string
  sleep_recovery?: number
  daytime_recovery?: number
  stress?: number
}

export interface SleepTime {
  day: string
  status?: string
  recommendation?: string
}

export interface OuraData {
  sleep: DailySleep[]
  sleepDetail: SleepDetail[]
  activity: DailyActivity[]
  readiness: DailyReadiness[]
  spo2: DailySpo2[]
  stress: DailyStress[]
  cvAge: CvAge[]
  workouts: Workout[]
  resilience: DailyResilience[]
  sleeptime: SleepTime[]
}

// ─── Trend Engine Types ───

export type TrendDirection = 'improving' | 'stable' | 'declining'
export type TrendZone = 'optimal' | 'acceptable' | 'attention'
export type MetricCategory = 'Sleep' | 'Heart' | 'Activity' | 'Recovery'

export interface MetricDefinition {
  id: string
  name: string
  src: keyof OuraData
  key: string
  higherBetter: boolean | null
  target: [number, number]
  unit: string
  category: MetricCategory
  weight: number
}

export interface TrendResult {
  latest: number | null
  current: number
  baseline: number
  delta: number
  pctChange: number
  direction: TrendDirection
  zone: TrendZone
  recentAvg: number | null
  midAvg: number | null
  longAvg: number | null
  allAvg: number | null
  sparkline: number[]
}
