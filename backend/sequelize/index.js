const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      frameCount INTEGER,
      reverseAnimation INTEGER DEFAULT 0,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      pixels TEXT
    )
  `);

  db.all("PRAGMA table_info(submissions)", [], (err, columns) => {
    if (err) {
      return;
    }

    const hasReverseAnimation = columns.some(
      (column) => column.name === "reverseAnimation",
    );
    const hasPixels = columns.some((column) => column.name === "pixels");

    if (!hasReverseAnimation) {
      db.run("ALTER TABLE submissions ADD COLUMN reverseAnimation INTEGER DEFAULT 0");
    }

    if (!hasPixels) {
      db.run("ALTER TABLE submissions ADD COLUMN pixels TEXT");
    }
  });
});

function authenticate() {
  return new Promise((resolve, reject) => {
    db.get("SELECT 1", (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(true);
    });
  });
}

const models = {
  animation: require("./models/animation.model")(db),
  status: require("./models/status.model")(db),
};

module.exports = {
  db,
  models,
  authenticate,
};
