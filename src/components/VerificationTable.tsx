import { useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import type { ParsedMarker } from '../types/bloodwork'
import { validateMarkerValue } from '../utils/lab-validation'
import { BLOODWORK_MARKERS } from '../data/bloodwork-metrics'

interface VerificationRow {
  parsed: ParsedMarker
  editedValue: string
  editedUnit: string
  validation: { flagged: boolean; flagReason?: string }
}

export interface VerificationRowResult {
  parsed: ParsedMarker
  editedValue: string
  editedUnit: string
  validation: { flagged: boolean; flagReason?: string }
}

interface VerificationTableProps {
  markers: ParsedMarker[]
  drawDate: string
  institution: string
  onConfirm: (rows: VerificationRowResult[]) => void
  onCancel: () => void
}

function getMarkerId(name: string): string {
  return BLOODWORK_MARKERS.find(
    def => def.name.toLowerCase() === name.toLowerCase()
  )?.id ?? name.toLowerCase().replace(/\s+/g, '_')
}

export default function VerificationTable({
  markers, drawDate, institution, onConfirm, onCancel
}: VerificationTableProps) {
  const [rows, setRows] = useState<VerificationRow[]>(() =>
    markers.map(m => ({
      parsed: m,
      editedValue: String(m.value),
      editedUnit: m.unit,
      validation: validateMarkerValue(getMarkerId(m.name), m.value, m.unit),
    }))
  )

  function updateRow(index: number, value: string, unit: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== index) return r
      const numVal = parseFloat(value)
      return {
        ...r,
        editedValue: value,
        editedUnit: unit,
        validation: isNaN(numVal)
          ? { flagged: true, flagReason: 'Enter a valid number' }
          : validateMarkerValue(getMarkerId(r.parsed.name), numVal, unit),
      }
    }))
  }

  const flaggedCount = rows.filter(r => r.validation.flagged || r.parsed.confidence === 'low').length

  const notFound = BLOODWORK_MARKERS.filter(def =>
    !def.computed &&
    !markers.some(m => m.name.toLowerCase() === def.name.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-100">Review Parsed Results</h2>
          <p className="text-xs text-gray-500 mt-0.5">{institution} · {drawDate}</p>
        </div>
        {flaggedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-1.5">
            <AlertTriangle size={12} />
            {flaggedCount} item{flaggedCount > 1 ? 's' : ''} need review
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.03]">
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Marker</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Value</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Unit</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Raw Text</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((row, i) => {
              const needsReview = row.validation.flagged || row.parsed.confidence === 'low'
              return (
                <tr key={i} className={needsReview ? 'bg-amber-400/5' : ''}>
                  <td className="px-4 py-3 text-gray-300 font-medium">{row.parsed.name}</td>
                  <td className="px-4 py-3">
                    <input
                      value={row.editedValue}
                      onChange={e => updateRow(i, e.target.value, row.editedUnit)}
                      className="w-24 bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-gray-200 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row.editedUnit}
                      onChange={e => updateRow(i, row.editedValue, e.target.value)}
                      className="w-20 bg-white/[0.06] border border-white/[0.1] rounded-lg px-2 py-1 text-gray-400 text-sm focus:outline-none focus:border-brand-500/50"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={row.parsed.rawText}>
                    {row.parsed.rawText}
                  </td>
                  <td className="px-4 py-3">
                    {needsReview ? (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <AlertTriangle size={11} />
                        {row.parsed.confidence === 'low' ? 'Low confidence' : 'Check value'}
                      </div>
                    ) : (
                      <CheckCircle size={14} className="text-emerald-500" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {notFound.length > 0 && (
        <div className="text-xs text-gray-600 bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
          <p className="text-gray-500 font-medium mb-1">Not found in document ({notFound.length}):</p>
          <p className="text-gray-600">{notFound.map(m => m.name).join(', ')}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onConfirm(rows)}
          className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Confirm & Save
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 text-sm rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
