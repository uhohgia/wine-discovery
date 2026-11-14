import { CONFIDENCE_LABELS, type Confidence } from '@/lib/scoring'

// Meaning is carried by the words and by a different symbol per label, never by color alone.
const LOOK: Record<Confidence, { symbol: string; classes: string }> = {
  'good-bet': { symbol: '✓', classes: 'border-ok bg-card text-ok' },
  'worth-a-try': { symbol: '◐', classes: 'border-flag-ring bg-flag-bg text-flag-text' },
  'a-stretch': { symbol: '△', classes: 'border-edge bg-sand text-ink' },
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const look = LOOK[confidence]
  return (
    <span className={`inline-flex min-h-9 items-center gap-2 rounded-full border-2 px-3 py-1 text-base font-bold ${look.classes}`}>
      <span aria-hidden="true">{look.symbol}</span>
      {CONFIDENCE_LABELS[confidence]}
    </span>
  )
}
