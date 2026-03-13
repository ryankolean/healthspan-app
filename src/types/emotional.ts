export type EmotionalSource = 'manual'

export interface EmotionalEntry {
  id: string
  source: EmotionalSource
  date: string                    // YYYY-MM-DD
  timestamp?: string              // ISO 8601 (time of entry)

  // Core metrics (1-5 scale)
  mood?: number                   // 1=very poor, 5=excellent
  stress?: number                 // 1=minimal, 5=severe (lowerIsBetter)
  anxiety?: number                // 1=calm, 5=severe (lowerIsBetter)
  energy?: number                 // 1=exhausted, 5=energized
  wellbeing?: number              // 1=very poor, 5=excellent (WHO-5 adapted)

  // Journal
  journalText?: string            // text entry or voice transcript
  audioId?: string                // reference to IndexedDB audio blob
  hasAudio?: boolean              // quick check without IndexedDB lookup

  createdAt: number
}
