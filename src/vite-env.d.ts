/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Leave unset to run in device-only demo mode. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase publishable (anon) key. Safe for the browser; RLS protects the data. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** "sample" swaps in the made-up test bottles (tests and e2e only). Leave unset for the real catalog. */
  readonly VITE_CATALOG?: string
  /** "1" in `npm run dev` swaps in a pretend label reader that reads the photo's file name. Never in production. */
  readonly VITE_FAKE_SCAN?: string
  /** "1" turns on real photo scanning for signed-in accounts (needs the scan-label function and its Anthropic key). Off by default: Scan is simulated. */
  readonly VITE_PHOTO_SCAN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
