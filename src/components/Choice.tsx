import { useId } from 'react'
import { UNSURE } from '@/data/quizRules'
import { CheckIcon } from './icons'

export interface ChoiceOption {
  value: string
  label: string
}

/**
 * Big tappable answers. Native radios (pick one) or checkboxes (pick any), so keyboards and screen
 * readers just work. "Not sure" is always offered and is exclusive. The selected state shows a check
 * mark and a filled background, so it never relies on color alone.
 */
export function ChoiceGroup({
  legend,
  options,
  value,
  onChange,
  multi,
  allowUnsure = true,
}: {
  legend: string
  options: readonly ChoiceOption[]
  value: string[]
  onChange: (next: string[]) => void
  multi: boolean
  /** Adds an exclusive "Not sure" choice (on by default). */
  allowUnsure?: boolean
}) {
  const name = useId()
  const all: ChoiceOption[] = allowUnsure ? [...options, { value: UNSURE, label: 'Not sure' }] : [...options]

  const toggle = (v: string) => {
    if (v === UNSURE) return onChange(value.includes(UNSURE) && multi ? [] : [UNSURE])
    if (!multi) return onChange([v])
    const rest = value.filter((x) => x !== UNSURE)
    onChange(rest.includes(v) ? rest.filter((x) => x !== v) : [...rest, v])
  }

  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="mb-2 text-lg font-semibold">{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {all.map((o) => {
          const checked = value.includes(o.value)
          return (
            <label
              key={o.value}
              className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-edge bg-card px-4 py-2 text-base font-semibold has-checked:border-wine has-checked:bg-wine has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-wine"
            >
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => toggle(o.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-current group-has-checked:bg-white group-has-checked:text-wine"
              >
                <CheckIcon className="hidden size-4 group-has-checked:block" />
              </span>
              <span>{o.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
