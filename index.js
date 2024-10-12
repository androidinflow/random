require("dotenv").config();

const text = require("./src/config/lang/EN.json");

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const MatchMaker = require("./src/matchmaker");
let Matchmaker = new MatchMaker();

Matchmaker.init();

bot.start((ctx) => {
  ctx.reply(text.START);
});

bot.command("contribute", (ctx) => {
  ctx.reply(text.CONTRIBUTE, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Open GitHub",
            url: "https://github.com/Shiyinq/anonim-chat",
          },
        ],
      ],
    },
  });
});

bot.command("help", (ctx) => {
  ctx.reply(text.HELP);
});

bot.command("ping", (ctx) => {
  const start = new Date();
  const s = start / 1000 - ctx.message.date;
  ctx.replyWithHTML(`${text.PING} - <code>⏱ ${s.toFixed(3)} s</code>`);
});

bot.command("find", (ctx) => {
  let id = ctx.message.chat.id;
  Matchmaker.find(id);
});

bot.command("next", (ctx) => {
  let id = ctx.message.chat.id;
  Matchmaker.next(id);
});

bot.command("stop", (ctx) => {
  let id = ctx.message.chat.id;
  Matchmaker.stop(id);
});

bot.command("exit", (ctx) => {
  let id = ctx.message.chat.id;
  Matchmaker.exit(id);
});

bot.command("users", (ctx) => {
  let id = ctx.message.chat.id;
  Matchmaker.currentActiveUser(id);
});

bot.on("text", (ctx) => {
  let id = ctx.message.chat.id;
  let message = ctx.message;
  Matchmaker.connect(id, ["text", message]);
});

bot.on(["document", "audio", "video", "voice", "photo", "sticker"], (ctx) => {
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
