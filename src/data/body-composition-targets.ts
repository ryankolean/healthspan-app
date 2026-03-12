export interface BMIStatus {
  value: number
  standard: 'underweight' | 'normal' | 'overweight' | 'obese'
  longevityOptimal: boolean
  color: 'green' | 'yellow' | 'red'
}

export interface BodyFatStatus {
  value: number
  standard: 'essential' | 'athletic' | 'fitness' | 'acceptable' | 'excess'
  longevityOptimal: boolean
  color: 'green' | 'yellow' | 'red'
}

export function getBMIStatus(bmi: number): BMIStatus {
  const standard: BMIStatus['standard'] =
    bmi < 18.5 ? 'underweight' :
    bmi < 25 ? 'normal' :
    bmi < 30 ? 'overweight' :
    'obese'

  const longevityOptimal = bmi >= 20 && bmi <= 23

  const color: BMIStatus['color'] =
    longevityOptimal ? 'green' :
    standard === 'underweight' || standard === 'obese' ? 'red' :
    'yellow'

  return { value: bmi, standard, longevityOptimal, color }
}

interface BodyFatRanges {
  essential: [number, number]
  athletic: [number, number]
  fitness: [number, number]
  acceptable: [number, number]
  longevityOptimal: [number, number]
}

const MALE_RANGES: BodyFatRanges = {
  essential: [2, 5],
  athletic: [6, 13],
  fitness: [14, 17],
  acceptable: [18, 24],
  longevityOptimal: [10, 15],
}

const FEMALE_RANGES: BodyFatRanges = {
  essential: [10, 13],
  athletic: [14, 20],
  fitness: [21, 24],
  acceptable: [25, 31],
  longevityOptimal: [18, 23],
}

export function getBodyFatStatus(bodyFat: number, sex: 'male' | 'female'): BodyFatStatus {
  const ranges = sex === 'male' ? MALE_RANGES : FEMALE_RANGES

  const standard: BodyFatStatus['standard'] =
    bodyFat <= ranges.essential[1] ? 'essential' :
    bodyFat <= ranges.athletic[1] ? 'athletic' :
    bodyFat <= ranges.fitness[1] ? 'fitness' :
    bodyFat <= ranges.acceptable[1] ? 'acceptable' :
    'excess'

  const longevityOptimal =
    bodyFat >= ranges.longevityOptimal[0] && bodyFat <= ranges.longevityOptimal[1]

  const color: BodyFatStatus['color'] =
    longevityOptimal ? 'green' :
    standard === 'essential' || standard === 'excess' ? 'red' :
    'yellow'

  return { value: bodyFat, standard, longevityOptimal, color }
}
