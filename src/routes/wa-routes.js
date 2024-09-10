const { Router } = require('express');
const WaController = require('../controller/wa-controller');
const limiter = require('../config/limiter');
const authMiddleware = require('../middleware/auth-middleware');
const waRoutes = Router();

waRoutes.use(limiter);
waRoutes.use(authMiddleware);
waRoutes.get('/:session/generate-qr', WaController.generateQr);
waRoutes.post('/:session/send-message', WaController.sendMessage);
waRoutes.post('/:session/send-media', WaController.sendMedia);
waRoutes.get('/devices', WaController.listActiveServices);
waRoutes.get('/:session/status', WaController.getStatus);
waRoutes.get('/:session/terminate', WaController.cleanup);
waRoutes.get('/:session/groups', WaController.getAllGroups);
waRoutes.get('/:session/cleanup', WaController.removeInactiveServices);

module.exports = waRoutes;
