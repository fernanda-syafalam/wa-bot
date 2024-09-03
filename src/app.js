require('dotenv').config();

const express = require('express');
const waRoutes = require('./routes/wa-routes');
const errorHandler = require('./middleware/error-handler');

const port = process.env.PORT || 3300;
const app = express();
app.use(errorHandler);
app.use(express.json({ limit: '10kb' }));
app.use('/api/v1', waRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
