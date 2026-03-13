export type SleepSource = 'oura' | 'apple_health' | 'whoop' | 'garmin' | 'fitbit' | 'samsung' | 'manual'

export interface SleepNight {
  id: string
  source: SleepSource
  sourceId: string
  date: string                    // YYYY-MM-DD (sleep start date)
  bedtime?: string                // ISO 8601 datetime
  wakeTime?: string               // ISO 8601 datetime
  totalMin?: number
  deepMin?: number
  remMin?: number
  lightMin?: number
  awakeMin?: number
  efficiency?: number             // percentage
  onsetMin?: number               // sleep onset latency
  avgHr?: number
  lowestHr?: number
  avgHrv?: number                 // ms
  avgBreath?: number              // breaths per minute
  spo2Avg?: number                // percentage
  sleepScore?: number             // 0-100
  qualityRating?: number          // manual: 1-5
  flaggedConflict?: boolean
  resolvedBy?: 'priority' | 'manual'
  createdAt: number
}

export interface SleepSettings {
  globalPriority: readonly SleepSource[]
}

export const DEFAULT_SLEEP_SETTINGS = Object.freeze({
  globalPriority: Object.freeze(['oura', 'apple_health', 'whoop', 'garmin', 'fitbit', 'samsung', 'manual'] as const),
}) satisfies SleepSettings
