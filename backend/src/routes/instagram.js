"use strict";
const { Router } = require("express");
const router = Router();

// POST /api/instagram/reply
// Отправляет ответ на Instagram-упоминание (комментарий, DM, mention).
//
// TODO (production):
//   1. Подключить Instagram Graph API
//   2. Использовать process.env.INSTAGRAM_ACCESS_TOKEN — НЕ хранить во frontend
//   3. Endpoint зависит от sourceType:
//      - instagram_comment → POST /{comment-id}/replies
//      - instagram_dm      → POST /me/messages
//      - instagram_mention → POST /{media-id}/comments
//   4. Хранить access_token в таблице instagram_tokens (PostgreSQL), не в .env
//      (токены Instagram истекают и требуют refresh)
//   5. Логировать результат в таблицу reply_history

router.post("/reply", async (req, res) => {
  const {
    mentionId,
    instagramCommentId,
    recipientUsername,
    replyText,
    sourceType
  } = req.body;

  if (!replyText) {
    return res.status(400).json({
      success: false,
      message: "Поле replyText обязательно"
    });
  }

  if (!instagramCommentId && !recipientUsername) {
    return res.status(400).json({
      success: false,
      message: "Необходимо передать instagramCommentId или recipientUsername"
    });
  }

  const hasToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

  if (!hasToken) {
    // DEMO: токен не настроен — симулируем отправку
    console.log("[Instagram DEMO] Ответ:", {
      mentionId,
      instagramCommentId,
      recipientUsername,
      replyText,
      sourceType,
      simulatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      mode: "demo",
      message: "Instagram reply simulated",
      messageId: "demo_ig_" + Date.now(),
      payload: {
        mentionId: mentionId || null,
        instagramCommentId: instagramCommentId || null,
        recipientUsername: recipientUsername || null,
        replyText,
        sourceType: sourceType || null,
        simulatedAt: new Date().toISOString()
      }
    });
  }

  // TODO: production — вызов Instagram Graph API
  // const apiUrl = buildInstagramApiUrl(sourceType, instagramCommentId);
  // const response = await fetch(apiUrl, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     message: replyText,
  //     access_token: process.env.INSTAGRAM_ACCESS_TOKEN
  //   })
  // });
  // if (!response.ok) throw new Error("Instagram API error");
  // const result = await response.json();

  res.json({
    success: true,
    mode: "demo",
    message: "Instagram reply simulated (token present but API not wired)",
    messageId: "demo_ig_" + Date.now()
  });
});

// GET /api/instagram/status
// Проверка статуса подключения Instagram.
// TODO: в production — проверять валидность токена через Graph API /me
router.get("/status", (req, res) => {
  const hasToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);
  res.json({
    success: true,
    mode: "demo",
    connected: false, // TODO: заменить на реальную проверку токена
    tokenConfigured: hasToken,
    message: hasToken
      ? "Токен настроен — подключите Graph API для активации"
      : "INSTAGRAM_ACCESS_TOKEN не задан в .env"
  });
});

// GET /api/instagram/oauth/start
// Инициирует OAuth-flow Instagram.
// TODO: редиректить на Meta OAuth URL с client_id и redirect_uri
router.get("/oauth/start", (req, res) => {
  // TODO (production):
  // const oauthUrl = `https://api.instagram.com/oauth/authorize?` +
  //   `client_id=${process.env.INSTAGRAM_APP_ID}` +
  //   `&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI)}` +
  //   `&scope=instagram_basic,instagram_manage_comments` +
  //   `&response_type=code`;
  // return res.redirect(oauthUrl);

  res.json({
    success: false,
    mode: "demo",
    message: "OAuth не настроен. Добавьте INSTAGRAM_APP_ID и INSTAGRAM_REDIRECT_URI в .env"
  });
});

// GET /api/instagram/oauth/callback
// Обрабатывает callback от Meta OAuth.
// TODO: обменивать code на access_token и сохранять в PostgreSQL
router.get("/oauth/callback", (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.status(400).json({
      success: false,
      message: "OAuth callback error: " + (error || "no code")
    });
  }
  // TODO: exchange code for token, save to instagram_tokens table
  res.json({
    success: false,
    mode: "demo",
    message: "OAuth callback получен, но обмен токена не настроен (TODO)"
  });
});

module.exports = router;
