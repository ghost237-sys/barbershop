// Import Firebase scripts for background message handling
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')
importScripts('/firebase-config.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')
// ... rest of sw.js unchanged


// Must match your firebaseConfig exactly
firebase.initializeApp({
  apiKey:            self.VITE_FIREBASE_API_KEY || '',
  authDomain:        self.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId:         self.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket:     self.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             self.VITE_FIREBASE_APP_ID || '',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message received:', payload)

  const { title, body } = payload.notification

  self.registration.showNotification(title, {
    body,
    icon:     '/favicon.ico',
    badge:    '/favicon.ico',
    vibrate:  [200, 100, 200],
    tag:      'queue-notification',
    renotify: true,
  })
})

// Open app when notification is tapped
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})