# KT MediaScanner

Платформа мониторинга упоминаний в социальных сетях и медиа.

---

## Структура проекта

```
mediascanner/
├── frontend/
│   ├── index.html          ← Основной интерфейс (Dashboard, Упоминания, SLA и т.д.)
│   └── login.html          ← Страница авторизации
├── backend/
│   ├── package.json
│   ├── .env.example        ← Пример переменных окружения (скопировать в .env)
│   ├── .gitignore
│   └── src/
│       ├── server.js       ← Express-сервер (порт 3000)
│       ├── middleware/
│       │   └── auth.js         requireAuth, requireRole middleware
│       ├── routes/
│       │   ├── auth.js         POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
│       │   ├── health.js       GET  /api/health
│       │   ├── mentions.js     GET/POST /api/mentions
│       │   ├── keywords.js     GET/POST/PATCH/DELETE /api/keywords
│       │   ├── employees.js    GET  /api/employees
│       │   ├── sla.js          GET  /api/sla
│       │   ├── telegram.js     POST /api/telegram/send-notification
│       │   └── instagram.js    POST /api/instagram/reply
│       └── data/
│           ├── demoData.js ← 25 demo-упоминаний, ключевые слова, сотрудники, SLA
│           └── users.js    ← Единственная admin-учётная запись (bcrypt hash)
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

Для demo-режима достаточно — заполнять токены не обязательно.

### 3. Запустить сервер

```bash
npm start
```

### 4. Открыть страницу входа

```
http://localhost:3000/login.html
```

### 5. Войти с demo-учётной записью

```
Логин:  allisyeo
Пароль: 45aseFUG@
```

После входа откроется главный интерфейс: `http://localhost:3000`

---

## Авторизация

### Принцип работы

- JWT-токен хранится в **httpOnly cookie** — frontend не имеет к нему доступа через JavaScript
- **localStorage не используется** для хранения токена
- Все защищённые API-запросы автоматически передают cookie (`credentials: "include"`)
- При истечении сессии или 401-ошибке — автоматический редирект на `/login.html`
- После выхода cookie очищается на сервере

### Учётная запись администратора

| Поле | Значение |
|------|----------|
| Логин | `allisyeo` |
| Пароль | `45aseFUG@` |
| Роль | `admin` |

> Пароль хранится в `backend/src/data/users.js` только в виде **bcrypt hash** (cost factor 12).
> Открытый пароль нигде в коде не присутствует.

### Открытые маршруты (без авторизации)

```
GET  /api/health
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
GET  /login.html
GET  / (статика frontend)
```

### Защищённые маршруты (требуют JWT cookie)

```
GET/POST        /api/mentions
GET/POST/PATCH  /api/keywords
GET             /api/employees
GET             /api/sla
POST            /api/telegram/*
POST            /api/instagram/*
```

### Настройка для production

1. Сменить пароль администратора:
```bash
node -e "require('bcryptjs').hash('НовыйПароль', 12).then(console.log)"
```
Вставить полученный hash в `backend/src/data/users.js` → поле `passwordHash`.

2. Задать надёжный JWT_SECRET в `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

3. Установить `COOKIE_SECURE=true` и `NODE_ENV=production` в `.env`.

---

## Проверка API

| URL | Описание | Требует авторизацию |
|-----|----------|---------------------|
| `http://localhost:3000/login.html` | Страница входа | — |
| `http://localhost:3000/api/health` | Статус сервера | ❌ |
| `http://localhost:3000/api/auth/me` | Текущий пользователь | ❌ (проверяет cookie) |
| `http://localhost:3000/api/mentions` | Список упоминаний | ✅ |
| `http://localhost:3000/api/keywords` | Ключевые слова | ✅ |
| `http://localhost:3000/api/employees` | Сотрудники | ✅ |
| `http://localhost:3000/api/sla` | SLA-статистика | ✅ |
| `http://localhost:3000/api/telegram/status` | Статус Telegram | ✅ |
| `http://localhost:3000/api/instagram/status` | Статус Instagram | ✅ |

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

**Backend доступен + авторизован** — при загрузке `index.html` проверяется `/api/auth/me`.
Если сессия активна, данные загружаются с API.

**Backend недоступен** — frontend работает на встроенных demo-данных из `index.html`
без проверки авторизации (аварийный demo-режим).

---

## API Endpoints

### POST /api/auth/login
```json
{ "username": "allisyeo", "password": "45aseFUG@" }
```
Ответ:
```json
{ "success": true, "user": { "id": "admin_001", "username": "allisyeo", "name": "Администратор", "role": "admin" } }
```

### GET /api/auth/me
Возвращает текущего пользователя по cookie. 401 если не авторизован.

### POST /api/auth/logout
Очищает cookie. Ответ: `{ "success": true }`.

### GET /api/mentions
Поддерживает фильтры: `?source=Instagram&sentiment=negative&status=Новый&keyword=интернет`

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
  "messageText": "Новое упоминание требует обработки",
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
| **SSL (Let's Encrypt)** | HTTPS через certbot — обязателен для secure cookie |

### Шаги деплоя

```bash
# 1. Клонировать репозиторий на сервер
git clone https://github.com/your-repo/mediascanner.git
cd mediascanner/backend

# 2. Установить зависимости
npm install --production

# 3. Заполнить переменные окружения
cp .env.example .env
nano .env
# Обязательно задать:
#   JWT_SECRET=<случайная строка 64+ символа>
#   NODE_ENV=production
#   COOKIE_SECURE=true
#   PORT=3000

# 4. Запустить через PM2
npm install -g pm2
pm2 start src/server.js --name mediascanner
pm2 save
pm2 startup
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
JWT_SECRET=<64-символьная случайная строка>
AUTH_COOKIE_NAME=kt_mediascanner_auth
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
INSTAGRAM_ACCESS_TOKEN=...
TELEGRAM_BOT_TOKEN=...
DATABASE_URL=postgresql://user:password@localhost:5432/mediascanner
```

### Чеклист для production

- [ ] Задать `JWT_SECRET` (случайная строка 64+ символа)
- [ ] Установить `COOKIE_SECURE=true` и `NODE_ENV=production`
- [ ] Сменить пароль администратора (новый bcrypt hash в `users.js`)
- [ ] Подключить PostgreSQL — заменить demo-массивы на запросы к БД
- [ ] Настроить HTTPS через certbot
- [ ] Подключить Telegram Bot API
- [ ] Подключить Instagram Graph API
- [ ] Запустить через PM2

---

## Разработка (dev mode)

```bash
cd backend
npm run dev  # nodemon — автоперезапуск при изменении файлов
```

Открыть в браузере: `http://localhost:3000/login.html`
