// A stand-in label reader for trying the Scan screen in a browser with no Supabase and no Claude.
// It only turns on in development (`npm run dev`) with VITE_FAKE_SCAN=1: the production build leaves it out.
// It "reads" the photo's FILE NAME: "goldeneye-pinot-noir.jpg" returns that bottle's label details,
// "not-a-label.jpg" says it isn't a wine label, "mystery.jpg" is a wine we don't have, "broken.jpg" fails.
import { REAL_BOTTLES } from '@/data/bottles'
import { ScanError, type LabelReader } from './labelReader'

export function createFakeLabelReader(delayMs = 400): LabelReader {
  return {
    async read(photo) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      const stem = ((photo as File).name ?? '').replace(/\.[^.]+$/, '')
      if (stem === 'broken') throw new ScanError('unavailable', 'We couldn’t read that right now. Try again, or type the name instead.')
      if (stem === 'not-a-label') return { is_wine_label: false, producer: null, name: null, vintage: null, type: null }
      const bottle = REAL_BOTTLES.find((b) => b.id === stem)
      if (!bottle) return { is_wine_label: true, producer: 'Opus One', name: 'Overture', vintage: 2019, type: 'red' }
      return { is_wine_label: true, producer: bottle.producer, name: bottle.name, vintage: bottle.vintage, type: bottle.type }
    },
  }
}
