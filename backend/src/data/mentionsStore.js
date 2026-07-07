"use strict";
const fs   = require("fs");
const path = require("path");

const STORE_FILE = process.env.VERCEL
  ? "/tmp/kt_mentions.json"
  : path.join(__dirname, "mentions.json");

let _mentions = [];

function load() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      _mentions = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
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

module.exports = { getAll, addMany, update, clear, count };
