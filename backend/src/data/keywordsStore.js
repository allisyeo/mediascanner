"use strict";
const fs   = require("fs");
const path = require("path");
const { keywords: defaultKeywords } = require("./demoData");

const STORE_FILE = process.env.VERCEL
  ? "/tmp/kt_keywords_v2.json"
  : path.join(__dirname, "keywords.json");

let _keywords = [];

function load() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      _keywords = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      return;
    }
  } catch (e) {
    console.error("[keywordsStore] Ошибка чтения:", e.message);
  }
  _keywords = [...defaultKeywords];
  save();
}

function save() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(_keywords, null, 2), "utf8");
  } catch (e) {
    console.error("[keywordsStore] Ошибка записи:", e.message);
  }
}

load();

function getAll(filters = {}) {
  let result = [..._keywords];
  if (filters.status) result = result.filter(k => k.status === filters.status);
  if (filters.type)   result = result.filter(k => k.type === filters.type);
  return result;
}

function add(kw) {
  _keywords.unshift(kw);
  save();
  return kw;
}

function update(id, patch) {
  const idx = _keywords.findIndex(k => k.id === id);
  if (idx === -1) return null;
  _keywords[idx] = { ..._keywords[idx], ...patch, updatedAt: new Date().toISOString() };
  save();
  return _keywords[idx];
}

function remove(id) {
  const idx = _keywords.findIndex(k => k.id === id);
  if (idx === -1) return null;
  const [removed] = _keywords.splice(idx, 1);
  save();
  return removed;
}

module.exports = { getAll, add, update, remove };
