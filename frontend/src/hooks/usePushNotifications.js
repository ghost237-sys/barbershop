import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

export function usePushNotifications(token) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [subscribed, setSubscribed] = useState(false)
  const lastPositionRef = useRef(null)
  const lastStatusRef   = useRef(null)
  const intervalRef     = useRef(null)

  // ── Request notification permission ──────────────────────────────────
  const subscribe = async () => {
    if (!('Notification' in window)) {
      console.warn('[Push] Notifications not supported')
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        setSubscribed(true)
        console.log('[Push] Permission granted — direct notifications enabled')

        // Show a confirmation notification immediately
        new Notification('💈 The Queue', {
          body: 'You will be notified when it is your turn! / Utajulishwa ukifika zamu yako.',
          icon: '/favicon.ico',
        })
      }
    } catch (err) {
      console.error('[Push] Permission request failed:', err)
    }
  }

  // ── Fire a notification directly ─────────────────────────────────────
  const fireNotification = (title, body) => {
    if (Notification.permission !== 'granted') return

    try {
      const notification = new Notification(title, {
        body,
        icon:    '/favicon.ico',
        vibrate: [200, 100, 200],
        tag:     'queue-update',
        renotify: true,
      })

      // Clicking the notification focuses the tab
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      console.log('[Push] Notification fired:', title)
    } catch (err) {
      console.error('[Push] Failed to fire notification:', err)
    }
  }

  // ── Poll queue status and fire notifications on changes ──────────────
  const startPolling = () => {
    if (intervalRef.current) return  // already polling
    if (!token) return

    console.log('[Push] Starting notification polling...')

    intervalRef.current = setInterval(async () => {
      // Only fire notifications when page is hidden (minimized/background)
      // When page is visible the wait room UI already shows the update
      if (document.visibilityState === 'visible') return

      try {
        const res  = await axios.get(`${API_BASE}/queue/entry/${token}/`)
        const data = res.data

        const currentPosition = data.queue_position
        const currentStatus   = data.status

        // First poll — just record the state, don't notify
        if (lastPositionRef.current === null) {
          lastPositionRef.current = currentPosition
          lastStatusRef.current   = currentStatus
          return
        }

        // Customer moved to position 2
        if (
          currentPosition === 2 &&
          lastPositionRef.current !== 2
        ) {
          fireNotification(
            "💈 You're 2nd in line!",
            `Head back to the shop now — ${data.barber_name} will call you soon. / Rudi dukani hivi karibuni.`
          )
        }

        // Customer's turn — status flipped to in_service
        if (
          currentStatus === 'in_service' &&
          lastStatusRef.current !== 'in_service'
        ) {
          fireNotification(
            "✂️ It's your turn!",
            `${data.barber_name} is ready for you now! Come on in! / ${data.barber_name} anakusubiri.`
          )
        }

        // Customer was re-queued
        if (
          currentStatus === 'waiting' &&
          lastStatusRef.current === 'no_show'
        ) {
          fireNotification(
            "🔄 You've been re-queued",
            `You're now at position #${currentPosition}. / Uko nafasi #${currentPosition}.`
          )
        }

        // Update tracked state
        lastPositionRef.current = currentPosition
        lastStatusRef.current   = currentStatus

      } catch (err) {
        console.warn('[Push] Poll failed:', err.message)
      }
    }, 4000)  // poll every 4 seconds
  }

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // ── Start polling when subscribed and token available ─────────────────
  useEffect(() => {
    if (token && permission === 'granted') {
      setSubscribed(true)
      startPolling()
    }
    return () => stopPolling()
  }, [token, permission])

  // ── Auto-request permission when token is available ───────────────────
  useEffect(() => {
    if (!token) return
    if (permission === 'default') {
      subscribe()
    } else if (permission === 'granted') {
      setSubscribed(true)
      startPolling()
    }
  }, [token])

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => stopPolling()
  }, [])

  return { permission, subscribed, subscribe }
}