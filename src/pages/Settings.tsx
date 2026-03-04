import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Key, Upload, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { getApiKey, setApiKey, clearApiKey } from '../utils/lab-storage'
import { saveOuraData, hasOuraData } from '../utils/oura-storage'
import type { OuraData } from '../types'

export default function Settings() {
  const [apiKey, setApiKeyState] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [ouraImported, setOuraImported] = useState(false)
  const [ouraError, setOuraError] = useState('')

  useEffect(() => {
    const existing = getApiKey()
    if (existing) setApiKeyState(existing)
    setOuraImported(hasOuraData())
  }, [])

  function handleSaveKey() {
    if (!apiKey.startsWith('sk-ant-')) {
      alert('Key should start with sk-ant- — double-check you copied it correctly.')
      return
    }
    setApiKey(apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClearKey() {
    clearApiKey()
    setApiKeyState('')
  }

  function handleOuraImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOuraError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string) as OuraData
        if (!json.sleep || !json.activity) throw new Error('Invalid Oura export format')
        saveOuraData(json)
        setOuraImported(true)
      } catch {
        setOuraError('Invalid file — make sure you export from Oura and use the JSON format.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon size={22} className="text-brand-400" />
        <h1 className="text-xl font-bold text-gray-100">Settings</h1>
      </div>

      {/* ─── API Key Section ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Anthropic API Key</h2>
        </div>

        <p className="text-sm text-gray-400 mb-5">
          Required for parsing lab documents with Claude Vision. Your key is stored only in your browser and never sent anywhere except Anthropic's API.
        </p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">How to get your API key</p>
          {[
            'Go to console.anthropic.com and sign in (or create a free account)',
            'Click "API Keys" in the left sidebar',
            'Click "Create Key" and give it a name like "Healthspan App"',
            'Copy the key — it starts with sk-ant-...',
            'Paste it in the field below and click Save',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKeyState(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500/50 pr-10"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleSaveKey}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saved ? '✓ Saved' : 'Save'}
          </button>
          {apiKey && (
            <button
              onClick={handleClearKey}
              className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 text-sm rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* ─── Oura Data Import Section ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Oura Ring Data</h2>
          {ouraImported && <CheckCircle size={14} className="text-emerald-400 ml-auto" />}
        </div>

        <p className="text-sm text-gray-400 mb-5">
          Import your Oura Ring data export. This data is stored locally in your browser only.
        </p>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">How to export Oura data</p>
          {[
            'Go to membership.ouraring.com/data-export',
            'Select JSON format and your date range',
            'Download the export file',
            'Upload it below',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {ouraImported && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 mb-4">
            <CheckCircle size={14} />
            Oura data imported successfully
          </div>
        )}

        {ouraError && (
          <div className="flex items-center gap-2 text-sm text-red-400 mb-4">
            <AlertCircle size={14} />
            {ouraError}
          </div>
        )}

        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm rounded-xl cursor-pointer transition-colors">
          <Upload size={14} />
          {ouraImported ? 'Replace Oura Data' : 'Import Oura JSON'}
          <input type="file" accept=".json" onChange={handleOuraImport} className="hidden" />
        </label>
      </section>
    </div>
  )
}
