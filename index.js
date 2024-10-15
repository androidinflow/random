require("dotenv").config();

console.log(`Node.js version: ${process.version}`);

const text = require("./src/config/lang/text.json");

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const axios = require("axios");
const cheerio = require("cheerio");

const { Markup } = require("telegraf");

const homeKeyboard = Markup.keyboard([["🔍 یافتن چت", "🍆گیف👾"]]).resize();

const waitingKeyboard = Markup.keyboard([["🚪 خروج"]]).resize();

const chatKeyboard = Markup.keyboard([
  ["🚪 خروج"],
  ["ℹ️ اطلاعات شریک"],
]).resize();

const ChatManager = require("./src/matchmaker");
let chatManager = new ChatManager(
  homeKeyboard,
  waitingKeyboard,
  chatKeyboard,
  homeKeyboard
);

chatManager.init();

bot.start(async (ctx) => {
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userId, username, name);

  await chatManager.saveUser(userId, username, name);

  const referralCode = ctx.startPayload;
  if (referralCode) {
    await chatManager.handleReferral(userId, referralCode);
  }

  // Send a welcome message
  ctx.reply(text.START, chatManager.initialKeyboard);
});

bot.hears("🍆گیف👾", async (ctx) => {
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userId, username, name);
  await chatManager.saveUser(userId, username, name);

  console.log(`Media request from user ${userId}`);

  try {
    const user = await chatManager.getUser(userId);

    if (user.media_uses >= 15) {
      await ctx.reply(
        "متأسفم، شما بیش از حد استفاده کرده اید. لطفاً بعداً دوباره تلاش کنید.",
        { reply_markup: homeKeyboard.reply_markup }
      );
      return;
    }

    const page = Math.floor(Math.random() * 2000) + 1; // Random page between 1 and 100
    console.log(`Fetching page: https://pornogifs.net/page/${page}/`);
    const response = await axios.get(`https://pornogifs.net/page/${page}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const gifs = $("img.cover-image")
      .map((i, el) => $(el).attr("data-src"))
      .get();

    if (gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
      await ctx.replyWithAnimation(
        { url: randomGif }
        // { reply_markup: homeKeyboard.reply_markup }
      );

      //increase the count of the media_uses in the pocketbase database. telegram_users collection. media_uses field.
      const user = await chatManager.getUser(userId);
      //console.log("loook here", user);
      let used = user.media_uses;
      //console.log("used", used);
      used++;
      //console.log("newValue", newValue);
      //console.log("user", user.id);
      await chatManager.updateUser(user.id, used);

      //send the media_uses count to the user
      ctx.reply(`تعداد استفاده از محتوا: ${used}`);
    } else {
      await ctx.reply(
        "متأسفم، نتوانستم هیچ GIF پیدا کنیم. لطفاً بعداً دوباره تلاش کنید.",
        { reply_markup: homeKeyboard.reply_markup }
      );
    }
  } catch (error) {
    console.error("Error fetching GIF:", error);
    await ctx.reply(
      "متأسفم، خطایی در دریافت GIF رخ داد. لطفاً بعداً دوباره تلاش کنید.",
      { reply_markup: homeKeyboard.reply_markup }
    );
  }
});

bot.hears("🔍 یافتن چت", (ctx) => {
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userId, username, name);
  chatManager.saveUser(userId, username, name);
  chatManager.findMatch(userId);
});

bot.hears("🚪 خروج", (ctx) => {
  const userId = ctx.message.from.id;
  chatManager.exitRoom(userId);
});

bot.hears("ℹ️ اطلاعات شریک", async (ctx) => {
  const userId = ctx.message.from.id;
  try {
    const partnerInfo = await chatManager.getPartnerInfo(userId);

    if (partnerInfo) {
      const formattedMessage = `
⭐️🌟 اطلاعات شریک چت شما ⭐️🌟
━━━━━━━━━━━━━━━━━━━━━
👤😊 نام: <b>${partnerInfo.name}</b>
━━━━━━━━━━━━━━━━━━━━━
امیدواریم گفتگوی خوبی داشته باشید! 🌟
      `;

      ctx.replyWithHTML(formattedMessage, { parse_mode: "HTML" });
    } else {
      const sadEmoji = "😔";
      const errorEmoji = "❌";

      ctx.reply(
        `${sadEmoji} اوه، متأسفیم! ${errorEmoji}
      
شما در حال حاضر در چتی نیستید یا مشکلی در دریافت اطلاعات شریک پیش آمده است.

لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.`
      );
    }
  } catch (error) {
    console.error("Error in Partner Info handler:", error);
    ctx.reply(
      "متأسفم، خطایی در دریافت اطلاعات شریک رخ داد. لطفاً بعداً دوباره تلاش کنید."
    );
  }
});

bot.on("text", (ctx) => {
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userId, username, name);
  chatManager.saveUser(userId, username, name);
  let chatId = ctx.message.chat.id;
  let message = ctx.message;
  chatManager.connect(chatId, ["text", message]);
});

bot.on(["document", "audio", "video", "voice", "photo", "sticker"], (ctx) => {
  const userId = ctx.message.from.id;
  const username = ctx.message.from.username || "Anonymous";
  const name = ctx.message.from.first_name || "Anonymous";
  console.log(userId, username, name);
  chatManager.saveUser(userId, username, name);
  let chatId = ctx.message.chat.id;
  let mediaFile;

  if (ctx.message.document) mediaFile = ctx.message.document;
  else if (ctx.message.audio) mediaFile = ctx.message.audio;
  else if (ctx.message.video) mediaFile = ctx.message.video;
  else if (ctx.message.voice) mediaFile = ctx.message.voice;
  else if (ctx.message.photo) {
    mediaFile = ctx.message.photo[ctx.message.photo.length - 1];
    mediaFile.file_name = "photo.jpg";
    mediaFile.mime_type = "image/jpeg";
  } else if (ctx.message.sticker) {
    mediaFile = ctx.message.sticker;
    mediaFile.file_name = "sticker.webp";
    mediaFile.mime_type = "image/webp";
  }

  if (mediaFile.mime_type) {
    mediaFile.file_name =
      mediaFile.file_name || `file.${mediaFile.mime_type.split("/")[1]}`;
  } else {
    mediaFile.file_name = mediaFile.file_name || "file";
  }
  chatManager.connect(chatId, ["file", mediaFile]);
});

// Launch the bot
bot.launch();

// Set up the Express server
app.get("/", (req, res) => res.send("Hello World!"));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
