import { describe, expect, it, vi } from 'vitest'
import { keepaliveForEvents } from './keepalive'

const run = (url: string, init?: RequestInit) => {
  const base = vi.fn().mockResolvedValue(new Response('{}'))
  keepaliveForEvents(base as unknown as typeof fetch)(url, init)
  return base.mock.calls[0]![1] as RequestInit | undefined
}

describe('keepaliveForEvents', () => {
  it('marks event writes keepalive so they survive leaving the page', () => {
    expect(run('https://x.supabase.co/rest/v1/wd_events', { method: 'POST', body: '{}' })?.keepalive).toBe(true)
  })
  it('leaves every other request alone', () => {
    expect(run('https://x.supabase.co/rest/v1/wd_ratings', { method: 'POST' })?.keepalive).toBeUndefined()
    expect(run('https://x.supabase.co/rest/v1/wd_events?select=*', { method: 'GET' })?.keepalive).toBeUndefined()
    expect(run('https://x.supabase.co/rest/v1/wd_taste_profiles', { method: 'POST' })?.keepalive).toBeUndefined()
    expect(run('https://x.supabase.co/auth/v1/token')?.keepalive).toBeUndefined()
  })
  it('keeps the original headers, body and method', () => {
    const init = run('https://x.supabase.co/rest/v1/wd_events', { method: 'POST', body: 'b', headers: { a: '1' } })!
    expect(init).toMatchObject({ method: 'POST', body: 'b', headers: { a: '1' }, keepalive: true })
  })
})
