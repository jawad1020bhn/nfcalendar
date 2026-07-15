'use client'

import * as React from 'react'
import { useTrackerStore, escalateSlips } from '@/lib/store'
import { getCurrentStreak } from '@/lib/tracker/stats'

// Home screen widget — uses the App Badging API to show streak count on the app icon.
// Works on Android (Chrome) and Windows. iOS shows a standard notification badge.
// Also sets the document title to include the streak for tab visibility.

export function useHomeScreenBadge() {
  const rawEntries = useTrackerStore((s) => s.entries)
  const entries = React.useMemo(() => escalateSlips(rawEntries), [rawEntries])
  const streak = React.useMemo(() => getCurrentStreak(entries), [entries])

  React.useEffect(() => {
    // App Badging API — show streak number on home screen icon
    if ('setAppBadge' in navigator) {
      if (streak > 0) {
        navigator.setAppBadge(streak).catch(() => {})
      } else {
        navigator.clearAppBadge().catch(() => {})
      }
    }

    // Also update the document title for tab/PWA visibility
    if (streak > 0) {
      document.title = `${streak} day streak — Steady`
    } else {
      document.title = 'Steady — Track your streak'
    }

    return () => {
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {})
      }
    }
  }, [streak])
}
