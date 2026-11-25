import { describe, expect, it } from 'vitest'
import { stepRun, type RunState } from '../src/utils/claimProgress'

function play(scores: number[]) {
  let run: RunState | undefined
  let progress = 0
  let n = 0
  const ids = new Set<string>()
  for (const s of scores) {
    const r = stepRun(run, s, () => `run${n++}`)
    run = r.run
    progress += r.delta
    ids.add(run.runId)
  }
  return { progress, runs: ids.size }
}

describe('stepRun (runs add up toward the claim)', () => {
  it('490 then a new run of 30 reaches 520', () => {
    expect(play([0, 100, 490, 0, 10, 30])).toEqual({ progress: 520, runs: 2 })
  })
  it('repeat posts in one run do not double count', () => {
    expect(play([200, 200, 300, 300])).toEqual({ progress: 300, runs: 1 })
  })
  it('caps a single run at the threshold', () => {
    expect(play([0, 2000])).toEqual({ progress: 500, runs: 1 })
  })
})

describe('uncapped run tracking alongside capped claimProgress', () => {
  it('assigns distinct runIds across high-scoring runs > 500 without capping score', () => {
    const r1 = stepRun(undefined, 1250, () => 'runA')
    const r2 = stepRun(r1.run, 0, () => 'runB')
    const r3 = stepRun(r2.run, 920, () => 'runC')
    expect(r1.run.runId).toBe('runA')
    expect(r1.run.last).toBe(1250)
    expect(r1.delta).toBe(500)
    expect(r2.run.runId).toBe('runB')
    expect(r3.run.runId).toBe('runB')
    expect(r3.run.last).toBe(920)
    expect(r3.delta).toBe(500)
  })
})
