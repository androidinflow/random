require("dotenv").config();

console.log(`Node.js version: ${process.version}`);

const text = require("./src/config/lang/EN.json");

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const { Markup } = require("telegraf");

const mainKeyboard = Markup.keyboard([
  ["🔍 Find Chat"],
  ["🖼️ Image", "🎞️ GIF"],
]).resize();

const searchingKeyboard = Markup.keyboard([
  ["🚪 Exit"],
  ["🖼️ Image", "🎞️ GIF"],
]).resize();

const chattingKeyboard = Markup.keyboard([["🚪 Exit"]]).resize();

const MatchMaker = require("./src/matchmaker");
let Matchmaker = new MatchMaker(
  mainKeyboard,
  searchingKeyboard,
  chattingKeyboard,
  mainKeyboard
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
  ctx.reply(text.START, mainKeyboard);
});

bot.command("gif", async (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);

  try {
    const randomPage = Math.floor(Math.random() * 100) + 1;
    const response = await axios.get(
      `https://xgroovy.com/gifs/${randomPage}/?sort=new`
    );
    const $ = cheerio.load(response.data);
    const gifs = $(".gif-wrap");
    if (gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
      const gifUrl = $(randomGif).data("full");
      if (gifUrl) {
        await ctx.replyWithAnimation(
          { url: gifUrl },
          { reply_markup: mediaKeyboard.reply_markup }
        );
      } else {
        await ctx.reply(
          "Sorry, I couldn't find a suitable GIF. Please try again.",
          { reply_markup: mainKeyboard.reply_markup }
        );
      }
    } else {
      await ctx.reply(
        "Sorry, I couldn't find any GIFs. Please try again later.",
        { reply_markup: mainKeyboard.reply_markup }
      );
    }
  } catch (error) {
    console.error("Error fetching GIF:", error);
    await ctx.reply(
      "Sorry, there was an error fetching the GIF. Please try again later.",
      { reply_markup: mainKeyboard.reply_markup }
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

bot.hears("🔍 Find Chat", (ctx) => {
  const userID = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userID, username, name);
  Matchmaker.saveUser(userID, username, name);
  ctx.reply(text.FIND.LOADING, Matchmaker.searchingKeyboard);
  Matchmaker.find(userID);
});

bot.hears("🚪 Exit", (ctx) => {
  const userID = ctx.message.from.id;
  Matchmaker.exit(userID);
});

bot.hears("🎞️ GIF", async (ctx) => {
  try {
    const randomPage = Math.floor(Math.random() * 100) + 1;
    const response = await axios.get(
      `https://xgroovy.com/gifs/${randomPage}/?sort=new`
    );
    const $ = cheerio.load(response.data);
    const gifs = $(".gif-wrap");
    if (gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
      const gifUrl = $(randomGif).data("full");
      if (gifUrl) {
        await ctx.replyWithAnimation(
          { url: gifUrl },
          { reply_markup: mediaKeyboard }
        );
      } else {
        await ctx.reply(
          "Sorry, I couldn't find a suitable GIF. Please try again.",
          { reply_markup: mainKeyboard }
        );
      }
    } else {
      await ctx.reply(
        "Sorry, I couldn't find any GIFs. Please try again later.",
        { reply_markup: mainKeyboard }
      );
    }
  } catch (error) {
    console.error("Error fetching GIF:", error);
    await ctx.reply(
      "Sorry, there was an error fetching the GIF. Please try again later.",
      { reply_markup: mainKeyboard }
    );
  }
});

bot.hears("🖼️ Image", async (ctx) => {
  try {
    const randomPage = Math.floor(Math.random() * 100) + 1;
    const response = await axios.get(
      `https://xgroovy.com/photos/${randomPage}/?sort=new`
    );
    const $ = cheerio.load(response.data);
    const images = $(".item .img img.thumb");
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const imageUrl = $(randomImage).attr("src");
    if (imageUrl) {
      await ctx.replyWithPhoto(imageUrl, { reply_markup: mediaKeyboard });
    } else {
      await ctx.reply("Sorry, I couldn't find an image to send.", {
        reply_markup: mainKeyboard,
      });
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    await ctx.reply("Sorry, there was an error fetching the image.", {
      reply_markup: mainKeyboard,
    });
  }
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

// Add this near the top of your file, where you define other keyboards
const mediaKeyboard = Markup.keyboard([
  ["🖼️ Another Image", "🎞️ Another GIF"],
  ["🔍 Find Chat", "🚪 Exit"],
]).resize();
