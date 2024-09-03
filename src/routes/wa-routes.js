const { Router } = require('express');
const WaController = require('../controller/wa-controller');
const limiter = require('../config/limiter');
const authMiddleware = require('../middleware/auth-middleware');
const waRoutes = Router();

waRoutes.use(limiter);
waRoutes.use(authMiddleware);
waRoutes.get('/:phoneNumber/generate-qr', WaController.generateQr);
waRoutes.post('/:phoneNumber/send-message', WaController.sendMessage);
waRoutes.get('/devices', WaController.listActiveServices);
waRoutes.get('/:phoneNumber/status', WaController.getStatus);
waRoutes.get('/:phoneNumber/terminate', WaController.cleanup);
waRoutes.get('/:phoneNumber/groups', WaController.getAllGroups);
waRoutes.get('/:phoneNumber/clean-service', WaController.removeService);

module.exports = waRoutes;
