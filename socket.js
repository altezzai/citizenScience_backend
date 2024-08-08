const { Sequelize, Op } = require("sequelize");
const sequelize = require("./config/connection");
const Chats = require("./models/chats");
const ChatMembers = require("./models/chatmembers");
const Messages = require("./models/messages");
const MessageStatuses = require("./models/messagestatuses");
const User = require("./models/user");

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
      sentAt,
    }) => {
      const transaction = await sequelize.transaction();
      try {
        if ((type === "group" || type === "community") && !name) {
          console.log("Name is required for group and community chats.");
          socket.emit(
            "error",
            "Name is required for group and community chats."
          );

          return;
        }
        if (!members.includes(createdBy)) {
          members.push(createdBy);
          members.sort((a, b) => a - b);
        }

        if (type === "personal") {
          if (members.length !== 2) {
            console.log("Personal chat must have exactly two members.");
            socket.emit(
              "error",
              "Personal chat must have exactly two members."
            );
            return;
          }

          const existingChat = await Chats.findOne({
            where: {
              type: "personal",
              createdBy: members[0],
            },
            include: [
              {
                model: ChatMembers,
                where: {
                  userId: members[1],
                },
              },
            ],
          });
          if (existingChat) {
            socket.emit("chatCreated", existingChat);
            return;
          }
        }

        // if (type === "group" || type === "community") {
        //   if (!members.includes(createdBy)) {
        //     members.push(createdBy);

        //   }
        // }

        const chat = await Chats.create(
          {
            type,
            name,
            createdBy,
            icon,
          },
          { transaction }
        );

        await Promise.all(
          members.map((userId) =>
            ChatMembers.create(
              {
                chatId: chat.id,
                userId,
                isAdmin: userId === createdBy,
              },
              { transaction }
            )
          )
        );

        if (initialMessage) {
          const message = await Messages.create(
            {
              chatId: chat.id,
              senderId: createdBy,
              content: initialMessage,
              mediaUrl,
              sentAt: sentAt ? new Date(sentAt) : new Date(),
            },
            { transaction }
          );
          await Promise.all(
            members
              .filter((userId) => userId !== createdBy)
              .map((userId) =>
                MessageStatuses.create(
                  {
                    messageId: message.id,
                    userId,
                    status: "sent",
                    sentAt: sentAt ? new Date(sentAt) : new Date(),
                  },
                  { transaction }
                )
              )
          );

          io.to(chat.id).emit("newMessage", message);
        }

        await transaction.commit();

        socket.emit("chatCreated", chat);
      } catch (error) {
        await transaction.rollback();
        console.error("Error adding chat:", error);
        socket.emit("error", "Failed to add chat.");
      }
    }
  );

  socket.on("sendMessage", async (data) => {
    const { chatId, senderId, content, mediaUrl, replyToId, sentAt } = data;
    const transaction = await sequelize.transaction();

    try {
      const chat = await Chats.findByPk(chatId, { transaction });

      if (chat) {
        const message = await Messages.create(
          {
            chatId,
            senderId,
            content,
            mediaUrl,
            replyToId,
            sentAt: sentAt ? new Date(sentAt) : new Date(),
          },
          { transaction }
        );

        const members = await ChatMembers.findAll({
          where: { chatId },
          transaction,
        });

        // await Promise.all(
        //   members.map((member) =>
        //     MessageStatuses.create(
        //       {
        //         messageId: message.id,
        //         userId: member.userId,
        //         status: "sent",
        //         sentAt: new Date(),
        //       },
        //       { transaction }
        //     )
        //   )
        // );

        await Promise.all(
          members
            .filter((member) => member.userId !== senderId)
            .map((member) =>
              MessageStatuses.create(
                {
                  messageId: message.id,
                  userId: member.userId,
                  status: "sent",
                  sentAt: sentAt ? new Date(sentAt) : new Date(),
                },
                { transaction }
              )
            )
        );

        await transaction.commit();

        io.to(chatId).emit("newMessage", message);
      } else {
        await transaction.rollback();
        console.log("Chat not found.");
        socket.emit("error", "Chat not found.");
      }
    } catch (error) {
      await transaction.rollback();
      console.error("Error sending message:", error);
      socket.emit("error", "Failed to send message.");
    }
  });

  socket.on("messageReceived", async ({ messageId, userId }) => {
    await MessageStatuses.update(
      { status: "received", receivedAt: new Date() },
      { where: { messageId, userId } }
    );

    // Optionally notify others in the chat
    io.to(userId).emit("messageStatusUpdate", {
      messageId,
      userId,
      status: "received",
    });
  });

  socket.on("messageRead", async ({ messageId, userId }) => {
    await MessageStatuses.update(
      { status: "read", readAt: new Date() },
      { where: { messageId, userId } }
    );

    // Notify others in the chat
    io.to(userId).emit("messageStatusUpdate", {
      messageId,
      userId,
      status: "read",
    });
  });

  //fetching messages in a particular chat

  socket.on("getMessages", async ({ chatId, page = 1, limit = 502 }) => {
    try {
      const offset = (page - 1) * limit;

      const messages = await Messages.findAndCountAll({
        where: { chatId },
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "username", "profilePhoto"],
          },
          {
            model: Messages,
            as: "replyTo",
            include: [
              {
                model: User,
                as: "sender",
                attributes: ["id", "username"],
              },
            ],
          },
          {
            model: MessageStatuses,
          },
        ],
      });

      const chatMembers = await ChatMembers.findAll({
        where: { chatId },
        attributes: ["userId"],
      });

      const memberIds = chatMembers.map((member) => member.userId);

      const formattedMessages = messages.rows.map((message) => {
        const statuses = message.MessageStatuses.reduce((acc, status) => {
          if (status.userId !== message.senderId) {
            acc[status.userId] = status.status;
          }
          return acc;
        }, {});

        const allReceived = memberIds
          .filter((userId) => userId !== message.senderId)
          .every(
            (userId) =>
              statuses[userId] === "received" || statuses[userId] === "read"
          );

        const allRead = memberIds
          .filter((userId) => userId !== message.senderId)
          .every((userId) => statuses[userId] === "read");

        let overallStatus;
        if (allRead) {
          overallStatus = "read";
        } else if (allReceived) {
          overallStatus = "received";
        } else {
          overallStatus = "sent";
        }

        return {
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          senderUsername: message.sender.username,
          senderProfilePhoto: message.sender.profilePhoto,
          content: message.content,
          mediaUrl: message.mediaUrl,
          sendAt: message.sentAt,
          statuses: statuses,
          overallStatus,
          reply: message.replyTo
            ? {
                id: message.replyTo.id,
                content: message.replyTo.content,
                senderId: message.replyTo.senderId,
                senderUsername: message.replyTo.sender.username,
                senderProfilePhoto: message.replyTo.sender.profilePhoto,
              }
            : null,
        };
      });

      const totalPages = Math.ceil(messages.count / limit);

      socket.emit("messages", {
        messages: formattedMessages,
        totalPages,
        currentPage: page,
      });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      socket.emit("error", "Failed to fetch chat messages.");
    }
  });

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
