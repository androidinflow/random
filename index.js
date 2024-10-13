require("dotenv").config();

console.log(`Node.js version: ${process.version}`);

const text = require("./src/config/lang/EN.json");

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const { Markup } = require("telegraf");

const initialKeyboard = Markup.keyboard([["/find"], ["/help"]]).resize();

const searchingKeyboard = Markup.keyboard([["/exit"], ["/help"]]).resize();

const chattingKeyboard = Markup.keyboard([["/stop"], ["/help"]]).resize();

const MatchMaker = require("./src/matchmaker");
let Matchmaker = new MatchMaker(
  initialKeyboard,
  searchingKeyboard,
  chattingKeyboard
);

Matchmaker.init();

bot.start((ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  ctx.reply(text.START);
});

bot.command("help", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  ctx.reply(text.HELP);
});

bot.command("ping", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  const start = new Date();
  const s = start / 1000 - ctx.message.date;
  ctx.replyWithHTML(`${text.PING} - <code>⏱ ${s.toFixed(3)} s</code>`);
});

bot.command("find", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  ctx.reply(text.FIND.LOADING, searchingKeyboard);
  Matchmaker.find(id);
});

bot.command("stop", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  Matchmaker.stop(id);
});

bot.command("exit", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  Matchmaker.exit(id);
});

bot.command("users", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  Matchmaker.currentActiveUser(id);
});

bot.on("text", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  let message = ctx.message;
  Matchmaker.connect(id, ["text", message]);
});

bot.on(["document", "audio", "video", "voice", "photo", "sticker"], (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  let file;

  if (ctx.message.document) file = ctx.message.document;
  else if (ctx.message.audio) file = ctx.message.audio;
  else if (ctx.message.video) file = ctx.message.video;
  else if (ctx.message.voice) file = ctx.message.voice;
  else if (ctx.message.photo) {
    file = ctx.message.photo[ctx.message.photo.length - 1];
    file.file_name = "photo.jpg";
    file.mime_type = "image/jpeg";
  } else if (ctx.message.sticker) file = ctx.message.sticker;

  file.file_name = file.file_name || `file.${file.mime_type.split("/")[1]}`;
  Matchmaker.connect(id, ["file", file]);
});

bot.on("callback_query", (ctx) => {
  let query = ctx.callbackQuery.data.split("-");

  switch (query[0]) {
    case "openPhoto":
      let urlPhoto = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/photos/${query[1]}`;
      ctx
        .deleteMessage()
        .then(ctx.replyWithPhoto({ url: urlPhoto }))
        .catch((err) => console.log(err));
      break;
    case "openVideo":
      let urlVideo = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/videos/${query[1]}`;
      ctx
        .deleteMessage()
        .then(ctx.replyWithVideo({ url: urlVideo }))
        .catch((err) => console.log(err));
      break;
    default:
      console.log("unknown");
      break;
  }
});

bot.launch();

app.get("/", (req, res) => res.send("Hello World!"));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
