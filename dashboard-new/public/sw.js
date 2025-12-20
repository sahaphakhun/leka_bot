// Service Worker for Leka Bot Dashboard (New)
// Version 1.0.0 - PWA Support with Offline Capabilities

const CACHE_NAME = "leka-bot-dashboard-v1";
const RUNTIME_CACHE = "leka-bot-runtime-v1";

// Assets to cache on install (using relative paths for subdirectory deployment)
const PRECACHE_ASSETS = ["./", "./index.html", "./offline.html"];

// Cache-first resources (static assets)
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:woff|woff2|ttf|eot)$/,
  /\.(?:css|js)$/,
];

// Network-first resources (API calls)
const NETWORK_FIRST_PATTERNS = [/\/api\//, /\/auth\//];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing Service Worker v1.0.0...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Precaching app shell");
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating Service Worker v1.0.0...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Check if it's a network-first resource (API calls)
  if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Check if it's a cache-first resource (static assets)
  if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: Stale-while-revalidate strategy
  event.respondWith(staleWhileRevalidate(request));
});

// Strategy 1: Cache First (for static assets)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log("[SW] Cache hit:", request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("[SW] Fetch failed:", error);
    return caches.match("/offline.html");
  }
}

// Strategy 2: Network First (for API calls)
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      return caches.match("/offline.html");
    }

    throw error;
  }
}

// Strategy 3: Stale While Revalidate (for HTML pages)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // If network fails and we have cache, return it
      if (cached) {
        return cached;
      }
      // Otherwise return offline page
      return caches.match("/offline.html");
    });

  return cached || fetchPromise;
}

// Message handling
self.addEventListener("message", (event) => {
  if (event.data && event.data.command === "skipWaiting") {
    console.log("[SW] Skip waiting triggered");
    self.skipWaiting();
  }

  if (event.data && event.data.command === "clearCache") {
    console.log("[SW] Clearing all caches");
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      }),
    );
  }
});

// Background sync (for offline form submissions)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    console.log("[SW] Background sync: tasks");
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  // Placeholder for background sync logic
  // Will be implemented when offline task submission is added
  console.log("[SW] Syncing tasks...");
}

// Push notifications (future feature)
self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const title = data.title || "Leka Bot";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: data.url,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(self.clients.openWindow(event.notification.data));
  }
});

console.log("[SW] Service Worker loaded successfully v1.0.0");
