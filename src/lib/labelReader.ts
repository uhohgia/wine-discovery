// Reading a label from a photo: shrink the photo on the device, send it to the "scan-label" Edge Function,
// and get back what is printed on it. The photo is never stored; it is used for this one request.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LabelReading } from './matchLabel'

/** Turns a photo into text that was printed on the label. Only exists when the app is connected to Supabase. */
export interface LabelReader {
  read(photo: Blob): Promise<LabelReading>
}

export type ScanErrorKind = 'bad-photo' | 'too-big' | 'declined' | 'rate-limited' | 'not-set-up' | 'signed-out' | 'unavailable'

/** An error with a message that is safe and kind to show to the person as it is. */
export class ScanError extends Error {
  constructor(
    readonly kind: ScanErrorKind,
    message: string,
  ) {
    super(message)
  }
}

/** Phone photos are 12 megapixels or more. Labels read fine at this size, and it keeps the upload small. */
export const MAX_EDGE = 1280
const JPEG_QUALITY = 0.82
/** Stay safely under the function's 1.5 MB limit. */
const MAX_BYTES = 1_300_000

const toBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

/** How big to draw a photo so its longest side is at most `max`. Never scales up. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Shrinks a photo to a JPEG the function will accept. Throws a ScanError if the file isn't a readable picture. */
export async function prepareImage(photo: Blob): Promise<{ image: string; mediaType: 'image/jpeg' }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(photo, { imageOrientation: 'from-image' })
  } catch {
    throw new ScanError('bad-photo', 'We couldn’t open that photo. Try a different one, or take a new one.')
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
    for (const quality of [JPEG_QUALITY, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (!blob) break
      if (blob.size <= MAX_BYTES) return { image: await toBase64(blob), mediaType: 'image/jpeg' }
    }
    throw new ScanError('too-big', 'That photo is too big. Try a smaller one.')
  } finally {
    bitmap.close()
  }
}

const MESSAGES: Record<number, [ScanErrorKind, string]> = {
  401: ['signed-out', 'Please sign in again, then try the scan.'],
  404: ['not-set-up', 'Photo scanning isn’t switched on yet. You can type the name instead.'], // the function isn't deployed
  413: ['too-big', 'That photo is too big. Try a smaller one.'],
  422: ['declined', 'We couldn’t read that photo. Try another one.'],
  429: ['rate-limited', 'That’s a lot of scans for one hour. Try again a little later, or type the name instead.'],
  503: ['not-set-up', 'Photo scanning isn’t switched on yet. You can type the name instead.'],
}

/**
 * Reading normally takes a second or two. Very occasionally a request on a connection that went idle (common on phones
 * and Wi-Fi) just never gets an answer. So each try is cut off after ATTEMPT_MS and tried again (up to MAX_ATTEMPTS)
 * on a fresh connection; TOTAL_MS is the most the person ever waits before we say so kindly instead of showing
 * "Reading…" forever.
 */
export const ATTEMPT_MS = 10_000
export const MAX_ATTEMPTS = 3
export const TOTAL_MS = 40_000
export interface ReadLimits {
  attemptMs: number
  totalMs: number
}
const DEFAULT_LIMITS: ReadLimits = { attemptMs: ATTEMPT_MS, totalMs: TOTAL_MS }

const unavailable = () => new ScanError('unavailable', 'We couldn’t read that right now. Try again, or type the name instead.')
const timedOut = () => new ScanError('unavailable', 'That’s taking too long. Try again, or type the name instead.')

/** Rejects with a kind ScanError if `work` hasn't finished in `ms`. */
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timedOut()), ms)
  })
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

/** The real reader: calls the Edge Function with the signed-in person's login. */
export function createLabelReader(client: SupabaseClient, prepare: typeof prepareImage = prepareImage, limits: ReadLimits = DEFAULT_LIMITS): LabelReader {
  return {
    read: (photo) => withTimeout(readWithRetry(client, prepare, photo, limits.attemptMs), limits.totalMs),
  }
}

async function readWithRetry(client: SupabaseClient, prepare: typeof prepareImage, photo: Blob, attemptMs: number): Promise<LabelReading> {
  const { image, mediaType } = await prepare(photo)
  for (let attempt = 1; ; attempt++) {
    const controller = new AbortController()
    try {
      return await withTimeout(call(client, image, mediaType, controller.signal), attemptMs)
    } catch (e) {
      controller.abort() // drop the stuck connection so the next try starts fresh
      const stuck = e instanceof ScanError && e.message === timedOut().message
      if (!stuck || attempt >= MAX_ATTEMPTS) throw e
    }
  }
}

async function call(client: SupabaseClient, image: string, mediaType: string, signal: AbortSignal): Promise<LabelReading> {
  const { data, error } = await client.functions.invoke('scan-label', { body: { image, mediaType }, signal })
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status
    const [kind, message] = (status !== undefined && MESSAGES[status]) || ['unavailable', unavailable().message]
    throw new ScanError(kind, message)
  }
  const reading = (data as { reading?: LabelReading } | null)?.reading
  if (!reading || typeof reading.is_wine_label !== 'boolean') throw unavailable()
  return reading
}
