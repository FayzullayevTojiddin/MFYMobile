# MFY Mobile — Backend O'zgarishlar Hujjati

Bu hujjatda mobile ilovada qilingan o'zgarishlar va backendda nima qilish kerakligi batafsil yozilgan.

---

## 1. Vazifa yuborishda tavsif (description) qo'shilishi

### Muammo (oldingi holat)
- Foydalanuvchi vazifani faqat **fayl** bilan yuborishi mumkin edi
- Tavsif (description) yozib bo'lmas edi
- Fayl **majburiy** edi — faylsiz yuborib bo'lmas edi

### Yechim (hozirgi holat)
- Foydalanuvchi **tavsif** yozishi mumkin
- **Fayl ixtiyoriy** — faqat tavsif bilan ham yuborsa bo'ladi
- Tavsif + fayl birgalikda ham yuborsa bo'ladi
- Kamida **tavsif YOKI fayl** bo'lishi kerak (ikkalasi bo'sh bo'lsa yuborib bo'lmaydi)

### Mobile nima yuboradi

**OLDINGI format (FormData):**
```
POST /api/tasks/{taskId}
Content-Type: multipart/form-data

latitude:  41.2995
longitude: 69.2401
files[0]:  (binary) photo_123.jpg      ← MAJBURIY
files[1]:  (binary) document.pdf        ← MAJBURIY
```

**YANGI format (FormData):**
```
POST /api/tasks/{taskId}
Content-Type: multipart/form-data

description: "Uy-joy ta'mirlash ishlari haqida hisobot"   ← YANGI (ixtiyoriy)
latitude:    41.2995
longitude:   69.2401
files[0]:    (binary) photo_123.jpg                         ← IXTIYORIY
files[1]:    (binary) document.pdf                          ← IXTIYORIY
```

### Backendda nima o'zgartirish kerak

#### 1. Validation qoidalarini yangilash

```php
// OLDINGI
$request->validate([
    'latitude'  => 'required|numeric',
    'longitude' => 'required|numeric',
    'files'     => 'required|array',
    'files.*'   => 'file|max:10240',
]);

// YANGI
$request->validate([
    'description' => 'nullable|string|max:2000',
    'latitude'    => 'required|numeric',
    'longitude'   => 'required|numeric',
    'files'       => 'nullable|array',           // required → nullable
    'files.*'     => 'file|max:51200',           // 50MB gacha
]);
```

#### 2. Controller da description ni saqlash

```php
// MyTask yaratishda
$myTask = new MyTask();
$myTask->task_id = $task->id;
$myTask->worker_id = auth()->user()->worker->id;
$myTask->description = $request->input('description'); // ← YANGI
$myTask->latitude = $request->input('latitude');
$myTask->longitude = $request->input('longitude');
$myTask->save();

// Fayllar ixtiyoriy
if ($request->hasFile('files')) {
    foreach ($request->file('files') as $file) {
        // ... fayl saqlash logikasi
    }
}
```

#### 3. Migration (agar `description` ustuni yo'q bo'lsa)

```php
Schema::table('my_tasks', function (Blueprint $table) {
    $table->text('description')->nullable()->after('task_id');
});
```

#### 4. Katta fayllar uchun server sozlamalari

```ini
; php.ini
upload_max_filesize = 50M
post_max_size = 55M
max_execution_time = 120

; Nginx
client_max_body_size 55M;
```

---

## 2. Uchrashuv (Meet) bildirishnoma tizimi — Budilnik rejim

### Muammo (oldingi holat)
- Server push bildirishnoma yuborardi, foydalanuvchi ko'rardi yoki ko'rmasdi
- Bildirishnoma bir marta kelardi va yo'qolardi
- Foydalanuvchi javob bermasa hech narsa bo'lmasdi

### Yechim (hozirgi holat)
- Server `meet_invite` push bildirishnoma yuboradi
- Mobile ilova uni qabul qiladi va **budilnik rejimini** boshlaydi
- **Har 15 soniyada** yangi bildirishnoma keladi (jami 40 ta = ~10 daqiqa)
- Kuchli vibratsiya + ovoz + lock screen da ko'rinadi
- Foydalanuvchi **"Boraman"** yoki **"Rad etish"** tugmasini bosguncha TO'XTAMAYDI
- Tugmani bosgandan keyin barcha alarm bildirishnomalari bekor bo'ladi

### Server nima qilishi kerak

Uchrashuv yaratilganda yoki ishchi uchrashuvga taklif qilinganda, FCM orqali push notification yuborish kerak.

#### FCM Payload formati

```php
// Laravel da Firebase Cloud Messaging yuborish
use Google\Client as GoogleClient;

// Yoki oddiy HTTP orqali
$payload = [
    'message' => [
        'token' => $worker->fcm_token,  // Ishchining FCM tokeni

        // Android notification (tizim bildirishnomasi)
        'notification' => [
            'title' => 'Yangi uchrashuv: ' . $meet->title,
            'body'  => $meet->meet_date . ' ' . $meet->meet_time . ' — ' . $meet->address,
            'sound' => 'default',
        ],

        // Data payload (ilova uchun)
        'data' => [
            'type'    => 'meet_invite',    // ← MUHIM: aynan shu qiymat
            'meet_id' => (string) $meet->id,
            'title'   => $meet->title,
            'body'    => 'Uchrashuvga taklif qilindingiz! Qabul yoki rad eting.',
        ],

        // Android sozlamalari
        'android' => [
            'priority' => 'high',
            'notification' => [
                'channel_id'         => 'meet-alarm',
                'notification_priority' => 'PRIORITY_MAX',
                'sound'              => 'default',
                'default_vibrate_timings' => true,
            ],
        ],
    ],
];
```

#### Muhim `data` maydonlari

| Maydon    | Turi     | Majburiy | Tavsif                                             |
|-----------|----------|----------|----------------------------------------------------|
| `type`    | `string` | Ha       | `"meet_invite"` — aynan shu qiymat bo'lishi shart  |
| `meet_id` | `string` | Ha       | Uchrashuv ID si (string shaklida)                  |
| `title`   | `string` | Ha       | Uchrashuv nomi — alarm sarlavhasida ko'rinadi      |
| `body`    | `string` | Ha       | Alarm matni                                         |

#### Laravel da Firebase yuborish misoli

```php
class MeetNotificationService
{
    public function sendInvite(Meet $meet, Worker $worker): void
    {
        if (!$worker->fcm_token) {
            return;
        }

        $title = $meet->title;
        $body  = $meet->meet_date . ' ' . $meet->meet_time . ' — ' . $meet->address;

        // FCM HTTP v1 API
        $message = [
            'message' => [
                'token' => $worker->fcm_token,
                'notification' => [
                    'title' => "Yangi uchrashuv: {$title}",
                    'body'  => $body,
                ],
                'data' => [
                    'type'    => 'meet_invite',
                    'meet_id' => (string) $meet->id,
                    'title'   => $title,
                    'body'    => 'Uchrashuvga taklif qilindingiz! Qabul yoki rad eting.',
                ],
                'android' => [
                    'priority' => 'high',
                ],
            ],
        ];

        $this->sendFcm($message);
    }

    // Barcha ishchilarga yuborish
    public function sendToAllWorkers(Meet $meet): void
    {
        foreach ($meet->workers as $worker) {
            $this->sendInvite($meet, $worker);
        }
    }
}
```

### Mobile da nima bo'ladi (ichki ishlash tartibi)

```
Server FCM yuboradi (type: "meet_invite", meet_id: 123)
    │
    ▼
Mobile ilova qabul qiladi (foreground yoki background)
    │
    ▼
meetAlarmService.startAlarm(123, "Uchrashuv nomi", "Tavsif") chaqiriladi
    │
    ▼
40 ta lokal bildirishnoma rejalanadi (har 15 soniyada)
    │   ├── 15s  → 🔔 "Uchrashuv nomi" bildirishnomasi
    │   ├── 30s  → 🔔 "Uchrashuv nomi" bildirishnomasi
    │   ├── 45s  → 🔔 "Uchrashuv nomi" bildirishnomasi
    │   └── ...  → (10 daqiqa davomida)
    │
    ▼
Foydalanuvchi bildirishnomani bosadi
    │
    ▼
Profil sahifasiga o'tadi (uchrashuvlar qismi)
    │
    ▼
"Boraman" ✅ yoki "Rad etish" ❌ tugmasini bosadi
    │
    ▼
meetAlarmService.cancelAlarm(123) chaqiriladi
    │
    ▼
Barcha rejalashtirilgan bildirishnomalar BEKOR bo'ladi ✓
```

### Mavjud notification turlari (umumiy ro'yxat)

| `data.type`            | Tavsif                                      | Mobile harakati                    |
|------------------------|---------------------------------------------|------------------------------------|
| `location_request`     | Real-time joylashuv so'rovi                  | GPS joylashuvni yuboradi           |
| `scheduled_location`   | Rejalashtirilgan joylashuv so'rovi           | GPS joylashuvni yuboradi           |
| `meet_invite`          | Uchrashuvga taklif (YANGI)                   | Budilnik alarm boshlaydi           |
| boshqa / bo'sh         | Oddiy bildirishnoma                          | Faqat ko'rsatiladi                 |

---

## Xulosa — Backend checklist

### Vazifa (Task) uchun:
- [ ] `my_tasks` jadvaliga `description` text ustuni qo'shish (nullable)
- [ ] Task upload validation da `files` ni `required` dan `nullable` ga o'zgartirish
- [ ] `description` ni request dan olib bazaga saqlash
- [ ] `files.*` max hajmini oshirish (50MB)
- [ ] php.ini va nginx da upload limitlarni oshirish
- [ ] API response da `description` ni qaytarish

### Uchrashuv (Meet) bildirishnomasi uchun:
- [ ] Uchrashuvga ishchi taklif qilinganda FCM push notification yuborish
- [ ] `data.type` ni aynan `"meet_invite"` qilish
- [ ] `data.meet_id` ni string shaklida yuborish
- [ ] `data.title` va `data.body` ni yuborish
- [ ] `android.priority` ni `"high"` qilish
