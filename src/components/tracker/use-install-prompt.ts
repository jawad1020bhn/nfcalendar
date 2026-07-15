'use client'

import * as React from 'react'

// M3 PWA install prompt — handles beforeinstallprompt event
// Shows a subtle "Install app" prompt after the user has used the app for a while

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = React.useState(false)
  const [showPrompt, setShowPrompt] = React.useState(false)
  const dismissedKey = 'steady-install-dismissed'
  const dismissedDate = React.useRef<string | null>(null)

  React.useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true)
      return
    }

    // Check if previously dismissed (within 7 days)
    dismissedDate.current = localStorage.getItem(dismissedKey)
    if (dismissedDate.current) {
      const days = (Date.now() - parseInt(dismissedDate.current)) / (1000 * 60 * 60 * 24)
      if (days < 7) return // Don't show again for 7 days
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after 10 seconds of use (not immediately)
      setTimeout(() => setShowPrompt(true), 10000)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(dismissedKey, String(Date.now()))
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const dismiss = () => {
    localStorage.setItem(dismissedKey, String(Date.now()))
    setShowPrompt(false)
  }

  return { showPrompt, isInstalled, promptInstall, dismiss }
}
