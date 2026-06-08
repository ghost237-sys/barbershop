import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Not supported in this browser')
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        console.log('[Push] Permission denied')
        return
      }

      console.log('[Push] Attempting subscription with key:', VAPID_PUBLIC_KEY.substring(0, 20) + '...')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      const subJson = subscription.toJSON()

      await axios.post(`${API_BASE}/push/subscribe/`, {
        token,
        endpoint: subJson.endpoint,
        p256dh:   subJson.keys.p256dh,
        auth:     subJson.keys.auth,
      })

      setSubscribed(true)
      console.log('[Push] Subscribed successfully')

    } catch (err) {
      console.error('[Push] Subscription failed:', err.name, err.message)

      if (err.name === 'AbortError') {
        console.error('[Push] FCM unreachable or VAPID key format wrong')
      }
      if (err.name === 'NotAllowedError') {
        console.error('[Push] User denied permission')
      }
      if (err.name === 'InvalidStateError') {
        console.error('[Push] Service worker not ready yet')
      }
    }
  }  // ← subscribe() closes here

  useEffect(() => {
    if (token && permission === 'default') {
      subscribe()
    }
  }, [token])

  console.log('[Push] VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY)
  console.log('[Push] Key length:', VAPID_PUBLIC_KEY?.length)

  return { permission, subscribed, subscribe }
}  // ← usePushNotifications closes here