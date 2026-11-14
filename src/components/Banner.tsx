import type { ReactNode } from 'react'

const TONES = {
  info: 'border-line bg-sand text-ink',
  concept: 'border-flag-ring bg-flag-bg text-flag-text',
  error: 'border-red-800 bg-red-50 text-red-900',
} as const

/** A short, clearly labelled notice. Errors are announced to screen readers; the icon letter backs up the color. */
export function Banner({ tone = 'info', title, children }: { tone?: keyof typeof TONES; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={`rounded-2xl border-2 p-4 ${TONES[tone]}`}>
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  )
}
