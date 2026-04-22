import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { saveCheckup, getCheckups, getCheckupById, getNearbyHospitals } from './controllers/checkupController.js';
import { chatWithAI, getOllamaStatus } from './controllers/chatController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthai';

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.post('/reports', saveCheckup);
app.get('/reports', getCheckups);
app.get('/reports/latest', async (req, res) => {
  const checkups = await getCheckups(req, res);
});
app.get('/reports/:id', getCheckupById);
app.post('/chat', chatWithAI);
app.get('/chat/status', getOllamaStatus);
app.get('/api/hospitals', getNearbyHospitals);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('⚠️ Running without database connection due to missing MongoDB instance. Continuing for UI dev gracefully.');
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on port ${PORT} (DB Offline)`);
    });
  });
