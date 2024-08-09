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

  socket.on("updateChat", async ({ chatId, name, icon, userId }) => {
    const transaction = await sequelize.transaction();

    try {
      // Fetch the chat
      const chat = await Chats.findOne({
        where: { id: chatId },
        transaction,
      });

      if (!chat) {
        socket.emit("error", "Chat not found.");
        await transaction.rollback();
        return;
      }

      // Fetch the chat member record to check admin status
      const chatMember = await ChatMembers.findOne({
        where: { chatId, userId },
        transaction,
      });

      if (!chatMember || !chatMember.isAdmin) {
        socket.emit("error", "Only admins can update the chat.");
        await transaction.rollback();
        return;
      }

      // Fetch the username of the user performing the update
      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        await transaction.rollback();
        return;
      }

      // Prepare the message content based on what was updated
      let content = `${user.username} updated the chat.`;
      if (name) {
        content = `${user.username} changed the chat name to ${name}.`;
      } else if (icon) {
        content = `${user.username} changed the chat icon.`;
      }

      // Update the chat
      const updatedChat = await chat.update({ name, icon }, { transaction });

      // Create a message about the update
      const updateMessage = await Messages.create(
        {
          chatId,
          senderId: userId, // Sender ID is the user performing the update
          content,
          mediaUrl: null,
          sentAt: new Date(),
        },
        { transaction }
      );

      // Commit the transaction
      await transaction.commit();

      // Notify all members about the update
      io.to(chatId).emit("chatUpdated", updatedChat);
      io.to(chatId).emit("newMessage", updateMessage);
    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      console.error("Error updating chat:", error);
      socket.emit("error", "Failed to update chat.");
    }
  });

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
    try {
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
    } catch (error) {
      console.error("Error updating message status:", error);
      socket.emit("error", "Failed to update message status.");
    }
  });

  socket.on("messageRead", async ({ messageId, userId }) => {
    try {
      await MessageStatuses.update(
        {
          status: "read",
          readAt: new Date(),
          receivedAt: sequelize.literal(
            `CASE WHEN status != 'received' THEN NOW() ELSE receivedAt END`
          ),
        },
        { where: { messageId, userId } }
      );

      io.to(userId).emit("messageStatusUpdate", {
        messageId,
        userId,
        status: "read",
      });
    } catch (error) {
      console.error("Error updating message status:", error);
      socket.emit("error", "Failed to update message status.");
    }
  });
  //fetching all conversation for a user

  //fetching messages in a particular chat

  socket.on("getMessages", async ({ chatId, page = 1, limit = 20 }) => {
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

  //group and community section same functions for both

  socket.on("addMemberToChat", async ({ chatId, userId, addedBy }) => {
    const transaction = await sequelize.transaction();
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction,
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }

      const adminCheck = await ChatMembers.findOne({
        where: {
          chatId,
          userId: addedBy,
          isAdmin: true,
        },
        transaction,
      });

      if (!adminCheck) {
        socket.emit("error", "Only admins can add members to the chat.");
        return;
      }

      const existingMember = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction,
      });

      if (existingMember) {
        socket.emit("error", "User is already a member of the chat.");
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        return;
      }

      const newMember = await ChatMembers.create(
        {
          chatId,
          userId,
          isAdmin: false,
        },
        { transaction }
      );

      const joinMessage = await Messages.create(
        {
          chatId,
          senderId: addedBy,
          content: `${user.username} has joined the chat.`,
          mediaUrl: null,
          sentAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      io.to(chatId).emit("memberAdded", {
        chatId,
        userId,
        addedBy,
        newMember,
        joinMessage,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error adding member to chat:", error);
      socket.emit("error", "Failed to add member to chat.");
    }
  });

  socket.on("makeAdmin", async ({ chatId, userId, madeBy }) => {
    const transaction = await sequelize.transaction();

    try {
      const requester = await ChatMembers.findOne({
        where: { chatId, userId: madeBy },
        transaction,
      });

      if (!requester || !requester.isAdmin) {
        socket.emit(
          "error",
          "You do not have permission to make someone an admin."
        );
        await transaction.rollback();
        return;
      }

      const result = await ChatMembers.update(
        { isAdmin: true },
        { where: { chatId, userId }, transaction }
      );

      if (result[0] === 0) {
        socket.emit(
          "error",
          "Failed to make user an admin. User may not be part of the chat."
        );
        await transaction.rollback();
        return;
      }

      const user = await User.findByPk(userId, { transaction });

      const adminMessage = await Messages.create(
        {
          chatId,
          senderId: madeBy,
          content: `${user.username} has been made an admin.`,
          sentAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      io.to(chatId).emit("adminMade", {
        chatId,
        userId,
        madeBy,
        adminMessage,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error making user an admin:", error);
      socket.emit("error", "Failed to make user an admin.");
    }
  });

  socket.on("removeMemberFromChat", async ({ chatId, userId, removedBy }) => {
    const transaction = await sequelize.transaction();
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        transaction,
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }

      const adminCheck = await ChatMembers.findOne({
        where: {
          chatId,
          userId: removedBy,
          isAdmin: true,
        },
        transaction,
      });

      if (!adminCheck) {
        socket.emit("error", "Only admins can remove members from the chat.");
        return;
      }

      const member = await ChatMembers.findOne({
        where: {
          chatId,
          userId,
        },
        transaction,
      });

      if (!member) {
        socket.emit("error", "User is not a member of the chat.");
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        return;
      }

      await ChatMembers.destroy({
        where: {
          chatId,
          userId,
        },
        transaction,
      });

      const removalMessage = await Messages.create(
        {
          chatId,
          senderId: removedBy,
          content: `${user.username} has been removed from the chat.`,
          mediaUrl: null,
          sentAt: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      io.to(chatId).emit("memberRemoved", {
        chatId,
        userId,
        removedBy,
        removalMessage,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error removing member from chat:", error);
      socket.emit("error", "Failed to remove member from chat.");
    }
  });

  socket.on("getChatMembers", async ({ chatId }) => {
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        attributes: ["id", "type", "name"],
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }

      const members = await ChatMembers.findAll({
        where: { chatId },
        include: [
          {
            model: User,
            attributes: ["id", "username", "profilePhoto"],
          },
        ],
      });

      const memberDetails = members.map((member) => ({
        userId: member.userId,
        username: member.User.username,
        profilePhoto: member.User.profilePhoto,
        isAdmin: member.isAdmin,
      }));

      socket.emit("chatMembers", {
        chatId,
        members: memberDetails,
      });
    } catch (error) {
      console.error("Error fetching chat members:", error);
      socket.emit("error", "Failed to fetch chat members.");
    }
  });

  //Community section

  socket.on("joinChat", async ({ chatId, userId }) => {
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
