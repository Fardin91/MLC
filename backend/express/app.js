const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const animations = require("./routes/animations");
const status = require("./routes/status");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

function makeHandlerAwareOfAsyncErrors(handler) {
  return async function handleRequest(req, res, next) {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/", (req, res) => {
  res.send("<h2>Matrix Light Control API</h2>");
});

app.get("/check-name", makeHandlerAwareOfAsyncErrors(animations.checkName));
app.post("/submit", makeHandlerAwareOfAsyncErrors(animations.create));
app.get("/animations", makeHandlerAwareOfAsyncErrors(animations.getAll));
app.get("/animations/:id", makeHandlerAwareOfAsyncErrors(animations.getById));
app.delete("/animations/:id", makeHandlerAwareOfAsyncErrors(animations.remove));

app.get("/api/status", makeHandlerAwareOfAsyncErrors(status.getStatus));
app.get("/api/host-ip", makeHandlerAwareOfAsyncErrors(status.getHostIp));

module.exports = app;
