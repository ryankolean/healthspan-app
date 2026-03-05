import { v4 as uuidv4 } from 'uuid'
import type { SleepNight } from '../../types/sleep'

interface OuraDailySleep {
  day: string
  score?: number
}

interface OuraSleepDetail {
  day: string
  deep_s?: number
  rem_s?: number
  light_s?: number
  total_s?: number
  avg_hr?: number
  lowest_hr?: number
  avg_hrv?: number
  efficiency?: number
  avg_breath?: number
}

interface OuraSleepData {
  sleep?: OuraDailySleep[]
  sleepDetail?: OuraSleepDetail[]
}

function secToMin(sec?: number): number | undefined {
  return sec != null ? Math.round(sec / 60) : undefined
}

export function parseOuraSleep(data: OuraSleepData | null): { nights: SleepNight[] } {
  if (!data?.sleep?.length) return { nights: [] }

  const detailMap = new Map<string, OuraSleepDetail>()
  if (data.sleepDetail) {
    data.sleepDetail.forEach(d => detailMap.set(d.day, d))
  }

  const nights: SleepNight[] = data.sleep.map(s => {
    const detail = detailMap.get(s.day)
    return {
      id: uuidv4(),
      source: 'oura' as const,
      sourceId: `oura-${s.day}`,
      date: s.day,
      sleepScore: s.score,
      totalMin: secToMin(detail?.total_s),
      deepMin: secToMin(detail?.deep_s),
      remMin: secToMin(detail?.rem_s),
      lightMin: secToMin(detail?.light_s),
      avgHr: detail?.avg_hr,
      lowestHr: detail?.lowest_hr,
      avgHrv: detail?.avg_hrv,
      efficiency: detail?.efficiency,
      avgBreath: detail?.avg_breath,
      createdAt: Date.now(),
    }
  })

  return { nights }
}
