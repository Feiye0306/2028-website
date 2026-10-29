const CACHE_NAME = 'kanban-2028-v4-network-first';

// 安裝時立即接管
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 啟動時徹底清除所有舊版本的快取（徹底清除舊版校系總覽快取）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('清除過期快取:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 核心快取策略：Network-First（優先請求最新網路版本，斷網才回退快取）
self.addEventListener('fetch', (event) => {
  // 忽略非 GET 請求或跨域 API 請求
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 斷網時才讀取本地快取
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// 推播事件監聽
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: '2028 學測陪跑日曆',
    body: '本週倒數週數與指引已更新，歡迎前往查看。'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './manifest.json',
      badge: './manifest.json',
      data: { url: './index.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('index.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});
