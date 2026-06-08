// Service Worker — handles push notifications when app is in background

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}

  const title   = data.title || '💈 The Queue'
  const options = {
    body:    data.body || 'Queue update',
    icon:    data.icon || '/favicon.ico',
    badge:   '/favicon.ico',
    vibrate: [200, 100, 200],  // buzz pattern on Android
    tag:     'queue-notification',  // replaces previous notification
    renotify: true,
    data:    { url: self.registration.scope }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// When customer taps the notification — open the app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.data?.url || '/')
  )
})