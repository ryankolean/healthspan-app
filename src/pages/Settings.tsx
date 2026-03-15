import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Key, Upload, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { getApiKey, setApiKey, clearApiKey } from '../utils/lab-storage'
import { saveOuraData, hasOuraData } from '../utils/oura-storage'
import { isDemoMode, getActivePersona, clearDemoData, DEMO_PERSONAS, generateAllDemoData } from '../utils/demo-data'
import { IMPORT_SOURCES } from '../data/import-sources'
import type { ImportSource } from '../data/import-sources'
import { getLastImportForSource } from '../utils/import-storage'
import type { OuraData } from '../types'

export default function Settings() {
  const [apiKey, setApiKeyState] = useState('')
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [ouraImported, setOuraImported] = useState(false)
  const [ouraError, setOuraError] = useState('')
  const [apiKeyError, setApiKeyError] = useState('')
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [justCleared, setJustCleared] = useState(false)
  const [userAge, setUserAge] = useState(() => localStorage.getItem('healthspan:userAge') ?? '35')
  const [userBirthSex, setUserBirthSex] = useState(() => localStorage.getItem('healthspan:userBirthSex') ?? 'male')
  const [demoActive] = useState(() => isDemoMode())
  const [activePersona] = useState(() => getActivePersona())

  useEffect(() => {
    const existing = getApiKey()
    if (existing) setApiKeyState(existing)
    setOuraImported(hasOuraData())
    setHasSavedKey(getApiKey() !== null)
  }, [])

  function handleSaveKey() {
    if (!apiKey.startsWith('sk-ant-')) {
      setApiKeyError('Key should start with sk-ant- — double-check you copied it correctly.')
      return
    }
    setApiKey(apiKey)
    setHasSavedKey(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleClearKey() {
    clearApiKey()
    setApiKeyState('')
    setHasSavedKey(false)
    setJustCleared(true)
    setTimeout(() => setJustCleared(false), 2000)
  }

  function saveAge(val: string) {
    setUserAge(val)
    localStorage.setItem('healthspan:userAge', val)
  }
  function saveSex(val: string) {
    setUserBirthSex(val)
    localStorage.setItem('healthspan:userBirthSex', val)
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

  async function handleFileImport(source: ImportSource, file: File) {
    const text = await file.text()

    try {
      switch (source.id) {
        // Existing parsers will be wired up here as they're built
        // For now, only already-supported sources have parsers
        default:
          void text
          alert(`Parser for ${source.name} is not yet implemented.`)
          return
      }
    } catch (err) {
      alert(`Import failed: ${(err as Error).message}`)
    }
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
          Required for parsing lab documents with Claude Vision. Your key is stored only in your browser's local storage and sent only to Anthropic's API — never to any other server. For best practice, create a key with a{' '}
          <span className="text-gray-300">monthly spend limit</span> in the Anthropic console.
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
              onChange={e => { setApiKeyState(e.target.value); setApiKeyError('') }}
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
          {hasSavedKey && (
            <button
              onClick={handleClearKey}
              className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-400 text-sm rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        {apiKeyError && (
          <div className="flex items-center gap-2 text-sm text-red-400 mt-2">
            <AlertCircle size={14} />
            {apiKeyError}
          </div>
        )}
        {justCleared && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 mt-2">
            <CheckCircle size={14} />
            API key cleared
          </div>
        )}
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

      {/* ─── Data Sources ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={16} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Data Sources</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Import health data from your devices and apps. Upload exported files to pull in your data.
        </p>

        {(['wearable', 'scale', 'app'] as const).map(category => {
          const sources = IMPORT_SOURCES.filter(s => s.category === category)
          const label = category === 'wearable' ? 'Wearables' : category === 'scale' ? 'Smart Scales' : 'Apps'

          return (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sources.map(source => {
                  const lastImport = getLastImportForSource(source.id)
                  const isSupported = source.parserStatus === 'supported'

                  return (
                    <div key={source.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-300 font-medium">{source.name}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {source.domains.map(d => (
                            <span key={d} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-500">{d}</span>
                          ))}
                        </div>
                        {lastImport && (
                          <div className="text-[10px] text-gray-600 mt-1">
                            Last import: {lastImport.importedAt.slice(0, 10)} ({lastImport.recordCount} records)
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        {isSupported ? (
                          <label className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 cursor-pointer hover:bg-brand-500/30 transition-colors">
                            Import
                            <input
                              type="file"
                              className="hidden"
                              accept={source.fileFormats.map(f => `.${f}`).join(',')}
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) handleFileImport(source, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] text-gray-600 border border-white/[0.06]">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      {/* ─── Exercise Settings ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mt-6">
        <h2 className="text-sm font-semibold text-gray-300">Exercise</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">Used for max HR calculation (Zone 2/5) and VO2 max longevity target lookup.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Age</label>
            <input
              type="number"
              min={18} max={100}
              value={userAge}
              onChange={e => saveAge(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Birth Sex</label>
            <select
              value={userBirthSex}
              onChange={e => saveSex(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="intersex">Intersex</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─── Demo Mode Section ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Demo Mode</h2>
          {demoActive && (
            <span className="text-[10px] bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full font-medium">Active</span>
          )}
        </div>

        {demoActive && activePersona ? (
          <div className="space-y-4">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-200">{activePersona.name}</span>
                <span className="text-[10px] text-gray-500 bg-white/[0.06] px-1.5 py-0.5 rounded">
                  {activePersona.age}{activePersona.sex === 'male' ? 'M' : 'F'}
                </span>
              </div>
              <p className="text-xs text-gray-500">{activePersona.description}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Switch to a different persona:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_PERSONAS.filter(p => p.id !== activePersona.id).map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => { clearDemoData(); generateAllDemoData(persona); window.location.reload() }}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-left hover:bg-white/[0.06] hover:border-brand-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-300">{persona.name}</span>
                      <span className="text-[10px] text-gray-600">{persona.age}{persona.sex === 'male' ? 'M' : 'F'}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">{persona.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { clearDemoData(); window.location.reload() }}
              className="w-full py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors"
            >
              Clear Demo Data
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 mb-4">
              Load demo data to see the app fully populated with realistic health data.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_PERSONAS.map(persona => (
                <button
                  key={persona.id}
                  onClick={() => { generateAllDemoData(persona); window.location.reload() }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-left hover:bg-white/[0.06] hover:border-brand-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-300">{persona.name}</span>
                    <span className="text-[10px] text-gray-600">{persona.age}{persona.sex === 'male' ? 'M' : 'F'}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{persona.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Onboarding ─── */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-[18px] p-6 mt-6">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-4">Onboarding</h2>
        <p className="text-sm text-gray-400 mb-4">Re-run the setup wizard to update your profile or import new data.</p>
        <button
          onClick={() => {
            localStorage.removeItem('healthspan:onboardingComplete')
            window.location.href = '/onboarding'
          }}
          className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 text-sm rounded-xl transition-colors"
        >
          Re-run Setup Wizard
        </button>
      </section>
    </div>
  )
}
