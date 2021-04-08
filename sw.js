const CACHE_VERSION = 'cache-v0'

// 只要 sw.js 发生变化，就会执行 install
self.addEventListener('install', (event) => {
  console.log('install')
  //内容发生变化，直接进入 activate
  // event.waitUntil(self.skipWaiting());

  // 进入缓存，添加缓存资源路径，接着进入 activate
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(['/', '/index.css']))
      .then(self.skipWaiting)
  )
})

self.addEventListener('activate', (event) => {
  console.log('activate')
  // 默认情况下，首次加载后不受控制，self.clients.claim 让首次控制生效
  // event.waitUntil(self.clients.claim())

  // 判断缓存资源，如果缓存版本修改，删掉旧版本资源
  event.waitUntil(
    caches.keys().then((cahceNames) => {
      return Promise.all(
        cahceNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            console.log('clear', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

self.addEventListener('fetch', (event) => {
  const url = event.request.url

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // 匹配缓存中的请求资源
      let response = await cache.match(event.request)
      // 存在则返回
      if (response) return response

      // 否则请求服务器资源
      response = await fetch(event.request)
      // 缓存服务器资源
      if (/\.(jpg|png)$/g.test(url)) {
        cache.put(event.request, response.clone())
      }

      return response
    })
  )
})
