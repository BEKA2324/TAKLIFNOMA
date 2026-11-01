# Luma

Taklifnoma, kechirim maktubi, interaktiv yurak, 3D kapalaklar va Telegram eslatmalari. Frontend va backend bitta loyiha ichida; ilova hamda testlarning manba kodi TypeScript’da yozilgan.

## Ishga tushirish

Node.js 24 yoki yangirog‘i kerak.

```sh
npm install
npm start
```

PowerShell `npm.ps1` ni bloklasa, `npm.cmd install` va `npm.cmd start` ishlating. Sayt: http://localhost:3000 . `npm start` avval frontendni yig‘adi, keyin backendni ishga tushiradi.

```sh
npm run check    # strict TypeScript va let/const tekshiruvi
npm test         # build, API, PNG, bot va 3D model testlari
npm run build    # frontend uchun kichraytirilgan JS/CSS
npm run dev      # build va backendni fayl o‘zgarishida qayta ishga tushirish
npm run format   # TypeScript/CSS formatlash
```

Frontendni tahrirlagandan keyin `npm run build` bajaring va sahifani yangilang. `dev` backend fayllarini kuzatadi; frontend uchun build alohida bajariladi. Ishlayotgan server statik fayllarni xotirada keshlaydi, shuning uchun yangi builddan keyin serverni ham qayta ishga tushiring.

## Kod qayerda?

```text
backend/
  server.ts          HTTP server va ishga tushirish
  routes.ts          taklifnoma API
  validation.ts      kiruvchi ma’lumotlarni tekshirish
  db.ts              SQLite va tayyorlangan so‘rovlar
  telegram.ts        bot, PNG yuborish va eslatmalar
  card.ts            qog‘oz uslubidagi PNG maktub
  places.ts          global manzil qidiruvi
  static.ts          fayl keshi va ETag
  http.ts            JSON va xatolar
frontend/
  app.ts             asosiy kirish nuqtasi
  composer.ts        forma, jonli ko‘rinish va javoblar
  effects.ts         kapalaklarni yoqish/yashirish
  animations/
    heart.ts         zarrali yurak
    butterflies.ts   Three.js sahnasi va qanot materiali
    flight.ts        ikki yo‘nalishli parvoz va masofa
  components/
    date-picker.ts   sana-vaqt kalendari
    map.ts           xarita va joylashuv tanlash
  lib/dom.ts         turlangan DOM yordamchilari
  styles/            alohida CSS fayllari
shared/
  types.ts           frontend/backend umumiy turlari
  time.ts            vaqt mintaqalari va sana hisoblari
scripts/             TypeScript build va tekshiruvlar
public/
  index.html         sahifa tuzilmasi
  assets/            GLB model, gullar va mualliflar
  build/             avtomatik yaratiladi, qo‘lda tahrirlanmaydi
data/mehr.sqlite     mavjud ma’lumotlar bazasi
```

`node_modules/three/build/three.module.js` — Three.js kutubxonasining tayyor kodi. O‘zgarishlar `frontend/animations/` fayllarida qilinadi. Kutubxonalar va `public/build` JavaScript bo‘lishi tabiiy: brauzer yig‘ilgan JavaScript’ni bajaradi. Ilovaning o‘z TypeScript manbalarida faqat `let` va `const` ishlatiladi; `npm run check` buni ham tekshiradi.

VS Code sozlamalari `node_modules` va yig‘ilgan `public/build` ni Explorer’da yashiradi. Ular diskda saqlanadi.

## Tezlik va tuzilma

esbuild frontendni kichraytiradi, umumiy kodni ajratadi va Three.js’ni kapalaklar yoqilganda yuklaydi. Backend statik fayllarni xotirada keshlaydi, ETag orqali o‘zgarmagan faylni qayta uzatmaydi. SQLite so‘rovlari qayta foydalanish uchun oldindan tayyorlanadi. TypeScript xatolarni ishga tushirishdan oldin topadi; uning o‘zi animatsiya tezligini oshirmaydi.

## Telegram va taklifnomalar

`.env.example` ni `.env` nomi bilan nusxalang, BotFather tokenini `TELEGRAM_BOT_TOKEN` ga kiriting. `.env` Git’ga kiritilmaydi. Bitta token bilan bitta bot jarayonini ishlating; oldingi webhook o‘chirilgan bo‘lsin.

Taklifnoma yaratib, “Botdan maktubni olish” orqali Telegramda Start bosing. Bot qog‘oz teksturasi, nafis matn va muhr bilan PNG yuboradi. Uni kerakli kishiga forward qilish yoki saytdan PNG yuklash mumkin. Bot rasmni Start bosgan chatga yuboradi.

Sanasi bor taklifnoma uchun bir kun va bir soat oldingi vaqt oralig‘ida eslatma yuboriladi. Server ishlashi kerak. `/stop` barcha eslatma obunalarini o‘chiradi. “Kechirim” turida sana va joy ixtiyoriy.

Havolasi bor kishi taklifnomani ko‘rishi va javobini o‘zgartirishi mumkin. Boshqa telefon yoki kompyuterda lokal havola ishlashi uchun saytni HTTPS bilan internetga joylashtiring. `.env` dagi `BASE_URL` ommaviy HTTPS manzil bo‘lsa, bot rasmiga saytni ochish tugmasi ham qo‘shiladi.

## Xarita va vaqt

Leaflet/OpenStreetMap orqali istalgan shahar yoki manzilni qidirish, nuqta tanlash va belgini surish mumkin. Qidiruv Nominatim orqali tugma bosilganda yuboriladi, keshlanadi va soniyasiga bir so‘rov bilan cheklanadi. Geolokatsiya localhost/HTTPS va foydalanuvchi ruxsatini talab qiladi.

Xarita dastlab Esri World Imagery sun’iy yo‘ldosh tasvirlari bilan ochiladi. “Ko‘chalar” tugmasi OpenStreetMap’ga qaytaradi. Tasvirlar yuklanmasa ko‘chalar rejimiga avtomatik o‘tiladi. Kattalashtirish tugmasi, masshtab chizig‘i va suriladigan yurakli belgi bor. Sun’iy yo‘ldosh tasvirlarining aniqligi hududga bog‘liq; ular jonli video emas. Manbalar xaritaning o‘zida ko‘rsatiladi.

Sana tanlangan vaqt mintaqasi bo‘yicha olinadi, UTC sifatida saqlanadi. Yozgi/qishki vaqt almashuvida mavjud bo‘lmagan vaqt rad etiladi; takrorlanadigan vaqtning birinchi varianti olinadi.

## Kapalaklar va manbalar

Kompyuterda 8, telefonda 4 ta kapalak alohida yo‘llarda ikki tomonga uchadi. Qanot skeletlari mustaqil, tekstura va geometriya umumiy. Yashirish tanlovi brauzerda saqlanadi; sahifa faol bo‘lmaganda yoki kapalaklar yashirilganda animatsiya to‘xtaydi. Reduced motion sozlamasida dastlab o‘chiq bo‘ladi.

Model 11.7 MB; dastlabki yuklanish vaqt olishi mumkin. Qora atlas foni shader orqali kesiladi, mobil qurilmada teksturalar xotirada kichraytiriladi. Modelni o‘zgartirmasdan dastlabki GLB saqlangan.

Sayt yaratuvchisi: **BEKA**. 3D model: **lunequinox**, CC BY 4.0. Manbalar: [public/assets/CREDITS.md](public/assets/CREDITS.md). Uzuk/guldasta: [UMUT RAW / Pexels](https://www.pexels.com/photo/elegant-engagement-ring-on-red-rose-bouquet-28887370/).

Testlar API, sana mintaqalari, kalendar hisoblari, PNG, botning mock transporti, GLB skeletlari va ekran o‘lchamlaridagi parvoz masofasini tekshiradi. Haqiqiy Telegram yuborilishi va WebGL’ning vizual ko‘rinishi alohida brauzer/telefon tekshiruvini talab qiladi.

Mavjud baza fayli va brauzer sozlamasi nomlari ma’lumotlarni saqlash uchun o‘zgartirilmagan. `data/mehr.sqlite` ni zaxiralang. Ommaviy tanishuv funksiyasi hali qo‘shilmagan; keyingi bosqichda profillar, yosh tekshiruvi, bloklash/shikoyat va moderatsiya kerak bo‘ladi.
