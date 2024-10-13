require("dotenv").config();

console.log(`Node.js version: ${process.version}`);

const text = require("./src/config/lang/EN.json");

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.BOT_TOKEN);

const { Markup } = require("telegraf");

const mainKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🔍 Find", "find"),
    Markup.button.callback("❓ Help", "help"),
  ],
  [
    Markup.button.callback("🖼️ Image", "image"),
    Markup.button.callback("🎞️ GIF", "gif"),
  ],
]);

const searchingKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🚪 Exit", "exit"),
    Markup.button.callback("❓ Help", "help"),
  ],
  [
    Markup.button.callback("🖼️ Image", "image"),
    Markup.button.callback("🎞️ GIF", "gif"),
  ],
]);

const chattingKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🛑 Stop", "stop"),
    Markup.button.callback("❓ Help", "help"),
  ],
]);

const MatchMaker = require("./src/matchmaker");
let Matchmaker = new MatchMaker(
  mainKeyboard,
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
  ctx.reply(text.START, mainKeyboard);
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
    const randomPage = Math.floor(Math.random() * 100) + 1;
    const response = await axios.get(
      `https://xgroovy.com/photos/${randomPage}/?sort=new`
    );
    const $ = cheerio.load(response.data);
    const images = $(".item .img img.thumb");
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const imageUrl = $(randomImage).attr("src");
    if (imageUrl) {
      await ctx.replyWithPhoto(imageUrl, {
        reply_markup: mediaKeyboard.reply_markup,
      });
    } else {
      await ctx.reply("Sorry, I couldn't find an image to send.", {
        reply_markup: mainKeyboard.reply_markup,
      });
    }
  } catch (error) {
    console.error("Error fetching image:", error);
    await ctx.reply("Sorry, there was an error fetching the image.", {
      reply_markup: mainKeyboard.reply_markup,
    });
  }
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

bot.on("callback_query", async (ctx) => {
  const action = ctx.callbackQuery.data;
  const userID = ctx.callbackQuery.from.id;

  switch (action) {
    case "find":
      await ctx.answerCbQuery();
      ctx.reply(text.FIND.LOADING, searchingKeyboard);
      Matchmaker.find(userID);
      break;
    case "help":
      await ctx.answerCbQuery();
      ctx.reply(text.HELP, mainKeyboard);
      break;
    case "image":
      await ctx.answerCbQuery();
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
          await ctx.replyWithPhoto(imageUrl, {
            reply_markup: mediaKeyboard.reply_markup,
          });
        } else {
          await ctx.reply("Sorry, I couldn't find an image to send.", {
            reply_markup: mainKeyboard.reply_markup,
          });
        }
      } catch (error) {
        console.error("Error fetching image:", error);
        await ctx.reply("Sorry, there was an error fetching the image.", {
          reply_markup: mainKeyboard.reply_markup,
        });
      }
      break;
    case "gif":
      await ctx.answerCbQuery();
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
      break;
    case "stop":
      await ctx.answerCbQuery();
      Matchmaker.stop(userID);
      break;
    case "exit":
      await ctx.answerCbQuery();
      Matchmaker.exit(userID);
      break;
    case "edit_profile":
      await ctx.answerCbQuery();
      ctx.reply(
        "To edit your profile, use the following commands:\n\n/setbio [Your bio]\n/setage [Your age]\n/setgender [Your gender]"
      );
      break;
    case "view_partner_profile":
      await ctx.answerCbQuery();
      const room = await Matchmaker.getUserRoom(userID);
      if (room) {
        const partnerID = room.participans.find(
          (id) => id !== userID.toString()
        );
        const partnerProfile = await Matchmaker.getUserProfile(partnerID);
        if (partnerProfile) {
          const profileText = `
👤 Partner's Profile:
Name: ${partnerProfile.name || "Not set"}
Username: ${partnerProfile.username || "Not set"}
Age: ${partnerProfile.age || "Not set"}
Gender: ${partnerProfile.gender || "Not set"}
Bio: ${partnerProfile.bio || "Not set"}
          `;
          ctx.reply(profileText);
        } else {
          ctx.reply("Sorry, we couldn't fetch your partner's profile.");
        }
      } else {
        ctx.reply("You're not currently in a chat with anyone.");
      }
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

bot.command("profile", async (ctx) => {
  const userID = ctx.message.from.id;
  const profile = await Matchmaker.getUserProfile(userID);
  if (profile) {
    const profileText = `
👤 Your Profile:
Name: ${profile.name || "Not set"}
Username: ${profile.username || "Not set"}
Age: ${profile.age || "Not set"}
Gender: ${profile.gender || "Not set"}
Bio: ${profile.bio || "Not set"}
    `;
    ctx.reply(profileText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Edit Profile", callback_data: "edit_profile" }],
        ],
      },
    });
  } else {
    ctx.reply("Sorry, we couldn't fetch your profile. Please try again later.");
  }
});

bot.command("setbio", async (ctx) => {
  const userID = ctx.message.from.id;
  const bio = ctx.message.text.split(" ").slice(1).join(" ");
  await Matchmaker.updateUserProfile(userID, { bio });
  ctx.reply("Your bio has been updated!");
});

bot.command("setage", async (ctx) => {
  const userID = ctx.message.from.id;
  const age = parseInt(ctx.message.text.split(" ")[1]);
  if (isNaN(age) || age < 13 || age > 120) {
    ctx.reply("Please provide a valid age between 13 and 120.");
  } else {
    await Matchmaker.updateUserProfile(userID, { age });
    ctx.reply("Your age has been updated!");
  }
});

bot.command("setgender", async (ctx) => {
  const userID = ctx.message.from.id;
  const gender = ctx.message.text.split(" ")[1];
  await Matchmaker.updateUserProfile(userID, { gender });
  ctx.reply("Your gender has been updated!");
});

bot.launch();

app.get("/", (req, res) => res.send("Hello World!"));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// Add this near the top of your file, where you define other keyboards
const mediaKeyboard = Markup.inlineKeyboard([
  [
    Markup.button.callback("🖼️ Another Image", "image"),
    Markup.button.callback("🎞️ Another GIF", "gif"),
  ],
  [
    Markup.button.callback("🔍 Find Chat", "find"),
    Markup.button.callback("❓ Help", "help"),
  ],
]);
