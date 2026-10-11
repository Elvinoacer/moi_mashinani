/* FCM data-only messages, with one notification owner to avoid duplicate banners. */
function noticeUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin && /^\/notifications\/open\/[^/]+$/.test(url.pathname)) return url.href;
  } catch {}
  return new URL('/dashboard', self.location.origin).href;
}
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { return; }
    const data = payload?.data;
    if (!data?.id || !data?.title) return;
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const visible = windows.filter(client => client.visibilityState === 'visible');
    const notice = {type:'MM_NOTIFICATION',id:data.id,title:data.title,body:data.body,url:noticeUrl(data.url)};
    if (visible.length) {
      visible.forEach(client => client.postMessage(notice));
      return;
    }
    await self.registration.showNotification(data.title,{body:data.body,icon:'/brand/apple-touch-icon.png',badge:'/brand/apple-touch-icon.png',tag:`mm-${data.id}`,data:{url:notice.url},renotify:false});
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = noticeUrl(event.notification.data?.url);
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const client = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (client) {await client.navigate(url);await client.focus();}
    else await self.clients.openWindow(url);
  })());
});
