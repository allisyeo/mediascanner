"use strict";
const { Router } = require("express");
const router = Router();

const APIFY_TOKEN  = process.env.APIFY_TOKEN;
const mentionsStore = require("../data/mentionsStore");
const APIFY_BASE   = "https://api.apify.com/v2";
// Официальный Instagram Scraper от Apify
const ACTOR_ID     = "apify~instagram-scraper";

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

// Ждём завершения рана (макс 120 сек)
async function waitForRun(runId, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 3000));
    const { data } = await apifyGet(`/actor-runs/${runId}`);
    if (data.status === "SUCCEEDED") return data;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(data.status)) {
      throw new Error(`Apify run ${data.status}`);
    }
  }
  throw new Error("Apify run timeout");
}

// Преобразуем пост Instagram в формат упоминания MediaScanner
function postToMention(post, keyword) {
  return {
    id:          "ig_apify_" + (post.id || post.shortCode || Date.now()),
    source:      "Instagram",
    author:      post.ownerUsername || post.username || "unknown",
    text:        post.caption || post.text || "",
    keyword:     keyword,
    url:         post.url || `https://instagram.com/p/${post.shortCode}`,
    sentiment:   "neutral",
    status:      "Новый",
    date:        post.timestamp || post.takenAt || new Date().toISOString(),
    likesCount:  post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    imageUrl:    post.displayUrl || post.thumbnailUrl || null
  };
}

// POST /api/apify/search — поиск по ключевому слову/хештегу
router.post("/search", async (req, res) => {
  const { keyword, limit = 20, searchType = "hashtag" } = req.body;

  if (!keyword) {
    return res.status(400).json({ success: false, message: "keyword обязателен" });
  }
  if (!APIFY_TOKEN) {
    return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан в .env" });
  }

  try {
    console.log(`[Apify] Запуск поиска: "${keyword}" (${searchType})`);

    const { data: run } = await apifyPost(`/acts/${ACTOR_ID}/runs`, {
      search:        keyword,
      searchType:    searchType, // "hashtag" | "user" | "place"
      resultsLimit:  Math.min(limit, 50),
      addParentData: false
    });

    console.log(`[Apify] Ран запущен: ${run.id}`);
    const finishedRun = await waitForRun(run.id);

    // Получаем результаты из датасета
    const resultsRes = await fetch(
      `${APIFY_BASE}/datasets/${finishedRun.defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=${limit}`
    );
    const posts = await resultsRes.json();

    const mentions = Array.isArray(posts)
      ? posts.map(p => postToMention(p, keyword))
      : [];

    const added = mentionsStore.addMany(mentions);
    console.log(`[Apify] Найдено: ${mentions.length}, новых: ${added}`);
    res.json({ success: true, keyword, searchType, total: mentions.length, added, data: mentions });

  } catch (err) {
    console.error("[Apify] Ошибка:", err.message);
    res.status(502).json({ success: false, message: "Apify ошибка: " + err.message });
  }
});

// POST /api/apify/scan-keywords — сканируем все активные ключевые слова
router.post("/scan-keywords", async (req, res) => {
  if (!APIFY_TOKEN) {
    return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан в .env" });
  }

  // Получаем ключевые слова из нашего сервиса
  const { keywords } = require("../data/demoData");
  const activeKeywords = keywords.filter(k => k.status === "active" && k.sources.includes("Instagram"));

  if (!activeKeywords.length) {
    return res.json({ success: true, message: "Нет активных ключевых слов для Instagram", data: [] });
  }

  const allMentions = [];
  const errors = [];

  for (const kw of activeKeywords) {
    try {
      console.log(`[Apify] Сканирование: "${kw.keyword}"`);
      const { data: run } = await apifyPost(`/acts/${ACTOR_ID}/runs`, {
        search:       kw.keyword,
        searchType:   kw.keyword.startsWith("#") ? "hashtag" : "hashtag",
        resultsLimit: 10
      });
      const finishedRun = await waitForRun(run.id);
      const resultsRes = await fetch(
        `${APIFY_BASE}/datasets/${finishedRun.defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=10`
      );
      const posts = await resultsRes.json();
      if (Array.isArray(posts)) {
        const items = posts.map(p => postToMention(p, kw.keyword));
        mentionsStore.addMany(items);
        allMentions.push(...items);
      }
    } catch (err) {
      errors.push({ keyword: kw.keyword, error: err.message });
      console.error(`[Apify] Ошибка для "${kw.keyword}":`, err.message);
    }
  }

  res.json({
    success: true,
    scanned: activeKeywords.length,
    total: allMentions.length,
    errors: errors.length ? errors : undefined,
    data: allMentions
  });
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
      message: `Подключён как ${data.data?.username}`
    });
  } catch (err) {
    res.status(502).json({ success: false, message: "Apify ошибка: " + err.message });
  }
});

module.exports = router;
