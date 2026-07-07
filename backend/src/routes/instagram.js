"use strict";
const { Router } = require("express");
const router = Router();

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_API = "https://graph.instagram.com/v21.0";

async function igGet(path, params = {}) {
  const url = new URL(`${IG_API}${path}`);
  url.searchParams.set("access_token", ACCESS_TOKEN);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function igPost(path, body = {}) {
  const url = new URL(`${IG_API}${path}`);
  url.searchParams.set("access_token", ACCESS_TOKEN);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// GET /api/instagram/status
router.get("/status", async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.json({ success: true, mode: "demo", connected: false,
      message: "INSTAGRAM_ACCESS_TOKEN не задан в .env" });
  }
  try {
    const data = await igGet("/me", { fields: "id,name,username,followers_count" });
    res.json({
      success: true, mode: "production", connected: true,
      account: { id: data.id, name: data.name, username: data.username, followers: data.followers_count },
      message: `Подключён аккаунт @${data.username}`
    });
  } catch (err) {
    res.status(502).json({ success: false, message: "Instagram API ошибка: " + err.message });
  }
});

// GET /api/instagram/mentions — упоминания (теги в комментариях к вашим медиа)
router.get("/mentions", async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.json({ success: true, mode: "demo", data: [] });
  }
  try {
    // Получаем последние медиа
    const media = await igGet("/me/media", {
      fields: "id,caption,timestamp,like_count,comments_count,permalink"
    });
    res.json({ success: true, mode: "production", data: media.data || [], paging: media.paging });
  } catch (err) {
    res.status(502).json({ success: false, message: "Instagram API ошибка: " + err.message });
  }
});

// GET /api/instagram/comments/:mediaId — комментарии к конкретному посту
router.get("/comments/:mediaId", async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.json({ success: true, mode: "demo", data: [] });
  }
  try {
    const data = await igGet(`/${req.params.mediaId}/comments`, {
      fields: "id,text,timestamp,username,replies{id,text,timestamp,username}"
    });
    res.json({ success: true, mode: "production", data: data.data || [] });
  } catch (err) {
    res.status(502).json({ success: false, message: "Instagram API ошибка: " + err.message });
  }
});

// POST /api/instagram/reply — ответить на комментарий
router.post("/reply", async (req, res) => {
  const { instagramCommentId, replyText, mediaId } = req.body;

  if (!replyText) {
    return res.status(400).json({ success: false, message: "Поле replyText обязательно" });
  }

  if (!ACCESS_TOKEN) {
    console.log("[Instagram DEMO] Ответ симулирован:", { instagramCommentId, replyText });
    return res.json({ success: true, mode: "demo", message: "Симуляция — задайте INSTAGRAM_ACCESS_TOKEN" });
  }

  try {
    let result;
    if (instagramCommentId) {
      // Ответ на комментарий
      result = await igPost(`/${instagramCommentId}/replies`, { message: replyText });
    } else if (mediaId) {
      // Новый комментарий к посту
      result = await igPost(`/${mediaId}/comments`, { message: replyText });
    } else {
      return res.status(400).json({ success: false, message: "Нужен instagramCommentId или mediaId" });
    }
    res.json({ success: true, mode: "production", id: result.id });
  } catch (err) {
    res.status(502).json({ success: false, message: "Instagram API ошибка: " + err.message });
  }
});

// GET /api/instagram/tagged — посты где отмечен ваш аккаунт
router.get("/tagged", async (req, res) => {
  if (!ACCESS_TOKEN) {
    return res.json({ success: true, mode: "demo", data: [] });
  }
  try {
    const me = await igGet("/me", { fields: "id" });
    const data = await igGet(`/${me.id}/tags`, {
      fields: "id,caption,timestamp,permalink,media_type"
    });
    res.json({ success: true, mode: "production", data: data.data || [] });
  } catch (err) {
    res.status(502).json({ success: false, message: "Instagram API ошибка: " + err.message });
  }
});

module.exports = router;
