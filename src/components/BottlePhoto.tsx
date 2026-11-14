import type { Bottle } from '@/data/bottles'

/**
 * The front-of-bottle photo, when a bottle has one. In lists it's a small decoration next to the name (the name
 * already says what it is, so it has no description); on the wine card it's described for screen readers.
 * The small one is a fixed size in pixels, so very large text doesn't let it crowd out the words.
 */
export function BottlePhoto({ bottle, size }: { bottle: Pick<Bottle, 'name' | 'producer' | 'label_image_path'>; size: 'thumb' | 'hero' }) {
  if (!bottle.label_image_path) return null
  const hero = size === 'hero'
  return (
    <img
      src={bottle.label_image_path}
      alt={hero ? `Photo of the front of the ${bottle.producer} ${bottle.name} bottle` : ''}
      width={600}
      height={800}
      loading={hero ? 'eager' : 'lazy'}
      decoding="async"
      className={
        hero
          ? 'mx-auto mt-3 aspect-[3/4] w-full max-w-64 rounded-2xl border border-line bg-sand object-cover object-[50%_75%]'
          : 'aspect-[3/4] w-[56px] shrink-0 rounded-lg border border-line bg-sand object-cover object-[50%_75%]'
      }
    />
  )
}
