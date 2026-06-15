"use strict";

// ─── Пользователи KT MediaScanner ──────────────────────────────────────────
// Единственная учётная запись — администратор системы.
// Регистрация новых пользователей не предусмотрена.
//
// passwordHash сгенерирован через bcrypt.hashSync("45aseFUG@", 12).
// Открытый пароль НИГДЕ в коде не хранится.
//
// TODO (production):
//   - Перенести пользователей в таблицу users в PostgreSQL
//   - Сменить пароль через: node -e "require('bcryptjs').hash('NewPass',12).then(console.log)"
//   - Задать надёжный JWT_SECRET в .env (обязательно для production)

const users = [
  {
    id:           "admin_001",
    username:     "allisyeo",
    name:         "Администратор",
    role:         "admin",
    passwordHash: "$2b$12$exMp9h6U1y5jNyG.D7G/M.yaRaRjkLl8N5./jJYYy79tQqUB4UgP2"
  }
];

/**
 * Найти пользователя по username.
 * @param {string} username
 * @returns {object|undefined}
 */
function findByUsername(username) {
  return users.find(u => u.username === username);
}

/**
 * Найти пользователя по id.
 * @param {string} id
 * @returns {object|undefined}
 */
function findById(id) {
  return users.find(u => u.id === id);
}

/**
 * Вернуть публичные поля пользователя (без passwordHash).
 * @param {object} user
 * @returns {object}
 */
function publicUser(user) {
  const { passwordHash: _omit, ...pub } = user;
  return pub;
}

module.exports = { findByUsername, findById, publicUser };
