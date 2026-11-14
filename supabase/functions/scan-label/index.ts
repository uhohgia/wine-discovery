// Edge Function "scan-label": reads one photo of a wine label with Claude and returns what's printed on it.
//
// - Only signed-in people can call it (Supabase checks the login before this code runs, and we check again).
// - The Anthropic API key lives here as a secret (ANTHROPIC_API_KEY). It is never sent to the browser.
// - The photo is used for this one request and is not stored or logged. Neither is what was read.
// - Each person can read 30 photos an hour, so a bug or a bad actor can't run up the bill.
//
// Deploy:  supabase functions deploy scan-label   (and set the secret: supabase secrets set ANTHROPIC_API_KEY=...)
import Anthropic from 'npm:@anthropic-ai/sdk@^0.136.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { checkRequest, ReadLabelError, readLabel, type MessagesClient } from './read-label.ts'

const READS_PER_HOUR = 30

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  // Let the browser remember the "may I?" answer, so most scans skip that extra round trip.
  'access-control-max-age': '7200',
}

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'bad_request', message: 'Use POST.' })

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return reply(503, { error: 'unavailable', message: 'Photo scanning isn’t set up yet.' })

  // Who is asking? (The service key is used only inside this function, to keep the hourly count.)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(token)
  const userId = auth?.user?.id
  if (!userId) return reply(401, { error: 'unauthorized', message: 'Please sign in again.' })

  let body: unknown
  try {
    const text = await req.text()
    if (text.length > 2_200_000) return reply(413, { error: 'bad_request', message: 'That photo is too big. Try a smaller one.' })
    body = JSON.parse(text)
  } catch {
    return reply(400, { error: 'bad_request', message: 'Send a photo.' })
  }
  const checked = checkRequest(body)
  if (!checked.ok) return reply(checked.status, { error: 'bad_request', message: checked.message })

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin.from('wd_scan_calls').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since)
  if ((count ?? 0) >= READS_PER_HOUR) return reply(429, { error: 'rate_limited', message: 'That’s a lot of scans for one hour. Try again a little later, or type the name instead.' })
  await admin.from('wd_scan_calls').insert({ user_id: userId })

  try {
    const reading = await readLabel(new Anthropic({ apiKey }) as unknown as MessagesClient, checked.image, checked.mediaType)
    return reply(200, { reading })
  } catch (e) {
    // Log what kind of failure it was, never the photo or what it said.
    console.error('scan-label failed:', e instanceof ReadLabelError ? e.kind : (e as Error)?.name ?? 'error')
    if (e instanceof ReadLabelError && e.kind === 'refused') return reply(422, { error: 'declined', message: 'We couldn’t read that photo. Try another one.' })
    return reply(502, { error: 'unavailable', message: 'We couldn’t read that right now. Try again, or type the name instead.' })
  }
})
