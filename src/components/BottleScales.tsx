import type { Bottle } from '@/data/bottles'
import { GLOSSARY } from '@/data/glossary'
import { ordinal, SCALES } from '@/data/scales'
import { ScaleMeter } from './ScaleMeter'

/** The four "feel" scales for a bottle, each with its everyday analogy and an optional explanation. */
export function BottleScales({ bottle }: { bottle: Bottle }) {
  return (
    <>
      <ScaleMeter title={SCALES.body.title} stops={SCALES.body.stops} value={ordinal('body', bottle.body)} help={GLOSSARY.body!.plain} />
      <ScaleMeter title={SCALES.sweetness.title} stops={SCALES.sweetness.stops} value={ordinal('sweetness', bottle.sweetness)} help={GLOSSARY.sweetness!.plain} />
      <ScaleMeter title={SCALES.acidity.title} stops={SCALES.acidity.stops} value={ordinal('acidity', bottle.acidity)} help={`${GLOSSARY.acidity!.plain} Also called “acidity”.`} />
      <ScaleMeter title={SCALES.tannin.title} stops={SCALES.tannin.stops} value={ordinal('tannin', bottle.tannin)} help={`${GLOSSARY.tannin!.plain} Also called “tannin”.`} />
    </>
  )
}
