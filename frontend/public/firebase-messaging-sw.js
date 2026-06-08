importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Firebase config hardcoded — these are public values, safe to expose
const firebaseConfig = {
  apiKey:            'AIzaSyCl9rj8qWHaj8WWaGMrt-uvsGJGJ9pi_Cw',
  authDomain:        'thequeue-barbershop.firebaseapp.com',
  projectId:         'thequeue-barbershop',
  storageBucket:     'thequeue-barbershop.firebasestorage.app',
  messagingSenderId: '301709557527',
  appId:             '1:301709557527:web:3690b9a8b2d75dd4aac152',
}

// Only initialize if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  console.log('[SW] Background message:', payload)
  const title = payload.notification?.title || '💈 The Queue'
  const body  = payload.notification?.body  || 'Queue update'

  self.registration.showNotification(title, {
    body,
    icon:     '/favicon.ico',
    vibrate:  [200, 100, 200],
    tag:      'queue-notification',
    renotify: true,
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})