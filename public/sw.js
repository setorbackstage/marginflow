// MarginFlow OS — Service Worker (Web Push)
// This file must stay at the root of the public/ directory so it is served
// at /sw.js (same scope as the app).

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  const title   = data.title  ?? "MarginFlow OS"
  const options = {
    body:    data.body  ?? "",
    icon:    "/icon-192.png",
    badge:   "/icon-192.png",
    tag:     data.tag   ?? "marginflow",
    data:    { url: data.url ?? "/" },
    vibrate: [200, 100, 200],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If there's an open window on the same origin, focus it and navigate
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus()
            if ("navigate" in client) client.navigate(url)
            return
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(url)
      }),
  )
})
