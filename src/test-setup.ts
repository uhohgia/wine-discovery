import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// Screens render quickly on a quiet machine, but a busy one (many tests at once) can take longer than the
// 1 second default to show a screen. A longer wait only slows a test that is genuinely failing.
configure({ asyncUtilTimeout: 5000 })
