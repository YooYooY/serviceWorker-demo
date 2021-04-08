# ServiceWorker 运用

MDN 文档
- [ServiceWorker](https://developer.mozilla.org/zh-CN/docs/Web/API/ServiceWorker)

参考文章
- [Working with the JavaScript Cache API](https://blog.logrocket.com/javascript-cache-api/)

[代码地址](https://github.com/YooYooY/serviceWorker-demo)

## 目标

断网情况下正常打开页面，加载本地缓存数据

## 调试

chrome 控制台 > Application > Service Workers

## 创建 serviceWorker 

新建 `sw.js` 文件，初始化监听事件：
```js
//sw.js

// 版本号
const CACHE_VERSION = 'cache-v0'

// 安装
self.addEventListener('install', (event) => {
    // sw.js 文件发生变动，就会执行 install 回调函数
  console.log('install')
})

// 激活
self.addEventListener('activate', (event) => {
  console.log('activate')
})

// 捕获网络请求
self.addEventListener('fetch', (event) => {})
```

## register

注册 serviceWorker:

```js
navigator.serviceWorker.register("./sw.js",{scope:"/"}).then(
    registration => console.log("success"),
    error =>console.error("register error")
)
```

## waitUntil

sw.js 文件发生变动后，虽然会执行 `install` 回调函数，但是新版本的脚本文件并没有被激活。

激活 `activate`:

```js
self.addEventListener('install', (event) => {
  console.log('install')
  //内容发生变化，直接进入 activate
  event.waitUntil(self.skipWaiting());
})
```

## caches

存在全局的 `caches` 对象，可通过 `caches.open(cacheName) `打开缓存对象或`delete(cacheName)` 删除对象。

通过 open 获得 `Cache` 主要包含以下几个方法：

| api | 作用 |
| ---- | ---- |
| Cache.addAll(requests)| 返回Promise，给 cache 添加缓存请求|
| Cache.match(request, options) | 返回Promise，匹配缓存对象已缓存请求 |
| Cache.put(request, response) | 返回Promise，获取请求和保存响应结果 |


> 更详细的api介绍请查看 [Working with the JavaScript Cache API](https://blog.logrocket.com/javascript-cache-api/)

## 流程

**ServiceWorker 需要在服务中启用**

首页 `index.html`

- 加载样式资源 `index.css`
- 加载图片资源
- 请求服务数据 `data.json`
- 响应数据渲染进app标签
- 注册 `ServiceWorker` 服务

```html
<html>
  <head>
    <title>service Worker</title>
    <link rel="stylesheet" href="./index.css" />
  </head>
  <body>
    <div id="app"></div>
    <img
      src="https://blog.logrocket.com/wp-content/uploads/2020/06/cacheapi.png"
    />
    <script>
      ;(async () => {
        const registration = await navigator.serviceWorker.register('./sw.js', {
          scope: '/',
        })
      })()

      window.onload = function () {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', './data.json')
        xhr.responseType = 'json'
        xhr.onload = () => {
          app.innerText = xhr.response.result
        }
        xhr.send(null)
      }
    </script>
  </body>
</html>
```

sw.js 流程

- 声明版本号

install 
- 获得对应版本号cache
- 添加需要缓存的资源路径
- 进入 activate

activate
- 获得已经注册的caches版本
- 遍历版本号，对比当前最新版本号
- 新旧版本号不匹配，清空旧版本

fetch
- 截取请求资源
- 打开当前版本号的缓存资源
- 匹配到缓存结果返回
- 不在缓存的资源再fetch服务器资源
- 如果是图片资源，加入到缓存


```js
// sw.js
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
```