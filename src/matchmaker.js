const { Telegram } = require("telegraf");
const tg = new Telegram(process.env.BOT_TOKEN);

const { Markup } = require("telegraf");

const text = require("./config/lang/EN.json");

const pb = require("./config/pocketbase");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

class MatchMaker {
  constructor(initialKeyboard, searchingKeyboard, chattingKeyboard) {
    this.initialKeyboard = initialKeyboard;
    this.searchingKeyboard = searchingKeyboard;
    this.chattingKeyboard = chattingKeyboard;
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
        const partnerId = newParticipants.find((pId) => pId !== id);
        const partner = await pb
          .collection("telegram_users")
          .getFirstListItem(`telegram_id="${partnerId}"`);
        const partnerName = partner.name || partner.username || "Anonymous";
        tg.sendMessage(
          id,
          `${text.CREATE_ROOM.SUCCESS_1}\nYou are connected with ${partnerName}.`,
          this.chattingKeyboard
        );
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
        if (error.status === 404) {
          // User is not in queue, which is fine
          console.log(
            `User ${userID} not found in queue, proceeding to check rooms`
          );
        } else {
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
        if (error.status === 404) {
          // User is not in a room, which is fine
          console.log(
            `User ${userID} not found in any room, proceeding to add to queue`
          );
        } else {
          // Unexpected error when checking rooms
          throw error;
        }
      }

      if (existingRoom) {
        tg.sendMessage(userID, text.FIND.WARNING_2);
        return;
      }

      // If user is neither in queue nor in a room, add them to the queue
      //tg.sendMessage(userID, text.FIND.LOADING);
      await pb.collection("queues").create({ user_id: userID });
      console.log(`User ${userID} added to queue successfully`);
    } catch (err) {
      console.error("Error in find method:", err);
      tg.sendMessage(userID, text.ERROR);
    }
  }

  async stop(userID) {
    try {
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
    console.log(`Message received - Type: ${type}, User ID: ${userID}`);
    console.log("Message data:", data);

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
        await tg.sendMessage(userID, text.FIND.LOADING);
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
          await tg.sendMessage(userID, text.CONNECT.WARNING_1);
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
                await tg.sendMessage(partnerID, `${partnerName}: ${data.text}`);
              }
            } catch (err) {
              console.error("Error saving or sending text message:", err);
            }
            break;
          case "file":
            console.log(`File: ${data.file_id}`);
            try {
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
                type: data.mime_type.startsWith("image/") ? "photo" : "file",
                file_id: data.file_id,
                file_unique_id: data.file_unique_id,
                content: fileLink,
                file_name: data.file_name,
                mime_type: data.mime_type,
                files: [file],
              };

              await pb.collection("messages").create(formData);
              console.log("File saved to PocketBase successfully");

              if (data.mime_type.startsWith("image/")) {
                await tg.sendPhoto(partnerID, data.file_id, {
                  caption: `${partnerName} sent a photo: ${data.file_name}`,
                });
              } else {
                await tg.sendDocument(partnerID, data.file_id, {
                  caption: `${partnerName} sent a file: ${data.file_name}`,
                });
              }
              console.log("File sent to partner successfully");
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
      await tg.sendMessage(userID, text.ERROR);
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

  async saveUser(userID, username, name) {
    try {
      // Check if the user already exists
      let existingUser;
      try {
        existingUser = await pb
          .collection("telegram_users")
          .getFirstListItem(`telegram_id="${userID}"`);
      } catch (error) {
        if (error.status !== 404) {
          throw error;
        }
      }

      const userData = {
        username: username,
        name: name || null,
        last_active: new Date().toISOString(),
      };

      if (existingUser) {
        // Update the existing user
        await pb.collection("telegram_users").update(existingUser.id, userData);
        console.log(`User ${userID} updated successfully`);
      } else {
        // Create a new user
        await pb.collection("telegram_users").create({
          telegram_id: userID.toString(),
          created_at: new Date().toISOString(),
          ...userData,
        });
        console.log(`User ${userID} created successfully`);
      }
    } catch (err) {
      console.error("Error saving user:", err);
    }
  }
}

async function uploadFileToPocketBase(fileLink, fileName, fileType) {
  const response = await fetch(fileLink);
  const arrayBuffer = await response.arrayBuffer();
  const file = new File([arrayBuffer], fileName, { type: fileType });
  return file;
}

module.exports = MatchMaker;
