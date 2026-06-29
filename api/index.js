let app;
try {
  app = require("../backend/src/server.js");
} catch (e) {
  console.error("STARTUP_CRASH:", e.message, e.stack);
  app = (req, res) => {
    res.status(500).json({ error: "Startup failed", message: e.message, stack: e.stack });
  };
}
module.exports = app;
