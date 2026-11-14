import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The brief: keys stay server-side, and no service-role key ever reaches the browser. This scans the code we ship
// and test for anything that looks like a secret.
const ROOTS = ['src', 'e2e', 'e2e-cloud', 'scripts', 'supabase', 'index.html', 'README.md', 'DECISIONS.md', '.env.example', 'vite.config.ts', 'package.json']
const SKIP = new Set(['node_modules', 'dist', 'dev-dist', '_archive', 'test-results', 'playwright-report'])

function files(path: string): string[] {
  const stat = statSync(path)
  if (stat.isFile()) return [path]
  return readdirSync(path).flatMap((name) => (SKIP.has(name) ? [] : files(join(path, name))))
}

const SELF = 'src/no-secrets.test.ts'
const all = ROOTS.flatMap((r) => {
  try {
    return files(r)
  } catch {
    return []
  }
}).filter((f) => f !== SELF)

const PATTERNS: [string, RegExp][] = [
  ['a service-role key', /service_role/i],
  ['a Supabase secret key', /sb_secret_[A-Za-z0-9_-]{10,}/],
  ['a JWT (like an old anon or service key)', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./],
  ['an Anthropic API key', /sk-ant-[A-Za-z0-9_-]{10,}/],
  ['a private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
]

describe('no secrets in the code we ship', () => {
  it('scans a sensible number of files', () => {
    expect(all.length).toBeGreaterThan(40)
  })

  // The Edge Function (server code, never sent to the browser) may READ the service key from its environment.
  // That one exact reference is allowed there; a key written out in the code, or any mention in browser code, is not.
  const SERVER_ENV_READ = /Deno\.env\.get\('SUPABASE_SERVICE_ROLE_KEY'\)/g
  const textOf = (f: string) => {
    const text = readFileSync(f, 'utf8')
    return f.startsWith('supabase/functions/') ? text.replace(SERVER_ENV_READ, '') : text
  }

  it.each(PATTERNS)('has no %s', (_name, pattern) => {
    const hits = all.filter((f) => pattern.test(textOf(f)))
    expect(hits).toEqual([])
  })

  it('keeps the Anthropic key on the server: no browser code reads it, and nothing exposes it as a VITE_ variable', () => {
    const browserFiles = all.filter((f) => f.startsWith('src/') || f === 'index.html' || f === 'vite.config.ts')
    expect(browserFiles.filter((f) => /ANTHROPIC_API_KEY|VITE_ANTHROPIC/.test(readFileSync(f, 'utf8')))).toEqual([])
    const fn = readFileSync('supabase/functions/scan-label/index.ts', 'utf8')
    expect(fn).toContain("Deno.env.get('ANTHROPIC_API_KEY')")
  })

  it('only ever puts the publishable key and URL in VITE_ variables', () => {
    const example = readFileSync('.env.example', 'utf8')
    const names = [...example.matchAll(/^#?\s*(VITE_\w+)=/gm)].map((m) => m[1])
    expect(names.sort()).toEqual(['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL'])
    expect(example).not.toMatch(/^#?\s*\w*(SERVICE|SECRET)\w*=/im) // no variable that looks like a secret key
  })
})
