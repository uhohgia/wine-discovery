/**
 * Wraps `fetch` so that analytics event writes (POSTs to the wd_events table) are marked `keepalive`. The browser
 * then finishes sending them even if the person closes the tab or loads another page a moment later. Nothing else
 * is changed: other requests (bottles, profile, shelf) behave exactly as before.
 */
export function keepaliveForEvents(base: typeof fetch): typeof fetch {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()
    if (method === 'POST' && url.includes('/rest/v1/wd_events')) return base(input, { ...init, keepalive: true })
    return base(input, init)
  }
}
