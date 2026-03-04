import Anthropic from '@anthropic-ai/sdk'
import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'
import type { ParsedLabDoc } from '../types/bloodwork'

export function buildLabParserPrompt(): string {
  const markerList = BLOODWORK_MARKERS
    .filter(m => !m.computed)
    .map(m => `- ${m.name} (${m.unit})`)
    .join('\n')

  return `You are a medical lab report parser. Extract bloodwork marker values from the provided lab document image.

MARKERS TO EXTRACT (only these, do not include any others):
${markerList}

RESPONSE FORMAT — return ONLY valid JSON, no explanation, no markdown, no other text:
{
  "markers": [
    {
      "name": "exact marker name from the list above",
      "value": 85,
      "unit": "unit string exactly as shown on the document",
      "rawText": "exact text as it appears on the document",
      "confidence": "high" or "low"
    }
  ],
  "drawDate": "YYYY-MM-DD or empty string if not found",
  "institution": "lab name or empty string if not found"
}

RULES:
- Only include markers you can clearly identify in the document. Do NOT guess.
- Set confidence to "low" if the value is hard to read or you are uncertain about it.
- If a marker appears multiple times, use the most recent or clearly labeled result.
- Include only the patient's actual result value, not reference ranges.
- If you cannot find any recognized markers, return: {"markers":[],"drawDate":"","institution":""}`
}

export function parseClaudeResponse(text: string): ParsedLabDoc | null {
  try {
    // Try to extract content between first ``` pair
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const cleaned = fenceMatch ? fenceMatch[1].trim() : text.trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed.markers)) return null
    // Validate each marker has required fields with correct types
    const validMarkers = parsed.markers.filter((m: unknown) => {
      if (typeof m !== 'object' || m === null) return false
      const marker = m as Record<string, unknown>
      return (
        typeof marker.name === 'string' && marker.name.length > 0 &&
        typeof marker.value === 'number' && !isNaN(marker.value) &&
        typeof marker.unit === 'string' &&
        typeof marker.rawText === 'string' &&
        (marker.confidence === 'high' || marker.confidence === 'low')
      )
    })
    parsed.markers = validMarkers
    return parsed as ParsedLabDoc
  } catch {
    return null
  }
}

export async function parseLabDocument(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  apiKey: string
): Promise<ParsedLabDoc> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: imageBase64 },
          },
          {
            type: 'text',
            text: buildLabParserPrompt(),
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const parsed = parseClaudeResponse(textBlock.text)
  if (!parsed) {
    throw new Error('Claude returned invalid JSON — please try again')
  }

  return parsed
}
