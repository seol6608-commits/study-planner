/* Study Planner 서비스워커 — 홈화면 설치 + 오프라인 캐시 */
const CACHE = 'study-planner-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});

// 활성화: 오래된 캐시 정리
self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=> k!==CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

// 요청 처리
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);

  // 구글 API/로그인·폰트 등 외부 요청은 항상 네트워크로 (캐시하지 않음)
  if(url.origin !== self.location.origin){
    return; // 브라우저 기본 처리(네트워크)
  }

  // 같은 출처(앱 파일): 네트워크 우선, 실패 시 캐시 (오프라인 대비)
  e.respondWith(
    fetch(e.request)
      .then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=> c.put(e.request, copy)).catch(()=>{});
        return res;
      })
      .catch(()=> caches.match(e.request).then(r=> r || caches.match('./index.html')))
  );
});
