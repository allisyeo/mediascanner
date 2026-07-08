"use strict";
const fs   = require("fs");
const path = require("path");

// На Vercel файловая система read-only кроме /tmp/.
// Используем bundled mentions.json как постоянную базу (обновляется через git),
// а /tmp/ — как кэш для текущей сессии (сбрасывается при cold start).
const BUNDLE_FILE = path.join(__dirname, "mentions.json");
const TMP_FILE    = "/tmp/kt_mentions.json";

const STORE_FILE = process.env.VERCEL
  ? TMP_FILE
  : BUNDLE_FILE;

let _mentions = [];

function load() {
  try {
    if (process.env.VERCEL) {
      // На Vercel: сначала пробуем /tmp/ (данные текущей сессии)
      if (fs.existsSync(TMP_FILE)) {
        _mentions = JSON.parse(fs.readFileSync(TMP_FILE, "utf8"));
        console.log(`[mentionsStore] Загружено из /tmp/: ${_mentions.length}`);
        return;
      }
      // Если /tmp/ пуст — грузим из bundled файла (закоммиченные данные)
      if (fs.existsSync(BUNDLE_FILE)) {
        _mentions = JSON.parse(fs.readFileSync(BUNDLE_FILE, "utf8"));
        console.log(`[mentionsStore] Загружено из bundle: ${_mentions.length}`);
        // Копируем в /tmp/ чтобы туда шли новые записи
        fs.writeFileSync(TMP_FILE, JSON.stringify(_mentions, null, 2), "utf8");
        return;
      }
    } else {
      if (fs.existsSync(STORE_FILE)) {
        _mentions = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      }
    }
  } catch (e) {
    console.error("[mentionsStore] Ошибка чтения:", e.message);
    _mentions = [];
  }
}

function save() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(_mentions, null, 2), "utf8");
  } catch (e) {
    console.error("[mentionsStore] Ошибка записи:", e.message);
  }
}

load();

function getAll() { return [..._mentions]; }

function addMany(items) {
  let added = 0;
  items.forEach(item => {
    if (!_mentions.find(m => m.id === item.id)) {
      _mentions.unshift(item);
      added++;
    }
  });
  if (added > 0) save();
  return added;
}

function update(id, patch) {
  const idx = _mentions.findIndex(m => m.id === id);
  if (idx === -1) return null;
  _mentions[idx] = { ..._mentions[idx], ...patch };
  save();
  return _mentions[idx];
}

function clear() {
  _mentions = [];
  save();
}

function count() { return _mentions.length; }

// Экспортируем snapshot текущих данных (для обновления bundled файла через endpoint)
function exportBundle() { return [..._mentions]; }

module.exports = { getAll, addMany, update, clear, count, exportBundle };
