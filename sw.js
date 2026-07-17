const CACHE = "planner-cache-v4"; // هر بار که تغییر مهمی دادید این عدد رو یکی زیاد کنید
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  var req = event.request;

  // خیلی مهم: هیچ درخواستی به یه دامنه‌ی دیگه (مثل Supabase) نباید کش بشه —
  // وگرنه جواب‌های API (که دیتای واقعی برنامه‌ست) کش می‌مونن و بعد از رفرش
  // به‌جای گرفتن نسخه‌ی تازه از سرور، همون جواب قدیمیِ کش‌شده برمی‌گرده
  // (این دقیقاً همون باگ «حذف با رفرش برمی‌گرده» بود). فقط فایل‌های
  // هم‌دامنه (خود اپ) رو کش می‌کنیم.
  if (new URL(req.url).origin !== self.location.origin) {
    return; // بذار مرورگر خودش عادی درخواست رو بفرسته، دست نمی‌زنیم
  }

  var isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (isHTML) {
    // Network-first: همیشه سعی می‌کنه آخرین نسخه رو از سرور بگیره،
    // فقط وقتی آفلاینی از کش قدیمی استفاده می‌کنه.
    event.respondWith(
      fetch(req)
        .then((response) => {
          var copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // بقیه فایل‌های هم‌دامنه (آیکون، مانیفست و...): اول کش، بعد شبکه
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((response) => {
            var copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
