import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banner } from '@/components/Banner'
import { ChoiceGroup } from '@/components/Choice'
import { Button } from '@/components/ui'
import { QUIZ_STEPS, SHOW_WINES_AFTER_STEP } from '@/data/quizRules'
import { useWd } from '@/data/WdContext'
import { isEmptyProfile } from '@/lib/profile'
import { cleanAnswers, quizToProfile, stepsAnswered, type QuizAnswers } from '@/lib/quiz'
import { usePageTitle } from '@/lib/usePageTitle'

/** The 6-screen taste quiz. Every question is optional ("Not sure" or skipping both tell us nothing). */
export default function Quiz() {
  usePageTitle('Taste quiz')
  const { profile, saveQuizProfile, track } = useWd()
  const navigate = useNavigate()
  const editing = !isEmptyProfile(profile.prefs)
  const [answers, setAnswers] = useState<QuizAnswers>(() => cleanAnswers(profile.prefs.quizAnswers))
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    track('quiz_started', { editing })
  }, [track, editing])

  // Move focus to the new screen's heading so keyboard and screen-reader users land in the right place.
  useEffect(() => {
    if (index > 0) headingRef.current?.focus()
  }, [index])

  const step = QUIZ_STEPS[index]!
  const last = index === QUIZ_STEPS.length - 1

  const finish = async (early: boolean) => {
    setError(null)
    setBusy(true)
    try {
      await saveQuizProfile(quizToProfile(answers))
      const answered = stepsAnswered(answers)
      if (early) track('quiz_stopped_early', { at_step: index + 1, steps_answered: answered })
      else track('quiz_completed', { steps_answered: answered })
      navigate('/profile', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <p className="font-semibold text-muted" aria-live="polite">
        Question {index + 1} of {QUIZ_STEPS.length}
      </p>
      <div
        role="progressbar"
        aria-label="Quiz progress"
        aria-valuemin={1}
        aria-valuemax={QUIZ_STEPS.length}
        aria-valuenow={index + 1}
        aria-valuetext={`Question ${index + 1} of ${QUIZ_STEPS.length}`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-wine transition-[width]" style={{ width: `${((index + 1) / QUIZ_STEPS.length) * 100}%` }} />
      </div>

      <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-3xl leading-tight outline-none">
        {step.title}
      </h1>

      {step.questions.map((q) => (
        <ChoiceGroup
          key={q.id}
          legend={q.prompt}
          options={q.options}
          multi={q.multi}
          value={answers[q.id] ?? []}
          onChange={(next) => setAnswers((a) => ({ ...a, [q.id]: next }))}
        />
      ))}

      {error && (
        <div className="mt-4">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Button onClick={() => (last ? finish(false) : setIndex(index + 1))} disabled={busy}>
          {last ? 'See my taste profile' : 'Next'}
        </Button>
        {index + 1 > SHOW_WINES_AFTER_STEP && !last && (
          <Button variant="secondary" onClick={() => finish(true)} disabled={busy}>
            Show me wines now
          </Button>
        )}
        {index > 0 && (
          <Button variant="ghost" onClick={() => setIndex(index - 1)} disabled={busy}>
            Back
          </Button>
        )}
      </div>
    </div>
  )
}
