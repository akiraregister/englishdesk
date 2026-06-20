/* The Desk — service worker
   - アプリ本体・アイコンはキャッシュ優先（オフラインでも起動）
   - lessons.json はネットワーク優先（毎日の更新を反映、失敗時はキャッシュ）
   キャッシュを作り直したいときは CACHE のバージョンを上げる。 */
var CACHE = "thedesk-v5";
var CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./favicon-32.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // 1件でも 404 だと addAll は全失敗するので、個別に入れて失敗は無視
      return Promise.all(CORE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部(Firebase等)は素通し

  // lessons.json はネットワーク優先（更新を取りに行く）
  if (url.pathname.indexOf("lessons.json") !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // それ以外はキャッシュ優先（オフライン起動）。なければ取得してキャッシュ。
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        // ナビゲーション失敗時はトップを返す
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部(Firebase等)は素通し

  // lessons.json はネットワーク優先（更新を取りに行く）
  if (url.pathname.indexOf("lessons.json") !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // それ以外はキャッシュ優先（オフライン起動）。なければ取得してキャッシュ。
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        // ナビゲーション失敗時はトップを返す
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部(Firebase等)は素通し

  // lessons.json はネットワーク優先（更新を取りに行く）
  if (url.pathname.indexOf("lessons.json") !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // それ以外はキャッシュ優先（オフライン起動）。なければ取得してキャッシュ。
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        // ナビゲーション失敗時はトップを返す
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
