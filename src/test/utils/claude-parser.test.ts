import { describe, it, expect } from 'vitest'
import { buildLabParserPrompt, parseClaudeResponse } from '@/utils/claude-parser'

describe('buildLabParserPrompt', () => {
  it('returns a non-empty prompt string', () => {
    const prompt = buildLabParserPrompt()
    expect(prompt.length).toBeGreaterThan(100)
    expect(prompt).toContain('JSON')
  })

  it('includes core marker names in the prompt', () => {
    const prompt = buildLabParserPrompt()
    expect(prompt).toContain('ApoB')
    expect(prompt).toContain('HbA1c')
    expect(prompt).toContain('Vitamin D')
  })

  it('does not include computed markers (HOMA-IR) in the extraction list', () => {
    const prompt = buildLabParserPrompt()
    // HOMA-IR is computed, not parsed from documents
    expect(prompt).not.toContain('HOMA-IR')
  })
})

describe('parseClaudeResponse', () => {
  it('parses valid JSON response', () => {
    const json = JSON.stringify({
      markers: [{ name: 'ApoB', value: 85, unit: 'mg/dL', rawText: 'ApoB 85', confidence: 'high' }],
      drawDate: '2026-03-01',
      institution: 'LabCorp',
    })
    const result = parseClaudeResponse(json)
    expect(result).not.toBeNull()
    expect(result!.markers).toHaveLength(1)
    expect(result!.markers[0].name).toBe('ApoB')
  })

  it('returns null for invalid JSON', () => {
    expect(parseClaudeResponse('not json')).toBeNull()
  })

  it('returns null if markers field is missing', () => {
    expect(parseClaudeResponse(JSON.stringify({ drawDate: '2026-03-01' }))).toBeNull()
  })

  it('strips markdown code block if present', () => {
    const wrapped = '```json\n{"markers":[],"drawDate":"2026-03-01","institution":"Quest"}\n```'
    const result = parseClaudeResponse(wrapped)
    expect(result).not.toBeNull()
    expect(result!.drawDate).toBe('2026-03-01')
  })

  it('handles plain code block without json language tag', () => {
    const wrapped = '```\n{"markers":[],"drawDate":"2026-03-01","institution":"Quest"}\n```'
    const result = parseClaudeResponse(wrapped)
    expect(result).not.toBeNull()
  })
})
