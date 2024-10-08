const { Router } = require('express');
const WhatsAppController = require('../controller/whatsapp-controller');
const limiter = require('../config/limiter');
const authMiddleware = require('../middleware/auth-middleware');
const waRoutes = Router();

waRoutes.use(limiter);
waRoutes.use(authMiddleware);
waRoutes.get('/:session/generate-qr', WhatsAppController.generateQr);
waRoutes.post('/:session/send-message', WhatsAppController.sendMessage);
waRoutes.post('/:session/send-media', WhatsAppController.sendMedia);
waRoutes.get('/devices', WhatsAppController.listActiveServices);
waRoutes.get('/:session/status', WhatsAppController.getStatus);
waRoutes.get('/:session/terminate', WhatsAppController.cleanup);
waRoutes.get('/:session/groups', WhatsAppController.getAllGroups);
waRoutes.get('/:session/cleanup', WhatsAppController.removeInactiveServices);

module.exports = waRoutes;
