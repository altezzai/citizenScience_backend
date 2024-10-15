const { Sequelize, Op } = require("sequelize");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const Chats = require("../models/chats");
const ChatMembers = require("../models/chatmembers");
const Messages = require("../models/messages");
const MessageStatuses = require("../models/messagestatuses");

exports.messageReceived =
  (io, socket) =>
  async ({ messageId }) => {
    let transaction;

    try {
      const userId = socket.user.id;

      transaction = await skrollsSequelize.transaction();

      const [updatedRows] = await MessageStatuses.update(
        { status: "received", receivedAt: new Date() },
        {
          where: { messageId, userId },
          transaction,
        }
      );

      if (updatedRows > 0) {
        await updateOverallMessageStatus(messageId, transaction);
      }

      await transaction.commit();

      // Optionally notify others in the chat
      socket.emit("messageStatusUpdate", {
        messageId,
        userId,
        status: "received",
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      console.error("Error updating message status:", error);
      socket.emit("error", "Failed to update message status.");
    }
  };

exports.messageRead =
  (io, socket) =>
  async ({ messageId }) => {
    try {
      const userId = socket.user.id;

      transaction = await skrollsSequelize.transaction();

      const [updatedRows] = await MessageStatuses.update(
        {
          status: "read",
          readAt: new Date(),
          receivedAt: skrollsSequelize.literal(
            `CASE WHEN status != 'received' THEN NOW() ELSE receivedAt END`
          ),
        },
        { where: { messageId, userId }, transaction }
      );

      if (updatedRows > 0) {
        await updateOverallMessageStatus(messageId, transaction);
      }

      await transaction.commit();

      socket.emit("messageStatusUpdate", {
        messageId,
        userId,
        status: "read",
      });
    } catch (error) {
      if (transaction) await transaction.rollback();

      console.error("Error updating message status:", error);
      socket.emit("error", "Failed to update message status.");
    }
  };

async function updateOverallMessageStatus(messageId, transaction) {
  try {
    const message = await Messages.findByPk(messageId, {
      include: [
        {
          model: Chats,
          include: [ChatMembers],
        },
      ],
      transaction,
    });

    if (!message) {
      throw new Error("Message not found");
    }

    console.log("Message:", JSON.stringify(message, null, 2));

    if (!message.Chat) {
      throw new Error("Chat not found for this message");
    }

    const totalMembers = message.Chat.ChatMembers.length - 1;
    console.log("Total members:", totalMembers);

    const statusCounts = await MessageStatuses.findAll({
      where: { messageId: messageId },
      attributes: [
        "status",
        [skrollsSequelize.fn("COUNT", skrollsSequelize.col("id")), "count"],
      ],
      group: ["status"],
      transaction,
    });

    console.log("Status counts:", JSON.stringify(statusCounts, null, 2));

    const counts = {
      read: 0,
      received: 0,
      sent: 0,
    };

    statusCounts.forEach((stat) => {
      counts[stat.status] = parseInt(stat.getDataValue("count"), 10);
    });

    console.log("Read count:", counts.read);
    console.log("Received count:", counts.received);
    console.log("Sent count:", counts.sent);

    let newStatus;
    if (counts.read === totalMembers) {
      newStatus = "read";
    } else if (counts.read + counts.received === totalMembers) {
      newStatus = "received";
    } else if (counts.sent > 0 || counts.received > 0) {
      newStatus = "sent";
    } else {
      newStatus = "sent";
    }

    console.log("New status:", newStatus);

    await Messages.update(
      { overallStatus: newStatus },
      {
        where: { id: messageId },
        transaction,
      }
    );

    return newStatus;
  } catch (error) {
    console.error("Error in updateOverallMessageStatus:", error);
    throw error;
  }
}
