const app = require("./express/app");
const sequelize = require("./sequelize");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function assertDatabaseConnectionOk() {
  console.log("Checking database connection...");

  try {
    await sequelize.authenticate();
    console.log("Database connection OK!");
  } catch (error) {
    console.log("Unable to connect to the database:");
    console.log(error.message);
    process.exit(1);
  }
}

async function init() {
  await assertDatabaseConnectionOk();

  console.log(`Starting Matrix Light Control API on http://${HOST}:${PORT}...`);

  app.listen(PORT, HOST, () => {
    console.log(`Express server started on port ${PORT}.`);
  });
}

init();
