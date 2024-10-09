const { Router } = require('express');
const WhatsAppController = require('../controller/whatsapp-controller');
const limiter = require('../config/limiter');
const authMiddleware = require('../middleware/auth-middleware');
const WhatsAppRoutes = Router();

WhatsAppRoutes.use(limiter);
WhatsAppRoutes.use(authMiddleware);
WhatsAppRoutes.post('/qr-code', WhatsAppController.generateQrCode);
WhatsAppRoutes.post('/raw-qr-code', WhatsAppController.generateQrCodeRaw);
WhatsAppRoutes.post('/:session/send-message', WhatsAppController.sendMessage);
WhatsAppRoutes.post('/:session/send-media', WhatsAppController.sendMedia);
WhatsAppRoutes.get('/', WhatsAppController.listActiveServices);
WhatsAppRoutes.get('/:session/status', WhatsAppController.getStatus);
WhatsAppRoutes.delete('/terminate', WhatsAppController.cleanup);
WhatsAppRoutes.get('/:session/groups', WhatsAppController.getAllGroups);
WhatsAppRoutes.get('/:session/cleanup', WhatsAppController.removeInactiveServices);

module.exports = WhatsAppRoutes;
