const { Sequelize, Op } = require("sequelize");
const sequelize = require("./config/connection");
const Chats = require("./models/chats");
const ChatMembers = require("./models/chatmembers");
const Messages = require("./models/messages");
const MessageStatuses = require("./models/messagestatuses");

module.exports = (io, socket) => {
  console.log("A user Connected");

  //main section
  socket.on(
    "createChat",
    async ({
      type,
      name,
      createdBy,
      icon,
      members,
      initialMessage,
      mediaUrl,
    }) => {
      if (type === "personal" && members.length !== 1) {
        socket.emit("error", "Personal chat must have exactly two members.");
        return;
      }

      //check if the chat is already exists
      const existingChat = await Chats.findOne({
        where: {
          type,
          [Op.or]: [
            {
              [Op.and]: [{ createdBy: createdBy }, { createdBy: members[0] }],
            },
            {
              [Op.and]: [{ createdBy: members[0] }, { createdBy: createdBy }],
            },
          ],
        },
      });

      if (existingChat) {
        socket.emit("error", "A chat with these members already exists");
        return;
      }
      const chat = await Chats.create({
        type,
        name,
        createdBy,
        icon,
      });

      await Promise.all(
        members.map((userId) =>
          ChatMembers.create({
            chatId: chat.id,
            userId,
            isAdmin: false,
          })
        )
      );

      if (initialMessage) {
        const message = await Messages.create({
          chatId: chat.id,
          senderId: createdBy,
          content: initialMessage,
          mediaUrl,
          sentAt: new Date(),
        });

        await MessageStatuses.create({
          messageId: message.id,
          userId: members[0],
          status: "sent",
          sentAt: new Date(),
        });

        // Notify the chat participants about the new message
        io.to(chat.id).emit("newMessage", message);
      }
      socket.emit("chatCreated", chat);
    }
  );

  //Community section

  socket.on("joinChat", async ({ chatId, userId }) => {
    // Check if the chat exists and if the user is a member of the chat
    const chat = await Chats.findByPk(chatId);
    if (!chat) {
      socket.emit("error", "Chat does not exist.");
      return;
    }

    const isMember = await ChatMembers.findOne({
      where: {
        chatId,
        userId,
      },
    });

    if (!isMember) {
      socket.emit("error", "User is not a member of this chat.");
      return;
    }

    socket.join(chatId);
    socket.emit("joinedChat", { chatId });
    socket.broadcast.to(chatId).emit("userJoined", userId);
  });

  //disconnecting
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
};
