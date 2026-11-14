// Generates PWA icons as plain PNGs with no dependencies (zlib + manual CRC).
// Usage: npm run icons
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const WINE = [0x7a, 0x1f, 0x3d]
const CREAM = [0xfa, 0xf5, 0xec]
const ROSE = [0xb3, 0x36, 0x5f]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

// Draw a wine glass on a wine-coloured background. `pad` shrinks the glass for maskable safe-zone.
function render(size, { pad = 0, rounded = true } = {}) {
  const px = Buffer.alloc(size * size * 3)
  const s = size / 64 // work in a 64-unit design grid
  const inset = pad * 64
  const k = (64 - inset * 2) / 64
  const tx = (v) => inset + v * k // transform design units
  const inBowl = (x, y) => {
    // trapezoid-ish bowl: from y 14..38, narrowing from width 20 to 0 following a curve
    if (y < tx(14) || y > tx(38)) return 0
    const t = (y - tx(14)) / (tx(38) - tx(14))
    const half = tx(32) - tx(22) // top half-width
    const w = half * (1 - t * t)
    if (Math.abs(x - tx(32)) > w) return 0
    return t > 0.35 ? 2 : 1 // 2 = wine in glass
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ux = x / s
      const uy = y / s
      let col = WINE
      // rounded corners for the non-maskable icons
      if (rounded) {
        const r = 14
        const cx = Math.min(Math.max(ux, r), 64 - r)
        const cy = Math.min(Math.max(uy, r), 64 - r)
        if ((ux - cx) ** 2 + (uy - cy) ** 2 > r * r) col = null
      }
      if (col) {
        const bowl = inBowl(ux, uy)
        if (bowl === 1) col = CREAM
        else if (bowl === 2) col = ROSE
        else if (ux >= tx(30.5) && ux <= tx(33.5) && uy >= tx(38) && uy <= tx(48)) col = CREAM
        else if (ux >= tx(24) && ux <= tx(40) && uy >= tx(48) && uy <= tx(51)) col = CREAM
      }
      const i = (y * size + x) * 3
      const c = col ?? CREAM // transparent corners are filled cream (no alpha channel to keep it tiny)
      px[i] = c[0]
      px[i + 1] = c[1]
      px[i + 2] = c[2]
    }
  }
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    px.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', render(192, { rounded: false }))
writeFileSync('public/icons/icon-512.png', render(512, { rounded: false }))
writeFileSync('public/icons/maskable-512.png', render(512, { pad: 0.14, rounded: false }))
writeFileSync('public/icons/apple-touch-icon.png', render(180, { rounded: false }))
console.log('Icons written to public/icons')
