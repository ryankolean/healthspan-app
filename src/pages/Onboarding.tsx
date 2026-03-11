import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Watch, FileText, Check, Upload, X } from 'lucide-react'
import { saveUserProfile, setOnboardingComplete } from '../utils/profile-storage'
import type { BirthSex, GenderIdentity, UserProfile } from '../types/profile'

const WEARABLES = [
  { name: 'Oura Ring', format: 'JSON' },
  { name: 'Apple Watch', format: 'XML' },
  { name: 'Fitbit', format: 'JSON' },
  { name: 'WHOOP', format: 'JSON' },
  { name: 'Strava', format: 'JSON' },
  { name: 'Hevy', format: 'CSV' },
] as const

const FORMAT_ACCEPT: Record<string, string> = {
  JSON: '.json',
  XML: '.xml',
  CSV: '.csv',
}

const STEPS = [
  { label: 'Profile', icon: User },
  { label: 'Wearables', icon: Watch },
  { label: 'Health Records', icon: FileText },
]

function WearableCard({ name, format }: { name: string; format: string }) {
  const [imported, setImported] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] transition-colors text-left ${
        imported ? 'border-brand-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{name}</span>
        {imported && <Check className="w-4 h-4 text-brand-400" />}
      </div>
      <span className="text-xs text-white/40">{format}</span>
      {imported && (
        <span className="block text-xs text-brand-400 mt-1">Imported</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={FORMAT_ACCEPT[format]}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) setImported(true)
        }}
      />
    </button>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Step 3 file state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const healthFileInputRef = useRef<HTMLInputElement>(null)

  // Step 1 form state
  const [age, setAge] = useState('')
  const [birthSex, setBirthSex] = useState('')
  const [genderIdentity, setGenderIdentity] = useState('')
  const [height, setHeight] = useState('')
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg')
  const [referenceRange, setReferenceRange] = useState('')

  const profileComplete =
    age !== '' &&
    birthSex !== '' &&
    genderIdentity !== '' &&
    height !== '' &&
    weight !== '' &&
    (birthSex !== 'intersex' || referenceRange !== '')

  function handleProfileNext() {
    const heightCm = heightUnit === 'ft' ? parseFloat(height) * 2.54 : parseFloat(height)
    const weightKg = weightUnit === 'lbs' ? parseFloat(weight) * 0.453592 : parseFloat(weight)

    const profile: UserProfile = {
      age: parseInt(age, 10),
      birthSex: birthSex as BirthSex,
      genderIdentity: genderIdentity as GenderIdentity,
      heightCm,
      weightKg,
    }

    if (birthSex === 'intersex' && referenceRange) {
      profile.referenceRange = referenceRange as 'male' | 'female'
    }

    saveUserProfile(profile)
    setStep(1)
  }

  function handleFinish() {
    setOnboardingComplete()
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${isDone ? 'bg-brand-500' : 'bg-white/[0.08]'}`}
                />
              )}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : isDone
                      ? 'bg-brand-500/20 text-brand-400'
                      : 'bg-white/[0.04] text-white/40'
                }`}
                aria-label={`Step ${i + 1}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-md">
        {/* Step 0: Profile */}
        {step === 0 && (
          <div>
            <h1 className="text-2xl font-bold mb-1">Your Profile</h1>
            <p className="text-white/60 mb-6 text-sm">
              Tell us about yourself so we can personalize your experience.
            </p>

            <div className="space-y-4">
              {/* Age */}
              <div>
                <label htmlFor="age" className="block text-sm font-medium mb-1">
                  Age
                </label>
                <input
                  id="age"
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-500"
                  placeholder="Enter your age"
                />
              </div>

              {/* Birth Sex */}
              <div>
                <label htmlFor="birthSex" className="block text-sm font-medium mb-1">
                  Birth Sex
                </label>
                <select
                  id="birthSex"
                  value={birthSex}
                  onChange={(e) => {
                    setBirthSex(e.target.value)
                    if (e.target.value !== 'intersex') setReferenceRange('')
                  }}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="intersex">Intersex</option>
                </select>
              </div>

              {/* Reference Range (conditional) */}
              {birthSex === 'intersex' && (
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
                  <label htmlFor="referenceRange" className="block text-sm font-medium mb-1">
                    Reference Range
                  </label>
                  <p className="text-white/50 text-xs mb-2">
                    Lab reference ranges differ by sex. Choose which range to use for your results.
                  </p>
                  <select
                    id="referenceRange"
                    value={referenceRange}
                    onChange={(e) => setReferenceRange(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              )}

              {/* Gender Identity */}
              <div>
                <label htmlFor="genderIdentity" className="block text-sm font-medium mb-1">
                  Gender Identity
                </label>
                <select
                  id="genderIdentity"
                  value={genderIdentity}
                  onChange={(e) => setGenderIdentity(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="trans-male">Trans Male</option>
                  <option value="trans-female">Trans Female</option>
                  <option value="intersex">Intersex</option>
                </select>
              </div>

              {/* Height */}
              <div>
                <label htmlFor="height" className="block text-sm font-medium mb-1">
                  Height
                </label>
                <div className="flex gap-2">
                  <input
                    id="height"
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-500"
                    placeholder={heightUnit === 'cm' ? 'cm' : 'inches'}
                  />
                  <button
                    type="button"
                    onClick={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')}
                    className="px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white/60 hover:text-white"
                  >
                    {heightUnit}
                  </button>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label htmlFor="weight" className="block text-sm font-medium mb-1">
                  Weight
                </label>
                <div className="flex gap-2">
                  <input
                    id="weight"
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-brand-500"
                    placeholder={weightUnit === 'kg' ? 'kg' : 'lbs'}
                  />
                  <button
                    type="button"
                    onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
                    className="px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white/60 hover:text-white"
                  >
                    {weightUnit}
                  </button>
                </div>
              </div>
            </div>

            <button
              disabled={!profileComplete}
              onClick={handleProfileNext}
              className="w-full mt-6 py-2.5 rounded-lg font-medium bg-brand-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 1: Wearables */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-1">Connect Wearables</h1>
            <p className="text-white/60 mb-6 text-sm">
              Import data from your devices to automatically track your health.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {WEARABLES.map((w) => (
                <WearableCard key={w.name} name={w.name} format={w.format} />
              ))}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-lg font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-lg font-medium bg-white/[0.06] text-white/60 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Health Records */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold mb-1">Health Records</h1>
            <p className="text-white/60 mb-6 text-sm">
              Upload lab reports to get a comprehensive view of your well-being. You can process them later from the Bloodwork page.
            </p>

            {/* Drop zone */}
            <button
              type="button"
              onClick={() => healthFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files.length) {
                  setUploadedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
                }
              }}
              className="w-full border-2 border-dashed border-white/[0.12] rounded-xl p-8 flex flex-col items-center gap-3 hover:border-white/[0.24] transition-colors cursor-pointer"
            >
              <Upload className="w-8 h-8 text-white/40" />
              <span className="text-sm text-white/60">
                Drag and drop files here, or click to browse
              </span>
              <span className="text-xs text-white/30">Accepts JPG, PNG, PDF</span>
            </button>
            <input
              ref={healthFileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                }
              }}
            />

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-white truncate block">{file.name}</span>
                      <span className="text-xs text-white/40">
                        {file.size < 1024
                          ? `${file.size} B`
                          : file.size < 1024 * 1024
                            ? `${(file.size / 1024).toFixed(1)} KB`
                            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="ml-2 p-1 text-white/40 hover:text-white transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 mt-6">
              <button
                onClick={handleFinish}
                className="w-full py-2.5 rounded-lg font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Finish
              </button>
              <button
                onClick={handleFinish}
                className="w-full py-2.5 rounded-lg font-medium bg-white/[0.06] text-white/60 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
