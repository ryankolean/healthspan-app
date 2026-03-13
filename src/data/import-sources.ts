export type ImportDomain = 'sleep' | 'exercise' | 'body-composition' | 'nutrition' | 'heart' | 'activity'

export interface ImportSource {
  id: string
  name: string
  category: 'scale' | 'wearable' | 'app'
  fileFormats: ('json' | 'csv' | 'xml')[]
  domains: ImportDomain[]
  parserStatus: 'supported' | 'planned' | 'not-started'
  parserPath?: string
  futureApi?: {
    hasPublicApi: boolean
    apiUrl?: string
    requiresOAuth: boolean
    notes: string
  }
}

export const IMPORT_SOURCES: readonly ImportSource[] = [
  // Wearables — already supported
  {
    id: 'oura',
    name: 'Oura Ring',
    category: 'wearable',
    fileFormats: ['json'],
    domains: ['sleep', 'exercise', 'heart', 'activity'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://cloud.ouraring.com/v2/docs', requiresOAuth: true, notes: 'REST API with OAuth2, comprehensive sleep/activity/readiness data' },
  },
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    category: 'wearable',
    fileFormats: ['xml'],
    domains: ['sleep', 'exercise', 'heart'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.apple.com/documentation/healthkit', requiresOAuth: false, notes: 'HealthKit API — native iOS only, no REST API' },
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    category: 'wearable',
    fileFormats: ['csv'],
    domains: ['sleep'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.whoop.com', requiresOAuth: true, notes: 'REST API with OAuth2, recovery/strain/sleep data' },
  },
  // Wearables — planned
  {
    id: 'garmin',
    name: 'Garmin',
    category: 'wearable',
    fileFormats: ['csv'],
    domains: ['sleep', 'exercise', 'body-composition', 'heart', 'activity'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.garmin.com/health-api/overview/', requiresOAuth: true, notes: 'Garmin Health API — comprehensive, requires partner agreement' },
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    category: 'wearable',
    fileFormats: ['json'],
    domains: ['sleep', 'exercise', 'body-composition', 'heart', 'activity'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, apiUrl: 'https://dev.fitbit.com/build/reference/web-api/', requiresOAuth: true, notes: 'Google-owned REST API with OAuth2, broad data access' },
  },
  {
    id: 'samsung',
    name: 'Samsung Health',
    category: 'wearable',
    fileFormats: ['csv'],
    domains: ['sleep', 'exercise', 'body-composition', 'activity'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'Health Connect on Android only — no REST API for web apps' },
  },
  // Scales
  {
    id: 'withings-scale',
    name: 'Withings Scale',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developer.withings.com/api-reference', requiresOAuth: true, notes: 'Well-documented REST API, weight + body comp measurements' },
  },
  {
    id: 'garmin-scale',
    name: 'Garmin Index S2',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, requiresOAuth: true, notes: 'Uses same Garmin Health API as wearables' },
  },
  {
    id: 'renpho',
    name: 'Renpho',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — Bluetooth sync to app only, CSV export available' },
  },
  {
    id: 'eufy',
    name: 'Eufy Smart Scale',
    category: 'scale',
    fileFormats: ['csv'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — app-only with CSV export' },
  },
  {
    id: 'fitbit-scale',
    name: 'Fitbit Aria',
    category: 'scale',
    fileFormats: ['json'],
    domains: ['body-composition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: true, requiresOAuth: true, notes: 'Uses Fitbit Web API body endpoints' },
  },
  // Apps — already supported
  {
    id: 'strava',
    name: 'Strava',
    category: 'app',
    fileFormats: ['json'],
    domains: ['exercise'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: true, apiUrl: 'https://developers.strava.com', requiresOAuth: true, notes: 'REST API with OAuth2, activity data' },
  },
  {
    id: 'hevy',
    name: 'Hevy',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['exercise'],
    parserStatus: 'supported',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — CSV export only' },
  },
  // Apps — planned
  {
    id: 'strong',
    name: 'Strong',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['exercise'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — CSV export only' },
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['nutrition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — Premium CSV export only' },
  },
  {
    id: 'cronometer',
    name: 'Cronometer',
    category: 'app',
    fileFormats: ['csv'],
    domains: ['nutrition'],
    parserStatus: 'planned',
    futureApi: { hasPublicApi: false, requiresOAuth: false, notes: 'No public API — CSV/spreadsheet export' },
  },
] as const
