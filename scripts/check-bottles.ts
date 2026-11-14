// Validates src/data/bottles.json (and the test-only bottles.sample.json) against the controlled vocabularies. Exits 1 on any problem.
// Usage: npm run bottles:check
import { existsSync, readFileSync } from 'node:fs'
import { jargonIn, parseBottles } from '../src/data/bottles'

try {
  parseBottles(JSON.parse(readFileSync('src/data/bottles.sample.json', 'utf8'))) // the made-up bottles tests use
  const bottles = parseBottles(JSON.parse(readFileSync('src/data/bottles.json', 'utf8')))
  const real = bottles.filter((b) => !b.is_placeholder).length
  for (const b of bottles) {
    const found = jargonIn(b)
    if (found.length > 0) console.warn(`warning: ${b.id} uses jargon (${found.join(', ')}) in its friendly text. Say it in plain words, or leave it to the word helper.`)
  }
  const missingPhoto = bottles.filter((b) => !b.is_placeholder && b.label_image_path && !existsSync('public' + b.label_image_path))
  if (missingPhoto.length > 0) throw new Error(`These bottles point at a photo that isn't in public/: ${missingPhoto.map((b) => b.id).join(', ')}`)
  console.log(`OK: ${bottles.length} bottles (${bottles.length - real} placeholders, ${real} real)`)
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
