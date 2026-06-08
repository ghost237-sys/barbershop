importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// PWA precache manifest injected by vite-plugin-pwa
self.__WB_MANIFEST

const firebaseConfig = {
  apiKey:            'AIzaSyCl9rj8qWHaj8WWaGMrt-uvsGJGJ9pi_Cw',
  authDomain:        'thequeue-barbershop.firebaseapp.com',
  projectId:         'thequeue-barbershop',
  storageBucket:     'thequeue-barbershop.firebasestorage.app',
  messagingSenderId: '301709557527',
  appId:             '1:301709557527:web:3690b9a8b2d75dd4aac152',
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const messaging = firebase.messaging()

// Handle background push messages
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || '💈 The Queue'
  const body  = payload.notification?.body  || 'Queue update'

  self.registration.showNotification(title, {
    body,
    icon:     '/icon-192.png',
    badge:    '/icon-192.png',
    vibrate:  [200, 100, 200],
    tag:      'queue-notification',
    renotify: true,
  })
})

// Handle notification click — open the app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})