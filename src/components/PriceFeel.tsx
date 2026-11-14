import { PRICE_FEEL_WORDS } from '@/data/pricing'
import { priceFeel, priceWords } from '@/lib/pricing'

/** "$$ · Mid-range". The dollar signs are decoration for screen readers, who get the words and the real price. */
export function PriceFeel({ price }: { price: number }) {
  const feel = priceFeel(price)
  return (
    <span>
      <span aria-hidden="true" className="font-semibold">
        {'$'.repeat(feel)}
        <span className="text-line">{'$'.repeat(3 - feel)}</span>
      </span>
      <span aria-hidden="true"> · {PRICE_FEEL_WORDS[feel]}</span>
      <span className="sr-only">{priceWords(price)}</span>
    </span>
  )
}
