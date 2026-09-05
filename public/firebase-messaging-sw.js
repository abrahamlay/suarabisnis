// Firebase Messaging Service Worker
// Handles BACKGROUND push (when browser tab is closed).
// Foreground messages are handled in the main app (FcmListener component).
//
// IMPORTANT: This file is served from /public/ root, accessible at /firebase-messaging-sw.js
// It uses the compat (UMD) SDK because Service Workers don't support ES Modules.

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Initialize Firebase app in service worker context.
// Values are injected at deploy time via a build step. For now, placeholders are safe
// (the actual config is in the main app; the SW just needs a valid config to call onBackgroundMessage).
firebase.initializeApp({
  apiKey: "AIzaSyPLACEHOLDER_REPLACE_AT_DEPLOY",
  authDomain: "bizbuzz-63267.firebaseapp.com",
  projectId: "bizbuzz-63267",
  storageBucket: "bizbuzz-63267.firebasestorage.app",
  messagingSenderId: "624784111594",
  appId: "1:624784111594:web:90e469620d0bf8a1672493",
});

const messaging = firebase.messaging();

// Handle background push
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-sw] Background message:", payload);

  const title = (payload.notification && payload.notification.title) || "SuaraBisnis";
  const body = (payload.notification && payload.notification.body) || "Anda memiliki notifikasi baru";

  const options = {
    body: body,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: payload.data || {},
    tag: (payload.data && payload.data.tag) || "default",
    requireInteraction: !!(payload.data && payload.data.priority === "high"),
  };

  self.registration.showNotification(title, options);
});

// Handle click on notification (deep link)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const clickAction = data.clickAction || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a tab is already open, navigate it
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin)) {
            try {
              client.navigate(clickAction);
              return client.focus();
            } catch (err) {
              // Some browsers don't allow navigate(), fall through
            }
          }
        }
        // Otherwise open a new tab
        return clients.openWindow(clickAction);
      })
  );
});
