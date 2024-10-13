require("dotenv").config();

console.log(`Node.js version: ${process.version}`);

const text = require("./src/config/lang/EN.json");

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const { Markup } = require("telegraf");

const initialKeyboard = Markup.keyboard([
  ["/find"],
  ["/help"],
  ["/image"],
  ["/gif"],
]).resize();

const searchingKeyboard = Markup.keyboard([
  ["/exit"],
  ["/help"],
  ["/image"],
  ["/gif"],
]).resize();

const chattingKeyboard = Markup.keyboard([
  ["/stop"],
  ["/help"],
  ["/image"],
  ["/gif"],
]).resize();

const MatchMaker = require("./src/matchmaker");
let Matchmaker = new MatchMaker(
  initialKeyboard,
  searchingKeyboard,
  chattingKeyboard
);

Matchmaker.init();

const axios = require("axios");
const cheerio = require("cheerio");

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

bot.command("image", async (ctx) => {
  try {
    // Generate a random page number between 1 and 100
    const randomPage = Math.floor(Math.random() * 100) + 1;

    // Fetch the webpage content with the random page number
    const response = await axios.get(
      `https://xgroovy.com/photos/${randomPage}/?sort=new`
    );
    const html = response.data;

    // Parse the HTML

    const $ = cheerio.load(html);

    // Find all image elements
    const images = $(".item .img img.thumb");

    // Randomly select an image
    const randomImage = images[Math.floor(Math.random() * images.length)];

    // Get the image URL
    const imageUrl = $(randomImage).attr("src");

    // Send the image
    if (imageUrl) {
      await ctx.replyWithPhoto(imageUrl);
    } else {
      await ctx.reply("Sorry, I couldn't find an image to send.");
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    await ctx.reply("Sorry, there was an error fetching the image.");
  }
});

bot.command("gif", async (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);

  try {
    // Generate a random page number between 1 and 100
    const randomPage = Math.floor(Math.random() * 100) + 1;

    // Fetch the webpage content with the random page number
    const response = await axios.get(
      `https://xgroovy.com/gifs/${randomPage}/?sort=new`
    );
    const $ = cheerio.load(response.data);
    const gifs = $(".gif-wrap");

    if (gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
      const gifUrl = $(randomGif).data("full");

      if (gifUrl) {
        await ctx.replyWithAnimation({ url: gifUrl });
      } else {
        await ctx.reply(
          "Sorry, I couldn't find a suitable GIF. Please try again."
        );
      }
    } else {
      await ctx.reply(
        "Sorry, I couldn't find any GIFs. Please try again later."
      );
    }
  } catch (error) {
    console.error("Error fetching GIF:", error);
    await ctx.reply(
      "Sorry, there was an error fetching the GIF. Please try again later."
    );
  }
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

bot.on(["photo"], (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  let file = ctx.message.photo[ctx.message.photo.length - 1];
  file.file_name = "photo.jpg";
  file.mime_type = "image/jpeg";
  file.caption = ctx.message.caption || "";
  console.log("Photo data:", file);
  Matchmaker.connect(id, ["file", file]);
});

bot.on(["document"], (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  let id = ctx.message.chat.id;
  let file = ctx.message.document;
  file.caption = ctx.message.caption || "";
  console.log("Document data:", file);
  Matchmaker.connect(id, ["file", file]);
});

bot.launch();

app.get("/", (req, res) => res.send("Hello World!"));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
