module.exports = (db) => ({
  checkDatabase() {
    return new Promise((resolve, reject) => {
      db.get("SELECT 1", (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(true);
      });
    });
  },
});
