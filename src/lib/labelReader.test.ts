import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { createLabelReader, fitWithin, MAX_EDGE, ScanError, withTimeout } from './labelReader'

const prepare = async () => ({ image: 'QUJD', mediaType: 'image/jpeg' as const })
const clientWith = (result: { data?: unknown; error?: unknown }) => {
  const invoke = vi.fn(async () => ({ data: null, error: null, ...result }))
  return { invoke, client: { functions: { invoke } } as unknown as SupabaseClient }
}
const READING = { is_wine_label: true, producer: 'Goldeneye', name: 'Pinot Noir', vintage: 2022, type: 'red' }

describe('fitWithin', () => {
  it('shrinks a big phone photo so its longest side is MAX_EDGE', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_EDGE, height: Math.round((3024 * MAX_EDGE) / 4032) })
    expect(fitWithin(3024, 4032).height).toBe(MAX_EDGE)
  })
  it('never makes a small photo bigger', () => {
    expect(fitWithin(600, 800)).toEqual({ width: 600, height: 800 })
  })
})

describe('createLabelReader', () => {
  it('sends the shrunken photo to the scan-label function and returns the reading', async () => {
    const { client, invoke } = clientWith({ data: { reading: READING } })
    const reading = await createLabelReader(client, prepare).read(new Blob(['x']))
    expect(reading).toEqual(READING)
    expect(invoke).toHaveBeenCalledWith('scan-label', expect.objectContaining({ body: { image: 'QUJD', mediaType: 'image/jpeg' } }))
  })

  it.each([
    [401, 'signed-out'],
    [413, 'too-big'],
    [422, 'declined'],
    [429, 'rate-limited'],
    [503, 'not-set-up'],
    [404, 'not-set-up'],
    [502, 'unavailable'],
    [500, 'unavailable'],
  ])('turns a %i from the function into a kind %s message', async (status, kind) => {
    const { client } = clientWith({ error: { context: { status } } })
    const failure = await createLabelReader(client, prepare).read(new Blob(['x'])).catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(ScanError)
    expect((failure as ScanError).kind).toBe(kind)
    expect((failure as ScanError).message.length).toBeGreaterThan(10)
  })

  it('handles a network failure with no status', async () => {
    const { client } = clientWith({ error: new Error('Failed to fetch') })
    await expect(createLabelReader(client, prepare).read(new Blob(['x']))).rejects.toMatchObject({ kind: 'unavailable' })
  })

  it('rejects an answer that is not a reading', async () => {
    for (const data of [null, {}, { reading: { producer: 'x' } }]) {
      const { client } = clientWith({ data })
      await expect(createLabelReader(client, prepare).read(new Blob(['x']))).rejects.toMatchObject({ kind: 'unavailable' })
    }
  })

  it('passes along a photo that could not be opened without calling the function', async () => {
    const { client, invoke } = clientWith({ data: { reading: READING } })
    const broken = async () => {
      throw new ScanError('bad-photo', 'We couldn’t open that photo.')
    }
    await expect(createLabelReader(client, broken).read(new Blob(['x']))).rejects.toMatchObject({ kind: 'bad-photo' })
    expect(invoke).not.toHaveBeenCalled()
  })
})

describe('stuck requests', () => {
  const READ = new Blob(['x'])
  const limits = { attemptMs: 20, totalMs: 500 }

  it('tries again when the first request never answers, and then succeeds', async () => {
    let calls = 0
    const invoke = vi.fn(async () => {
      calls++
      if (calls === 1) return new Promise(() => undefined) // the stuck one
      return { data: { reading: READING }, error: null }
    })
    const client = { functions: { invoke } } as unknown as SupabaseClient
    await expect(createLabelReader(client, prepare, limits).read(READ)).resolves.toEqual(READING)
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('aborts the stuck request so its connection is dropped', async () => {
    const signals: AbortSignal[] = []
    let calls = 0
    const invoke = vi.fn(async (_name: string, opts: { signal: AbortSignal }) => {
      signals.push(opts.signal)
      return ++calls === 1 ? new Promise(() => undefined) : { data: { reading: READING }, error: null }
    })
    const client = { functions: { invoke } } as unknown as SupabaseClient
    await createLabelReader(client, prepare, limits).read(READ)
    expect(signals[0]!.aborted).toBe(true)
  })

  it('gives up kindly after three stuck tries (no endless "Reading…")', async () => {
    const invoke = vi.fn(() => new Promise(() => undefined))
    const client = { functions: { invoke } } as unknown as SupabaseClient
    const failure = await createLabelReader(client, prepare, limits).read(READ).catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(ScanError)
    expect((failure as ScanError).message).toMatch(/taking too long/)
    expect(invoke).toHaveBeenCalledTimes(3)
  })

  it('does not retry a real answer such as "too many scans"', async () => {
    const { client, invoke } = clientWith({ error: { context: { status: 429 } } })
    await expect(createLabelReader(client, prepare, limits).read(READ)).rejects.toMatchObject({ kind: 'rate-limited' })
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('stops waiting at the overall limit even if the photo itself never gets prepared', async () => {
    const { client } = clientWith({ data: { reading: READING } })
    const never = () => new Promise<never>(() => undefined)
    const failure = await createLabelReader(client, never, { attemptMs: 20, totalMs: 30 }).read(READ).catch((e: unknown) => e)
    expect((failure as ScanError).message).toMatch(/taking too long/)
  })

  it('withTimeout lets a quick job through untouched', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })
})
