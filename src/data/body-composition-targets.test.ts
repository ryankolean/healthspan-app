import { describe, it, expect } from 'vitest'
import { getBMIStatus, getBodyFatStatus } from './body-composition-targets'

describe('getBMIStatus', () => {
  it('underweight (17) → standard=underweight, color=red', () => {
    const result = getBMIStatus(17)
    expect(result).toEqual({
      value: 17,
      standard: 'underweight',
      longevityOptimal: false,
      color: 'red',
    })
  })

  it('normal + longevity optimal (21.5) → green', () => {
    const result = getBMIStatus(21.5)
    expect(result).toEqual({
      value: 21.5,
      standard: 'normal',
      longevityOptimal: true,
      color: 'green',
    })
  })

  it('normal but not longevity optimal (24) → yellow', () => {
    const result = getBMIStatus(24)
    expect(result).toEqual({
      value: 24,
      standard: 'normal',
      longevityOptimal: false,
      color: 'yellow',
    })
  })

  it('overweight (27) → yellow', () => {
    const result = getBMIStatus(27)
    expect(result).toEqual({
      value: 27,
      standard: 'overweight',
      longevityOptimal: false,
      color: 'yellow',
    })
  })

  it('obese (32) → red', () => {
    const result = getBMIStatus(32)
    expect(result).toEqual({
      value: 32,
      standard: 'obese',
      longevityOptimal: false,
      color: 'red',
    })
  })
})

describe('getBodyFatStatus', () => {
  it('10% male → athletic + longevity optimal, green', () => {
    const result = getBodyFatStatus(10, 'male')
    expect(result).toEqual({
      value: 10,
      standard: 'athletic',
      longevityOptimal: true,
      color: 'green',
    })
  })

  it('14% male → fitness + longevity optimal, green', () => {
    const result = getBodyFatStatus(14, 'male')
    expect(result).toEqual({
      value: 14,
      standard: 'fitness',
      longevityOptimal: true,
      color: 'green',
    })
  })

  it('20% male → acceptable, yellow', () => {
    const result = getBodyFatStatus(20, 'male')
    expect(result).toEqual({
      value: 20,
      standard: 'acceptable',
      longevityOptimal: false,
      color: 'yellow',
    })
  })

  it('26% male → excess, red', () => {
    const result = getBodyFatStatus(26, 'male')
    expect(result).toEqual({
      value: 26,
      standard: 'excess',
      longevityOptimal: false,
      color: 'red',
    })
  })

  it('22% female → fitness + longevity optimal, green', () => {
    const result = getBodyFatStatus(22, 'female')
    expect(result).toEqual({
      value: 22,
      standard: 'fitness',
      longevityOptimal: true,
      color: 'green',
    })
  })

  it('33% female → excess, red', () => {
    const result = getBodyFatStatus(33, 'female')
    expect(result).toEqual({
      value: 33,
      standard: 'excess',
      longevityOptimal: false,
      color: 'red',
    })
  })
})
