# KT MediaScanner

Платформа мониторинга упоминаний в социальных сетях и медиа.

---

## Структура проекта

```
mediascanner/
├── frontend/
│   └── index.html          ← Основной интерфейс (Dashboard, Упоминания, SLA и т.д.)
├── backend/
│   ├── package.json
│   ├── .env.example        ← Пример переменных окружения (скопировать в .env)
│   ├── .gitignore
│   └── src/
│       ├── server.js       ← Express-сервер (порт 3000)
│       ├── routes/
│       │   ├── health.js       GET  /api/health
│       │   ├── mentions.js     GET/POST /api/mentions
│       │   ├── keywords.js     GET/POST/PATCH/DELETE /api/keywords
│       │   ├── employees.js    GET  /api/employees
│       │   ├── sla.js          GET  /api/sla
│       │   ├── telegram.js     POST /api/telegram/send-notification
│       │   └── instagram.js    POST /api/instagram/reply
│       └── data/
│           └── demoData.js ← 25 demo-упоминаний, ключевые слова, сотрудники, SLA
└── README.md
```

---

## Быстрый старт (локально)

### 1. Установить зависимости backend

```bash
cd backend
npm install
```

### 2. Создать файл .env

```bash
cp .env.example .env
```

Заполнять токены не обязательно для demo-режима.

### 3. Запустить сервер

```bash
npm start
```

### 4. Открыть в браузере

```
http://localhost:3000
```

Frontend раздаётся автоматически — отдельно открывать `index.html` не нужно.

---

## Проверка API

| URL | Описание |
|-----|----------|
| `http://localhost:3000/api/health` | Статус сервера |
| `http://localhost:3000/api/mentions` | Список упоминаний |
| `http://localhost:3000/api/keywords` | Ключевые слова |
| `http://localhost:3000/api/employees` | Сотрудники |
| `http://localhost:3000/api/sla` | SLA-статистика |
| `http://localhost:3000/api/telegram/status` | Статус Telegram-бота |
| `http://localhost:3000/api/instagram/status` | Статус Instagram |

---

## Разделы интерфейса

| Раздел | Описание |
|--------|----------|
| **Dashboard** | KPI, динамика упоминаний, SLA по сотрудникам, AI-рекомендации |
| **Упоминания** | Таблица с фильтрами, ответы, Instagram demo-отправка |
| **Ключевые слова** | Управление keywords, localStorage + API |
| **Источники** | Карточки платформ, Instagram integration block |
| **AI-агент** | Очередь ответов, режимы автоматизации |
| **Отчёты** | Сводки по периодам, экспорт |

---

## Режимы работы frontend

**Backend доступен** — при загрузке страницы frontend автоматически обращается к `/api/health`.
Если ответ `{ status: "ok" }`, данные загружаются с API.

**Backend недоступен** — frontend использует встроенные demo-данные из `index.html`.
Интерфейс полностью функционален в обоих режимах.

---

## API Endpoints

### GET /api/health
```json
{ "status": "ok", "service": "KT MediaScanner API", "mode": "demo" }
```

### GET /api/mentions
Поддерживает query-фильтры: `?source=Instagram&sentiment=negative&status=Новый&keyword=интернет`

### POST /api/mentions
```json
{
  "source": "Instagram",
  "author": "@user_demo",
  "text": "Интернет не работает второй день",
  "sentiment": "negative",
  "keyword": "интернет не работает",
  "assignedTo": "Каракоз Сыздыкова",
  "priority": "high"
}
```

### POST /api/telegram/send-notification
```json
{
  "recipientId": "emp_1",
  "telegramChatId": "123456789",
  "mentionId": "m_001",
  "messageText": "Новое упоминание: @user написал о проблеме с интернетом",
  "priority": "high",
  "source": "Telegram",
  "keyword": "интернет не работает"
}
```

### POST /api/instagram/reply
```json
{
  "mentionId": "m_006",
  "instagramCommentId": "ig_cmt_17823456789012",
  "recipientUsername": "client_kz",
  "replyText": "Здравствуйте! Рады помочь.",
  "sourceType": "instagram_comment"
}
```

---

## Перенос на собственный сервер (VPS / Production)

### Что потребуется

| Компонент | Описание |
|-----------|----------|
| **Node.js 18+** | Среда выполнения |
| **PM2** | Process manager — автозапуск, логи, мониторинг |
| **Nginx** | Reverse proxy — HTTPS, статика, проксирование на Node |
| **PostgreSQL** | База данных (заменяет demo-данные из памяти) |
| **SSL (Let's Encrypt)** | HTTPS через certbot |

### Шаги деплоя

```bash
# 1. Клонировать репозиторий на сервер
git clone https://github.com/your-repo/mediascanner.git
cd mediascanner/backend

# 2. Установить зависимости
npm install --production

# 3. Заполнить переменные окружения
cp .env.example .env
nano .env  # заполнить PORT, DATABASE_URL, TELEGRAM_BOT_TOKEN, INSTAGRAM_ACCESS_TOKEN

# 4. Запустить через PM2
npm install -g pm2
pm2 start src/server.js --name mediascanner
pm2 save
pm2 startup  # автозапуск при перезагрузке сервера
```

### Пример конфига Nginx

```nginx
server {
    listen 80;
    server_name your-domain.kz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.kz;

    ssl_certificate     /etc/letsencrypt/live/your-domain.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.kz/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Переменные окружения (production)

```env
PORT=3000
NODE_ENV=production
INSTAGRAM_ACCESS_TOKEN=...   # Meta Graph API — только на сервере, не во frontend
TELEGRAM_BOT_TOKEN=...       # @BotFather — только на сервере, не во frontend
DATABASE_URL=postgresql://user:password@localhost:5432/mediascanner
JWT_SECRET=...               # случайная строка 64+ символа
```

### Следующие шаги для production

- [ ] Подключить PostgreSQL — заменить demo-массивы в `demoData.js` на запросы к БД
- [ ] Добавить авторизацию — JWT + таблица `users`
- [ ] Подключить Telegram Bot API — раскомментировать TODO в `routes/telegram.js`
- [ ] Подключить Instagram Graph API — раскомментировать TODO в `routes/instagram.js`
- [ ] Настроить вебхуки Instagram — получать комментарии/DM в реальном времени
- [ ] Настроить Telegram-бота — мониторинг каналов и групп

---

## Разработка (dev mode)

```bash
cd backend
npm run dev  # запускает nodemon — автоперезапуск при изменении файлов
```

Для разработки frontend достаточно открыть `http://localhost:3000` — сервер раздаёт `frontend/index.html` как статику.
