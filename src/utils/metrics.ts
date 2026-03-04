import type { MetricDefinition } from '../types'

export const METRICS: MetricDefinition[] = [
  // Sleep
  { id: 'sleep_score', name: 'Sleep Score', src: 'sleep', key: 'score', higherBetter: true, target: [85, 100], unit: '/100', category: 'Sleep', weight: 12 },
  { id: 'deep_sleep', name: 'Deep Sleep', src: 'sleepDetail', key: 'deep_h', higherBetter: true, target: [1.0, 2.0], unit: 'hrs', category: 'Sleep', weight: 8 },
  { id: 'rem_sleep', name: 'REM Sleep', src: 'sleepDetail', key: 'rem_h', higherBetter: true, target: [1.5, 2.5], unit: 'hrs', category: 'Sleep', weight: 8 },
  { id: 'total_sleep', name: 'Total Sleep', src: 'sleepDetail', key: 'total_h', higherBetter: true, target: [7.0, 8.5], unit: 'hrs', category: 'Sleep', weight: 10 },
  { id: 'sleep_eff', name: 'Sleep Efficiency', src: 'sleepDetail', key: 'efficiency', higherBetter: true, target: [85, 100], unit: '%', category: 'Sleep', weight: 5 },
  // Heart
  { id: 'hrv', name: 'HRV', src: 'sleepDetail', key: 'avg_hrv', higherBetter: true, target: [80, 150], unit: 'ms', category: 'Heart', weight: 12 },
  { id: 'resting_hr', name: 'Resting Heart Rate', src: 'sleepDetail', key: 'lowest_hr', higherBetter: false, target: [40, 55], unit: 'bpm', category: 'Heart', weight: 10 },
  { id: 'spo2', name: 'SpO2', src: 'spo2', key: 'avg', higherBetter: true, target: [95, 100], unit: '%', category: 'Heart', weight: 4 },
  { id: 'bdi', name: 'Breathing Disturbance', src: 'spo2', key: 'bdi', higherBetter: false, target: [0, 10], unit: 'idx', category: 'Heart', weight: 3 },
  // Activity
  { id: 'steps', name: 'Daily Steps', src: 'activity', key: 'steps', higherBetter: true, target: [10000, 15000], unit: 'steps', category: 'Activity', weight: 8 },
  { id: 'active_cal', name: 'Active Calories', src: 'activity', key: 'active_cal', higherBetter: true, target: [400, 800], unit: 'cal', category: 'Activity', weight: 5 },
  { id: 'activity_score', name: 'Activity Score', src: 'activity', key: 'score', higherBetter: true, target: [85, 100], unit: '/100', category: 'Activity', weight: 5 },
  // Recovery
  { id: 'readiness', name: 'Readiness Score', src: 'readiness', key: 'score', higherBetter: true, target: [85, 100], unit: '/100', category: 'Recovery', weight: 5 },
  { id: 'vascular_age', name: 'Vascular Age', src: 'cvAge', key: 'vascular_age', higherBetter: false, target: [20, 35], unit: 'yrs', category: 'Recovery', weight: 4 },
  { id: 'temp_dev', name: 'Temp Deviation', src: 'readiness', key: 'temp_dev', higherBetter: null, target: [-0.5, 0.5], unit: '°C', category: 'Recovery', weight: 1 },
]

export const METRIC_CATEGORIES = ['Sleep', 'Heart', 'Activity', 'Recovery'] as const
