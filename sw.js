// =============================================
// Service Worker for 営業リストアプリ v3
// =============================================
const CACHE_NAME = 'eigyo-app-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// インストール時：必要ファイルをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('キャッシュ失敗:', err);
      });
    })
  );
  self.skipWaiting();
});

// アクティベート時：古いキャッシュを全削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// フェッチ時：自サイトのファイルのみキャッシュ、外部は全スルー
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 外部ドメインへのリクエストはすべてブラウザに任せる（スルー）
  if (url.origin !== self.location.origin) {
    return;
  }

  // POSTリクエストはキャッシュしない
  if (event.request.method !== 'GET') {
    return;
  }

  // 自サイトのGETリクエスト：キャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // オフライン時：index.htmlにフォールバック
        return caches.match('./index.html');
      });
    })
  );
});
