function parsePixels(row) {
  if (!row || !row.pixels) {
    return null;
  }

  try {
    return JSON.parse(row.pixels);
  } catch (error) {
    return null;
  }
}

function mapAnimationRow(row) {
  return {
    ...row,
    pixels: parsePixels(row),
  };
}

module.exports = (db) => ({
  checkNameExists(name) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT 1 FROM submissions WHERE LOWER(name) = LOWER(?) LIMIT 1",
        [name],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(Boolean(row));
        },
      );
    });
  },

  create(animation) {
    const pixelsJson = Array.isArray(animation.pixels)
      ? JSON.stringify(animation.pixels)
      : null;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO submissions (name, type, frameCount, reverseAnimation, description, pixels)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          animation.name,
          animation.type,
          animation.frameCount || null,
          animation.reverseAnimation ? 1 : 0,
          animation.description || null,
          pixelsJson,
        ],
        function onInserted(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve(this.lastID);
        },
      );
    });
  },

  findAll() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, type, frameCount, reverseAnimation, description, createdAt, pixels
         FROM submissions
         ORDER BY id DESC`,
        [],
        (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(rows.map(mapAnimationRow));
        },
      );
    });
  },

  findByPk(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id, name, type, frameCount, reverseAnimation, description, createdAt, pixels
         FROM submissions
         WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(row ? mapAnimationRow(row) : null);
        },
      );
    });
  },

  destroy(id) {
    return new Promise((resolve, reject) => {
      db.run("DELETE FROM submissions WHERE id = ?", [id], function onDeleted(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.changes);
      });
    });
  },
});
