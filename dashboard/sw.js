// Simple Service Worker for Leka Bot Dashboard
// This is a minimal service worker to avoid 404 errors

const CACHE_NAME = 'leka-bot-v1';

// Install event
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch event - minimal implementation
self.addEventListener('fetch', function(event) {
  // Let all requests pass through without caching for now
  // This avoids interfering with the main application
  event.respondWith(fetch(event.request));
});

// Message handling
self.addEventListener('message', function(event) {
  if (event.data && event.data.command === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded successfully');