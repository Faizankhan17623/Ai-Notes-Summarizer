const BASE_URL = import.meta.env.VITE_MAIN_BACKEND_URL

export const ChatData = {
    createChat: BASE_URL + "/chat",
    allChats: BASE_URL + "/chat",
    singleChat: BASE_URL + "/chat",       // + /:chatId
    sendMessage: BASE_URL + "/chat",      // + /:chatId/message
    regenerateReply: BASE_URL + "/chat",  // + /:chatId/regenerate
    deleteChat: BASE_URL + "/chat",       // + /:chatId
}
