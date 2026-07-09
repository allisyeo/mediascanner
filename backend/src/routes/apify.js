"use strict";
const { Router } = require("express");
const router = Router();

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const mentionsStore = require("../data/mentionsStore");
const APIFY_BASE = "https://api.apify.com/v2";

// APP_URL нужен для webhook — задайте в Vercel как https://mediascanner.vercel.app
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");

const ACTORS = {
  Instagram: "apify~instagram-scraper",
  Twitter:   "apify~twitter-scraper",
  TikTok:    "apify~tiktok-scraper",
  Facebook:  "apify~facebook-posts-scraper",
  Threads:   "apify~threads-scraper",
};

async function apifyPost(path, body) {
  const res = await fetch(`${APIFY_BASE}${path}?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Apify API error");
  return data;
}

async function apifyGet(path) {
  const res = await fetch(`${APIFY_BASE}${path}?token=${APIFY_TOKEN}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Apify API error");
  return data;
}

// Входные параметры актора для каждой платформы
function buildActorInput(platform, keyword, limit = 10) {
  switch (platform) {
    case "Instagram":
      return { search: keyword.replace(/^#/, ""), searchType: "hashtag", resultsLimit: limit, addParentData: false };
    case "Twitter":
      return { searchTerms: [keyword], maxItems: limit, queryType: "Latest" };
    case "TikTok":
      return { keywords: [keyword], resultsPerPage: limit };
    case "Facebook":
      return { search: keyword, maxPosts: limit };
    case "Threads":
      return { search: keyword, maxItems: limit };
    default:
      throw new Error(`Неизвестная платформа: ${platform}`);
  }
}

// Нормализуем результат любой платформы в формат упоминания
function toMention(item, platform, keyword) {
  const id = `${platform.toLowerCase()}_apify_` + (item.id || item.shortCode || item.tweetId || Date.now() + Math.random());
  let author = "unknown", text = "", url = "", date = new Date().toISOString(), likesCount = 0;

  switch (platform) {
    case "Instagram":
      author = item.ownerUsername || item.username || item.owner?.username || item.user?.username || item.authorUsername || "unknown";
      text   = item.caption || item.text || item.description || item.edge_media_to_caption?.edges?.[0]?.node?.text || "";
      url    = item.url || item.postUrl || (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : "") || (item.id ? `https://instagram.com/p/${item.id}` : "");
      date   = item.timestamp || item.takenAt || item.taken_at_timestamp || item.createdAt || date;
      likesCount = item.likesCount || item.like_count || item.edge_media_preview_like?.count || 0;
      break;
    case "Twitter":
      author = item.author?.userName || item.user?.screen_name || "unknown";
      text   = item.text || item.fullText || "";
      url    = item.url || `https://twitter.com/i/web/status/${item.id}`;
      date   = item.createdAt || date;
      likesCount = item.likeCount || item.favorite_count || 0;
      break;
    case "TikTok":
      author = item.authorMeta?.name || item.author?.uniqueId || "unknown";
      text   = item.text || item.description || "";
      url    = item.webVideoUrl || `https://tiktok.com/@${author}/video/${item.id}`;
      date   = item.createTimeISO || date;
      likesCount = item.diggCount || item.stats?.diggCount || 0;
      break;
    case "Facebook":
      author = item.pageName || item.user?.name || "unknown";
      text   = item.text || item.message || "";
      url    = item.url || item.postUrl || "";
      date   = item.time || item.createdTime || date;
      likesCount = item.likes || 0;
      break;
    case "Threads":
      author = item.username || item.user?.username || "unknown";
      text   = item.text || item.caption || "";
      url    = item.url || `https://threads.net/@${author}`;
      date   = item.takenAt || item.timestamp || date;
      likesCount = item.likeCount || 0;
      break;
  }

  return {
    id, source: platform, author, text, keyword, url,
    sentiment: "neutral", status: "Новый",
    date, likesCount, commentsCount: item.commentsCount || item.replyCount || 0,
    imageUrl: item.displayUrl || item.thumbnailUrl || item.coverImageUrl || null
  };
}

// Вспомогательная: загружает датасет и сохраняет упоминания
async function fetchAndSaveDataset(datasetId, platform, keyword, limit = 10) {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${limit}`);
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) return 0;

  const valid = items.filter(i => !i.error && !i.errorDescription);
  if (valid.length > 0) console.log(`[Apify] ${platform} fields:`, Object.keys(valid[0]).join(", "));
  else {
    console.warn(`[Apify] ${platform} returned errors:`, items[0]?.error, items[0]?.errorDescription);
    return 0;
  }

  const mentions = valid.map(i => toMention(i, platform, keyword));
  return mentionsStore.addMany(mentions);
}

// POST /api/apify/scan-keywords — запускает акторы АСИНХРОННО, сразу возвращает ответ
// Apify вызывает /api/apify/webhook когда каждый актор завершается
router.post("/scan-keywords", async (req, res) => {
  if (!APIFY_TOKEN) {
    return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан в .env" });
  }

  const keywordsStore = require("../data/keywordsStore");
  const { platforms: filterPlatforms } = req.body;

  const activeKeywords = keywordsStore.getAll({ status: "active" });
  if (!activeKeywords.length) {
    return res.json({ success: true, async: false, message: "Нет активных ключевых слов", started: 0 });
  }

  const started = [];
  const errors  = [];

  const webhookUrl = APP_URL ? `${APP_URL}/api/apify/webhook` : null;

  // Собираем все задачи и запускаем ПАРАЛЛЕЛЬНО
  const tasks = [];
  for (const kw of activeKeywords) {
    const sources   = Array.isArray(kw.sources) ? kw.sources : ["Twitter"];
    const platforms = filterPlatforms ? sources.filter(s => filterPlatforms.includes(s)) : sources;
    for (const platform of platforms) {
      if (!ACTORS[platform]) continue;
      tasks.push({ keyword: kw.keyword, platform });
    }
  }

  const runOpts = webhookUrl ? `?webhooks=${encodeURIComponent(JSON.stringify([{
    eventTypes: ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
    requestUrl: webhookUrl,
    payloadTemplate: JSON.stringify({
      eventType: "{{eventType}}",
      runId: "{{runId}}",
      datasetId: "{{defaultDatasetId}}",
      platform: "{{actorId}}",  // будет переопределено ниже через customData
    })
  }]))}` : "";

  await Promise.all(tasks.map(async ({ keyword, platform }) => {
    try {
      const input = buildActorInput(platform, keyword, 10);
      const webhooksParam = webhookUrl
        ? `?webhooks=${encodeURIComponent(JSON.stringify([{
            eventTypes: ["ACTOR.RUN.SUCCEEDED"],
            requestUrl: webhookUrl,
            payloadTemplate: `{"eventType":"{{eventType}}","runId":"{{runId}}","datasetId":"{{defaultDatasetId}}","platform":${JSON.stringify(platform)},"keyword":${JSON.stringify(keyword)}}`
          }]))}`
        : "";
      const { data: run } = await apifyPost(`/acts/${ACTORS[platform]}/runs${webhooksParam}`, input);
      started.push({ runId: run.id, platform, keyword, datasetId: run.defaultDatasetId });
      console.log(`[Apify] Запущен ${platform} "${keyword}" runId=${run.id}`);
    } catch (err) {
      errors.push({ platform, keyword, error: err.message });
      console.error(`[Apify] Ошибка запуска ${platform} "${keyword}":`, err.message);
    }
  }));

  res.json({
    success: true,
    async: true,
    started: started.length,
    errors: errors.length ? errors : undefined,
    message: webhookUrl
      ? `Запущено ${started.length} сканирований. Результаты появятся через 1-3 минуты.`
      : `Запущено ${started.length} сканирований (без webhook — обновите страницу через 2-3 минуты).`,
    runs: started
  });
});

// POST /api/apify/webhook — вызывается Apify когда актор завершился
router.post("/webhook", async (req, res) => {
  // Apify может слать body как JSON или как строку
  let payload = req.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (_) {}
  }

  const { eventType, datasetId, platform, keyword } = payload || {};
  console.log(`[Apify webhook] event=${eventType} platform=${platform} keyword=${keyword} dataset=${datasetId}`);

  // Отвечаем быстро чтобы Apify не retry
  res.json({ received: true });

  if (eventType !== "ACTOR.RUN.SUCCEEDED" || !datasetId || !platform || !keyword) return;

  try {
    const added = await fetchAndSaveDataset(datasetId, platform, keyword, 10);
    console.log(`[Apify webhook] Сохранено ${added} упоминаний (${platform} "${keyword}")`);
  } catch (err) {
    console.error("[Apify webhook] Ошибка сохранения:", err.message);
  }
});

// GET /api/apify/runs/:runId — статус конкретного рана (для поллинга с фронтенда)
router.get("/runs/:runId", async (req, res) => {
  if (!APIFY_TOKEN) return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан" });
  try {
    const { data } = await apifyGet(`/actor-runs/${req.params.runId}`);
    res.json({ success: true, status: data.status, datasetId: data.defaultDatasetId });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
});

// POST /api/apify/collect — фронтенд явно запрашивает результаты по runIds
router.post("/collect", async (req, res) => {
  if (!APIFY_TOKEN) return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан" });

  const { runs } = req.body; // [{ runId, platform, keyword, datasetId }]
  if (!Array.isArray(runs) || !runs.length) {
    return res.status(400).json({ success: false, message: "runs обязателен" });
  }

  let totalAdded = 0;
  const results  = [];

  for (const run of runs) {
    try {
      // Проверяем статус если datasetId не передан
      let datasetId = run.datasetId;
      if (!datasetId) {
        const { data } = await apifyGet(`/actor-runs/${run.runId}`);
        if (data.status !== "SUCCEEDED") {
          results.push({ ...run, status: data.status, added: 0 });
          continue;
        }
        datasetId = data.defaultDatasetId;
      }
      const added = await fetchAndSaveDataset(datasetId, run.platform, run.keyword, 10);
      totalAdded += added;
      results.push({ ...run, status: "SUCCEEDED", added });
    } catch (err) {
      results.push({ ...run, status: "ERROR", error: err.message, added: 0 });
    }
  }

  res.json({ success: true, totalAdded, results });
});

// POST /api/apify/search — поиск по одному ключевому слову АСИНХРОННО
router.post("/search", async (req, res) => {
  const { keyword, limit = 10, platform = "Twitter" } = req.body;
  if (!keyword) return res.status(400).json({ success: false, message: "keyword обязателен" });
  if (!APIFY_TOKEN) return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан" });
  if (!ACTORS[platform]) return res.status(400).json({ success: false, message: `Платформа "${platform}" не поддерживается` });

  try {
    const input = buildActorInput(platform, keyword, Math.min(limit, 50));
    const { data: run } = await apifyPost(`/acts/${ACTORS[platform]}/runs`, input);
    res.json({ success: true, async: true, runId: run.id, datasetId: run.defaultDatasetId, platform, keyword });
  } catch (err) {
    console.error("[Apify] Ошибка:", err.message);
    res.status(502).json({ success: false, message: "Apify ошибка: " + err.message });
  }
});

// GET /api/apify/status — проверка подключения
router.get("/status", async (req, res) => {
  if (!APIFY_TOKEN) {
    return res.json({ success: true, connected: false, message: "APIFY_TOKEN не задан в .env" });
  }
  try {
    const data = await apifyGet("/users/me");
    res.json({
      success: true, connected: true,
      username: data.data?.username,
      plan: data.data?.plan?.name || "free",
      supportedPlatforms: Object.keys(ACTORS),
      message: `Подключён как ${data.data?.username}`
    });
  } catch (err) {
    res.status(502).json({ success: false, message: "Apify ошибка: " + err.message });
  }
});

module.exports = router;
