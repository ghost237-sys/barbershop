import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// Converts the VAPID public key from base64 to Uint8Array
// Required format for the Push API
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

export function usePushNotifications(token) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [subscribed, setSubscribed] = useState(false)

  const subscribe = async () => {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Not supported in this browser')
      return
    }

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')

      // Request permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        console.log('[Push] Permission denied')
        return
      }

      // Subscribe to push service
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      const subJson = subscription.toJSON()

      // Save subscription to backend linked to this queue entry
      await axios.post(`${API_BASE}/push/subscribe/`, {
        token,
        endpoint: subJson.endpoint,
        p256dh:   subJson.keys.p256dh,
        auth:     subJson.keys.auth,
      })

      setSubscribed(true)
      console.log('[Push] Subscribed successfully')

    } catch (err) {
      console.error('[Push] Subscription failed:', err)
    }
  }

  // Auto-subscribe when token is available and permission not yet decided
  useEffect(() => {
    if (token && permission === 'default') {
      subscribe()
    }
  }, [token])

  return { permission, subscribed, subscribe }
}

export function usePushNotifications(token) {
  console.log('[Push] VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY)
  console.log('[Push] Key length:', VAPID_PUBLIC_KEY?.length)
}