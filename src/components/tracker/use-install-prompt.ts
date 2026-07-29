'use client'

import * as React from 'react'

// M3 PWA install prompt — handles beforeinstallprompt event.
// Shows a subtle "Install app" prompt after the user has used the app for a while.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean
}

const DISMISSED_KEY = 'steady-install-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as NavigatorStandalone
  return nav.standalone === true
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return true
  const raw = localStorage.getItem(DISMISSED_KEY)
  if (!raw) return false
  const days = (Date.now() - parseInt(raw, 10)) / (1000 * 60 * 60 * 24)
  return days < 7
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  // Lazily initialize installed/dismissed state so we don't need a synchronous
  // setState inside the effect.
  const [isInstalled, setIsInstalled] = React.useState<boolean>(() => isStandalone())
  const [showPrompt, setShowPrompt] = React.useState<boolean>(
    () => !isStandalone() && !wasRecentlyDismissed(),
  )
  const showTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (isInstalled) return
    if (wasRecentlyDismissed()) return

    let cancelled = false

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after 10 seconds of use (not immediately).
      if (showTimer.current) clearTimeout(showTimer.current)
      showTimer.current = setTimeout(() => {
        if (!cancelled) setShowPrompt(true)
      }, 10000)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      cancelled = true
      if (showTimer.current) clearTimeout(showTimer.current)
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [isInstalled])

  const promptInstall = React.useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }, [deferredPrompt])

  const dismiss = React.useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShowPrompt(false)
  }, [])

  return { showPrompt, isInstalled, promptInstall, dismiss }
}
