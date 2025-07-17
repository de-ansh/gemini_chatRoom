import { Router } from 'express';
import { ChatroomController } from '../controllers/chatroom.controller';
import { MessageController } from '../controllers/message.controller';
import { simpleAuthenticate } from '../middleware/auth.middleware';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply authentication middleware to all chatroom routes
router.use(simpleAuthenticate);

// Apply rate limiting
router.use(rateLimiter);

// Chatroom routes
router.post('/', ChatroomController.createChatroom);
router.get('/', ChatroomController.getChatrooms);
router.get('/stats', ChatroomController.getChatroomStats);
router.get('/search', ChatroomController.searchChatrooms);
router.get('/:id', ChatroomController.getChatroomById);
router.put('/:id', ChatroomController.updateChatroom);
router.delete('/:id', ChatroomController.deleteChatroom);

// Send message to chatroom with automatic Gemini processing
router.post('/:id/send-message', ChatroomController.sendMessageToChatroom);

// Message routes within chatrooms
router.post('/:chatroomId/messages', MessageController.sendMessage);
router.get('/:chatroomId/messages', MessageController.getChatroomMessages);
router.get('/:chatroomId/messages/recent', MessageController.getRecentMessages);
router.get('/:chatroomId/messages/history', MessageController.getMessageHistory);
router.get('/:chatroomId/messages/stats', MessageController.getMessageStats);
router.get('/:chatroomId/messages/search', MessageController.searchMessages);
router.delete('/:chatroomId/messages', MessageController.clearChatroomMessages);

// AI message endpoint (internal use)
router.post('/:chatroomId/messages/ai', MessageController.sendAIMessage);

export default router; 