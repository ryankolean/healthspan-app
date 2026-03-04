export type BloodworkPanel = 'Lipids' | 'Metabolic' | 'CBC' | 'Hormones' | 'Micronutrients'

export interface MarkerDefinition {
  id: string
  name: string
  unit: string
  optimal: [number | null, number | null]
  acceptable: [number | null, number | null]
  attentionThreshold: { low?: number; high?: number }
  panel: BloodworkPanel
  higherBetter: boolean | null
  weight: number
  computed?: boolean
  alternateUnits?: string[]
  notes?: string
}

export const BLOODWORK_PANELS: BloodworkPanel[] = [
  'Lipids', 'Metabolic', 'CBC', 'Hormones', 'Micronutrients',
]

export const BLOODWORK_MARKERS: MarkerDefinition[] = [
  // ─── Lipids & Cardiovascular ───
  {
    id: 'apob', name: 'ApoB', unit: 'mg/dL',
    optimal: [null, 90], acceptable: [null, 110],
    attentionThreshold: { high: 120 },
    panel: 'Lipids', higherBetter: false, weight: 10,
    notes: 'Primary driver of atherosclerosis. Attia target <90 mg/dL.',
  },
  {
    id: 'ldl_c', name: 'LDL-C', unit: 'mg/dL',
    optimal: [null, 100], acceptable: [null, 130],
    attentionThreshold: { high: 160 },
    panel: 'Lipids', higherBetter: false, weight: 7,
  },
  {
    id: 'hdl_c', name: 'HDL-C', unit: 'mg/dL',
    optimal: [60, null], acceptable: [40, null],
    attentionThreshold: { low: 40 },
    panel: 'Lipids', higherBetter: true, weight: 6,
  },
  {
    id: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL',
    optimal: [null, 100], acceptable: [null, 150],
    attentionThreshold: { high: 200 },
    panel: 'Lipids', higherBetter: false, weight: 7,
  },
  {
    id: 'lpa', name: 'Lp(a)', unit: 'nmol/L',
    optimal: [null, 75], acceptable: [null, 100],
    attentionThreshold: { high: 125 },
    panel: 'Lipids', higherBetter: false, weight: 8,
    notes: 'Genetically determined. Elevated Lp(a) significantly increases cardiovascular risk.',
  },
  {
    id: 'hscrp', name: 'hsCRP', unit: 'mg/L',
    optimal: [null, 1.0], acceptable: [null, 3.0],
    attentionThreshold: { high: 3.0 },
    panel: 'Lipids', higherBetter: false, weight: 7,
  },

  // ─── Metabolic ───
  {
    id: 'fasting_glucose', name: 'Fasting Glucose', unit: 'mg/dL',
    optimal: [72, 85], acceptable: [70, 99],
    attentionThreshold: { high: 100, low: 60 },
    panel: 'Metabolic', higherBetter: null, weight: 9,
    alternateUnits: ['mmol/L'],
  },
  {
    id: 'fasting_insulin', name: 'Fasting Insulin', unit: 'µIU/mL',
    optimal: [2, 6], acceptable: [2, 10],
    attentionThreshold: { high: 10 },
    panel: 'Metabolic', higherBetter: false, weight: 8,
  },
  {
    id: 'hba1c', name: 'HbA1c', unit: '%',
    optimal: [null, 5.4], acceptable: [null, 5.6],
    attentionThreshold: { high: 5.7 },
    panel: 'Metabolic', higherBetter: false, weight: 9,
  },
  {
    id: 'homa_ir', name: 'HOMA-IR', unit: 'index',
    optimal: [null, 1.0], acceptable: [null, 1.9],
    attentionThreshold: { high: 2.0 },
    panel: 'Metabolic', higherBetter: false, weight: 8,
    computed: true,
    notes: 'Computed: (Fasting Glucose × Fasting Insulin) / 405',
  },
  {
    id: 'alt', name: 'ALT', unit: 'U/L',
    optimal: [null, 30], acceptable: [null, 40],
    attentionThreshold: { high: 40 },
    panel: 'Metabolic', higherBetter: false, weight: 5,
  },
  {
    id: 'ast', name: 'AST', unit: 'U/L',
    optimal: [null, 30], acceptable: [null, 40],
    attentionThreshold: { high: 40 },
    panel: 'Metabolic', higherBetter: false, weight: 5,
  },
  {
    id: 'ggt', name: 'GGT', unit: 'U/L',
    optimal: [null, 25], acceptable: [null, 40],
    attentionThreshold: { high: 40 },
    panel: 'Metabolic', higherBetter: false, weight: 4,
  },

  // ─── CBC ───
  {
    id: 'wbc', name: 'WBC', unit: 'K/µL',
    optimal: [4.0, 7.0], acceptable: [3.5, 10.5],
    attentionThreshold: { low: 3.5, high: 10.5 },
    panel: 'CBC', higherBetter: null, weight: 4,
  },
  {
    id: 'rbc', name: 'RBC', unit: 'M/µL',
    optimal: [4.5, 5.5], acceptable: [4.2, 5.8],
    attentionThreshold: { low: 4.0, high: 6.0 },
    panel: 'CBC', higherBetter: null, weight: 3,
  },
  {
    id: 'hemoglobin', name: 'Hemoglobin', unit: 'g/dL',
    optimal: [14, 17], acceptable: [13, 17.5],
    attentionThreshold: { low: 12, high: 18 },
    panel: 'CBC', higherBetter: null, weight: 4,
    notes: 'Ranges differ by sex. These are male defaults — adjust for female (12–15 optimal).',
  },
  {
    id: 'hematocrit', name: 'Hematocrit', unit: '%',
    optimal: [41, 52], acceptable: [38, 54],
    attentionThreshold: { low: 36, high: 56 },
    panel: 'CBC', higherBetter: null, weight: 3,
  },
  {
    id: 'platelets', name: 'Platelets', unit: 'K/µL',
    optimal: [150, 350], acceptable: [140, 400],
    attentionThreshold: { low: 100, high: 450 },
    panel: 'CBC', higherBetter: null, weight: 3,
  },

  // ─── Hormones ───
  {
    id: 'testosterone_total', name: 'Testosterone (Total)', unit: 'ng/dL',
    optimal: [600, 900], acceptable: [400, 1000],
    attentionThreshold: { low: 300 },
    panel: 'Hormones', higherBetter: true, weight: 6,
  },
  {
    id: 'testosterone_free', name: 'Free Testosterone', unit: 'pg/mL',
    optimal: [15, 25], acceptable: [9, 30],
    attentionThreshold: { low: 8 },
    panel: 'Hormones', higherBetter: true, weight: 5,
  },
  {
    id: 'dhea_s', name: 'DHEA-S', unit: 'µg/dL',
    optimal: [200, 400], acceptable: [100, 500],
    attentionThreshold: { low: 80 },
    panel: 'Hormones', higherBetter: null, weight: 4,
  },
  {
    id: 'cortisol', name: 'Cortisol (AM)', unit: 'µg/dL',
    optimal: [10, 18], acceptable: [6, 23],
    attentionThreshold: { low: 5, high: 25 },
    panel: 'Hormones', higherBetter: null, weight: 4,
  },
  {
    id: 'tsh', name: 'TSH', unit: 'mIU/L',
    optimal: [1.0, 2.5], acceptable: [0.5, 4.5],
    attentionThreshold: { low: 0.4, high: 5.0 },
    panel: 'Hormones', higherBetter: null, weight: 5,
  },

  // ─── Micronutrients & Other ───
  {
    id: 'vitamin_d', name: 'Vitamin D (25-OH)', unit: 'ng/mL',
    optimal: [60, 80], acceptable: [40, 100],
    attentionThreshold: { low: 30 },
    panel: 'Micronutrients', higherBetter: true, weight: 7,
  },
  {
    id: 'ferritin', name: 'Ferritin', unit: 'ng/mL',
    optimal: [50, 150], acceptable: [30, 250],
    attentionThreshold: { low: 20, high: 300 },
    panel: 'Micronutrients', higherBetter: null, weight: 5,
  },
  {
    id: 'homocysteine', name: 'Homocysteine', unit: 'µmol/L',
    optimal: [null, 8], acceptable: [null, 12],
    attentionThreshold: { high: 12 },
    panel: 'Micronutrients', higherBetter: false, weight: 6,
  },
  {
    id: 'uric_acid', name: 'Uric Acid', unit: 'mg/dL',
    optimal: [3.5, 5.5], acceptable: [2.5, 7.0],
    attentionThreshold: { high: 7.0 },
    panel: 'Micronutrients', higherBetter: null, weight: 4,
  },
]
