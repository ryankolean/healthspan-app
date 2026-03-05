import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

function parseAppleDate(dateStr: string): string {
  return dateStr.replace(' ', 'T').replace(/\s\+\d{4}$/, 'Z')
}

function diffMin(start: string, end: string): number {
  return Math.round((new Date(parseAppleDate(end)).getTime() - new Date(parseAppleDate(start)).getTime()) / 60000)
}

function nightDateKey(startDate: string): string {
  const d = new Date(parseAppleDate(startDate))
  if (d.getUTCHours() < 12) {
    const prev = new Date(d)
    prev.setUTCDate(prev.getUTCDate() - 1)
    return prev.toISOString().slice(0, 10)
  }
  return d.toISOString().slice(0, 10)
}

interface NightAccumulator {
  date: string
  bedtime: string
  wakeTime: string
  deepMin: number
  remMin: number
  lightMin: number
  awakeMin: number
  inBedMin: number
}

export function parseAppleHealthSleep(xmlString: string): { nights: SleepNight[] } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const records = doc.querySelectorAll('Record[type="HKCategoryTypeIdentifierSleepAnalysis"]')
  if (records.length === 0) return { nights: [] }

  const nightMap = new Map<string, NightAccumulator>()

  records.forEach(node => {
    const value = node.getAttribute('value') ?? ''
    const startDate = node.getAttribute('startDate') ?? ''
    const endDate = node.getAttribute('endDate') ?? ''
    const dateKey = nightDateKey(startDate)
    const minutes = diffMin(startDate, endDate)

    if (!nightMap.has(dateKey)) {
      nightMap.set(dateKey, {
        date: dateKey,
        bedtime: startDate,
        wakeTime: endDate,
        deepMin: 0,
        remMin: 0,
        lightMin: 0,
        awakeMin: 0,
        inBedMin: 0,
      })
    }

    const acc = nightMap.get(dateKey)!

    if (parseAppleDate(startDate) < parseAppleDate(acc.bedtime)) acc.bedtime = startDate
    if (parseAppleDate(endDate) > parseAppleDate(acc.wakeTime)) acc.wakeTime = endDate

    switch (value) {
      case 'HKCategoryValueSleepAnalysisInBed':
        acc.inBedMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAsleepDeep':
        acc.deepMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAsleepREM':
        acc.remMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAsleepCore':
        acc.lightMin += minutes
        break
      case 'HKCategoryValueSleepAnalysisAwake':
        acc.awakeMin += minutes
        break
    }
  })

  const nights: SleepNight[] = Array.from(nightMap.values()).map(acc => {
    const totalMin = acc.deepMin + acc.remMin + acc.lightMin
    const timeInBed = acc.inBedMin > 0 ? acc.inBedMin : totalMin + acc.awakeMin
    const efficiency = timeInBed > 0 ? Math.round((totalMin / timeInBed) * 1000) / 10 : undefined

    return {
      id: uuidv4(),
      source: 'apple_health' as const,
      sourceId: `apple-sleep-${acc.date}`,
      date: acc.date,
      bedtime: parseAppleDate(acc.bedtime),
      wakeTime: parseAppleDate(acc.wakeTime),
      totalMin,
      deepMin: acc.deepMin > 0 ? acc.deepMin : undefined,
      remMin: acc.remMin > 0 ? acc.remMin : undefined,
      lightMin: acc.lightMin > 0 ? acc.lightMin : undefined,
      awakeMin: acc.awakeMin > 0 ? acc.awakeMin : undefined,
      efficiency,
      createdAt: Date.now(),
    }
  })

  return { nights }
}
