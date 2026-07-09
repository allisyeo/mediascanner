"use strict";
const { Router } = require("express");
const router = Router();

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const mentionsStore = require("../data/mentionsStore");
const APIFY_BASE = "https://api.apify.com/v2";

// Акторы Apify для каждой платформы
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

// Входные параметры актора для каждой платформы
function buildActorInput(platform, keyword, limit = 10) {
  switch (platform) {
    case "Instagram":
      return {
        search: keyword.replace(/^#/, ""),
        searchType: "hashtag",
        resultsLimit: limit,
        addParentData: false
      };
    case "Twitter":
      return {
        searchTerms: [keyword],
        maxItems: limit,
        queryType: "Latest"
      };
    case "TikTok":
      return {
        keywords: [keyword],
        resultsPerPage: limit
      };
    case "Facebook":
      return {
        search: keyword,
        maxPosts: limit
      };
    case "Threads":
      return {
        search: keyword,
        maxItems: limit
      };
    default:
      throw new Error(`Неизвестная платформа: ${platform}`);
  }
}

// Нормализуем результат любой платформы в формат упоминания
function toMention(item, platform, keyword) {
  const id = `${platform.toLowerCase()}_apify_` + (item.id || item.shortCode || item.tweetId || Date.now() + Math.random());
  let author = "unknown";
  let text = "";
  let url = "";
  let date = new Date().toISOString();
  let likesCount = 0;

  switch (platform) {
    case "Instagram":
      author = item.ownerUsername || item.username || item.owner?.username
             || item.user?.username || item.authorUsername || "unknown";
      text   = item.caption || item.text || item.description
             || item.edge_media_to_caption?.edges?.[0]?.node?.text || "";
      url    = item.url || item.postUrl
             || (item.shortCode ? `https://instagram.com/p/${item.shortCode}` : "")
             || (item.id ? `https://instagram.com/p/${item.id}` : "");
      date   = item.timestamp || item.takenAt || item.taken_at_timestamp
             || item.createdAt || date;
      likesCount = item.likesCount || item.like_count
                 || item.edge_media_preview_like?.count || 0;
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

// Сканирование одной платформы по ключевому слову
async function scanPlatform(platform, keyword, limit = 10) {
  const actorId = ACTORS[platform];
  if (!actorId) throw new Error(`Нет актора для платформы ${platform}`);

  const input = buildActorInput(platform, keyword, limit);
  const { data: run } = await apifyPost(`/acts/${actorId}/runs`, input);
  const finishedRun = await waitForRun(run.id);

  const resultsRes = await fetch(
    `${APIFY_BASE}/datasets/${finishedRun.defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=${limit}`
  );
  const items = await resultsRes.json();
  if (!Array.isArray(items) || items.length === 0) return [];

  // Фильтруем ошибки от Apify (error objects вместо реальных данных)
  const valid = items.filter(i => !i.error && !i.errorDescription);
  if (valid.length > 0) {
    console.log(`[Apify] ${platform} fields:`, Object.keys(valid[0]).join(", "));
  } else {
    const errItem = items[0];
    console.warn(`[Apify] ${platform} returned errors:`, errItem.error, errItem.errorDescription);
  }
  return valid.map(i => toMention(i, platform, keyword));
}

// POST /api/apify/scan-keywords — сканируем все активные ключевые слова по всем платформам
router.post("/scan-keywords", async (req, res) => {
  if (!APIFY_TOKEN) {
    return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан в .env" });
  }

  const keywordsStore = require("../data/keywordsStore");
  const { platforms: filterPlatforms } = req.body; // опционально: ["Instagram","Twitter"]

  const activeKeywords = keywordsStore.getAll({ status: "active" });
  if (!activeKeywords.length) {
    return res.json({ success: true, message: "Нет активных ключевых слов", data: [] });
  }

  const allMentions = [];
  const errors = [];

  for (const kw of activeKeywords) {
    const sources = Array.isArray(kw.sources) ? kw.sources : ["Instagram"];
    const platforms = filterPlatforms
      ? sources.filter(s => filterPlatforms.includes(s))
      : sources;

    for (const platform of platforms) {
      if (!ACTORS[platform]) continue;
      try {
        console.log(`[Apify] Сканирование "${kw.keyword}" на ${platform}`);
        const mentions = await scanPlatform(platform, kw.keyword, 10);
        mentionsStore.addMany(mentions);
        allMentions.push(...mentions);
        console.log(`[Apify] ${platform}: найдено ${mentions.length}`);
      } catch (err) {
        errors.push({ keyword: kw.keyword, platform, error: err.message });
        console.error(`[Apify] Ошибка "${kw.keyword}" на ${platform}:`, err.message);
      }
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

// POST /api/apify/search — поиск по одному ключевому слову на одной платформе
router.post("/search", async (req, res) => {
  const { keyword, limit = 20, platform = "Instagram" } = req.body;

  if (!keyword) return res.status(400).json({ success: false, message: "keyword обязателен" });
  if (!APIFY_TOKEN) return res.status(503).json({ success: false, message: "APIFY_TOKEN не задан в .env" });
  if (!ACTORS[platform]) return res.status(400).json({ success: false, message: `Платформа "${platform}" не поддерживается` });

  try {
    const mentions = await scanPlatform(platform, keyword, Math.min(limit, 50));
    const added = mentionsStore.addMany(mentions);
    res.json({ success: true, keyword, platform, total: mentions.length, added, data: mentions });
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
