"use strict";

// ─── Demo-данные KT MediaScanner ───────────────────────────────────────────
// Используются пока не подключена база данных.
// При добавлении PostgreSQL — заменить на реальные запросы к БД.

// ─── Сотрудники ────────────────────────────────────────────────────────────
const employees = [
  {
    id: "emp_1",
    name: "Ляззат Баймагамбетова",
    role: "Старший оператор",
    telegramUsername: "@lyazzat_b",
    telegramChatId: "",
    status: "active"
  },
  {
    id: "emp_2",
    name: "Каракоз Сыздыкова",
    role: "Оператор",
    telegramUsername: "@karakoz_s",
    telegramChatId: "",
    status: "active"
  },
  {
    id: "emp_3",
    name: "Жансая Медеубаева",
    role: "Оператор",
    telegramUsername: "@zhansaya_m",
    telegramChatId: "",
    status: "active"
  },
  {
    id: "emp_4",
    name: "Альменбетова Айнур Мейрамбековна",
    role: "Модератор",
    telegramUsername: "@ainur_a",
    telegramChatId: "",
    status: "active"
  }
];

// ─── Ключевые слова ────────────────────────────────────────────────────────
const keywords = [
  {
    id: "kw_1",
    keyword: "Казахтелеком",
    type: "brand",
    status: "active",
    sources: ["Telegram", "Instagram", "YouTube", "Новости"],
    createdAt: "2026-01-10T09:00:00.000Z"
  },
  {
    id: "kw_2",
    keyword: "интернет не работает",
    type: "problem",
    status: "active",
    sources: ["Telegram", "TikTok", "X/Twitter"],
    createdAt: "2026-01-12T10:30:00.000Z"
  },
  {
    id: "kw_3",
    keyword: "#тарифы",
    type: "tag",
    status: "active",
    sources: ["TikTok", "YouTube", "Новости", "Instagram"],
    createdAt: "2026-02-01T08:00:00.000Z"
  },
  {
    id: "kw_4",
    keyword: "конкуренты",
    type: "competitor",
    status: "active",
    sources: ["Новости", "YouTube", "Telegram"],
    createdAt: "2026-02-15T11:00:00.000Z"
  },
  {
    id: "kw_5",
    keyword: "мусин",
    type: "person",
    status: "active",
    sources: ["Telegram", "Новости", "X/Twitter"],
    createdAt: "2026-03-01T09:00:00.000Z"
  }
];

// ─── SLA по сотрудникам ────────────────────────────────────────────────────
const slaData = [
  {
    employeeId: "emp_1",
    employeeName: "Ляззат Баймагамбетова",
    role: "Старший оператор",
    assigned: 22,
    processed: 20,
    avgResponseTime: "14 мин",
    slaTarget: "30 мин",
    slaFact: "97%",
    overdue: 0,
    status: "good"
  },
  {
    employeeId: "emp_2",
    employeeName: "Каракоз Сыздыкова",
    role: "Оператор",
    assigned: 19,
    processed: 16,
    avgResponseTime: "21 мин",
    slaTarget: "30 мин",
    slaFact: "88%",
    overdue: 2,
    status: "risk"
  },
  {
    employeeId: "emp_3",
    employeeName: "Жансая Медеубаева",
    role: "Оператор",
    assigned: 18,
    processed: 12,
    avgResponseTime: "34 мин",
    slaTarget: "30 мин",
    slaFact: "72%",
    overdue: 4,
    status: "overdue"
  },
  {
    employeeId: "emp_4",
    employeeName: "Альменбетова Айнур Мейрамбековна",
    role: "Модератор",
    assigned: 15,
    processed: 13,
    avgResponseTime: "16 мин",
    slaTarget: "30 мин",
    slaFact: "91%",
    overdue: 1,
    status: "risk"
  }
];

// ─── Упоминания ────────────────────────────────────────────────────────────
// Функция смещения даты от сегодня (в днях)
function daysAgo(n, h = 12, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const mentions = [
  // --- Негативные по "интернет не работает" (Telegram) ---
  {
    id: "m_001",
    source: "Telegram",
    author: "@almaty_chat",
    text: "Интернет опять не работает вечером, скорость падает после 20:00.",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "Новый",
    assignedTo: "Жансая Медеубаева",
    priority: "high",
    slaStatus: "overdue",
    slaMinutes: -15,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(0, 9, 12)
  },
  {
    id: "m_002",
    source: "Telegram",
    author: "@shymkent_internet",
    text: "У кого интернет не работает в Шымкенте? Уже третий час без связи.",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "В работе",
    assignedTo: "Каракоз Сыздыкова",
    priority: "high",
    slaStatus: "risk",
    slaMinutes: 8,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(0, 10, 5)
  },
  {
    id: "m_003",
    source: "Telegram",
    author: "@astana_reviews",
    text: "Интернет не работает второй день, поддержка не отвечает, передаю в КПП.",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "Новый",
    assignedTo: "Жансая Медеубаева",
    priority: "high",
    slaStatus: "overdue",
    slaMinutes: -22,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(1, 19, 5)
  },
  {
    id: "m_004",
    source: "X/Twitter",
    author: "@kz_tech_news",
    text: "Пользователи жалуются на перебои связи в Алматы — тренд набирает обороты. #интернет",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "Новый",
    assignedTo: "Жансая Медеубаева",
    priority: "high",
    slaStatus: "overdue",
    slaMinutes: -8,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(1, 17, 31)
  },
  {
    id: "m_005",
    source: "X/Twitter",
    author: "@support_needed",
    text: "Третий день без интернета, поддержка Казахтелеком не отвечает на звонки.",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "В работе",
    assignedTo: "Жансая Медеубаева",
    priority: "high",
    slaStatus: "overdue",
    slaMinutes: -30,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(5, 18, 15)
  },
  // --- Instagram: комментарии и упоминания ---
  {
    id: "m_006",
    source: "Instagram",
    author: "@client_kz",
    text: "Спасибо за быстрое подключение, мастер приехал вовремя.",
    sentiment: "positive",
    importance: "low",
    keyword: "Казахтелеком",
    status: "Обработан",
    assignedTo: "Каракоз Сыздыкова",
    priority: "low",
    slaStatus: "good",
    slaMinutes: 45,
    instagramSourceType: "instagram_comment",
    instagramCommentId: "ig_cmt_17823456789012",
    replyHistory: [
      {
        author: "Каракоз Сыздыкова",
        date: "сегодня",
        text: "Спасибо за отзыв! Рады помочь.",
        status: "demo_sent"
      }
    ],
    createdAt: daysAgo(0, 8, 44)
  },
  {
    id: "m_007",
    source: "Instagram",
    author: "@help_me_kz",
    text: "Здравствуйте, не могу подключить роутер, напишите в директ.",
    sentiment: "neutral",
    importance: "medium",
    keyword: "Казахтелеком",
    status: "Новый",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "medium",
    slaStatus: "risk",
    slaMinutes: 12,
    instagramSourceType: "instagram_dm",
    instagramCommentId: "ig_dm_17823456789078",
    replyHistory: [],
    createdAt: daysAgo(0, 7, 30)
  },
  {
    id: "m_008",
    source: "Instagram",
    author: "@angry_client",
    text: "Почему так долго отвечаете на комментарии? Уже второй день жду! Интернет не работает!",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "Новый",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "high",
    slaStatus: "overdue",
    slaMinutes: -5,
    instagramSourceType: "instagram_comment",
    instagramCommentId: "ig_cmt_17823456789099",
    replyHistory: [],
    createdAt: daysAgo(0, 6, 55)
  },
  {
    id: "m_009",
    source: "Instagram",
    author: "@user_kz",
    text: "Отметили бренд в сторис после подключения услуги — всё отлично!",
    sentiment: "positive",
    importance: "low",
    keyword: "Казахтелеком",
    status: "На проверке",
    assignedTo: "Каракоз Сыздыкова",
    priority: "low",
    slaStatus: "good",
    slaMinutes: 60,
    instagramSourceType: "instagram_story_mention",
    instagramCommentId: "ig_story_17823456789034",
    replyHistory: [],
    createdAt: daysAgo(2, 14, 0)
  },
  {
    id: "m_010",
    source: "Instagram",
    author: "@brand_lover",
    text: "Лучший оператор в городе, рекомендую всем друзьям! #Казахтелеком",
    sentiment: "positive",
    importance: "low",
    keyword: "Казахтелеком",
    status: "Обработан",
    assignedTo: "Каракоз Сыздыкова",
    priority: "low",
    slaStatus: "good",
    slaMinutes: 75,
    instagramSourceType: "instagram_mention",
    instagramCommentId: "ig_media_17823456789056",
    replyHistory: [],
    createdAt: daysAgo(10, 21, 0)
  },
  // --- TikTok ---
  {
    id: "m_011",
    source: "TikTok",
    author: "@internet_user",
    text: "Видео с жалобой на долгую обработку заявки — уже 3 дня жду. #интернет",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "В работе",
    assignedTo: "Ляззат Баймагамбетова",
    priority: "high",
    slaStatus: "risk",
    slaMinutes: 5,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(0, 8, 10)
  },
  {
    id: "m_012",
    source: "TikTok",
    author: "@speedtest_kz",
    text: "Ролик с тестом скорости Казахтелеком — результаты ниже заявленных. #тарифы",
    sentiment: "negative",
    importance: "medium",
    keyword: "#тарифы",
    status: "Передано оператору",
    assignedTo: "Жансая Медеубаева",
    priority: "medium",
    slaStatus: "overdue",
    slaMinutes: -10,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(3, 11, 45)
  },
  {
    id: "m_013",
    source: "TikTok",
    author: "@old_review_kz",
    text: "Архивное видео с жалобами на связь — скорость падает в вечерние часы.",
    sentiment: "negative",
    importance: "medium",
    keyword: "интернет не работает",
    status: "Обработан",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "medium",
    slaStatus: "good",
    slaMinutes: 0,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(42, 16, 20)
  },
  // --- YouTube ---
  {
    id: "m_014",
    source: "YouTube",
    author: "Tech Review KZ",
    text: "В обзоре сравнили тарифы нескольких операторов и отдельно отметили цену пакета. #тарифы",
    sentiment: "neutral",
    importance: "medium",
    keyword: "#тарифы",
    status: "На проверке",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "medium",
    slaStatus: "risk",
    slaMinutes: 20,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(1, 22, 18)
  },
  {
    id: "m_015",
    source: "YouTube",
    author: "Обзор тарифов KZ",
    text: "В видео сравнивают тарифы операторов связи в Казахстане. Казахтелеком проигрывает по цене.",
    sentiment: "negative",
    importance: "medium",
    keyword: "конкуренты",
    status: "Обработан",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "medium",
    slaStatus: "good",
    slaMinutes: 55,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(4, 20, 30)
  },
  {
    id: "m_016",
    source: "YouTube",
    author: "Tech KZ",
    text: "Обзор скорости интернета Казахтелеком — падение в часы пик подтверждено.",
    sentiment: "negative",
    importance: "high",
    keyword: "интернет не работает",
    status: "Обработан",
    assignedTo: "Жансая Медеубаева",
    priority: "high",
    slaStatus: "good",
    slaMinutes: 0,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(38, 9, 30)
  },
  // --- Новости ---
  {
    id: "m_017",
    source: "Новости",
    author: "Tengrinews",
    text: "Операторы связи Казахстана готовят новые тарифные планы на лето. #тарифы",
    sentiment: "neutral",
    importance: "medium",
    keyword: "#тарифы",
    status: "Обработан",
    assignedTo: "Каракоз Сыздыкова",
    priority: "medium",
    slaStatus: "good",
    slaMinutes: 90,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(1, 17, 31)
  },
  {
    id: "m_018",
    source: "Новости",
    author: "Informburo",
    text: "Регулятор обсуждает новые требования к качеству интернет-услуг в Казахстане.",
    sentiment: "neutral",
    importance: "high",
    keyword: "Казахтелеком",
    status: "Новый",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "high",
    slaStatus: "risk",
    slaMinutes: 18,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(6, 16, 0)
  },
  {
    id: "m_019",
    source: "Новости",
    author: "Kursiv",
    text: "Аналитика рынка телекома за прошлый месяц: Казахтелеком сохраняет лидерство.",
    sentiment: "neutral",
    importance: "medium",
    keyword: "Казахтелеком",
    status: "Обработан",
    assignedTo: "Каракоз Сыздыкова",
    priority: "low",
    slaStatus: "good",
    slaMinutes: 0,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(35, 12, 0)
  },
  // --- Telegram: позитивные и нейтральные ---
  {
    id: "m_020",
    source: "Telegram",
    author: "@astana_positive",
    text: "Отметили бренд в положительном отзыве о скорости интернета Казахтелеком.",
    sentiment: "positive",
    importance: "low",
    keyword: "Казахтелеком",
    status: "Обработан",
    assignedTo: "Ляззат Баймагамбетова",
    priority: "low",
    slaStatus: "good",
    slaMinutes: 60,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(2, 15, 20)
  },
  {
    id: "m_021",
    source: "Telegram",
    author: "@tariff_watch",
    text: "Обсуждают новые тарифы Казахтелеком в регионах — цены растут.",
    sentiment: "neutral",
    importance: "medium",
    keyword: "#тарифы",
    status: "Обработан",
    assignedTo: "Ляззат Баймагамбетова",
    priority: "medium",
    slaStatus: "good",
    slaMinutes: 30,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(12, 13, 40)
  },
  {
    id: "m_022",
    source: "Telegram",
    author: "@shymkent_chat",
    text: "Кто-нибудь сталкивался с обрывами связи в районе Абылай-хана? Интернет не работает.",
    sentiment: "negative",
    importance: "medium",
    keyword: "интернет не работает",
    status: "Отклонено",
    assignedTo: "Ляззат Баймагамбетова",
    priority: "medium",
    slaStatus: "good",
    slaMinutes: 0,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(6, 10, 22)
  },
  // --- Мусин (персона) ---
  {
    id: "m_023",
    source: "Telegram",
    author: "@kz_politics",
    text: "Мусин провёл совещание по развитию цифровой инфраструктуры в регионах.",
    sentiment: "neutral",
    importance: "medium",
    keyword: "мусин",
    status: "На проверке",
    assignedTo: "Альменбетова Айнур Мейрамбековна",
    priority: "medium",
    slaStatus: "good",
    slaMinutes: 25,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(0, 11, 0)
  },
  {
    id: "m_024",
    source: "Новости",
    author: "Zakon.kz",
    text: "Министр Мусин анонсировал снижение тарифов на широкополосный интернет.",
    sentiment: "positive",
    importance: "high",
    keyword: "мусин",
    status: "Новый",
    assignedTo: "Ляззат Баймагамбетова",
    priority: "high",
    slaStatus: "good",
    slaMinutes: 35,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(1, 9, 15)
  },
  // --- Конкуренты ---
  {
    id: "m_025",
    source: "Новости",
    author: "Forbes Kazakhstan",
    text: "Конкуренты Казахтелекома наращивают долю рынка в регионах.",
    sentiment: "negative",
    importance: "high",
    keyword: "конкуренты",
    status: "Новый",
    assignedTo: "Ляззат Баймагамбетова",
    priority: "high",
    slaStatus: "risk",
    slaMinutes: 10,
    instagramSourceType: null,
    instagramCommentId: null,
    replyHistory: [],
    createdAt: daysAgo(0, 13, 0)
  }
];

module.exports = { mentions, keywords, employees, slaData };
