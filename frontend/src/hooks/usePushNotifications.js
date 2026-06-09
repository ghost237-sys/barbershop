import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// ── Chime sound using Web Audio API ─────────────────────────────────────────
// No external files needed — generated in the browser
function playChime(type = 'normal') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    if (type === 'urgent') {
      // Your turn — two urgent beeps
      [0, 0.3].forEach(delay => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.5, ctx.currentTime + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.4)
      })
    } else {
      // 2nd in line — gentle three-note rising chime
      const notes = [523, 659, 784]  // C, E, G
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0.3, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
        osc.start(t)
        osc.stop(t + 0.5)
      })
    }
  } catch (err) {
    console.warn('[Chime] Could not play sound:', err)
  }
}

// ── Fire a browser notification ───────────────────────────────────────────────
function fireNotification(title, body, type = 'normal') {
  if (Notification.permission !== 'granted') return

  try {
    playChime(type)

    const notification = new Notification(title, {
      body,
      icon:     '/icon-192.png',
      badge:    '/icon-192.png',
      tag:      'queue-update',
      renotify: true,
      vibrate:  type === 'urgent' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    console.log('[Push] Notification fired:', title)
  } catch (err) {
    console.error('[Push] Failed:', err)
  }
}

// ── Main hook ──────────────────────────────────────────────────────────────────
export function usePushNotifications(token) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined'
      ? Notification.permission
      : 'denied'
  )
  const [subscribed, setSubscribed]   = useState(
    typeof Notification !== 'undefined'
      ? Notification.permission === 'granted'
      : false
  )

  const lastPositionRef = useRef(null)
  const lastStatusRef   = useRef(null)
  const intervalRef     = useRef(null)
  const tokenRef        = useRef(token)

  // Keep tokenRef current
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  // ── Request notification permission ────────────────────────────────────
  const subscribe = async () => {
    if (!('Notification' in window)) {
      console.warn('[Push] Notifications not supported')
      return
    }

    // Already granted — just start polling
    if (Notification.permission === 'granted') {
      setPermission('granted')
      setSubscribed(true)
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result === 'granted') {
        setSubscribed(true)

        // Confirmation chime + notification
        playChime('normal')
        new Notification('💈 The Queue', {
          body: "You'll be notified when it's your turn! / Utajulishwa ukifika zamu yako.",
          icon: '/icon-192.png',
        })

        console.log('[Push] Permission granted')
      }
    } catch (err) {
      console.error('[Push] Permission request failed:', err)
    }
  }

  // ── Polling loop — checks queue and fires notifications ─────────────────
  const startPolling = () => {
    if (intervalRef.current) return

    console.log('[Push] Starting notification polling for token:', tokenRef.current)

    intervalRef.current = setInterval(async () => {
      if (!tokenRef.current) return
      if (Notification.permission !== 'granted') return

      try {
        const res  = await axios.get(`${API_BASE}/queue/entry/${tokenRef.current}/`)
        const data = res.data

        const currentPosition = data.queue_position
        const currentStatus   = data.status

        // First poll — record baseline, no notification
        if (lastPositionRef.current === null) {
          lastPositionRef.current = currentPosition
          lastStatusRef.current   = currentStatus
          return
        }

        // ── 2nd in line ──────────────────────────────────────────────────
        if (
          currentPosition === 2 &&
          lastPositionRef.current !== 2 &&
          currentStatus === 'waiting'
        ) {
          fireNotification(
            "💈 You're 2nd in line!",
            `Head back to the shop — ${data.barber_name} will call you soon.\nRudi dukani hivi karibuni.`,
            'normal'
          )
        }

        // ── It's your turn ───────────────────────────────────────────────
        if (
          currentStatus === 'in_service' &&
          lastStatusRef.current !== 'in_service'
        ) {
          fireNotification(
            "✂️ It's your turn!",
            `${data.barber_name} is ready for you — come on in!\n${data.barber_name} anakusubiri.`,
            'urgent'
          )
        }

        // ── Re-queued after no-show ──────────────────────────────────────
        if (
          currentStatus === 'waiting' &&
          lastStatusRef.current === 'no_show'
        ) {
          fireNotification(
            "🔄 You've been re-queued",
            `You're now at position #${currentPosition}.\nUko nafasi #${currentPosition}.`,
            'normal'
          )
        }

        // ── Update tracked state ─────────────────────────────────────────
        lastPositionRef.current = currentPosition
        lastStatusRef.current   = currentStatus

      } catch (err) {
        // Silent fail — never crash the UI
        console.warn('[Push] Poll failed:', err.message)
      }
    }, 4000)  // every 4 seconds
  }

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // ── Start polling when we have a token and permission ───────────────────
  useEffect(() => {
    if (token && permission === 'granted') {
      startPolling()
    }
    return () => stopPolling()
  }, [token, permission])

  // ── Auto-request permission when token appears ───────────────────────────
  useEffect(() => {
    if (!token) return

    if (permission === 'default') {
      // Small delay so check-in page has fully rendered first
      setTimeout(subscribe, 1000)
    } else if (permission === 'granted') {
      setSubscribed(true)
      startPolling()
    }
  }, [token])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => stopPolling()
  }, [])

  return { permission, subscribed, subscribe }
}