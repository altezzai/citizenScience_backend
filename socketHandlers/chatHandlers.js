const { Op, Sequelize } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const Chats = require("../models/chats");
const ChatMembers = require("../models/chatmembers");
const Messages = require("../models/messages");
const MessageStatuses = require("../models/messagestatuses");
const User = require("../models/user");
const socket = require("./socket");
const DeletedChats = require("../models/deletedchats");
const DeletedMessages = require("../models/deletedmessages");

exports.createChat =
  (io, socket) =>
  async ({
    type,
    name,
    createdBy,
    icon,
    description,
    members,
    initialMessage,
    mediaUrl,
    sentAt,
  }) => {
    const transaction = await skrollsSequelize.transaction();
    try {
      if ((type === "group" || type === "community") && !name) {
        console.log("Name is required for group and community chats.");
        socket.emit("error", "Name is required for group and community chats.");

        return;
      }
      if (!members.includes(createdBy)) {
        members.push(createdBy);
        members.sort((a, b) => a - b);
      }

      if (type === "personal") {
        if (members.length !== 2) {
          console.log("Personal chat must have exactly two members.");
          socket.emit("error", "Personal chat must have exactly two members.");
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
          socket.emit("error", "chat already exist");
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
          description,
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
            overallStatus: "sent",
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
  };

exports.updateChat =
  (io, socket) =>
  async ({ chatId, name, icon, description, userId }) => {
    const skrollsTransaction = await skrollsSequelize.transaction();
    const repositoryTransaction = await repositorySequelize.transaction();

    try {
      const chat = await Chats.findOne({
        where: { id: chatId },
        transaction: skrollsTransaction,
      });

      const existingName = chat.name;

      if (!chat) {
        socket.emit("error", "Chat not found.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const chatMember = await ChatMembers.findOne({
        where: { chatId, userId },
        transaction: skrollsTransaction,
      });

      if (!chatMember || !chatMember.isAdmin) {
        socket.emit("error", "Only admins can update the chat.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      const user = await User.findOne({
        where: { id: userId },
        attributes: ["username"],
        transaction: repositoryTransaction,
      });

      if (!user) {
        socket.emit("error", "User not found.");
        await skrollsTransaction.rollback();
        await repositoryTransaction.rollback();
        return;
      }

      let content = `${user.username} updated the chat.`;
      if (name) {
        content = `${user.username} changed the chat name ${existingName} to ${name}.`;
      } else if (icon) {
        content = `${user.username} changed the chat icon.`;
      }

      const updatedChat = await chat.update(
        { name, icon, description },
        { transaction: skrollsTransaction }
      );

      const updateMessage = await Messages.create(
        {
          chatId,
          senderId: userId,
          content,
          mediaUrl: null,
          sentAt: new Date(),
          overallStatus: "sent",
        },
        { transaction: skrollsTransaction }
      );

      await skrollsTransaction.commit();
      await repositoryTransaction.commit();

      io.to(chatId).emit("chatUpdated", updatedChat);
      io.to(chatId).emit("newMessage", updateMessage);
    } catch (error) {
      await skrollsTransaction.rollback();
      await repositoryTransaction.rollback();
      console.error("Error updating chat:", error);
      socket.emit("error", "Failed to update chat.");
    }
  };

exports.getChatMembers =
  (io, socket) =>
  async ({ chatId }) => {
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
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT username
                FROM repository.Users AS users
                WHERE users.id = ChatMembers.userId
              )`),
              "username",
            ],
            [
              Sequelize.literal(`(
                SELECT profilePhoto
                FROM repository.Users AS users
                WHERE users.id = ChatMembers.userId
              )`),
              "profilePhoto",
            ],
          ],
        },
        raw: true,
      });

      const memberDetails = members.map((member) => ({
        userId: member.userId,
        username: member.username,
        profilePhoto: member.profilePhoto,
        isAdmin: member.isAdmin ? true : false,
      }));

      socket.emit("chatMembers", {
        chatId,
        members: memberDetails,
      });
    } catch (error) {
      console.error("Error fetching chat members:", error);
      socket.emit("error", "Failed to fetch chat members.");
    }
  };

exports.deleteChat =
  (io, socket) =>
  async ({ userId, chatId, deletedAt }) => {
    try {
      const chat = await Chats.findByPk(chatId);
      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }
      await DeletedChats.create({
        userId,
        chatId,
        deletedAt: deletedAt ? new Date(deletedAt) : new Date(),
      });

      socket.emit("message", "Chat deleted successfully");
    } catch (error) {
      console.error("Error deleting chat:", error);
      socket.emit("error", "Error deleting chat.");
    }
  };

exports.getUserConversations =
  (io, socket) =>
  async ({ userId, type }) => {
    try {
      const conversations = await Chats.findAll({
        include: [
          {
            model: ChatMembers,
            attributes: ["userId"],
          },
          {
            model: DeletedChats,
            where: { userId },
            required: false,
          },
          {
            model: Messages,
            attributes: [
              "id",
              "content",
              "senderId",
              "createdAt",
              "overallStatus",
              "deleteForEveryone",
            ],
            order: [["createdAt", "DESC"]],
          },
        ],
        where: {
          id: {
            [Op.in]: Sequelize.literal(
              `(SELECT chatId FROM skrolls.ChatMembers WHERE userId = ${userId})`
            ),
          },
          type: type,
        },
        order: [["updatedAt", "DESC"]],
      });

      const deletedMessages = await DeletedMessages.findAll({
        where: { userId },
        attributes: ["messageId"],
      });

      const deletedMessageIds = deletedMessages.map((dm) => dm.messageId);

      const userIds = new Set();
      conversations.forEach((convo) => {
        convo.ChatMembers.forEach((member) => userIds.add(member.userId));
        convo.Messages.forEach((message) => userIds.add(message.senderId));
      });

      const users = await User.findAll({
        where: {
          id: Array.from(userIds),
        },
        attributes: ["id", "username", "profilePhoto"],
      });

      const userMap = {};
      users.forEach((user) => {
        userMap[user.id] = user;
      });

      const filteredConversations = conversations
        .map((conversation) => {
          const validMessages = conversation.Messages.filter((message) => {
            return (
              !message.deleteForEveryone &&
              !deletedMessageIds.includes(message.id)
            );
          });

          const lastMessage =
            validMessages.length > 0 ? validMessages[0] : null;

          const isDeletedChat = conversation.DeletedChats.length > 0;
          const lastValidMessageDate = lastMessage
            ? lastMessage.createdAt
            : new Date(0);
          const deletedChatDate = isDeletedChat
            ? conversation.DeletedChats[0].deletedAt
            : new Date(0);

          if (!isDeletedChat || lastValidMessageDate > deletedChatDate) {
            const otherMember = conversation.ChatMembers.find(
              (member) => member.userId !== userId
            );
            return {
              chatId: conversation.id,
              type: conversation.type,
              name:
                conversation.type == "personal"
                  ? userMap[otherMember.userId]?.username || "Unknown User"
                  : conversation.name,
              icon:
                conversation.type == "personal"
                  ? userMap[otherMember.userId]?.profilePhoto || null
                  : conversation.icon,
              lastMessage: lastMessage
                ? {
                    id: lastMessage.id,
                    content: lastMessage.content,
                    senderId: lastMessage.senderId,
                    senderUsername:
                      userMap[lastMessage.senderId]?.username || null,
                    status:
                      lastMessage.senderId === userId
                        ? lastMessage.overallStatus
                        : null,
                    createdAt: lastMessage.createdAt,
                  }
                : null,
              unreadMessagesCount: 0,
            };
          }
          return null;
        })
        .filter((convo) => convo !== null);

      console.log(
        "Filtered Conversations:",
        JSON.stringify(filteredConversations, null, 2)
      );

      const result = await Promise.all(
        filteredConversations.map(async (conversation) => {
          const unreadMessagesCount = await MessageStatuses.count({
            include: [
              {
                model: Messages,
                attributes: [],
                where: {
                  chatId: conversation.chatId,
                  createdAt: {
                    [Op.gt]: conversation.lastMessage
                      ? conversation.lastMessage.createdAt
                      : new Date(0),
                  },
                  deleteForEveryone: false,
                },
              },
            ],
            where: {
              userId: userId,
              status: {
                [Op.in]: ["sent", "received"],
              },
            },
          });

          return {
            ...conversation,
            unreadMessagesCount,
          };
        })
      );

      console.log("Final Result:", JSON.stringify(result, null, 2));

      socket.emit("userConversations", { conversations: result });
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      socket.emit("error", "Failed to fetch user conversations.");
    }
  };

exports.getChatDetails =
  (io, socket) =>
  async ({ chatId }) => {
    try {
      const chat = await Chats.findOne({
        where: {
          id: chatId,
          type: { [Op.in]: ["group", "community"] },
        },
        attributes: ["id", "type", "name", "icon", "description"],
      });

      if (!chat) {
        socket.emit("error", "Chat not found or not a group/community.");
        return;
      }

      const members = await ChatMembers.findAll({
        where: { chatId },
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT username
                FROM repository.Users AS users
                WHERE users.id = ChatMembers.userId
              )`),
              "username",
            ],
            [
              Sequelize.literal(`(
                SELECT profilePhoto
                FROM repository.Users AS users
                WHERE users.id = ChatMembers.userId
              )`),
              "profilePhoto",
            ],
          ],
        },
        raw: true,
      });

      const memberDetails = members.map((member) => ({
        userId: member.userId,
        username: member.username,
        profilePhoto: member.profilePhoto,
        isAdmin: member.isAdmin,
      }));

      socket.emit("chatDetails", {
        chatId: chat.id,
        chatName: chat.name,
        chatIcon: chat.icon,
        chatDescription: chat.description,
        members: memberDetails,
      });
    } catch (error) {
      console.error("Error fetching chat details:", error);
      socket.emit("error", "Failed to fetch chat details.");
    }
  };
