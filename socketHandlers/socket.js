const chatHandlers = require("./chatHandlers");
const messageHandlers = require("./messageHandlers");
const groupHandlers = require("./groupHandlers");
const communityHandlers = require("./communityHandlers");
const messageStatusHandlers = require("./messageStatusHandlers");
const personalHandlers = require("./personalHandler");

module.exports = (io, socket) => {
  console.log(`User connected: ${socket.user.id}`);

  //chat section

  socket.on("createChat", chatHandlers.createChat(io, socket));

  socket.on("updateChat", chatHandlers.updateChat(io, socket));

  socket.on("getChatMembers", chatHandlers.getChatMembers(io, socket));

  socket.on("deleteChat", chatHandlers.deleteChat(io, socket));

  socket.on(
    "getUserConversations",
    chatHandlers.getUserConversations(io, socket)
  );

  //chat details for group and community
  socket.on("getChatDetails", chatHandlers.getChatDetails(io, socket));

  //message section

  socket.on("sendMessage", messageHandlers.sendMessage(io, socket));

  socket.on("deleteMessage", messageHandlers.deleteMessage(io, socket));

  socket.on("getMessages", messageHandlers.getMessages(io, socket));

  socket.on("getNewMessages", messageHandlers.getNewMessages(io, socket));

  //messageStatuses section
  socket.on(
    "messageReceived",
    messageStatusHandlers.messageReceived(io, socket)
  );

  socket.on("messageRead", messageStatusHandlers.messageRead(io, socket));

  //group and community section same functions for both

  socket.on("addMemberToChat", groupHandlers.addMemberToChat(io, socket));

  socket.on("makeAdmin", groupHandlers.makeAdmin(io, socket));

  socket.on("dismissAdmin", groupHandlers.dismissAdmin(io, socket));

  socket.on("leaveChat", groupHandlers.leaveChat(io, socket));

  socket.on(
    "removeMemberFromChat",
    groupHandlers.removeMemberFromChat(io, socket)
  );

  //Community section

  socket.on("joinChat", communityHandlers.joinChat(io, socket));

  socket.on(
    "getCommunityMessagesAndFeeds",
    communityHandlers.getCommunityMessagesAndFeeds(io, socket)
  );

  //personal section

  socket.on("directMessage", personalHandlers.directMessage(io, socket));
  socket.on("toggleBlock", personalHandlers.toggleBlock(io, socket));

  //disconnecting
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
};
