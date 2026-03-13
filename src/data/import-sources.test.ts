import { IMPORT_SOURCES } from './import-sources'

describe('IMPORT_SOURCES', () => {
  it('has 15 sources', () => {
    expect(IMPORT_SOURCES).toHaveLength(15)
  })

  it('every source has required fields', () => {
    for (const src of IMPORT_SOURCES) {
      expect(src.id).toBeTruthy()
      expect(src.name).toBeTruthy()
      expect(['scale', 'wearable', 'app']).toContain(src.category)
      expect(src.fileFormats.length).toBeGreaterThan(0)
      expect(src.domains.length).toBeGreaterThan(0)
      expect(['supported', 'planned', 'not-started']).toContain(src.parserStatus)
    }
  })

  it('has unique ids', () => {
    const ids = IMPORT_SOURCES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('already-supported sources have parserStatus supported', () => {
    const supported = IMPORT_SOURCES.filter(s => s.parserStatus === 'supported')
    const supportedIds = supported.map(s => s.id)
    expect(supportedIds).toContain('oura')
    expect(supportedIds).toContain('apple-watch')
    expect(supportedIds).toContain('whoop')
    expect(supportedIds).toContain('strava')
    expect(supportedIds).toContain('hevy')
  })

  it('sources with futureApi have required fields', () => {
    const withApi = IMPORT_SOURCES.filter(s => s.futureApi)
    for (const src of withApi) {
      expect(typeof src.futureApi!.hasPublicApi).toBe('boolean')
      expect(typeof src.futureApi!.requiresOAuth).toBe('boolean')
      expect(src.futureApi!.notes).toBeTruthy()
    }
  })
})
