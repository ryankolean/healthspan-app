import { useState, useEffect } from 'react'
import { TestTube, Plus, AlertTriangle } from 'lucide-react'
import UploadZone from '../components/UploadZone'
import VerificationTable, { type VerificationRowResult } from '../components/VerificationTable'
import { parseLabDocument } from '../utils/claude-parser'
import { validateMarkerValue, computeMarkerStatus, computeHomaIr } from '../utils/lab-validation'
import { saveLabResult, getLabResults, getApiKey } from '../utils/lab-storage'
import { BLOODWORK_MARKERS, BLOODWORK_PANELS } from '../data/bloodwork-metrics'
import type { LabResult, BloodMarker, ParsedLabDoc } from '../types/bloodwork'
import { Link } from 'react-router-dom'

type View = 'list' | 'upload' | 'verify' | 'detail'

export default function Bloodwork() {
  const [view, setView] = useState<View>('list')
  const [results, setResults] = useState<LabResult[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsedDoc, setParsedDoc] = useState<ParsedLabDoc | null>(null)
  const apiKey = getApiKey()

  useEffect(() => {
    setResults(getLabResults())
  }, [])

  async function handleFile(base64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') {
    if (!apiKey) {
      setParseError('No API key set. Go to Settings first.')
      return
    }
    setParsing(true)
    setParseError('')
    try {
      const doc = await parseLabDocument(base64, mimeType, apiKey)
      setParsedDoc(doc)
      setView('verify')
    } catch (e: unknown) {
      setParseError((e instanceof Error ? e.message : null) ?? 'Parsing failed. Try again.')
    } finally {
      setParsing(false)
    }
  }

  function handleConfirm(rows: VerificationRowResult[]) {
    if (!parsedDoc) return
    const drawDate = parsedDoc.drawDate || new Date().toISOString().split('T')[0]
    const id = `lab-${drawDate}`

    const glucoseRow = rows.find(r => r.parsed.name.toLowerCase().includes('glucose'))
    const insulinRow = rows.find(r => r.parsed.name.toLowerCase().includes('insulin'))
    const homaIrValue = computeHomaIr(
      glucoseRow ? parseFloat(glucoseRow.editedValue) : null,
      insulinRow ? parseFloat(insulinRow.editedValue) : null,
    )

    const markers: BloodMarker[] = rows
      .filter(r => !isNaN(parseFloat(r.editedValue)))
      .map(r => {
        const def = BLOODWORK_MARKERS.find(d => d.name.toLowerCase() === r.parsed.name.toLowerCase())
        const markerId = def?.id ?? r.parsed.name.toLowerCase().replace(/\s+/g, '_')
        const value = parseFloat(r.editedValue)
        const validation = validateMarkerValue(markerId, value, r.editedUnit)
        return {
          id: markerId,
          name: r.parsed.name,
          value,
          unit: r.editedUnit,
          status: computeMarkerStatus(markerId, value),
          flagged: validation.flagged,
          flagReason: validation.flagReason,
          rawText: r.parsed.rawText,
          confidence: r.parsed.confidence,
        }
      })

    if (homaIrValue !== null) {
      markers.push({
        id: 'homa_ir',
        name: 'HOMA-IR',
        value: parseFloat(homaIrValue.toFixed(2)),
        unit: 'index',
        status: computeMarkerStatus('homa_ir', homaIrValue),
      })
    }

    const result: LabResult = {
      id,
      drawDate,
      institution: parsedDoc.institution || 'Unknown',
      markers,
      createdAt: Date.now(),
    }

    saveLabResult(result)
    setResults(getLabResults())
    setSelectedId(id)
    setView('detail')
    setParsedDoc(null)
  }

  function labScore(result: LabResult): number {
    if (!result.markers.length) return 0
    let weighted = 0, totalWeight = 0
    result.markers.forEach(m => {
      const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
      const w = def?.weight ?? 3
      const score = m.status === 'optimal' ? 100 : m.status === 'acceptable' ? 65 : 20
      weighted += score * w
      totalWeight += w
    })
    return Math.round(weighted / totalWeight)
  }

  // ─── No API Key Banner (upload attempt without key) ───
  if (!apiKey && view === 'upload') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-400/10 border border-amber-400/20 rounded-[18px] p-6 text-center space-y-3">
          <AlertTriangle size={22} className="text-amber-400 mx-auto" />
          <p className="text-sm text-amber-300 font-medium">API key required to parse lab documents</p>
          <Link to="/settings" className="inline-block text-xs text-brand-400 underline">Go to Settings to add your key →</Link>
        </div>
      </div>
    )
  }

  // ─── Upload View ───
  if (view === 'upload') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-gray-100">Upload Lab Results</h1>
          <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-300">← Back</button>
        </div>
        <UploadZone onFile={handleFile} loading={parsing} />
        {parseError && (
          <p className="text-xs text-red-400 mt-3">{parseError}</p>
        )}
      </div>
    )
  }

  // ─── Verify View ───
  if (view === 'verify' && parsedDoc) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <VerificationTable
          markers={parsedDoc.markers}
          drawDate={parsedDoc.drawDate}
          institution={parsedDoc.institution}
          onConfirm={handleConfirm}
          onCancel={() => setView('upload')}
        />
      </div>
    )
  }

  // ─── Detail / List View ───
  const displayResult = results.find(r => r.id === selectedId) ?? results[0]
  const score = displayResult ? labScore(displayResult) : null
  const scoreColor = score === null ? '#64748b' : score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  const statusCounts = displayResult ? {
    optimal: displayResult.markers.filter(m => m.status === 'optimal').length,
    acceptable: displayResult.markers.filter(m => m.status === 'acceptable').length,
    attention: displayResult.markers.filter(m => m.status === 'attention').length,
  } : null

  const attentionMarkers = displayResult?.markers.filter(m => m.status === 'attention') ?? []

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      optimal: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20',
      acceptable: 'bg-amber-400/15 text-amber-400 border-amber-400/20',
      attention: 'bg-red-400/15 text-red-400 border-red-400/20',
    }
    return `text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${styles[status] ?? 'bg-white/10 text-gray-400 border-white/10'}`
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TestTube size={20} className="text-brand-400" />
          <h1 className="text-xl font-bold text-gray-100">Lab Results</h1>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 1 && (
            <select
              value={selectedId ?? ''}
              onChange={e => setSelectedId(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              {results.map(r => (
                <option key={r.id} value={r.id}>{r.drawDate} — {r.institution}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setView('upload')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={14} />
            Upload Labs
          </button>
        </div>
      </div>

      {!displayResult ? (
        <div className="text-center py-20 text-gray-500 space-y-2">
          <TestTube size={32} className="mx-auto opacity-30" />
          <p className="text-sm">No lab results yet</p>
          <button onClick={() => setView('upload')} className="text-xs text-brand-400 underline">Upload your first lab document →</button>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Lab Score', value: score, color: scoreColor, unit: '/100' },
              { label: 'Optimal', value: statusCounts?.optimal, color: '#10b981', unit: 'markers' },
              { label: 'Acceptable', value: statusCounts?.acceptable, color: '#f59e0b', unit: 'markers' },
              { label: 'Attention', value: statusCounts?.attention, color: '#ef4444', unit: 'markers' },
            ].map(card => (
              <div key={card.label} className="bg-white/[0.04] border border-white/[0.08] rounded-[14px] p-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold font-mono" style={{ color: card.color }}>{card.value ?? '—'}</span>
                  <span className="text-xs text-gray-600">{card.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action items */}
          {attentionMarkers.length > 0 && (
            <div className="bg-red-400/[0.07] border border-red-400/20 rounded-[18px] p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-red-400" />
                <h2 className="text-sm font-semibold text-red-300">Action Items</h2>
              </div>
              <div className="space-y-2">
                {attentionMarkers.map(m => {
                  const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
                  return (
                    <div key={m.id} className="text-xs text-red-300/80">
                      <span className="font-medium">{m.name}</span> ({m.value} {m.unit})
                      {def?.attentionThreshold.high && m.value > def.attentionThreshold.high
                        ? ` is above the attention threshold of ${def.attentionThreshold.high} ${m.unit}`
                        : def?.attentionThreshold.low && m.value < def.attentionThreshold.low
                        ? ` is below the attention threshold of ${def.attentionThreshold.low} ${m.unit}`
                        : ' is outside optimal range'}
                      {' '}— consider discussing with your clinician.
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-red-400/50 mt-3">This is not medical advice. Always consult a qualified clinician.</p>
            </div>
          )}

          {/* Panel breakdown */}
          {BLOODWORK_PANELS.map(panel => {
            const panelMarkers = displayResult.markers.filter(m => {
              const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
              return def?.panel === panel
            })
            if (!panelMarkers.length) return null
            const sorted = [...panelMarkers].sort((a, b) =>
              a.status === 'attention' ? -1 : b.status === 'attention' ? 1 : 0
            )
            return (
              <div key={panel} className="mb-4 bg-white/[0.03] border border-white/[0.07] rounded-[18px] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{panel}</h3>
                  <span className="text-xs text-gray-600">{panelMarkers.length} markers</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {sorted.map(m => {
                    const def = BLOODWORK_MARKERS.find(d => d.id === m.id)
                    const [optLow, optHigh] = def?.optimal ?? [null, null]
                    const rangeStr = optLow !== null && optHigh !== null
                      ? `${optLow}–${optHigh} ${m.unit}`
                      : optHigh !== null ? `<${optHigh} ${m.unit}`
                      : optLow !== null ? `>${optLow} ${m.unit}` : '—'
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-300 font-medium">{m.name}</div>
                          <div className="text-xs text-gray-600 mt-0.5">Optimal: {rangeStr}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono font-semibold text-gray-200">{m.value} <span className="text-xs text-gray-500 font-sans">{m.unit}</span></div>
                        </div>
                        <span className={statusBadge(m.status)}>{m.status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
