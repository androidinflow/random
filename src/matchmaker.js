const { Telegram } = require("telegraf");
const tg = new Telegram(process.env.BOT_TOKEN);

const { Markup } = require("telegraf");

const text = require("./config/lang/EN.json");

const pb = require("./config/pocketbase");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

class MatchMaker {
  constructor(
    initialKeyboard,
    searchingKeyboard,
    chattingKeyboard,
    mainKeyboard
  ) {
    this.initialKeyboard = initialKeyboard;
    this.searchingKeyboard = searchingKeyboard;
    this.chattingKeyboard = chattingKeyboard;
    this.mainKeyboard = mainKeyboard;
    this.startTimes = new Map(); // To track start times
  }

  async init() {
    setInterval(async () => {
      try {
        const queues = await pb.collection("queues").getList(1, 2, {
          sort: "created",
        });
        if (queues.items.length === 2) {
          const newParticipants = queues.items.map((q) => q.user_id);
          for (const q of queues.items) {
            await pb.collection("queues").delete(q.id);
          }
          await this.createRoom(newParticipants);
        }
      } catch (err) {
        console.error("Error in init:", err);
      }
    }, 2000);
  }

  async createRoom(newParticipants) {
    try {
      const room = await pb.collection("rooms").create({
        participans: newParticipants,
      });

      for (const id of newParticipants) {
        const keyboard = Markup.keyboard([["🚪 Exit"]]).resize(); // Only Exit button
        tg.sendMessage(id, `${text.CREATE_ROOM.SUCCESS_1}`, keyboard);
      }
    } catch (err) {
      console.error("Error creating room:", err);
    }
  }

  async find(userID) {
    try {
      // Check if the user is already in a queue
      let existingQueue;
      try {
        existingQueue = await pb
          .collection("queues")
          .getFirstListItem(`user_id="${userID}"`);
      } catch (error) {
        if (error.status !== 404) {
          // Unexpected error when checking queue
          throw error;
        }
      }

      if (existingQueue) {
        tg.sendMessage(userID, text.FIND.WARNING_1);
        return;
      }

      // Check if the user is already in a room
      let existingRoom;
      try {
        existingRoom = await pb
          .collection("rooms")
          .getFirstListItem(`participans~"${userID}"`);
      } catch (error) {
        if (error.status !== 404) {
          // Unexpected error when checking rooms
          throw error;
        }
      }

      if (existingRoom) {
        tg.sendMessage(userID, text.FIND.WARNING_2);
        return;
      }

      // If user is not in queue or room, add them to the queue
      await pb.collection("queues").create({ user_id: userID });
      tg.sendMessage(userID, text.FIND.LOADING, this.searchingKeyboard);
    } catch (err) {
      console.error("Error in find method:", err);
      tg.sendMessage(userID, text.ERROR);
    }
  }

  async stop(userID) {
    try {
      const startTime = this.startTimes.get(userID);
      const currentTime = Date.now();

      // Check if 5 seconds have passed
      if (currentTime - startTime < 5000) {
        tg.sendMessage(
          userID,
          "⚠️ You need to wait at least 5 seconds before ending the conversation."
        );
        return;
      }

      // First, check if the user is in a room
      let room;
      try {
        room = await pb
          .collection("rooms")
          .getFirstListItem(`participans~"${userID}"`);
      } catch (err) {
        if (err.status === 404) {
          // User is not in a room, check if they're in the queue
          console.log(`User ${userID} not found in any room, checking queue`);
        } else {
          throw err;
        }
      }

      if (room) {
        // If user is in a room, remove them and notify participants
        await pb.collection("rooms").delete(room.id);
        room.participans.forEach((id) => {
          if (userID === id) {
            tg.sendMessage(userID, text.STOP.SUCCESS_1, this.initialKeyboard);
          } else {
            tg.sendMessage(id, text.STOP.SUCCESS_2, this.initialKeyboard);
          }
        });
        // After successfully stopping the conversation
        this.startTimes.delete(userID); // Remove the user from the start times
        return;
      }

      // If not in a room, check if user is in the queue
      let queue;
      try {
        queue = await pb
          .collection("queues")
          .getFirstListItem(`user_id="${userID}"`);
      } catch (err) {
        if (err.status === 404) {
          // User is not in the queue either
          tg.sendMessage(userID, text.STOP.WARNING_1, this.initialKeyboard);
          return;
        } else {
          throw err;
        }
      }

      if (queue) {
        // If user is in the queue, remove them
        await pb.collection("queues").delete(queue.id);
        tg.sendMessage(userID, text.STOP.SUCCESS_3, this.initialKeyboard);
      } else {
        // This shouldn't happen, but just in case
        tg.sendMessage(userID, text.STOP.WARNING_1, this.initialKeyboard);
      }
    } catch (err) {
      console.error("Error in stop:", err);
      tg.sendMessage(userID, text.ERROR, this.initialKeyboard);
    }
  }

  async exit(userID) {
    try {
      // First, check if the user is in a queue
      let queue;
      try {
        queue = await pb
          .collection("queues")
          .getFirstListItem(`user_id="${userID}"`);
      } catch (err) {
        if (err.status === 404) {
          // User is not in queue, which is fine
          console.log(`User ${userID} not found in queue, checking if in room`);
        } else {
          throw err;
        }
      }

      if (queue) {
        // If user is in queue, remove them
        await pb.collection("queues").delete(queue.id);
        tg.sendMessage(userID, text.EXIT.SUCCESS_1, this.initialKeyboard);
        return;
      }

      // If not in queue, check if user is in a room
      let room;
      try {
        room = await pb
          .collection("rooms")
          .getFirstListItem(`participans~"${userID}"`);
      } catch (err) {
        if (err.status === 404) {
          // User is not in a room either
          tg.sendMessage(userID, text.EXIT.WARNING_1, this.initialKeyboard);
          return;
        } else {
          throw err;
        }
      }

      if (room) {
        // If user is in a room, remove them from the room
        await pb.collection("rooms").delete(room.id);
        room.participans.forEach((id) => {
          if (userID === id) {
            tg.sendMessage(userID, text.STOP.SUCCESS_1, this.initialKeyboard);
          } else {
            tg.sendMessage(id, text.STOP.SUCCESS_2, this.initialKeyboard);
          }
        });
      } else {
        // This shouldn't happen, but just in case
        tg.sendMessage(userID, text.EXIT.WARNING_1, this.initialKeyboard);
      }
    } catch (err) {
      console.error("Error in exit:", err);
      tg.sendMessage(userID, text.ERROR, this.initialKeyboard);
    }
  }

  async connect(userID, [type, data]) {
    //console.log(`Message received - Type: ${type}, User ID: ${userID}`);
    //console.log("Message data:", data);

    try {
      // Check if user is in a queue
      let queue;
      try {
        queue = await pb
          .collection("queues")
          .getFirstListItem(`user_id="${userID}"`);
      } catch (err) {
        if (err.status !== 404) {
          throw err;
        }
      }

      if (queue) {
        await tg.sendMessage(userID, text.FIND.LOADING, {
          reply_markup: searchingKeyboard.reply_markup,
        });
        return;
      }

      // Check if user is in a room
      let room;
      try {
        room = await pb
          .collection("rooms")
          .getFirstListItem(`participans~"${userID}"`);
      } catch (err) {
        if (err.status === 404) {
          // User is not in a room
          await tg.sendMessage(userID, text.CONNECT.WARNING_1, {
            reply_markup: this.mainKeyboard,
          });
          return;
        } else {
          throw err;
        }
      }

      if (room) {
        const participans = room.participans;
        const index = participans.indexOf(userID);
        const partnerID = participans[index === 1 ? 0 : 1];

        const partner = await pb
          .collection("telegram_users")
          .getFirstListItem(`telegram_id="${partnerID}"`);
        const partnerName = partner.name || partner.username || "Anonymous";

        const saveMessage = async (messageData) => {
          await pb.collection("messages").create(messageData);
        };

        switch (type) {
          case "text":
            const messageData = {
              sender_id: userID.toString(),
              receiver_id: partnerID.toString(),
              type: "text",
              content: data.text,
            };

            try {
              await pb.collection("messages").create(messageData);
              console.log("Text message saved to PocketBase successfully");

              if (data.reply_to_message) {
                await this.#sendReply(
                  partnerID,
                  userID,
                  data.text,
                  data,
                  "sendMessage"
                );
              } else {
                await tg.sendMessage(partnerID, data.text, {
                  reply_markup: this.chattingKeyboard.reply_markup,
                });
              }
            } catch (err) {
              console.error("Error saving or sending text message:", err);
            }
            break;
          case "file":
            try {
              if (data.mime_type === "image/webp") {
                // This is a sticker, don't save it to PocketBase
                await tg.sendSticker(partnerID, data.file_id);
                console.log("Sticker sent to partner successfully");
              } else {
                const fileLink = await tg.getFileLink(data.file_id);
                console.log(`File link: ${fileLink}`);
                const file = await uploadFileToPocketBase(
                  fileLink,
                  data.file_name,
                  data.mime_type
                );

                const formData = {
                  sender_id: userID.toString(),
                  receiver_id: partnerID.toString(),
                  type: data.file_id.startsWith("AgAC") ? "photo" : "file",
                  file_id: data.file_id,
                  file_unique_id: data.file_unique_id,
                  content: fileLink,
                  file_name: data.file_name,
                  mime_type: data.mime_type,
                  caption: data.caption || "",
                  files: [file],
                };

                await pb.collection("messages").create(formData);
                console.log("File saved to PocketBase successfully");

                if (data.file_id.startsWith("AgAC")) {
                  // This is a compressed image (photo)
                  await tg.sendPhoto(partnerID, data.file_id, {
                    caption: data.caption || "",
                  });
                } else {
                  // This is an uncompressed image or other file type (document)
                  await tg.sendDocument(partnerID, data.file_id, {
                    caption: data.caption || "",
                  });
                }
                console.log("File sent to partner successfully");
              }
            } catch (err) {
              console.error("Error processing file:", err);
              this.#errorWhenRoomActive(err, userID);
            }
            break;
          default:
            console.log(`Unsupported message type: ${type}`);
            break;
        }
      }
    } catch (err) {
      console.error("Error in connect method:", err);
      await tg.sendMessage(userID, text.ERROR, {
        reply_markup: this.chattingKeyboard.reply_markup,
      });
    }
  }

  async currentActiveUser(userID) {
    try {
      const totalUserInRoom =
        (await pb.collection("rooms").getFullList()).length * 2;
      const totalUserInQueue = (await pb.collection("queues").getFullList())
        .length;
      const totalUser = totalUserInRoom + totalUserInQueue;
      let textActiveUser = text.ACTIVE_USER.replace("${totalUser}", totalUser)
        .replace("${totalUserInQueue}", totalUserInQueue)
        .replace("${totalUserInRoom}", totalUserInRoom);

      tg.sendMessage(userID, textActiveUser);
    } catch (err) {
      console.error("Error in currentActiveUser:", err);
    }
  }

  #forceStop(userID) {
    Room.findOneAndDelete({ participans: userID }, (err, doc) => {
      if (err) {
        console.log(err);
      } else {
        if (doc) {
          let participans = doc.participans;
          participans.forEach((id) => {
            if (userID === id) {
              tg.sendMessage(userID, text.STOP.SUCCESS_2);
            }
          });
        }
      }
    });
  }

  #errorWhenRoomActive({ response, on }, userID) {
    console.log(response, on);
    switch (response.error_code) {
      case 403:
        this.#forceStop(userID);
        break;
      default:
        break;
    }
  }

  #sendReply(partnerID, userID, dataToSend, dataReply, type) {
    let {
      photo,
      video,
      message_id,
      from: { id },
    } = dataReply.reply_to_message;

    let number = photo || video ? 2 : 1;
    let replyToPlus = { reply_to_message_id: message_id + number };
    let replyToMinus = { reply_to_message_id: message_id - number };

    id == userID
      ? tg[type](partnerID, dataToSend, replyToPlus)
      : tg[type](partnerID, dataToSend, replyToMinus);
  }

  async getUser(userID) {
    try {
      return await pb
        .collection("telegram_users")
        .getFirstListItem(`telegram_id="${userID}"`);
    } catch (err) {
      if (err.status === 404) {
        // User not found, which is expected for new users
        return null;
      }
      console.error(`Error getting user ${userID}:`, err);
      return null;
    }
  }

  async saveUser(userID, username, name) {
    try {
      const existingUser = await this.getUser(userID);
      if (existingUser) {
        await pb.collection("telegram_users").update(existingUser.id, {
          username: username,
          name: name,
        });
        console.log(`User ${userID} updated successfully`);
      } else {
        await pb.collection("telegram_users").create({
          telegram_id: userID.toString(),
          username: username,
          name: name,
          points: 0,
          media_uses: 0,
          referrals: [],
        });
        console.log(`New user ${userID} created successfully`);
      }
    } catch (err) {
      console.error("Error saving user:", err);
    }
  }

  async createReferralLink(userID) {
    const user = await this.getUser(userID);
    if (user) {
      const referralLink = `https://t.me/soorakhi_bot?start=${user.telegram_id}`;
      return referralLink;
    }
    return null;
  }

  async handleReferral(newUserID, referrerTelegramID) {
    try {
      const referrer = await this.getUser(referrerTelegramID);
      if (referrer) {
        await pb.collection("telegram_users").update(referrer.id, {
          points: (referrer.points || 0) + 1,
          referrals: [...(referrer.referrals || []), newUserID.toString()],
        });
        console.log(
          `Referral successful: ${referrer.telegram_id} referred ${newUserID}`
        );

        // Notify the referrer
        tg.sendMessage(
          referrer.telegram_id,
          "🎉 Congratulations! You've earned a point for referring a new user!"
        );

        // Notify the new user
        tg.sendMessage(
          newUserID,
          "Welcome! You've been successfully referred by a friend."
        );
      } else {
        console.log(`Invalid referral ID: ${referrerTelegramID}`);
        tg.sendMessage(
          newUserID,
          "Sorry, the referral link you used is invalid."
        );
      }
    } catch (err) {
      console.error("Error handling referral:", err);
      tg.sendMessage(
        newUserID,
        "There was an error processing your referral. Please try again later."
      );
    }
  }

  async canUseMediaCommand(userID) {
    const user = await this.getUser(userID);
    if (!user) return false;

    if (user.referrals && user.referrals.length > 0) return true;
    if (user.media_uses < 10) {
      await pb.collection("telegram_users").update(user.id, {
        media_uses: user.media_uses + 1,
      });
      return true;
    }
    return false;
  }
}

async function uploadFileToPocketBase(fileLink, fileName, fileType) {
  const response = await fetch(fileLink);
  const arrayBuffer = await response.arrayBuffer();
  const file = new File([arrayBuffer], fileName, { type: fileType });
  return file;
}

module.exports = MatchMaker;
