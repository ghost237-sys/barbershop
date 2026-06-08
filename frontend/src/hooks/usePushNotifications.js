import { useState, useEffect } from 'react'
import { messaging, getToken, onMessage } from '../firebase'
import axios from 'axios'

const API_BASE       = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
const FIREBASE_VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

export function usePushNotifications(token) {
  const [permission, setPermission]   = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const [subscribed, setSubscribed]   = useState(false)

  const subscribe = async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service workers not supported')
      return
    }

    try {
      // Register Firebase service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      console.log('[Push] Service worker registered')

      // Request permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        console.log('[Push] Permission denied')
        return
      }

      console.log('[Push] Getting FCM token...')

      // Get FCM registration token
      const fcmToken = await getToken(messaging, {
        vapidKey:            FIREBASE_VAPID,
        serviceWorkerRegistration: registration,
      })

      if (!fcmToken) {
        console.warn('[Push] No FCM token received')
        return
      }

      console.log('[Push] Got FCM token:', fcmToken.substring(0, 20) + '...')

      // Save to backend
      await axios.post(`${API_BASE}/push/subscribe/`, {
        token,      // queue entry token
        fcm_token:  fcmToken,
      })

      setSubscribed(true)
      console.log('[Push] Subscribed successfully')

      // Handle foreground messages (app is open)
      onMessage(messaging, payload => {
        console.log('[Push] Foreground message:', payload)
        // Show a browser notification even when app is open
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title, {
            body:    payload.notification.body,
            icon:    '/favicon.ico',
            vibrate: [200, 100, 200],
          })
        }
      })

    } catch (err) {
      console.error('[Push] Failed:', err.name, err.message)
    }
  }

  useEffect(() => {
    if (!token) return
    if (permission === 'default' || permission === 'granted') {
      subscribe()
    }
  }, [token])

  return { permission, subscribed, subscribe }
}