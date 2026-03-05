import { v4 as uuidv4 } from 'uuid'
import type { ExerciseWorkout, ExerciseType, VO2MaxEntry } from '../../types/exercise'

const STRENGTH_ACTIVITY_TYPES = new Set([
  'HKWorkoutActivityTypeTraditionalStrengthTraining',
  'HKWorkoutActivityTypeFunctionalStrengthTraining',
  'HKWorkoutActivityTypeYoga',
  'HKWorkoutActivityTypePilates',
  'HKWorkoutActivityTypeCrossTraining',
])

function appleTypeToExerciseType(activityType: string): ExerciseType {
  if (STRENGTH_ACTIVITY_TYPES.has(activityType)) return 'strength'
  return 'cardio'
}

function parseAppleDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

function parseAppleIso(dateStr: string): string {
  return dateStr.replace(' ', 'T').replace(/\s\+\d{4}$/, 'Z')
}

export function parseAppleHealthXml(xmlString: string, userAge: number): { workouts: ExerciseWorkout[]; vo2max: VO2MaxEntry[] } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const workouts: ExerciseWorkout[] = []
  const vo2max: VO2MaxEntry[] = []

  const workoutNodes = doc.querySelectorAll('Workout')
  workoutNodes.forEach(node => {
    const activityType = node.getAttribute('workoutActivityType') ?? ''
    const startDate = node.getAttribute('startDate') ?? ''
    const endDate = node.getAttribute('endDate') ?? ''
    const duration = parseFloat(node.getAttribute('duration') ?? '0')
    const calories = parseFloat(node.getAttribute('totalEnergyBurned') ?? '0')
    const distanceKm = parseFloat(node.getAttribute('totalDistance') ?? '0')

    workouts.push({
      id: uuidv4(),
      source: 'apple_health',
      sourceId: `apple-${startDate}`,
      date: parseAppleDate(startDate),
      startTime: parseAppleIso(startDate),
      endTime: parseAppleIso(endDate),
      type: appleTypeToExerciseType(activityType),
      activityName: activityType.replace('HKWorkoutActivityType', ''),
      durationMin: Math.round(duration),
      distanceKm: distanceKm > 0 ? distanceKm : undefined,
      calories: calories > 0 ? calories : undefined,
      createdAt: Date.now(),
    })
  })

  const recordNodes = doc.querySelectorAll('Record[type="HKQuantityTypeIdentifierVO2Max"]')
  recordNodes.forEach(node => {
    const startDate = node.getAttribute('startDate') ?? ''
    const value = parseFloat(node.getAttribute('value') ?? '0')
    if (value > 0) {
      vo2max.push({
        id: uuidv4(),
        date: parseAppleDate(startDate),
        value,
        source: 'apple_health',
        method: 'apple_watch',
        createdAt: Date.now(),
      })
    }
  })

  return { workouts, vo2max }
}
