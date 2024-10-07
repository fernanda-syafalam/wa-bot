require('dotenv').config();
const os = require('os');

const YAML = require('yamljs');
const express = require('express');
const waRoutes = require('./routes/wa-routes');
const errorHandler = require('./middleware/error-handler');
const healthController = require('./controller/health-controller');
const swaggerUi = require('swagger-ui-express');

const swaggerDocument = YAML.load('./doc/swagger.yaml');

const port = process.env.PORT || 3300;
const app = express();
app.set('trust proxy', 1);
app.use(errorHandler);
app.use(express.json({ limit: '10kb' }));
app.use('/api/v1', waRoutes);
app.get('/health', healthController.healthCheck);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
