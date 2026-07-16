// MarginFlow OS — Service Worker
// Responsabilidades:
//   1. Web Push notifications
//   2. Cache de assets estáticos (cache-first)
//   3. Fallback offline para navegação

const CACHE_NAME = "marginflow-v1"

// Assets estáticos que serão pré-cacheados na instalação do SW.
// Mantém pequeno — apenas o essencial para shell offline.
const PRECACHE_ASSETS = [
  "/offline.html",
  "/icon-192.png",
  "/apple-icon.png",
  "/favicon-16x16.png",
]

// ---------------------------------------------------------------------------
// Install — pré-cacheia assets críticos.
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

// ---------------------------------------------------------------------------
// Activate — remove caches de versões anteriores.
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

// ---------------------------------------------------------------------------
// Fetch — estratégias por tipo de recurso.
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições cross-origin, extensões, etc.
  if (url.origin !== self.location.origin) return

  // Ignora chamadas de API — nunca cacheamos respostas de API.
  if (url.pathname.startsWith("/api/")) return

  // Assets estáticos (_next/static, imagens públicas): cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navegação de página (Accept: text/html): network-first com fallback offline.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }
})

// ---------------------------------------------------------------------------
// Estratégia: cache-first → network → salva no cache.
// ---------------------------------------------------------------------------

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response("Recurso indisponível offline.", { status: 503 })
  }
}

// ---------------------------------------------------------------------------
// Estratégia: network-first → fallback para /offline.html quando offline.
// ---------------------------------------------------------------------------

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    // Cacheia navegações bem-sucedidas para disponibilidade futura.
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Tenta o cache antes do fallback genérico.
    const cached = await caches.match(request)
    if (cached) return cached
    // Página de fallback offline.
    const offline = await caches.match("/offline.html")
    return offline ?? new Response("Você está offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
  }
}

// ---------------------------------------------------------------------------
// Web Push — exibe notificação nativa.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Notification click — foca janela existente ou abre nova.
// ---------------------------------------------------------------------------

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus()
            if ("navigate" in client) client.navigate(url)
            return
          }
        }
        if (clients.openWindow) return clients.openWindow(url)
      }),
  )
})
